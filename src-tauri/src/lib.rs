#[cfg(target_os = "macos")]
use core_foundation::base::TCFType;
#[cfg(target_os = "macos")]
use core_foundation::mach_port::CFMachPortRef;
#[cfg(target_os = "macos")]
use core_foundation::runloop::{kCFRunLoopCommonModes, CFRunLoop};
#[cfg(target_os = "macos")]
use core_graphics::event::{
    CGEvent, CGEventTap, CGEventTapLocation, CGEventTapOptions, CGEventTapPlacement, CGEventType,
    CallbackResult, EventField, KeyCode,
};
#[cfg(target_os = "macos")]
use objc2_app_kit::{NSEvent, NSEventMask, NSEventType};
use serde::Serialize;
use serde_json::Value;
#[cfg(target_os = "macos")]
use std::collections::HashSet;
use std::fs;
#[cfg(target_os = "macos")]
use std::os::raw::c_uchar;
use std::path::Path;
#[cfg(target_os = "macos")]
use std::ptr::NonNull;
use std::sync::atomic::{AtomicBool, Ordering};
#[cfg(target_os = "macos")]
use std::sync::atomic::{AtomicU64, AtomicUsize};
#[cfg(target_os = "macos")]
use std::sync::{LazyLock, Mutex};
#[cfg(target_os = "macos")]
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager};

#[cfg(target_os = "macos")]
static KEYBOARD_LISTENER_STARTED: AtomicBool = AtomicBool::new(false);
#[cfg(target_os = "macos")]
static KEYBOARD_LOCAL_MONITOR_STARTED: AtomicBool = AtomicBool::new(false);
#[cfg(target_os = "macos")]
static KEYBOARD_EVENT_TAP_READY: AtomicBool = AtomicBool::new(false);
#[cfg(target_os = "macos")]
static KEYBOARD_EVENT_TAP_PORT: AtomicUsize = AtomicUsize::new(0);
#[cfg(target_os = "macos")]
static KEYBOARD_LAST_GLOBAL_EVENT_MS: AtomicU64 = AtomicU64::new(0);
#[cfg(target_os = "macos")]
static KEYBOARD_LAST_EVENT: Mutex<KeyboardEventDedupeState> =
    Mutex::new(KeyboardEventDedupeState {
        keycode: u16::MAX,
        source: KEYBOARD_SOURCE_NONE,
        event_at_ms: 0,
    });
#[cfg(target_os = "macos")]
static KEYBOARD_PRESSED_KEYS: LazyLock<Mutex<HashSet<u16>>> =
    LazyLock::new(|| Mutex::new(HashSet::new()));
#[cfg(target_os = "macos")]
const KEYBOARD_SOURCE_NONE: u8 = 0;
#[cfg(target_os = "macos")]
const KEYBOARD_SOURCE_LOCAL: u8 = 1;
#[cfg(target_os = "macos")]
const KEYBOARD_SOURCE_EVENT_TAP: u8 = 2;
#[cfg(target_os = "macos")]
const KEYBOARD_DEDUPE_WINDOW_MS: u64 = 80;
#[cfg(target_os = "macos")]
const KEYBOARD_GLOBAL_EVENT_TRUST_WINDOW_MS: u64 = 2_000;
#[cfg(target_os = "macos")]
const KEYBOARD_EVENT_TAP_RETRY_INTERVAL: Duration = Duration::from_secs(2);

#[cfg(target_os = "macos")]
struct KeyboardEventDedupeState {
    keycode: u16,
    source: u8,
    event_at_ms: u64,
}

#[cfg(target_os = "macos")]
struct KeyboardEventMessage {
    raw_keycode: u16,
    is_key_down: bool,
}

#[cfg(target_os = "macos")]
#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    fn AXIsProcessTrusted() -> c_uchar;
    fn CGEventTapEnable(tap: CFMachPortRef, enable: bool);
}

#[derive(Clone, Serialize)]
struct KeyPressPayload {
    key_id: String,
    precise: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PermissionStatusPayload {
    trusted: bool,
    can_record_global_keys: bool,
    required_permission: String,
}

#[derive(Clone, Serialize)]
struct TrayActionPayload {
    action: String,
}

#[derive(Clone, Serialize)]
struct ExternalProgressCandidate {
    source: String,
    progress: Value,
}

const LEGACY_BUNDLE_IDENTIFIERS: [&str; 2] =
    ["com.keyboardfarm.desktop", "com.keyaquarium.desktop"];
const PROGRESS_STORE_FILENAMES: [&str; 2] = ["key-aquarium.json", "keyboard-farm.json"];

/** 运行 Tauri 应用并注册托盘、菜单和键盘监听能力。 */
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            setup_tray(app.handle())?;
            start_macos_keyboard_listeners(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            keyboard_permission_status,
            open_keyboard_permission_settings,
            set_main_window_always_on_top,
            show_main_window,
            hide_main_window,
            open_status_panel,
            load_external_progress_candidates
        ])
        .run(tauri::generate_context!())
        .expect("启动 Key Aquarium 失败");
}

/** 查询键盘监听权限状态，非 macOS 默认返回可用。 */
#[tauri::command]
fn keyboard_permission_status() -> PermissionStatusPayload {
    current_keyboard_permission_status()
}

/** 打开 macOS 辅助功能权限设置页面，失败时回退到系统设置应用。 */
#[tauri::command]
fn open_keyboard_permission_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        open_macos_accessibility_settings()
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(())
    }
}

/** 设置主窗口是否始终显示在最前。 */
#[tauri::command]
fn set_main_window_always_on_top(app: AppHandle, enabled: bool) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "找不到主窗口".to_string())?;
    window
        .set_always_on_top(enabled)
        .map_err(|error| error.to_string())
}

/** 显示主窗口并把焦点交还给应用。 */
#[tauri::command]
fn show_main_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "找不到主窗口".to_string())?;
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}

/** 隐藏主窗口但保留托盘入口。 */
#[tauri::command]
fn hide_main_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "找不到主窗口".to_string())?;
    window.hide().map_err(|error| error.to_string())
}

/** 通过事件通知前端打开状态面板。 */
#[tauri::command]
fn open_status_panel(app: AppHandle) -> Result<(), String> {
    app.emit(
        "status-panel-requested",
        TrayActionPayload {
            action: "open".to_string(),
        },
    )
    .map_err(|error| error.to_string())
}

/** 读取历史 bundle id 数据目录，返回可迁移的进度候选。 */
#[tauri::command]
fn load_external_progress_candidates(app: AppHandle) -> Vec<ExternalProgressCandidate> {
    let app_data_dir = match app.path().app_data_dir() {
        Ok(path) => path,
        Err(_) => return Vec::new(),
    };
    let Some(application_support_dir) = app_data_dir.parent() else {
        return Vec::new();
    };

    let mut candidates = Vec::new();

    for bundle_identifier in LEGACY_BUNDLE_IDENTIFIERS {
        let legacy_data_dir = application_support_dir.join(bundle_identifier);

        for file_name in PROGRESS_STORE_FILENAMES {
            let path = legacy_data_dir.join(file_name);

            if path.starts_with(&app_data_dir) {
                continue;
            }

            if let Some(progress) = read_progress_candidate(&path) {
                candidates.push(ExternalProgressCandidate {
                    source: format!("{bundle_identifier}/{file_name}"),
                    progress,
                });
            }
        }
    }

    candidates
}

/** 从 Tauri Store 文件中提取 progress 字段，异常文件直接忽略。 */
fn read_progress_candidate(path: &Path) -> Option<Value> {
    let store_content = fs::read_to_string(path).ok()?;
    let store_value = serde_json::from_str::<Value>(&store_content).ok()?;
    let progress = store_value
        .get("progress")
        .cloned()
        .unwrap_or_else(|| store_value.clone());

    is_version_one_progress(&progress).then_some(progress)
}

/** 判断 JSON 是否是当前版本的进度存档。 */
fn is_version_one_progress(progress: &Value) -> bool {
    progress
        .get("version")
        .and_then(Value::as_u64)
        .is_some_and(|version| version == 1)
}

/** 创建状态栏托盘图标和菜单项。 */
fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
    let hide_item = MenuItem::with_id(app, "hide", "隐藏窗口", true, None::<&str>)?;
    let status_item = MenuItem::with_id(app, "status", "打开状态面板", true, None::<&str>)?;
    let always_on_top_item = MenuItem::with_id(
        app,
        "always_on_top",
        "切换始终显示在最前",
        true,
        None::<&str>,
    )?;
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(
        app,
        &[
            &show_item,
            &hide_item,
            &status_item,
            &always_on_top_item,
            &separator,
            &quit_item,
        ],
    )?;

    TrayIconBuilder::with_id("key-aquarium")
        .tooltip("Key Aquarium")
        .icon(create_tray_icon())
        .icon_as_template(true)
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(move |app, event| {
            handle_tray_menu(app, event.id().as_ref());
        })
        .build(app)?;

    Ok(())
}

/** 处理状态栏菜单点击事件。 */
fn handle_tray_menu(app: &AppHandle, item_id: &str) {
    match item_id {
        "show" => {
            let _ = show_main_window(app.clone());
        }
        "hide" => {
            let _ = hide_main_window(app.clone());
        }
        "status" => {
            let _ = show_main_window(app.clone());
            let _ = open_status_panel(app.clone());
        }
        "always_on_top" => {
            let _ = app.emit(
                "tray-toggle-always-on-top",
                TrayActionPayload {
                    action: "toggle".to_string(),
                },
            );
        }
        "quit" => app.exit(0),
        _ => {}
    }
}

/** 创建小鱼缸轮廓模板托盘图标，macOS 会按菜单栏主题自动着色。 */
fn create_tray_icon() -> Image<'static> {
    let size = 32_u32;
    let mut rgba = vec![0_u8; (size * size * 4) as usize];
    let mut paint_rect = |left: u32, top: u32, width: u32, height: u32| {
        for y in top..top + height {
            for x in left..left + width {
                let index = ((y * size + x) * 4) as usize;
                rgba[index..index + 4].copy_from_slice(&[255, 255, 255, 255]);
            }
        }
    };

    // 鱼缸外框和底座保持粗像素块，并尽量吃满 32px 画布的安全区域。
    paint_rect(6, 4, 20, 2);
    paint_rect(4, 6, 2, 16);
    paint_rect(26, 6, 2, 16);
    paint_rect(6, 22, 20, 2);
    paint_rect(8, 24, 16, 2);
    paint_rect(10, 26, 12, 2);

    // 缸内只保留一条小鱼和一个气泡，避免菜单栏里细节糊成一团。
    paint_rect(8, 8, 2, 2);
    paint_rect(12, 12, 9, 2);
    paint_rect(10, 14, 14, 3);
    paint_rect(12, 18, 9, 2);
    paint_rect(22, 12, 2, 2);
    paint_rect(24, 10, 2, 2);
    paint_rect(24, 20, 2, 2);

    Image::new_owned(rgba, size, size)
}

/** 启动 macOS 键盘监听，event tap 负责后台，AppKit local 负责聚焦兜底。 */
#[cfg(target_os = "macos")]
fn start_macos_keyboard_listeners(app: AppHandle) {
    start_keyboard_event_tap_listener(app.clone());
    start_appkit_local_keyboard_monitor(app);
}

/** 非 macOS 环境不启动系统级键盘监听。 */
#[cfg(not(target_os = "macos"))]
fn start_macos_keyboard_listeners(_app: AppHandle) {}

/** 启动 KeyFarm 同类的 CGEventTap 后台监听线程，失败后定时重试。 */
#[cfg(target_os = "macos")]
fn start_keyboard_event_tap_listener(app: AppHandle) {
    if KEYBOARD_LISTENER_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }

    std::thread::spawn(move || loop {
        if run_keyboard_event_tap_listener(app.clone()).is_err() {
            KEYBOARD_EVENT_TAP_READY.store(false, Ordering::SeqCst);
            KEYBOARD_EVENT_TAP_PORT.store(0, Ordering::SeqCst);
            emit_keyboard_permission(&app);
            std::thread::sleep(KEYBOARD_EVENT_TAP_RETRY_INTERVAL);
        }
    });
}

/** 安装 HID 层 listen-only event tap，并把它挂到当前线程 run loop。 */
#[cfg(target_os = "macos")]
fn run_keyboard_event_tap_listener(app: AppHandle) -> Result<(), ()> {
    let (key_sender, key_receiver) = std::sync::mpsc::channel::<KeyboardEventMessage>();
    let emit_app = app.clone();
    std::thread::spawn(move || {
        for message in key_receiver {
            handle_event_tap_keyboard_event(&emit_app, message);
        }
    });

    let event_tap = CGEventTap::new(
        CGEventTapLocation::HID,
        CGEventTapPlacement::HeadInsertEventTap,
        CGEventTapOptions::ListenOnly,
        vec![CGEventType::KeyDown, CGEventType::KeyUp],
        move |_proxy, event_type, event| {
            handle_event_tap_callback(&key_sender, event_type, event);
            CallbackResult::Keep
        },
    )?;
    let loop_source = event_tap
        .mach_port()
        .create_runloop_source(0)
        .map_err(|_| ())?;

    KEYBOARD_EVENT_TAP_PORT.store(
        event_tap.mach_port().as_concrete_TypeRef() as usize,
        Ordering::SeqCst,
    );
    KEYBOARD_EVENT_TAP_READY.store(true, Ordering::SeqCst);
    emit_keyboard_permission(&app);

    CFRunLoop::get_current().add_source(&loop_source, unsafe { kCFRunLoopCommonModes });
    event_tap.enable();
    CFRunLoop::run_current();

    KEYBOARD_EVENT_TAP_READY.store(false, Ordering::SeqCst);
    KEYBOARD_EVENT_TAP_PORT.store(0, Ordering::SeqCst);
    Err(())
}

/** 安装 AppKit 本地键盘监听，用于捕获应用窗口聚焦时发给本应用的键盘事件。 */
#[cfg(target_os = "macos")]
fn start_appkit_local_keyboard_monitor(app: AppHandle) {
    if KEYBOARD_LOCAL_MONITOR_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }

    let block = block2::RcBlock::new(move |event: NonNull<NSEvent>| -> *mut NSEvent {
        let keyboard_event = unsafe { event.as_ref() };
        let raw_keycode = keyboard_event.keyCode();
        let is_key_down = keyboard_event.r#type() == NSEventType::KeyDown;

        handle_appkit_keyboard_event(&app, KEYBOARD_SOURCE_LOCAL, raw_keycode, is_key_down);
        event.as_ptr()
    });
    let monitor = unsafe {
        NSEvent::addLocalMonitorForEventsMatchingMask_handler(
            NSEventMask::KeyDown.union(NSEventMask::KeyUp),
            &block,
        )
    };

    if let Some(monitor) = monitor {
        // AppKit 返回的 monitor token 和 block 都需要保留到进程结束，否则本地监听会被释放。
        std::mem::forget(monitor);
        std::mem::forget(block);
    }
}

/** 处理 event tap 回调，包含按键上报和 tap 被系统禁用后的恢复。 */
#[cfg(target_os = "macos")]
fn handle_event_tap_callback(
    key_sender: &std::sync::mpsc::Sender<KeyboardEventMessage>,
    event_type: CGEventType,
    event: &CGEvent,
) {
    if matches!(
        event_type,
        CGEventType::TapDisabledByTimeout | CGEventType::TapDisabledByUserInput
    ) {
        reenable_keyboard_event_tap();
        return;
    }

    if !matches!(event_type, CGEventType::KeyDown | CGEventType::KeyUp) {
        return;
    }

    let raw_keycode = event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE);
    if !(0..=u16::MAX as i64).contains(&raw_keycode) {
        return;
    }

    let _ = key_sender.send(KeyboardEventMessage {
        raw_keycode: raw_keycode as u16,
        is_key_down: matches!(event_type, CGEventType::KeyDown),
    });
}

/** 重新启用被系统临时禁用的 event tap，避免监听因 timeout 永久停止。 */
#[cfg(target_os = "macos")]
fn reenable_keyboard_event_tap() {
    let tap_port = KEYBOARD_EVENT_TAP_PORT.load(Ordering::SeqCst) as CFMachPortRef;

    if tap_port.is_null() {
        return;
    }

    unsafe {
        CGEventTapEnable(tap_port, true);
    }
}

/** 处理 event tap 捕获到的后台键盘事件，并标记全局监听真实可用。 */
#[cfg(target_os = "macos")]
fn handle_event_tap_keyboard_event(app: &AppHandle, message: KeyboardEventMessage) {
    KEYBOARD_EVENT_TAP_READY.store(true, Ordering::SeqCst);
    KEYBOARD_LAST_GLOBAL_EVENT_MS.store(current_time_millis(), Ordering::SeqCst);
    emit_keyboard_permission(app);

    if !should_emit_keyboard_event(
        KEYBOARD_SOURCE_EVENT_TAP,
        message.raw_keycode,
        message.is_key_down,
    ) {
        return;
    }

    emit_keyboard_press(app, message.raw_keycode);
}

/** 处理 AppKit 键盘事件，统一去重后再发送给前端。 */
#[cfg(target_os = "macos")]
fn handle_appkit_keyboard_event(app: &AppHandle, source: u8, raw_keycode: u16, is_key_down: bool) {
    if !should_emit_keyboard_event(source, raw_keycode, is_key_down) {
        return;
    }

    emit_keyboard_press(app, raw_keycode);
}

/** 判断本次键盘事件是否应发送，同一个键松开前只允许一次 KeyDown 推进。 */
#[cfg(target_os = "macos")]
fn should_emit_keyboard_event(source: u8, raw_keycode: u16, is_key_down: bool) -> bool {
    if !sync_keyboard_pressed_state(raw_keycode, is_key_down) {
        return false;
    }

    if !is_key_down {
        return false;
    }

    let now = current_time_millis();
    let mut last_event = KEYBOARD_LAST_EVENT
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    let is_cross_source_duplicate = last_event.keycode == raw_keycode
        && last_event.source != KEYBOARD_SOURCE_NONE
        && last_event.source != source
        && now.saturating_sub(last_event.event_at_ms) <= KEYBOARD_DEDUPE_WINDOW_MS;

    if is_cross_source_duplicate {
        return false;
    }

    last_event.keycode = raw_keycode;
    last_event.source = source;
    last_event.event_at_ms = now;
    true
}

/** 同步物理按键按住集合，按住期间重复 KeyDown 不再重复上报。 */
#[cfg(target_os = "macos")]
fn sync_keyboard_pressed_state(raw_keycode: u16, is_key_down: bool) -> bool {
    let mut pressed_keys = KEYBOARD_PRESSED_KEYS
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());

    if is_key_down {
        return pressed_keys.insert(raw_keycode);
    }

    pressed_keys.remove(&raw_keycode);
    true
}

/** 发送精确键位事件，前端统一写入按键排行榜和水族箱进度。 */
#[cfg(target_os = "macos")]
fn emit_keyboard_press(app: &AppHandle, raw_keycode: u16) {
    if let Some(key_id) = map_keycode_to_id(raw_keycode) {
        let _ = app.emit(
            "keyboard-press",
            KeyPressPayload {
                key_id,
                precise: true,
            },
        );
    }
}

/** 读取当前 Unix 毫秒时间，系统时间异常时回退为 0。 */
#[cfg(target_os = "macos")]
fn current_time_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

/** 把 macOS 虚拟键码映射到 Web KeyboardEvent 风格的物理键位 ID。 */
#[cfg(target_os = "macos")]
fn map_keycode_to_id(keycode: u16) -> Option<String> {
    let key_id = match keycode {
        KeyCode::ANSI_A => "KeyA",
        KeyCode::ANSI_S => "KeyS",
        KeyCode::ANSI_D => "KeyD",
        KeyCode::ANSI_F => "KeyF",
        KeyCode::ANSI_H => "KeyH",
        KeyCode::ANSI_G => "KeyG",
        KeyCode::ANSI_Z => "KeyZ",
        KeyCode::ANSI_X => "KeyX",
        KeyCode::ANSI_C => "KeyC",
        KeyCode::ANSI_V => "KeyV",
        KeyCode::ANSI_B => "KeyB",
        KeyCode::ANSI_Q => "KeyQ",
        KeyCode::ANSI_W => "KeyW",
        KeyCode::ANSI_E => "KeyE",
        KeyCode::ANSI_R => "KeyR",
        KeyCode::ANSI_Y => "KeyY",
        KeyCode::ANSI_T => "KeyT",
        KeyCode::ANSI_1 => "Digit1",
        KeyCode::ANSI_2 => "Digit2",
        KeyCode::ANSI_3 => "Digit3",
        KeyCode::ANSI_4 => "Digit4",
        KeyCode::ANSI_6 => "Digit6",
        KeyCode::ANSI_5 => "Digit5",
        KeyCode::ANSI_EQUAL => "Equal",
        KeyCode::ANSI_9 => "Digit9",
        KeyCode::ANSI_7 => "Digit7",
        KeyCode::ANSI_MINUS => "Minus",
        KeyCode::ANSI_8 => "Digit8",
        KeyCode::ANSI_0 => "Digit0",
        KeyCode::ANSI_RIGHT_BRACKET => "BracketRight",
        KeyCode::ANSI_O => "KeyO",
        KeyCode::ANSI_U => "KeyU",
        KeyCode::ANSI_LEFT_BRACKET => "BracketLeft",
        KeyCode::ANSI_I => "KeyI",
        KeyCode::ANSI_P => "KeyP",
        KeyCode::ANSI_L => "KeyL",
        KeyCode::ANSI_J => "KeyJ",
        KeyCode::ANSI_QUOTE => "Quote",
        KeyCode::ANSI_K => "KeyK",
        KeyCode::ANSI_SEMICOLON => "Semicolon",
        KeyCode::ANSI_BACKSLASH => "Backslash",
        KeyCode::ANSI_COMMA => "Comma",
        KeyCode::ANSI_SLASH => "Slash",
        KeyCode::ANSI_N => "KeyN",
        KeyCode::ANSI_M => "KeyM",
        KeyCode::ANSI_PERIOD => "Period",
        KeyCode::ANSI_GRAVE => "Backquote",
        KeyCode::ANSI_KEYPAD_DECIMAL => "NumpadDecimal",
        KeyCode::ANSI_KEYPAD_MULTIPLY => "NumpadMultiply",
        KeyCode::ANSI_KEYPAD_PLUS => "NumpadAdd",
        KeyCode::ANSI_KEYPAD_CLEAR => "NumLock",
        KeyCode::ANSI_KEYPAD_DIVIDE => "NumpadDivide",
        KeyCode::ANSI_KEYPAD_ENTER => "NumpadEnter",
        KeyCode::ANSI_KEYPAD_MINUS => "NumpadSubtract",
        KeyCode::ANSI_KEYPAD_EQUAL => "NumpadEqual",
        KeyCode::ANSI_KEYPAD_0 => "Numpad0",
        KeyCode::ANSI_KEYPAD_1 => "Numpad1",
        KeyCode::ANSI_KEYPAD_2 => "Numpad2",
        KeyCode::ANSI_KEYPAD_3 => "Numpad3",
        KeyCode::ANSI_KEYPAD_4 => "Numpad4",
        KeyCode::ANSI_KEYPAD_5 => "Numpad5",
        KeyCode::ANSI_KEYPAD_6 => "Numpad6",
        KeyCode::ANSI_KEYPAD_7 => "Numpad7",
        KeyCode::ANSI_KEYPAD_8 => "Numpad8",
        KeyCode::ANSI_KEYPAD_9 => "Numpad9",
        KeyCode::RETURN => "Enter",
        KeyCode::TAB => "Tab",
        KeyCode::SPACE => "Space",
        KeyCode::DELETE => "Backspace",
        KeyCode::ESCAPE => "Escape",
        KeyCode::COMMAND => "MetaLeft",
        KeyCode::RIGHT_COMMAND => "MetaRight",
        KeyCode::SHIFT => "ShiftLeft",
        KeyCode::RIGHT_SHIFT => "ShiftRight",
        KeyCode::CAPS_LOCK => "CapsLock",
        KeyCode::OPTION => "AltLeft",
        KeyCode::RIGHT_OPTION => "AltRight",
        KeyCode::CONTROL => "ControlLeft",
        KeyCode::RIGHT_CONTROL => "ControlRight",
        KeyCode::FUNCTION => "Fn",
        KeyCode::F1 => "F1",
        KeyCode::F2 => "F2",
        KeyCode::F3 => "F3",
        KeyCode::F4 => "F4",
        KeyCode::F5 => "F5",
        KeyCode::F6 => "F6",
        KeyCode::F7 => "F7",
        KeyCode::F8 => "F8",
        KeyCode::F9 => "F9",
        KeyCode::F10 => "F10",
        KeyCode::F11 => "F11",
        KeyCode::F12 => "F12",
        KeyCode::F13 => "F13",
        KeyCode::F14 => "F14",
        KeyCode::F15 => "F15",
        KeyCode::F16 => "F16",
        KeyCode::F17 => "F17",
        KeyCode::F18 => "F18",
        KeyCode::F19 => "F19",
        KeyCode::F20 => "F20",
        KeyCode::HELP => "Insert",
        KeyCode::HOME => "Home",
        KeyCode::PAGE_UP => "PageUp",
        KeyCode::FORWARD_DELETE => "Delete",
        KeyCode::END => "End",
        KeyCode::PAGE_DOWN => "PageDown",
        KeyCode::LEFT_ARROW => "ArrowLeft",
        KeyCode::RIGHT_ARROW => "ArrowRight",
        KeyCode::DOWN_ARROW => "ArrowDown",
        KeyCode::UP_ARROW => "ArrowUp",
        _ => return None,
    };

    Some(key_id.to_string())
}

/** 生成当前键盘监听权限状态，前端使用系统授权状态决定是否展示辅助功能提示。 */
fn current_keyboard_permission_status() -> PermissionStatusPayload {
    #[cfg(target_os = "macos")]
    {
        let trusted = macos_accessibility_permission_trusted();
        let can_record_global_keys = macos_global_keyboard_listener_available();

        PermissionStatusPayload {
            trusted,
            can_record_global_keys,
            required_permission: "accessibility".to_string(),
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        PermissionStatusPayload {
            trusted: true,
            can_record_global_keys: true,
            required_permission: "accessibility".to_string(),
        }
    }
}

/** 查询 macOS 是否已授予当前应用辅助功能权限，用于避免新包启动时误弹授权提示。 */
#[cfg(target_os = "macos")]
fn macos_accessibility_permission_trusted() -> bool {
    unsafe { AXIsProcessTrusted() != 0 }
}

/** 判断全局键盘监听是否实际可用，避免仅有系统状态或旧授权时隐藏提示。 */
#[cfg(target_os = "macos")]
fn macos_global_keyboard_listener_available() -> bool {
    has_recent_global_keyboard_event() || KEYBOARD_EVENT_TAP_READY.load(Ordering::SeqCst)
}

/** 判断最近是否收到过全局键盘事件，用于处理系统权限状态短暂滞后的情况。 */
#[cfg(target_os = "macos")]
fn has_recent_global_keyboard_event() -> bool {
    let last_event_at = KEYBOARD_LAST_GLOBAL_EVENT_MS.load(Ordering::SeqCst);

    last_event_at > 0
        && current_time_millis().saturating_sub(last_event_at)
            <= KEYBOARD_GLOBAL_EVENT_TRUST_WINDOW_MS
}

/** 打开 macOS 辅助功能设置页，URL 失败时回退打开系统设置应用。 */
#[cfg(target_os = "macos")]
fn open_macos_accessibility_settings() -> Result<(), String> {
    let settings_url =
        "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";
    let status = std::process::Command::new("open")
        .arg(settings_url)
        .status()
        .map_err(|error| error.to_string())?;

    if status.success() {
        return Ok(());
    }

    let fallback_status = std::process::Command::new("open")
        .arg("/System/Applications/System Settings.app")
        .status()
        .map_err(|error| error.to_string())?;

    fallback_status
        .success()
        .then_some(())
        .ok_or_else(|| "无法打开系统设置".to_string())
}

/** 向前端广播键盘监听权限变化。 */
fn emit_keyboard_permission(app: &AppHandle) {
    let _ = app.emit(
        "keyboard-permission-changed",
        current_keyboard_permission_status(),
    );
}
