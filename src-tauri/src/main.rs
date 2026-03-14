#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::convert_legacy_office,
            commands::probe_remote_resource,
            commands::read_remote_resource
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
