mod config;
mod services;

use serde::{Deserialize, Serialize};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
};

// ── Data Types ──

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemMetrics {
    cpu: f32,
    mem: f32,
    disk_free: u64,
    disk_total: u64,
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

// ── Commands ──

#[tauri::command]
fn get_metrics() -> SystemMetrics {
    SystemMetrics {
        cpu: 0.0,
        mem: 0.0,
        disk_free: 0,
        disk_total: 0,
        net_down: 0.0,
        net_up: 0.0,
    }
}

// ── App Entry ──

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![get_metrics])
        .setup(|app| {
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
            let restart = MenuItemBuilder::new("Restart").id("restart").build(app)?;
            let quit = MenuItemBuilder::new("Quit").id("quit").build(app)?;
            let menu = MenuBuilder::new(app)
                .item(&version_label)
                .separator()
                .item(&show)
                .item(&settings)
                .separator()
                .item(&restart)
                .item(&quit)
                .build()?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Sentinel — Status Monitor")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
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

                    let disks = Disks::new_with_refreshed_list();
                    let (disk_free, disk_total) = disks
                        .iter()
                        .find(|d| {
                            let mp = d.mount_point().to_string_lossy();
                            mp == "C:\\" || mp == "/"
                        })
                        .map(|d| (d.available_space(), d.total_space()))
                        .unwrap_or_else(|| {
                            disks
                                .iter()
                                .max_by_key(|d| d.total_space())
                                .map(|d| (d.available_space(), d.total_space()))
                                .unwrap_or((0, 0))
                        });

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
                        net_down,
                        net_up,
                    };
                    let _ = metrics_handle.emit("system-metrics", &metrics);
                }
            });

            // ── Weather Polling ──
            let weather_cfg = cfg.weather.clone();
            let weather_handle = app.handle().clone();
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
            tauri::async_runtime::spawn(async move {
                let client = reqwest::Client::new();
                let interval_secs = svc_cfg.services.poll_interval_seconds;

                loop {
                    let results = services::poll_services(&client, &svc_cfg).await;
                    let _ = svc_handle.emit("service-status", &results);
                    tokio::time::sleep(tokio::time::Duration::from_secs(interval_secs)).await;
                }
            });

            // ── Health Check Polling ──
            if !cfg.health.targets.is_empty() {
                let health_cfg = cfg.clone();
                let health_handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    let client = reqwest::Client::new();
                    let interval_secs = health_cfg.health.poll_interval_seconds;

                    loop {
                        let results = services::poll_health(&client, &health_cfg).await;
                        let _ = health_handle.emit("health-status", &results);
                        tokio::time::sleep(tokio::time::Duration::from_secs(interval_secs)).await;
                    }
                });
            }

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
