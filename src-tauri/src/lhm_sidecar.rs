//! Bundled LibreHardwareMonitor management.
//!
//! Sentinel ships a copy of LibreHardwareMonitor (MPL 2.0) as a resource and
//! offers two operations:
//!
//! 1. `lhm_install_autostart` — registers a Windows scheduled task that runs
//!    the bundled LHM at logon with elevated privileges, so CPU/memory
//!    temperatures become available without an interactive UAC prompt every
//!    boot. Registration itself goes through one UAC prompt (via `runas`).
//! 2. `lhm_remove_autostart` — removes that task.
//!
//! `lhm_status` reports whether the binary is bundled, whether the task is
//! installed, and whether the LHM process is currently running.
//!
//! All elevated invocations use ShellExecuteEx with the `runas` verb so the
//! UAC prompt is the standard Windows dialog.

use serde::Serialize;
use std::path::PathBuf;
use tauri::Manager;

const TASK_NAME: &str = "Sentinel-LibreHardwareMonitor";

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LhmStatus {
    pub bundled: bool,
    pub bundled_path: Option<String>,
    pub task_installed: bool,
    pub running: bool,
}

fn lhm_path(app: &tauri::AppHandle) -> Option<PathBuf> {
    let res = app.path().resource_dir().ok()?;
    let p = res
        .join("resources")
        .join("lhm")
        .join("LibreHardwareMonitor.exe");
    if p.exists() {
        Some(p)
    } else {
        None
    }
}

#[cfg(windows)]
fn task_installed() -> bool {
    use std::os::windows::process::CommandExt;
    use std::process::Command;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    Command::new("schtasks.exe")
        .args(["/Query", "/TN", TASK_NAME])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[cfg(not(windows))]
fn task_installed() -> bool {
    false
}

#[cfg(windows)]
fn lhm_running() -> bool {
    use std::os::windows::process::CommandExt;
    use std::process::Command;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let output = Command::new("tasklist.exe")
        .args(["/FI", "IMAGENAME eq LibreHardwareMonitor.exe", "/NH"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    match output {
        Ok(o) => String::from_utf8_lossy(&o.stdout).contains("LibreHardwareMonitor.exe"),
        Err(_) => false,
    }
}

#[cfg(not(windows))]
fn lhm_running() -> bool {
    false
}

#[tauri::command]
pub fn lhm_status(app: tauri::AppHandle) -> LhmStatus {
    let path = lhm_path(&app);
    LhmStatus {
        bundled: path.is_some(),
        bundled_path: path.as_ref().map(|p| p.display().to_string()),
        task_installed: task_installed(),
        running: lhm_running(),
    }
}

#[tauri::command]
pub async fn lhm_install_autostart(app: tauri::AppHandle) -> Result<(), String> {
    let path = lhm_path(&app)
        .ok_or_else(|| "LibreHardwareMonitor binary is not bundled with this build".to_string())?;
    let path_str = path.display().to_string();

    // /TR must escape inner quotes; we wrap the whole task-args string in outer quotes
    // so paths with spaces survive schtasks's parser.
    let create_args = format!(
        r#"/Create /TN "{task}" /TR "\"{exe}\"" /SC ONLOGON /RL HIGHEST /F"#,
        task = TASK_NAME,
        exe = path_str
    );

    let exit = tokio::task::spawn_blocking(move || run_elevated_wait("schtasks.exe", &create_args))
        .await
        .map_err(|e| e.to_string())??;
    if exit != 0 {
        return Err(format!("schtasks /Create exited with code {}", exit));
    }

    // Launch immediately so the user doesn't have to log out/in to start using it.
    // Fire-and-forget; if it fails, the scheduled task will run at next logon anyway.
    tokio::task::spawn_blocking(move || {
        let _ = run_elevated_no_wait(&path_str, "");
    });

    Ok(())
}

#[tauri::command]
pub async fn lhm_remove_autostart() -> Result<(), String> {
    let args = format!(r#"/Delete /TN "{}" /F"#, TASK_NAME);
    let exit = tokio::task::spawn_blocking(move || run_elevated_wait("schtasks.exe", &args))
        .await
        .map_err(|e| e.to_string())??;
    if exit != 0 && task_installed() {
        return Err(format!("schtasks /Delete exited with code {}", exit));
    }
    Ok(())
}

#[tauri::command]
pub async fn lhm_launch_now(app: tauri::AppHandle) -> Result<(), String> {
    let path = lhm_path(&app)
        .ok_or_else(|| "LibreHardwareMonitor binary is not bundled with this build".to_string())?;
    let path_str = path.display().to_string();
    tokio::task::spawn_blocking(move || run_elevated_no_wait(&path_str, ""))
        .await
        .map_err(|e| e.to_string())??;
    Ok(())
}

// ── Elevation helpers (ShellExecuteEx with `runas`) ──

#[cfg(windows)]
fn run_elevated_wait(exe: &str, args: &str) -> Result<u32, String> {
    use std::os::windows::ffi::OsStrExt;
    use windows::core::{w, PCWSTR};
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Threading::{GetExitCodeProcess, WaitForSingleObject, INFINITE};
    use windows::Win32::UI::Shell::{ShellExecuteExW, SEE_MASK_NOCLOSEPROCESS, SHELLEXECUTEINFOW};
    use windows::Win32::UI::WindowsAndMessaging::SW_HIDE;

    let exe_w: Vec<u16> = std::ffi::OsString::from(exe)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let args_w: Vec<u16> = std::ffi::OsString::from(args)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    let mut info = SHELLEXECUTEINFOW {
        cbSize: std::mem::size_of::<SHELLEXECUTEINFOW>() as u32,
        fMask: SEE_MASK_NOCLOSEPROCESS,
        lpVerb: w!("runas"),
        lpFile: PCWSTR(exe_w.as_ptr()),
        lpParameters: PCWSTR(args_w.as_ptr()),
        nShow: SW_HIDE.0,
        ..Default::default()
    };

    unsafe {
        ShellExecuteExW(&mut info).map_err(|e| e.to_string())?;
        if info.hProcess.is_invalid() {
            return Ok(0);
        }
        WaitForSingleObject(info.hProcess, INFINITE);
        let mut exit_code = 0u32;
        GetExitCodeProcess(info.hProcess, &mut exit_code).map_err(|e| e.to_string())?;
        let _ = CloseHandle(info.hProcess);
        Ok(exit_code)
    }
}

#[cfg(windows)]
fn run_elevated_no_wait(exe: &str, args: &str) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use windows::core::{w, PCWSTR};
    use windows::Win32::UI::Shell::{ShellExecuteExW, SHELLEXECUTEINFOW};
    use windows::Win32::UI::WindowsAndMessaging::SW_NORMAL;

    let exe_w: Vec<u16> = std::ffi::OsString::from(exe)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let args_w: Vec<u16> = std::ffi::OsString::from(args)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    let mut info = SHELLEXECUTEINFOW {
        cbSize: std::mem::size_of::<SHELLEXECUTEINFOW>() as u32,
        fMask: 0,
        lpVerb: w!("runas"),
        lpFile: PCWSTR(exe_w.as_ptr()),
        lpParameters: PCWSTR(args_w.as_ptr()),
        nShow: SW_NORMAL.0,
        ..Default::default()
    };

    unsafe {
        ShellExecuteExW(&mut info).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(not(windows))]
fn run_elevated_wait(_exe: &str, _args: &str) -> Result<u32, String> {
    Err("LHM auto-start is Windows-only".into())
}

#[cfg(not(windows))]
fn run_elevated_no_wait(_exe: &str, _args: &str) -> Result<(), String> {
    Err("LHM auto-start is Windows-only".into())
}
