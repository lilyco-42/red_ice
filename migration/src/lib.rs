#![allow(elided_lifetimes_in_paths)]
#![allow(clippy::wildcard_imports)]
pub use sea_orm_migration::prelude::*;
mod m20220101_000001_users;

mod m20260419_145923_articles;
mod m20260419_150924_sensor_data;
pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20220101_000001_users::Migration),
            Box::new(m20260419_145923_articles::Migration),
            Box::new(m20260419_150924_sensor_data::Migration),
            // inject-above (do not remove this comment)
        ]
    }
}
