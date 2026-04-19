#![allow(clippy::unused_async)]
use loco_rs::prelude::*;
use serde::{Deserialize, Serialize};

use crate::models::users::Model as UserModel;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CommandRequest {
    pub command: String,
    pub device_id: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CommandResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<serde_json::Value>,
}

#[debug_handler]
pub async fn get_commands(auth: auth::JWT, State(ctx): State<AppContext>) -> Result<Response> {
    format::json(serde_json::json!({
        "commands": [
            {"name": "led_on", "description": "Turn on LED"},
            {"name": "led_off", "description": "Turn off LED"},
            {"name": "relay_on", "description": "Turn on relay"},
            {"name": "relay_off", "description": "Turn off relay"},
            {"name": "restart", "description": "Restart device"},
            {"name": "status", "description": "Get device status"}
        ]
    }))
}

#[debug_handler]
pub async fn send_command(
    auth: auth::JWT,
    State(ctx): State<AppContext>,
    Json(params): Json<CommandRequest>,
) -> Result<Response> {
    let user = UserModel::find_by_pid(&ctx.db, &auth.claims.pid).await?;

    let response = match params.command.as_str() {
        "led_on" => CommandResponse {
            success: true,
            message: "LED turned on".to_string(),
            data: Some(serde_json::json!({"gpio": 2, "state": "on"})),
        },
        "led_off" => CommandResponse {
            success: true,
            message: "LED turned off".to_string(),
            data: Some(serde_json::json!({"gpio": 2, "state": "off"})),
        },
        "status" => CommandResponse {
            success: true,
            message: "Device status retrieved".to_string(),
            data: Some(serde_json::json!({
                "uptime": 3600,
                "free_memory": 40960,
                "wifi_strength": -45
            })),
        },
        _ => CommandResponse {
            success: false,
            message: format!("Unknown command: {}", params.command),
            data: None,
        },
    };

    format::json(response)
}

pub fn routes() -> Routes {
    Routes::new()
        .prefix("api/device")
        .add("/commands", get(get_commands))
        .add("/command", post(send_command))
}
