use serde::Serialize;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
};

#[derive(Clone, Serialize)]
struct SystemMetrics {
    cpu: f32,
    mem: f32,
    disk_free: u64,
    disk_total: u64,
    net_down: f64,
    net_up: f64,
}

/// Tauri command: get system metrics on demand
#[tauri::command]
fn get_metrics() -> SystemMetrics {
    // TODO: Implement with sysinfo crate
    SystemMetrics {
        cpu: 0.0,
        mem: 0.0,
        disk_free: 0,
        disk_total: 0,
        net_down: 0.0,
        net_up: 0.0,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![get_metrics])
        .setup(|app| {
            // ── System Tray ──
            let show = MenuItemBuilder::new("Show").id("show").build(app)?;
            let settings = MenuItemBuilder::new("Settings").id("settings").build(app)?;
            let quit = MenuItemBuilder::new("Quit").id("quit").build(app)?;
            let menu = MenuBuilder::new(app)
                .item(&show)
                .item(&settings)
                .separator()
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
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        if let Some(win) =
                            tray.app_handle().get_webview_window("sentinel-main")
                        {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                })
                .build(app)?;

            // TODO: Spawn background tasks for metrics polling, service checks,
            //       weather API, and health checks using tokio intervals.
            //       Emit events to the frontend via app.emit("system-metrics", payload).

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
