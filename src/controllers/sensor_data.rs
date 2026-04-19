#![allow(clippy::missing_errors_doc)]
#![allow(clippy::unnecessary_struct_initialization)]
#![allow(clippy::unused_async)]
use axum::http::HeaderMap;
use loco_rs::prelude::*;
use serde::{Deserialize, Serialize};

use crate::models::_entities::sensor_data::{self, ActiveModel, Entity, Model};
use crate::models::users::Model as UserModel;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Params {
    pub device_id: Option<String>,
    pub sensor_type: Option<String>,
    pub value: Option<f64>,
}

impl Params {
    fn update(&self, item: &mut ActiveModel) {
        item.device_id = Set(self.device_id.clone());
        item.sensor_type = Set(self.sensor_type.clone());
        item.value = Set(self.value);
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BatchParams {
    pub device_id: String,
    pub sensor_type: String,
    pub values: Vec<f64>,
}

async fn load_item(ctx: &AppContext, id: i32) -> Result<Model> {
    let item = Entity::find_by_id(id).one(&ctx.db).await?;
    item.ok_or_else(|| Error::NotFound)
}

#[debug_handler]
pub async fn list(auth: auth::JWT, State(ctx): State<AppContext>) -> Result<Response> {
    let user = UserModel::find_by_pid(&ctx.db, &auth.claims.pid).await?;
    let data = Entity::find()
        .filter(sensor_data::Column::UserId.eq(user.id))
        .all(&ctx.db)
        .await?;
    format::json(data)
}

#[debug_handler]
pub async fn add(
    auth: auth::JWT,
    State(ctx): State<AppContext>,
    Json(params): Json<Params>,
) -> Result<Response> {
    let user = UserModel::find_by_pid(&ctx.db, &auth.claims.pid).await?;
    let mut item = ActiveModel {
        user_id: Set(user.id),
        ..Default::default()
    };
    params.update(&mut item);
    let item = item.insert(&ctx.db).await?;
    format::json(item)
}

#[debug_handler]
pub async fn add_with_api_key(
    State(ctx): State<AppContext>,
    headers: HeaderMap,
    Json(params): Json<Params>,
) -> Result<Response> {
    let key = match headers.get("x-api-key") {
        Some(v) => v.to_str().map(|s| s.to_string()),
        None => return unauthorized("Missing API key"),
    };
    // 改后
    let Ok(key) = key else {
        return unauthorized("Invalid API key header");
    };
    let user = UserModel::find_by_api_key(&ctx.db, &key).await?;
    let mut item = ActiveModel {
        user_id: Set(user.id),
        ..Default::default()
    };
    params.update(&mut item);
    let item = item.insert(&ctx.db).await?;
    format::json(item)
}

#[debug_handler]
pub async fn add_batch_with_api_key(
    State(ctx): State<AppContext>,
    headers: HeaderMap,
    Json(params): Json<BatchParams>,
) -> Result<Response> {
    let key = match headers.get("x-api-key") {
        Some(v) => v.to_str().map(ToString::to_string),
        None => return unauthorized("Missing API key"),
    };

    let Ok(key) = key else {
        return unauthorized("Invalid API key header");
    };

    let user = UserModel::find_by_api_key(&ctx.db, &key).await?;

    let mut items = Vec::new();
    for value in params.values {
        let item = ActiveModel {
            device_id: Set(Some(params.device_id.clone())),
            sensor_type: Set(Some(params.sensor_type.clone())),
            value: Set(Some(value)),
            user_id: Set(user.id),
            ..Default::default()
        };
        items.push(item.insert(&ctx.db).await?);
    }
    format::json(items)
}

#[debug_handler]
pub async fn update(
    Path(id): Path<i32>,
    auth: auth::JWT,
    State(ctx): State<AppContext>,
    Json(params): Json<Params>,
) -> Result<Response> {
    let user = UserModel::find_by_pid(&ctx.db, &auth.claims.pid).await?;
    let item = load_item(&ctx, id).await?;
    if item.user_id != user.id {
        return unauthorized("Not authorized to update this data");
    }
    let mut item = item.into_active_model();
    params.update(&mut item);
    let item = item.update(&ctx.db).await?;
    format::json(item)
}

#[debug_handler]
pub async fn remove(
    Path(id): Path<i32>,
    auth: auth::JWT,
    State(ctx): State<AppContext>,
) -> Result<Response> {
    let user = UserModel::find_by_pid(&ctx.db, &auth.claims.pid).await?;
    let item = load_item(&ctx, id).await?;
    if item.user_id != user.id {
        return unauthorized("Not authorized to delete this data");
    }
    item.delete(&ctx.db).await?;
    format::empty()
}

#[debug_handler]
pub async fn get_one(
    Path(id): Path<i32>,
    auth: auth::JWT,
    State(ctx): State<AppContext>,
) -> Result<Response> {
    let user = UserModel::find_by_pid(&ctx.db, &auth.claims.pid).await?;
    let item = load_item(&ctx, id).await?;
    if item.user_id != user.id {
        return unauthorized("Not authorized to view this data");
    }
    format::json(item)
}

pub fn routes() -> Routes {
    Routes::new()
        .prefix("api/sensor_data")
        .add("/", get(list))
        .add("/", post(add))
        .add("/device", post(add_with_api_key))
        .add("/device/batch", post(add_batch_with_api_key))
        .add("/{id}", get(get_one))
        .add("/{id}", delete(remove))
        .add("/{id}", put(update))
        .add("/{id}", patch(update))
}
