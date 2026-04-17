use crate::config::{AppConfig, HealthTargetConfig, ServiceTargetConfig};
use serde::Serialize;
use std::time::{Duration, Instant};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceResult {
    pub name: String,
    pub status: &'static str, // "ok" | "warn" | "crit" | "unknown"
    pub url: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthResult {
    pub name: String,
    pub status: &'static str,
    pub latency: Option<u64>, // milliseconds
    pub url: Option<String>,
}

/// Fetch status from an Atlassian Statuspage API endpoint
async fn fetch_statuspage(client: &reqwest::Client, target: &ServiceTargetConfig) -> ServiceResult {
    let status = match client.get(&target.url).timeout(Duration::from_secs(10)).send().await {
        Ok(resp) => {
            match resp.json::<serde_json::Value>().await {
                Ok(json) => {
                    // Navigate json_path like "status.indicator"
                    let indicator = if let Some(ref path) = target.json_path {
                        let mut val = &json;
                        for key in path.split('.') {
                            val = &val[key];
                        }
                        val.as_str().unwrap_or("unknown").to_string()
                    } else {
                        // Try default path
                        json["status"]["indicator"]
                            .as_str()
                            .unwrap_or("unknown")
                            .to_string()
                    };
                    map_statuspage_indicator(&indicator)
                }
                Err(_) => "unknown",
            }
        }
        Err(_) => "crit",
    };

    ServiceResult {
        name: target.name.clone(),
        status,
        url: target.status_url.clone().or_else(|| Some(target.url.clone())),
    }
}

/// Map Atlassian Statuspage indicator values to our status levels
fn map_statuspage_indicator(indicator: &str) -> &'static str {
    match indicator {
        "none" | "operational" => "ok",
        "minor" | "degraded" => "warn",
        "major" | "critical" => "crit",
        _ => "unknown",
    }
}

/// Fetch all service statuses
pub async fn poll_services(client: &reqwest::Client, config: &AppConfig) -> Vec<ServiceResult> {
    let mut results = Vec::new();
    for target in &config.services.targets {
        let result = fetch_statuspage(client, target).await;
        results.push(result);
    }
    results
}

/// Perform a single health check
async fn check_health(client: &reqwest::Client, target: &HealthTargetConfig, timeout_ms: u64) -> HealthResult {
    let timeout = Duration::from_millis(timeout_ms);
    let start = Instant::now();

    let result = client
        .request(
            target.method.parse().unwrap_or(reqwest::Method::GET),
            &target.url,
        )
        .timeout(timeout)
        .send()
        .await;

    let elapsed = start.elapsed().as_millis() as u64;

    let (status, has_response) = match &result {
        Ok(resp) => {
            if resp.status().as_u16() == target.expected_status {
                ("ok", true)
            } else {
                ("warn", true)
            }
        }
        Err(_) => ("crit", false),
    };

    HealthResult {
        name: target.name.clone(),
        status,
        latency: if has_response { Some(elapsed) } else { None },
        url: Some(target.url.clone()),
    }
}

/// Perform all health checks
pub async fn poll_health(client: &reqwest::Client, config: &AppConfig) -> Vec<HealthResult> {
    let mut results = Vec::new();
    for target in &config.health.targets {
        let result = check_health(client, target, config.health.timeout_ms).await;
        results.push(result);
    }
    results
}
