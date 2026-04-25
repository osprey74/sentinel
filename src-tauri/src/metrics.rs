//! Extended PC metrics: NVIDIA GPU (NVML) + temperatures via LibreHardwareMonitor's
//! built-in HTTP server.
//!
//! LibreHardwareMonitor v0.9.6 dropped the WMI provider from the UI; the only
//! reliable inter-process sensor stream is now the Remote Web Server feature
//! (Options → Remote Web Server, default port 8085). We poll
//! `http://127.0.0.1:8085/data.json` and walk the returned tree to extract
//! Temperature sensors classified into CPU / memory / disk.
//!
//! All subsystems are best-effort: if NVML init fails or the LHM HTTP server
//! is not reachable, the corresponding fields are simply `None` / empty and
//! the UI hides them.

use serde::Serialize;

#[derive(Clone, Debug, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GpuMetrics {
    pub name: String,
    pub usage: f32,
    pub temp: Option<f32>,
    pub mem_used: u64,
    pub mem_total: u64,
}

#[derive(Clone, Debug, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DiskTemp {
    pub label: String,
    pub temp: f32,
}

#[derive(Clone, Debug, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ExtendedMetrics {
    pub gpu: Option<GpuMetrics>,
    pub cpu_temp: Option<f32>,
    pub mem_temp: Option<f32>,
    pub disk_temps: Vec<DiskTemp>,
    pub lhm_available: bool,
}

#[cfg(windows)]
mod imp {
    use super::{DiskTemp, GpuMetrics};
    use nvml_wrapper::{enum_wrappers::device::TemperatureSensor, Nvml};
    use std::sync::OnceLock;
    use std::time::Duration;

    fn nvml() -> Option<&'static Nvml> {
        static NVML: OnceLock<Option<Nvml>> = OnceLock::new();
        NVML.get_or_init(|| match Nvml::init() {
            Ok(n) => Some(n),
            Err(e) => {
                eprintln!("[metrics] NVML init failed: {e}");
                None
            }
        })
        .as_ref()
    }

    pub fn collect_gpu() -> Option<GpuMetrics> {
        let nvml = nvml()?;
        let count = nvml.device_count().ok()?;
        if count == 0 {
            return None;
        }
        let device = nvml.device_by_index(0).ok()?;
        let name = device.name().unwrap_or_default();
        let usage = device
            .utilization_rates()
            .ok()
            .map(|u| u.gpu as f32)
            .unwrap_or(0.0);
        let temp = device
            .temperature(TemperatureSensor::Gpu)
            .ok()
            .map(|t| t as f32);
        let mem = device.memory_info().ok();
        Some(GpuMetrics {
            name,
            usage,
            temp,
            mem_used: mem.as_ref().map(|m| m.used).unwrap_or(0),
            mem_total: mem.as_ref().map(|m| m.total).unwrap_or(0),
        })
    }

    /// One temperature sensor extracted from LHM's data.json tree, with
    /// ancestor context kept so we can classify by parent device kind.
    struct LhmTemp {
        text: String,
        value: f32,
        parents: Vec<ParentCtx>,
    }

    #[derive(Clone)]
    struct ParentCtx {
        text: String,
        image: String,
    }

    fn http_client() -> &'static reqwest::blocking::Client {
        static CLIENT: OnceLock<reqwest::blocking::Client> = OnceLock::new();
        CLIENT.get_or_init(|| {
            reqwest::blocking::Client::builder()
                .timeout(Duration::from_millis(2000))
                .build()
                .expect("reqwest blocking client")
        })
    }

    /// Returns (lhm_available, cpu_temp, mem_temp, disk_temps).
    /// `lhm_available` is true when the LHM HTTP server is reachable and
    /// returned a parseable JSON tree.
    pub fn collect_lhm() -> (bool, Option<f32>, Option<f32>, Vec<DiskTemp>) {
        let resp = match http_client().get("http://127.0.0.1:8085/data.json").send() {
            Ok(r) => r,
            Err(_) => return (false, None, None, vec![]),
        };
        if !resp.status().is_success() {
            return (false, None, None, vec![]);
        }
        let json: serde_json::Value = match resp.json() {
            Ok(v) => v,
            Err(e) => {
                eprintln!("[metrics] LHM JSON parse error: {e}");
                return (true, None, None, vec![]);
            }
        };

        let mut temps = Vec::new();
        walk(&json, &[], &mut temps);

        let cpu_temp = pick_cpu_temp(&temps);
        let mem_temp = pick_mem_temp(&temps);
        let disk_temps = collect_disk_temps(&temps);
        (true, cpu_temp, mem_temp, disk_temps)
    }

    fn walk(node: &serde_json::Value, parents: &[ParentCtx], out: &mut Vec<LhmTemp>) {
        let text = node
            .get("Text")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let image = node
            .get("ImageURL")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let value_str = node.get("Value").and_then(|v| v.as_str()).unwrap_or("");

        // Group nodes (e.g. "Temperatures") have ImageURL=temperature.png but empty
        // Value; only leaf sensor rows (e.g. "CPU Package") carry a "43.0 °C" string.
        // Detect leaves by parsing the Value field — the degree mark is required so
        // we don't pick up voltages, fan RPMs, etc.
        if let Some(v) = parse_celsius(value_str) {
            out.push(LhmTemp {
                text: text.clone(),
                value: v,
                parents: parents.to_vec(),
            });
        }

        if let Some(children) = node.get("Children").and_then(|v| v.as_array()) {
            let mut new_parents = parents.to_vec();
            if !text.is_empty() {
                new_parents.push(ParentCtx {
                    text,
                    image: image.clone(),
                });
            }
            for child in children {
                walk(child, &new_parents, out);
            }
        }
    }

    /// Parse Celsius strings emitted by LHM (e.g. "43.0 °C", "43,0 °C").
    /// The degree symbol must be present so we don't accidentally treat
    /// voltages or RPMs as temperatures.
    fn parse_celsius(s: &str) -> Option<f32> {
        if !s.contains('°') {
            return None;
        }
        let cleaned: String = s
            .chars()
            .filter(|c| c.is_ascii_digit() || *c == '.' || *c == '-' || *c == ',')
            .collect();
        let normalized = cleaned.replace(',', ".");
        let v = normalized.parse::<f32>().ok()?;
        if (-50.0..=200.0).contains(&v) {
            Some(v)
        } else {
            None
        }
    }

    fn parent_image_matches(t: &LhmTemp, kinds: &[&str]) -> bool {
        t.parents.iter().any(|p| {
            let img = p.image.to_ascii_lowercase();
            kinds.iter().any(|k| img.contains(k))
        })
    }

    fn parent_text_matches(t: &LhmTemp, kinds: &[&str]) -> bool {
        t.parents.iter().any(|p| {
            let txt = p.text.to_ascii_lowercase();
            kinds.iter().any(|k| txt.contains(k))
        })
    }

    fn pick_cpu_temp(temps: &[LhmTemp]) -> Option<f32> {
        // Restrict to temperatures whose ancestor is identified as a CPU node
        // (image contains "cpu" or text matches Intel/AMD CPU pattern).
        let cpu: Vec<&LhmTemp> = temps
            .iter()
            .filter(|t| {
                parent_image_matches(t, &["cpu"])
                    || parent_text_matches(t, &["intel core", "intel xeon", "amd ryzen", "amd epyc"])
            })
            .collect();
        cpu.iter()
            .find(|t| t.text.eq_ignore_ascii_case("CPU Package"))
            .or_else(|| {
                cpu.iter().find(|t| {
                    let n = t.text.to_ascii_lowercase();
                    n.contains("tctl") || n.contains("tdie")
                })
            })
            .or_else(|| cpu.iter().find(|t| t.text.eq_ignore_ascii_case("Core Average")))
            .or_else(|| cpu.iter().find(|t| t.text.eq_ignore_ascii_case("Core Max")))
            .or_else(|| cpu.first())
            .map(|t| t.value)
    }

    fn pick_mem_temp(temps: &[LhmTemp]) -> Option<f32> {
        temps
            .iter()
            .find(|t| {
                parent_image_matches(t, &["ram", "memory"])
                    || parent_text_matches(t, &["memory", "ram", "dram"])
            })
            .map(|t| t.value)
    }

    fn collect_disk_temps(temps: &[LhmTemp]) -> Vec<DiskTemp> {
        temps
            .iter()
            .filter_map(|t| {
                let disk_parent = t.parents.iter().rev().find(|p| {
                    let img = p.image.to_ascii_lowercase();
                    img.contains("hdd")
                        || img.contains("ssd")
                        || img.contains("nvme")
                        || img.contains("storage")
                })?;
                Some(DiskTemp {
                    label: disk_parent.text.clone(),
                    temp: t.value,
                })
            })
            .collect()
    }
}

pub fn collect() -> ExtendedMetrics {
    #[cfg(windows)]
    {
        let gpu = imp::collect_gpu();
        let (lhm_available, cpu_temp, mem_temp, lhm_disk_temps) = imp::collect_lhm();

        // Direct NVMe SMART read works without admin and without LHM running.
        // Merge with LHM-reported temps; UI will pick the maximum so duplicates are harmless.
        let mut disk_temps = crate::nvme::collect_nvme_temps();
        disk_temps.extend(lhm_disk_temps);

        ExtendedMetrics {
            gpu,
            cpu_temp,
            mem_temp,
            disk_temps,
            lhm_available,
        }
    }
    #[cfg(not(windows))]
    {
        ExtendedMetrics::default()
    }
}
