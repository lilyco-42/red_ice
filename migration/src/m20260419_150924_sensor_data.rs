use loco_rs::schema::*;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, m: &SchemaManager) -> Result<(), DbErr> {
        create_table(
            m,
            "sensor_data",
            &[
                ("id", ColType::PkAuto),
                ("device_id", ColType::StringNull),
                ("sensor_type", ColType::StringNull),
                ("value", ColType::DoubleNull),
            ],
            &[("user", "")],
        )
        .await
    }

    async fn down(&self, m: &SchemaManager) -> Result<(), DbErr> {
        drop_table(m, "sensor_data").await
    }
}
