// 강호견문록 데스크톱판: 게임(HTML · JS)을 창 하나에 띄운다. 게임 규칙은 모두 웹판과 같은 코드다.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("강호견문록을 열지 못했습니다");
}
