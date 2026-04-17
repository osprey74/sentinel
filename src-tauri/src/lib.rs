mod config;
mod services;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
};

// ── Data Types ──

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DiskInfo {
    label: String,
    free: u64,
    total: u64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemMetrics {
    cpu: f32,
    mem: f32,
    disk_free: u64,
    disk_total: u64,
    disks: Vec<DiskInfo>,
    net_down: f64,
    net_up: f64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DayForecast {
    date: String,
    weather_code: i32,
    temp_max: f64,
    temp_min: f64,
    precip_probability: i32,
}

#[derive(Deserialize)]
struct OpenMeteoResponse {
    daily: OpenMeteoDaily,
}

#[derive(Deserialize)]
struct OpenMeteoDaily {
    time: Vec<String>,
    weather_code: Vec<i32>,
    temperature_2m_max: Vec<f64>,
    temperature_2m_min: Vec<f64>,
    precipitation_probability_max: Vec<i32>,
}

// ── Geocoding Types ──

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GeoResult {
    name: String,
    latitude: f64,
    longitude: f64,
    country: Option<String>,
    admin1: Option<String>,
}

#[derive(Deserialize)]
struct GeoResponse {
    results: Option<Vec<GeoResult>>,
}

// ── Commands ──

#[tauri::command]
fn get_metrics() -> SystemMetrics {
    SystemMetrics {
        cpu: 0.0,
        mem: 0.0,
        disk_free: 0,
        disk_total: 0,
        disks: vec![],
        net_down: 0.0,
        net_up: 0.0,
    }
}

/// Search cities via Open-Meteo Geocoding API
#[tauri::command]
async fn search_location(query: String) -> Result<Vec<GeoResult>, String> {
    let url = format!(
        "https://geocoding-api.open-meteo.com/v1/search?name={}&count=5&language=ja",
        urlencoding(&query)
    );
    let resp = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    let data: GeoResponse = resp.json().await.map_err(|e| e.to_string())?;
    Ok(data.results.unwrap_or_default())
}

/// Save weather location to config.toml and restart weather polling
#[tauri::command]
async fn set_weather_location(
    app: tauri::AppHandle,
    name: String,
    latitude: f64,
    longitude: f64,
) -> Result<(), String> {
    // Update config file
    let path = config::config_path();
    let mut cfg = config::load_config();
    cfg.weather.location_name = name;
    cfg.weather.latitude = latitude;
    cfg.weather.longitude = longitude;
    let content = toml::to_string_pretty(&cfg).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())?;

    // Emit config-changed event so frontend can update
    let _ = app.emit("weather-location-changed", &cfg.weather);

    // Trigger immediate weather fetch with new location
    let url = format!(
        "https://api.open-meteo.com/v1/forecast?latitude={}&longitude={}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo&forecast_days={}",
        latitude, longitude, cfg.weather.forecast_days
    );
    eprintln!("[weather] Location changed, fetching: {url}");
    if let Ok(resp) = reqwest::get(&url).await {
        if let Ok(data) = resp.json::<OpenMeteoResponse>().await {
            let forecasts: Vec<DayForecast> = data
                .daily
                .time
                .iter()
                .enumerate()
                .map(|(i, date)| DayForecast {
                    date: date.clone(),
                    weather_code: data.daily.weather_code.get(i).copied().unwrap_or(0),
                    temp_max: data.daily.temperature_2m_max.get(i).copied().unwrap_or(0.0),
                    temp_min: data.daily.temperature_2m_min.get(i).copied().unwrap_or(0.0),
                    precip_probability: data.daily.precipitation_probability_max.get(i).copied().unwrap_or(0),
                })
                .collect();
            let _ = app.emit("weather-update", &forecasts);
        }
    }
    Ok(())
}

/// Get current weather location from config
#[tauri::command]
fn get_weather_location() -> GeoResult {
    let cfg = config::load_config();
    GeoResult {
        name: cfg.weather.location_name,
        latitude: cfg.weather.latitude,
        longitude: cfg.weather.longitude,
        country: None,
        admin1: None,
    }
}

// ── Config Editor Types ──

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ServiceTargetJs {
    name: String,
    url: String,
    json_path: Option<String>,
    status_url: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HealthTargetJs {
    name: String,
    url: String,
    method: String,
    expected_status: u16,
}

/// Get current service targets from config
#[tauri::command]
fn get_service_targets() -> Vec<ServiceTargetJs> {
    let cfg = config::load_config();
    cfg.services.targets.iter().map(|t| ServiceTargetJs {
        name: t.name.clone(),
        url: t.url.clone(),
        json_path: t.json_path.clone(),
        status_url: t.status_url.clone(),
    }).collect()
}

/// Save service targets to config and trigger re-poll
#[tauri::command]
async fn set_service_targets(app: tauri::AppHandle, targets: Vec<ServiceTargetJs>) -> Result<(), String> {
    let path = config::config_path();
    let mut cfg = config::load_config();
    cfg.services.targets = targets.iter().map(|t| config::ServiceTargetConfig {
        name: t.name.clone(),
        url: t.url.clone(),
        r#type: "status_page".into(),
        json_path: t.json_path.clone(),
        status_url: t.status_url.clone(),
    }).collect();
    let content = toml::to_string_pretty(&cfg).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())?;

    // Immediate re-poll
    let client = reqwest::Client::new();
    let results = services::poll_services(&client, &cfg).await;
    let _ = app.emit("service-status", &results);
    Ok(())
}

/// Get current health targets from config
#[tauri::command]
fn get_health_targets() -> Vec<HealthTargetJs> {
    let cfg = config::load_config();
    cfg.health.targets.iter().map(|t| HealthTargetJs {
        name: t.name.clone(),
        url: t.url.clone(),
        method: t.method.clone(),
        expected_status: t.expected_status,
    }).collect()
}

/// Save health targets to config and trigger re-poll
#[tauri::command]
async fn set_health_targets(app: tauri::AppHandle, targets: Vec<HealthTargetJs>) -> Result<(), String> {
    let path = config::config_path();
    let mut cfg = config::load_config();
    cfg.health.targets = targets.iter().map(|t| config::HealthTargetConfig {
        name: t.name.clone(),
        url: t.url.clone(),
        method: t.method.clone(),
        expected_status: t.expected_status,
    }).collect();
    let content = toml::to_string_pretty(&cfg).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())?;

    // Immediate re-poll
    let client = reqwest::Client::new();
    let results = services::poll_health(&client, &cfg).await;
    let _ = app.emit("health-status", &results);
    Ok(())
}

/// Toggle drag lock and return new state
#[tauri::command]
fn toggle_drag_lock(
    app: tauri::AppHandle,
    state: tauri::State<'_, DragLockState>,
    menu_ref: tauri::State<'_, LockMenuItemRef>,
) -> bool {
    let prev = state.0.load(Ordering::Relaxed);
    let new_val = !prev;
    state.0.store(new_val, Ordering::Relaxed);
    if let Some(item) = menu_ref.0.lock().unwrap().as_ref() {
        let _ = item.set_text(if new_val { "🔒 Unlock Position" } else { "Lock Position" });
    }
    let _ = app.emit("drag-locked", new_val);
    new_val
}

/// Get current drag lock state
#[tauri::command]
fn get_drag_locked(state: tauri::State<'_, DragLockState>) -> bool {
    state.0.load(Ordering::Relaxed)
}

/// Check if autostart is enabled
#[tauri::command]
fn get_autostart(app: tauri::AppHandle) -> bool {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().is_enabled().unwrap_or(false)
}

/// Toggle autostart
#[tauri::command]
fn set_autostart(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    let manager = app.autolaunch();
    if enabled {
        manager.enable().map_err(|e| e.to_string())?;
    } else {
        manager.disable().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Get cached weather data (for initial load)
#[tauri::command]
fn get_cached_weather(state: tauri::State<'_, WeatherCache>) -> Vec<DayForecast> {
    state.0.lock().unwrap().clone()
}

/// Quit the application
#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

/// Save window position to config
#[tauri::command]
fn save_window_position(x: i32, y: i32) -> Result<(), String> {
    let path = config::config_path();
    let mut cfg = config::load_config();
    cfg.general.position = Some(config::PositionConfig { x, y });
    let content = toml::to_string_pretty(&cfg).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

/// Send desktop notification on status change
fn send_notification(app: &tauri::AppHandle, name: &str, old: &str, new: &str) {
    use tauri_plugin_notification::NotificationExt;
    let (title, body) = match new {
        "crit" => (
            format!("⚠ {} is DOWN", name),
            format!("{} → {}", status_label(old), status_label(new)),
        ),
        "warn" => (
            format!("⚡ {} degraded", name),
            format!("{} → {}", status_label(old), status_label(new)),
        ),
        "ok" => (
            format!("✓ {} recovered", name),
            format!("{} → operational", status_label(old)),
        ),
        _ => return,
    };
    eprintln!("[notify] {}: {} → {}", name, old, new);
    let _ = app.notification().builder().title(&title).body(&body).show();
}

fn status_label(s: &str) -> &str {
    match s {
        "ok" => "operational",
        "warn" => "degraded",
        "crit" => "down",
        _ => "unknown",
    }
}

/// Simple URL encoding for the search query
fn urlencoding(s: &str) -> String {
    s.bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                String::from(b as char)
            }
            _ => format!("%{:02X}", b),
        })
        .collect()
}

// ── Shared State ──

struct WeatherCache(Arc<Mutex<Vec<DayForecast>>>);
struct DragLockState(Arc<AtomicBool>);
struct LockMenuItemRef(Mutex<Option<tauri::menu::MenuItem<tauri::Wry>>>);

/// Previous status map for change detection: name -> status
type StatusMap = Arc<Mutex<HashMap<String, String>>>;

// ── App Entry ──

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let weather_cache = Arc::new(Mutex::new(Vec::<DayForecast>::new()));
    let svc_status_map: StatusMap = Arc::new(Mutex::new(HashMap::new()));
    let health_status_map: StatusMap = Arc::new(Mutex::new(HashMap::new()));
    let drag_locked = Arc::new(AtomicBool::new(false));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(WeatherCache(weather_cache.clone()))
        .manage(DragLockState(drag_locked.clone()))
        .manage(LockMenuItemRef(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            get_metrics,
            search_location,
            set_weather_location,
            get_weather_location,
            get_service_targets,
            set_service_targets,
            get_health_targets,
            set_health_targets,
            save_window_position,
            quit_app,
            get_cached_weather,
            get_autostart,
            set_autostart,
            toggle_drag_lock,
            get_drag_locked,
        ])
        .setup(move |app| {
            // ── Load Config ──
            let cfg = config::load_config();

            // ── System Tray ──
            let version = app.package_info().version.to_string();
            let version_label = MenuItemBuilder::new(format!("Sentinel v{}", version))
                .id("version")
                .enabled(false)
                .build(app)?;
            let show = MenuItemBuilder::new("Show").id("show").build(app)?;
            let settings = MenuItemBuilder::new("Settings").id("settings").build(app)?;
            let lock_pos = MenuItemBuilder::new("Lock Position")
                .id("lock_position")
                .build(app)?;
            let lock_pos_for_tray = lock_pos.clone();
            let restart = MenuItemBuilder::new("Restart").id("restart").build(app)?;
            let quit = MenuItemBuilder::new("Quit").id("quit").build(app)?;
            let menu = MenuBuilder::new(app)
                .item(&version_label)
                .separator()
                .item(&show)
                .item(&settings)
                .item(&lock_pos)
                .separator()
                .item(&restart)
                .item(&quit)
                .build()?;

            let drag_locked_ref = drag_locked.clone();
            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Sentinel — Status Monitor")
                .menu(&menu)
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(win) = app.get_webview_window("sentinel-main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                    "settings" => {
                        if let Some(win) = app.get_webview_window("sentinel-main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                            let _ = win.emit("open-settings", ());
                        }
                    }
                    "lock_position" => {
                        let prev = drag_locked_ref.load(Ordering::Relaxed);
                        let new_val = !prev;
                        drag_locked_ref.store(new_val, Ordering::Relaxed);
                        let _ = lock_pos_for_tray.set_text(if new_val { "🔒 Unlock Position" } else { "Lock Position" });
                        let _ = app.emit("drag-locked", new_val);
                    }
                    "restart" => {
                        app.restart();
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        if let Some(win) =
                            tray.app_handle().get_webview_window("sentinel-main")
                        {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Store lock menu item reference for commands to update text
            {
                let state = app.state::<LockMenuItemRef>();
                *state.0.lock().unwrap() = Some(lock_pos);
            }

            // ── Restore Window Position ──
            if let Some(pos) = &cfg.general.position {
                if let Some(win) = app.get_webview_window("sentinel-main") {
                    let _ = win.set_position(tauri::LogicalPosition::new(pos.x, pos.y));
                }
            }

            // ── System Metrics Polling ──
            let metrics_poll = cfg.metrics.poll_interval_seconds;
            let metrics_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                use sysinfo::{Disks, Networks, System};

                let mut sys = System::new();
                let mut networks = Networks::new_with_refreshed_list();

                sys.refresh_cpu_usage();
                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;

                let mut interval =
                    tokio::time::interval(tokio::time::Duration::from_secs(metrics_poll));

                loop {
                    interval.tick().await;

                    sys.refresh_cpu_usage();
                    sys.refresh_memory();
                    networks.refresh();

                    let cpu = sys.global_cpu_usage();
                    let total_mem = sys.total_memory();
                    let mem = if total_mem > 0 {
                        sys.used_memory() as f32 / total_mem as f32 * 100.0
                    } else {
                        0.0
                    };

                    let disks_list = Disks::new_with_refreshed_list();
                    // Collect all local drives with non-zero free space
                    let mut all_disks: Vec<DiskInfo> = disks_list
                        .iter()
                        .filter(|d| d.total_space() > 0 && d.available_space() > 0)
                        .map(|d| {
                            let mp = d.mount_point().to_string_lossy().to_string();
                            let label = mp.trim_end_matches('\\').to_string();
                            DiskInfo {
                                label,
                                free: d.available_space(),
                                total: d.total_space(),
                            }
                        })
                        .collect();
                    all_disks.sort_by(|a, b| a.label.cmp(&b.label));
                    // Primary disk for backward compat
                    let primary = all_disks.iter()
                        .find(|d| d.label == "C:" || d.label == "/")
                        .or_else(|| all_disks.first());
                    let (disk_free, disk_total) = primary
                        .map(|d| (d.free, d.total))
                        .unwrap_or((0, 0));

                    let (rx_bytes, tx_bytes) =
                        networks.iter().fold((0u64, 0u64), |(r, t), (_, data)| {
                            (r + data.received(), t + data.transmitted())
                        });
                    let net_down = rx_bytes as f64 / metrics_poll as f64;
                    let net_up = tx_bytes as f64 / metrics_poll as f64;

                    let metrics = SystemMetrics {
                        cpu,
                        mem,
                        disk_free,
                        disk_total,
                        disks: all_disks,
                        net_down,
                        net_up,
                    };
                    let _ = metrics_handle.emit("system-metrics", &metrics);
                }
            });

            // ── Weather Polling ──
            let weather_cfg = cfg.weather.clone();
            let weather_handle = app.handle().clone();
            let weather_cache_ref = weather_cache.clone();
            tauri::async_runtime::spawn(async move {
                let client = reqwest::Client::new();
                let url = format!(
                    "https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo&forecast_days={days}",
                    lat = weather_cfg.latitude,
                    lon = weather_cfg.longitude,
                    days = weather_cfg.forecast_days,
                );
                eprintln!("[weather] URL: {url}");

                loop {
                    match client.get(&url).send().await {
                        Ok(resp) => {
                            let status = resp.status();
                            match resp.json::<OpenMeteoResponse>().await {
                                Ok(data) => {
                                    let forecasts: Vec<DayForecast> = data
                                        .daily
                                        .time
                                        .iter()
                                        .enumerate()
                                        .map(|(i, date)| DayForecast {
                                            date: date.clone(),
                                            weather_code: data.daily.weather_code.get(i).copied().unwrap_or(0),
                                            temp_max: data.daily.temperature_2m_max.get(i).copied().unwrap_or(0.0),
                                            temp_min: data.daily.temperature_2m_min.get(i).copied().unwrap_or(0.0),
                                            precip_probability: data.daily.precipitation_probability_max.get(i).copied().unwrap_or(0),
                                        })
                                        .collect();
                                    eprintln!("[weather] OK: {} forecasts", forecasts.len());
                                    *weather_cache_ref.lock().unwrap() = forecasts.clone();
                                    let _ = weather_handle.emit("weather-update", &forecasts);
                                }
                                Err(e) => eprintln!("[weather] JSON parse error (HTTP {}): {e}", status),
                            }
                        }
                        Err(e) => eprintln!("[weather] Request error: {e}"),
                    }
                    tokio::time::sleep(tokio::time::Duration::from_secs(
                        weather_cfg.poll_interval_seconds,
                    )).await;
                }
            });

            // ── Service Status Polling ──
            let svc_cfg = cfg.clone();
            let svc_handle = app.handle().clone();
            let svc_prev = svc_status_map.clone();
            tauri::async_runtime::spawn(async move {
                let client = reqwest::Client::new();
                let interval_secs = svc_cfg.services.poll_interval_seconds;

                loop {
                    let results = services::poll_services(&client, &svc_cfg).await;
                    // Check for status changes and notify
                    {
                        let mut prev = svc_prev.lock().unwrap();
                        for r in &results {
                            let old = prev.get(&r.name).map(|s| s.as_str()).unwrap_or("unknown");
                            if old != r.status && old != "unknown" {
                                send_notification(&svc_handle, &r.name, old, r.status);
                            }
                            prev.insert(r.name.clone(), r.status.to_string());
                        }
                    }
                    let _ = svc_handle.emit("service-status", &results);
                    tokio::time::sleep(tokio::time::Duration::from_secs(interval_secs)).await;
                }
            });

            // ── Health Check Polling ──
            if !cfg.health.targets.is_empty() {
                let health_cfg = cfg.clone();
                let health_handle = app.handle().clone();
                let health_prev = health_status_map.clone();
                tauri::async_runtime::spawn(async move {
                    let client = reqwest::Client::new();
                    let interval_secs = health_cfg.health.poll_interval_seconds;

                    loop {
                        let results = services::poll_health(&client, &health_cfg).await;
                        {
                            let mut prev = health_prev.lock().unwrap();
                            for r in &results {
                                let old = prev.get(&r.name).map(|s| s.as_str()).unwrap_or("unknown");
                                if old != r.status && old != "unknown" {
                                    send_notification(&health_handle, &r.name, old, r.status);
                                }
                                prev.insert(r.name.clone(), r.status.to_string());
                            }
                        }
                        let _ = health_handle.emit("health-status", &results);
                        tokio::time::sleep(tokio::time::Duration::from_secs(interval_secs)).await;
                    }
                });
            }

            // ── Config Hot Reload ──
            let reload_handle = app.handle().clone();
            std::thread::spawn(move || {
                use notify::{Watcher, RecursiveMode, Event, EventKind};
                let config_path = config::config_path();
                let config_dir = config_path.parent().unwrap().to_path_buf();

                let (tx, rx) = std::sync::mpsc::channel::<notify::Result<Event>>();
                let mut watcher = notify::recommended_watcher(tx).unwrap();
                let _ = watcher.watch(&config_dir, RecursiveMode::NonRecursive);

                eprintln!("[config] Watching {}", config_dir.display());
                for event in rx {
                    if let Ok(event) = event {
                        if matches!(event.kind, EventKind::Modify(_) | EventKind::Create(_)) {
                            if event.paths.iter().any(|p| p.ends_with("config.toml")) {
                                eprintln!("[config] Reloaded config.toml");
                                let _ = reload_handle.emit("config-reloaded", ());
                            }
                        }
                    }
                }
            });

            Ok(())
        })
        // ── Close to Tray ──
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Sentinel");
}
