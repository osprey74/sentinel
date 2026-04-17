use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Top-level config structure matching ~/.config/sentinel/config.toml
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AppConfig {
    #[serde(default)]
    pub general: GeneralConfig,
    #[serde(default)]
    pub weather: WeatherConfig,
    #[serde(default)]
    pub metrics: MetricsConfig,
    #[serde(default)]
    pub services: ServicesConfig,
    #[serde(default)]
    pub health: HealthConfig,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PositionConfig {
    pub x: i32,
    pub y: i32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GeneralConfig {
    #[serde(default = "default_poll_interval")]
    pub poll_interval_seconds: u64,
    pub position: Option<PositionConfig>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WeatherConfig {
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default = "default_lat")]
    pub latitude: f64,
    #[serde(default = "default_lon")]
    pub longitude: f64,
    #[serde(default = "default_location_name")]
    pub location_name: String,
    #[serde(default = "default_forecast_days")]
    pub forecast_days: u8,
    #[serde(default = "default_weather_poll")]
    pub poll_interval_seconds: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct MetricsConfig {
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default = "default_metrics_poll")]
    pub poll_interval_seconds: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ServicesConfig {
    #[serde(default = "default_service_poll")]
    pub poll_interval_seconds: u64,
    #[serde(default = "default_service_targets")]
    pub targets: Vec<ServiceTargetConfig>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ServiceTargetConfig {
    pub name: String,
    pub url: String,
    #[serde(default = "default_status_page_type")]
    pub r#type: String,
    pub json_path: Option<String>,
    pub status_url: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HealthConfig {
    #[serde(default = "default_health_poll")]
    pub poll_interval_seconds: u64,
    #[serde(default = "default_timeout")]
    pub timeout_ms: u64,
    #[serde(default)]
    pub targets: Vec<HealthTargetConfig>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HealthTargetConfig {
    pub name: String,
    pub url: String,
    #[serde(default = "default_get")]
    pub method: String,
    #[serde(default = "default_expected_status")]
    pub expected_status: u16,
}

// ── Defaults ──

fn default_true() -> bool { true }
fn default_poll_interval() -> u64 { 10 }
fn default_lat() -> f64 { 35.6762 }
fn default_lon() -> f64 { 139.6503 }
fn default_location_name() -> String { "Tokyo".into() }
fn default_forecast_days() -> u8 { 4 }
fn default_weather_poll() -> u64 { 1800 }
fn default_metrics_poll() -> u64 { 5 }
fn default_service_poll() -> u64 { 60 }
fn default_health_poll() -> u64 { 30 }
fn default_timeout() -> u64 { 5000 }
fn default_get() -> String { "GET".into() }
fn default_expected_status() -> u16 { 200 }
fn default_status_page_type() -> String { "status_page".into() }

fn default_service_targets() -> Vec<ServiceTargetConfig> {
    vec![
        ServiceTargetConfig {
            name: "GitHub".into(),
            url: "https://www.githubstatus.com/api/v2/status.json".into(),
            r#type: "status_page".into(),
            json_path: Some("status.indicator".into()),
            status_url: Some("https://www.githubstatus.com".into()),
        },
        ServiceTargetConfig {
            name: "Fly.io".into(),
            url: "https://status.flyio.net/api/v2/status.json".into(),
            r#type: "status_page".into(),
            json_path: Some("status.indicator".into()),
            status_url: Some("https://status.flyio.net".into()),
        },
        ServiceTargetConfig {
            name: "Bluesky".into(),
            url: "https://bluesky.statuspage.io/api/v2/status.json".into(),
            r#type: "status_page".into(),
            json_path: Some("status.indicator".into()),
            status_url: Some("https://bluesky.statuspage.io".into()),
        },
        ServiceTargetConfig {
            name: "Cloudflare".into(),
            url: "https://www.cloudflarestatus.com/api/v2/status.json".into(),
            r#type: "status_page".into(),
            json_path: Some("status.indicator".into()),
            status_url: Some("https://www.cloudflarestatus.com".into()),
        },
        ServiceTargetConfig {
            name: "Anthropic".into(),
            url: "https://status.anthropic.com/api/v2/status.json".into(),
            r#type: "status_page".into(),
            json_path: Some("status.indicator".into()),
            status_url: Some("https://status.anthropic.com".into()),
        },
    ]
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            general: GeneralConfig::default(),
            weather: WeatherConfig::default(),
            metrics: MetricsConfig::default(),
            services: ServicesConfig::default(),
            health: HealthConfig::default(),
        }
    }
}

impl Default for GeneralConfig {
    fn default() -> Self {
        Self { poll_interval_seconds: default_poll_interval(), position: None }
    }
}

impl Default for WeatherConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            latitude: default_lat(),
            longitude: default_lon(),
            location_name: default_location_name(),
            forecast_days: default_forecast_days(),
            poll_interval_seconds: default_weather_poll(),
        }
    }
}

impl Default for MetricsConfig {
    fn default() -> Self {
        Self { enabled: true, poll_interval_seconds: default_metrics_poll() }
    }
}

impl Default for ServicesConfig {
    fn default() -> Self {
        Self {
            poll_interval_seconds: default_service_poll(),
            targets: default_service_targets(),
        }
    }
}

impl Default for HealthConfig {
    fn default() -> Self {
        Self {
            poll_interval_seconds: default_health_poll(),
            timeout_ms: default_timeout(),
            targets: vec![],
        }
    }
}

/// Get the config file path: ~/.config/sentinel/config.toml
pub fn config_path() -> PathBuf {
    let base = dirs_next::config_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join("sentinel").join("config.toml")
}

/// Load config from file, creating default if it doesn't exist
pub fn load_config() -> AppConfig {
    let path = config_path();
    if path.exists() {
        match std::fs::read_to_string(&path) {
            Ok(content) => match toml::from_str::<AppConfig>(&content) {
                Ok(cfg) => return cfg,
                Err(e) => eprintln!("Config parse error: {e}, using defaults"),
            },
            Err(e) => eprintln!("Config read error: {e}, using defaults"),
        }
    } else {
        // Create default config file
        let cfg = AppConfig::default();
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        if let Ok(content) = toml::to_string_pretty(&cfg) {
            let _ = std::fs::write(&path, content);
            eprintln!("Created default config at {}", path.display());
        }
    }
    AppConfig::default()
}
