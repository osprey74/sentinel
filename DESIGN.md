# Sentinel — Desktop Status Monitor Widget

## 概要

**Sentinel** は、デスクトップに常駐するコンパクトなステータスモニターウィジェット。
PCメトリクス・外部サービスステータス・自作サービスのヘルスチェック・天気予報を
一画面でリアルタイムに表示する。

## 設計原則

1. **Glanceable** — 視線を送るだけで全体のヘルスが分かる
2. **Lightweight** — メモリ使用量 50MB 以下を目標
3. **Unobtrusive** — デスクトップに溶け込むフレームレスUI
4. **Configurable** — TOML設定ファイルで監視対象を自由に定義

## 技術スタック

| レイヤー | 技術 | 補足 |
|---------|------|------|
| フレームワーク | Tauri v2 | フレームレス + always-on-top |
| フロントエンド | React + TypeScript | Vite ベース |
| バックエンド | Rust | sysinfo, reqwest, tokio |
| 設定 | TOML (serde) | ~/.config/sentinel/config.toml |
| スタイリング | CSS Modules or Tailwind | ダークテーマ基調 |

## アーキテクチャ

```
┌──────────────────────────────────────────────┐
│  React Frontend (WebView)                    │
│  ┌────────┐ ┌────────┐ ┌──────┐ ┌────────┐  │
│  │Weather │ │PC Met. │ │Serv. │ │Health  │  │
│  │Forecast│ │Section │ │Sect. │ │Section │  │
│  └────────┘ └────────┘ └──────┘ └────────┘  │
│       ▲          ▲         ▲         ▲       │
│       └──────────┼─────────┼─────────┘       │
│              Tauri Event API                 │
├──────────────────────────────────────────────┤
│  Rust Backend                                │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐      │
│  │ sysinfo  │ │ reqwest  │ │  tokio  │      │
│  │ (metrics)│ │(http/api)│ │ (timer) │      │
│  └──────────┘ └──────────┘ └─────────┘      │
│                                              │
│  HTTP targets:                               │
│  - Open-Meteo API (天気予報, APIキー不要)       │
│  - Statuspage API (GitHub/Cloudflare/Fly.io) │
│  - Custom health endpoints                   │
└──────────────────────────────────────────────┘
```

### データフロー

1. Rust 側で `tokio::interval` により定期ポーリング（5〜60秒間隔、カテゴリ別に設定可能）
2. 各データソースから情報取得:
   - **PC メトリクス**: `sysinfo` クレートで CPU/メモリ/ディスク/ネットワーク
   - **外部サービス**: 各サービスの Status API に HTTP GET（Fly.io 含む）
   - **ヘルスチェック**: 設定されたエンドポイントに HTTP GET、レスポンスコード＋レイテンシ計測
   - **天気予報**: Open-Meteo API に HTTP GET（APIキー不要、4日分の日次予報）
3. 取得データを `tauri::Emitter` でフロントエンドにイベント push
4. React 側は `listen()` でイベント受信し、状態更新 → 再レンダリング

## ウィンドウ設定

### WindowConfig (tauri.conf.json)

```json
{
  "label": "sentinel-main",
  "title": "Sentinel",
  "width": 320,
  "height": 640,
  "decorations": false,
  "alwaysOnTop": true,
  "transparent": true,
  "resizable": false,
  "maximizable": false,
  "minimizable": false,
  "closable": true,
  "skipTaskbar": true,
  "focus": true
}
```

- `decorations: false` → OSのタイトルバーを非表示
- `transparent: true` → 背景透過でデスクトップに溶け込む
- `alwaysOnTop: true` → 常時最前面表示
- `maximizable / minimizable: false` → 最大化・最小化を無効化
- `skipTaskbar: true` → タスクバー/Dock に表示しない
- ドラッグ移動は `data-tauri-drag-region` 属性で実現

### ウィンドウ挙動仕様

#### 常時最前面（Always-on-Top）

ウィジェットは常に他のウィンドウの上に表示される。
ゲームや全画面アプリに対しては自動的にオーバーレイされない（OS標準挙動）。

#### フォーカス連動の透過率切替

| 状態 | 透過率 | 挙動 |
|------|--------|------|
| フォーカスあり | 0%（完全不透明） | クリック操作、スクロール等すべて可能 |
| フォーカスなし | 60〜70%透過 | デスクトップが透けて見える |
| 遷移 | 0.3秒のトランジション | ふわっと切り替わる |

**実装方式（フロントエンド CSS opacity 方式を採用）:**

Rust 側でプラットフォーム固有 API を使う方式もあるが、
CSS opacity 方式がクロスプラットフォームで安定するためこちらを推奨。

```typescript
// React: フォーカス状態の監視
import { getCurrentWindow } from "@tauri-apps/api/window";

const [focused, setFocused] = useState(true);

useEffect(() => {
  const unlisten = getCurrentWindow().onFocusChanged(({ payload }) => {
    setFocused(payload);
  });
  return () => { unlisten.then(fn => fn()); };
}, []);

// ルートコンテナに適用
// style={{ opacity: focused ? 1 : 0.35, transition: 'opacity 0.3s ease' }}
```

> **macOS 注意**: macOS Sonoma 以降で transparent ウィンドウのフォーカス切替時に
> 描画グリッチが報告されている (tauri-apps/tauri#8255)。
> `macOSPrivateApi: true` を有効にし、`EffectsBuilder` でウィンドウエフェクトを
> 設定すると回避できるケースがある。要実機検証。

#### 閉じるボタン → システムトレイ格納

ウィンドウの閉じる操作（カスタムヘッダーの ✕ ボタン、または Alt+F4 等）では
アプリケーションを終了せず、ウィンドウを非表示にしてシステムトレイに格納する。

```rust
// src-tauri/src/lib.rs
app.on_window_event(|window, event| {
    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        // ウィンドウを非表示にし、閉じるのをキャンセル
        window.hide().unwrap();
        api.prevent_close();
    }
});
```

#### システムトレイ

トレイアイコンを常時表示し、以下の操作をサポートする:

| 操作 | 挙動 |
|------|------|
| 左クリック | ウィンドウを表示＋フォーカス |
| 右クリック | コンテキストメニュー表示 |

**コンテキストメニュー項目:**

- **Sentinel v{version}** — バージョン表示（グレーアウト、操作不可）
- ── (セパレーター) ──
- **Show** — ウィンドウを表示＋フォーカス
- **Settings** — 設定パネルを開いた状態で表示
- ── (セパレーター) ──
- **Restart** — アプリケーションを再起動
- **Quit** — アプリケーションを完全終了

```rust
// src-tauri/src/lib.rs — トレイアイコンの初期化
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::menu::{MenuBuilder, MenuItemBuilder};

let version = app.package_info().version.to_string();
let version_label = MenuItemBuilder::new(format!("Sentinel v{}", version))
    .id("version")
    .enabled(false)
    .build(app)?;
let show = MenuItemBuilder::new("Show").id("show").build(app)?;
let settings = MenuItemBuilder::new("Settings").id("settings").build(app)?;
let restart = MenuItemBuilder::new("Restart").id("restart").build(app)?;
let quit = MenuItemBuilder::new("Quit").id("quit").build(app)?;
let menu = MenuBuilder::new(app)
    .item(&version_label)
    .separator()
    .item(&show)
    .item(&settings)
    .separator()
    .item(&restart)
    .item(&quit)
    .build()?;

TrayIconBuilder::new()
    .icon(app.default_window_icon().unwrap().clone())
    .tooltip("Sentinel — Status Monitor")
    .menu(&menu)
    .on_menu_event(|app, event| {
        match event.id().as_ref() {
            "show" => {
                if let Some(win) = app.get_webview_window("sentinel-main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
            "settings" => {
                if let Some(win) = app.get_webview_window("sentinel-main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                    let _ = win.emit("open-settings", ());
                }
            }
            "restart" => {
                app.restart();
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        }
    })
    .on_tray_icon_event(|tray, event| {
        // 左クリックのみでウィンドウ表示（右クリックメニューと競合しないよう）
        if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
        } = event
        {
            if let Some(win) =
                tray.app_handle().get_webview_window("sentinel-main")
            {
                let _ = win.show();
                let _ = win.set_focus();
            }
        }
    })
    .build(app)?;
```

#### ウィンドウ状態遷移図

```
                    blur                       
  ┌──────────┐  ──────────→  ┌──────────────┐ 
  │ Focused  │               │  Unfocused   │ 
  │ opacity  │  ←──────────  │  opacity     │ 
  │ = 1.0    │    focus      │  = 0.35      │ 
  └──────────┘               └──────────────┘ 
       │                           │          
       │  close button             │  close   
       └───────────┐   ┌──────────┘          
                    ▼   ▼                     
             ┌──────────────┐                 
             │  CloseReq.   │                 
             │ prevent_close│                 
             └──────┬───────┘                 
                    ▼                         
             ┌──────────────┐    tray click   
             │ System Tray  │ ──────────────→ Focused
             │  (hidden)    │                 
             └──────────────┘                 
                    │                         
                    │  Quit menu              
                    ▼                         
               app.exit(0)                    
```

#### 必要な Capabilities (権限)

`src-tauri/capabilities/main.json` に以下を追加:

```json
{
  "permissions": [
    "core:window:allow-show",
    "core:window:allow-hide",
    "core:window:allow-set-focus",
    "core:window:allow-close",
    "core:window:allow-start-dragging",
    "core:window:allow-set-always-on-top",
    "core:tray:default"
  ]
}
```

## UI デザイン

### テーマ

- **基調**: ダークテーマ（半透明ブラックガラス）
- **アクセント**: ティールグリーン (#1D9E75) をプライマリカラーに
- **フォント**: BIZ UDゴシック（日本語）/ JetBrains Mono（数値）
- **角丸**: 12px（ウィジェット外枠）、8px（内部カード）
- **背景**: `rgba(15, 15, 20, 0.85)` + `backdrop-filter: blur(20px)`

### ステータスカラー

| ステータス | カラー | 用途 |
|-----------|--------|------|
| Healthy / Operational | `#1D9E75` (Teal 400) | 正常稼働 |
| Warning / Degraded | `#EF9F27` (Amber 400) | 部分的な問題 |
| Critical / Down | `#E24B4A` (Red 400) | 障害・ダウン |
| Unknown / Checking | `#888780` (Gray 400) | 確認中 |

### レイアウト構成

```
┌──────────────────────────────┐
│ ··· Sentinel      ⚙  5s ago │  ← ヘッダー（ドラッグ領域 + 設定ボタン）
├──────────────────────────────┤
│  ┌─────────┐ ┌────────────┐ │
│  │  ◷      │ │ Apr 2026   │ │  ← アナログ時計 + カレンダー
│  │ analog  │ │ Su Mo .. Sa│ │     時計: 数字なし、点のみ
│  │  clock  │ │  1  2 ..  5│ │     カレンダー: 日=赤, 土=青
│  └─────────┘ │ .. [16] .. │ │
│              └────────────┘ │
├──────────────────────────────┤
│  WEATHER — Tokyo             │
│  ☀ 24° │ ⛅ 22° │ 🌧 18° │ ☁ 20° │  ← 今日〜3日後の4日分
│  Today   Thu     Fri     Sat │
├──────────────────────────────┤
│  PC METRICS                  │
│  ┌──────┐ ┌──────┐          │
│  │ CPU  │ │ MEM  │          │  ← 2x2 メトリクスグリッド
│  │ 23%  │ │ 68%  │          │
│  └──────┘ └──────┘          │
│  ┌──────┐ ┌──────┐          │
│  │ DISK │ │ NET  │          │
│  │412GB │ │↓12Mb │          │
│  └──────┘ └──────┘          │
├──────────────────────────────┤
│  SERVICES                    │
│  ● AWS          operational  │  ← ステータスドット + ラベル
│  ● GitHub       operational  │
│  ● Fly.io       operational  │
│  ● Bluesky      operational  │  ← Bluesky 追加
│  ◐ Cloudflare   degraded     │
│  ● Anthropic    operational  │
├──────────────────────────────┤
│  SELF-HOSTED                 │
│  ● bsaf-jma-bot     32ms    │  ← レイテンシ表示
│  ✕ kazahana-api    timeout   │
└──────────────────────────────┘
```

### アナログ時計仕様

- 文字盤: 数字なし
- 5分単位: 大きな白い点（12個）
- 1分単位: 小さな点（48個）
- 時針: 白、太め（3px）
- 分針: 白、やや細め（2px）
- 秒針: 赤（#E24B4A）、細い（0.8px）
- 中心点: 赤い小さなドット
- SVGで描画、1秒ごとに更新

### カレンダー仕様

- 当月の月間カレンダー
- 日曜日: 赤（#E24B4A）
- 土曜日: 青（#85B7EB）
- 平日: 白（半透明）
- 当日: ティール背景でハイライト
- フォント: JetBrains Mono 9px

### インタラクション

- **ヘッダードラッグ**: ウィジェット移動
- **⚙ボタン**: サービス設定パネルの表示/非表示
- **右クリック**: コンテキストメニュー（設定/終了）
- **サービス行クリック**: ステータスページをデフォルトブラウザで開く
- **ホイールスクロール**: コンテンツが溢れた場合のスクロール
- **ダブルクリック（ヘッダー）**: コンパクト/フル表示切替

### サービス登録方法

ユーザーが監視対象サービスを追加・削除する方法は **3つ** 用意する:

1. **ウィジェット内設定UI** — ⚙ボタンからサービス名 + Status API URLを入力して追加。
   削除も同パネルから可能。変更は即座に config.toml に永続化される。

2. **TOML設定ファイル直接編集** — `~/.config/sentinel/config.toml` の
   `[[services.targets]]` セクションを手動で追加・編集。
   ファイル変更は `notify` クレートでホットリロード対応。

3. **プリセット** — よく使われるサービス（AWS/GitHub/Fly.io/Bluesky/Cloudflare/Anthropic）は
   Statuspage API URLをプリセットとして内蔵。名前を選ぶだけで追加可能。

### コンパクトモード

ダブルクリックで切り替え可能な縮小表示:

```
┌──────────────────────────────┐
│ ● Sentinel  ●●◐●  ●✕       │
└──────────────────────────────┘
```

ステータスドットのみの1行表示。全サービスが正常なら緑1色で安心感を提供。

## 設定ファイル

```toml
# ~/.config/sentinel/config.toml

[general]
poll_interval_seconds = 10
theme = "dark"
position = { x = 50, y = 50 }
compact = false

[weather]
enabled = true
latitude = 35.6762     # 東京
longitude = 139.6503
location_name = "Tokyo"
forecast_days = 4
poll_interval_seconds = 1800  # 30分間隔（天気は頻繁に変わらない）
# Open-Meteo API: https://api.open-meteo.com/v1/forecast
# APIキー不要、CC BY 4.0 ライセンス

[metrics]
enabled = true
poll_interval_seconds = 5

[services]
poll_interval_seconds = 60

[[services.targets]]
name = "AWS"
url = "https://health.aws.amazon.com/health/status"
type = "status_page"

[[services.targets]]
name = "GitHub"
url = "https://www.githubstatus.com/api/v2/status.json"
type = "status_page"
json_path = "status.indicator"

[[services.targets]]
name = "Fly.io"
url = "https://status.flyio.net/api/v2/status.json"
type = "status_page"
json_path = "status.indicator"
status_url = "https://status.flyio.net"

[[services.targets]]
name = "Bluesky"
url = "https://bluesky.statuspage.io/api/v2/status.json"
type = "status_page"
json_path = "status.indicator"
status_url = "https://bluesky.statuspage.io"

[[services.targets]]
name = "Cloudflare"
url = "https://www.cloudflarestatus.com/api/v2/status.json"
type = "status_page"
json_path = "status.indicator"

[[services.targets]]
name = "Anthropic API"
url = "https://status.anthropic.com/api/v2/status.json"
type = "status_page"
json_path = "status.indicator"

[health]
poll_interval_seconds = 30
timeout_ms = 5000

[[health.targets]]
name = "bsaf-jma-bot"
url = "https://bsaf-jma-bot.fly.dev/health"
method = "GET"
expected_status = 200

[[health.targets]]
name = "kazahana-api"
url = "https://kazahana-api.example.com/health"
method = "GET"
expected_status = 200
```

## Rust クレート依存

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon", "image-png"] }
sysinfo = "0.32"
reqwest = { version = "0.12", features = ["json"] }
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
toml = "0.8"
chrono = "0.4"
notify = "7"                                    # config.toml ホットリロード
```

> **補足**: `tauri.conf.json` の `app` セクションに以下を追加すること:
> ```json
> { "app": { "macOSPrivateApi": true } }
> ```
> macOS で透過ウィンドウのフォーカス切替グリッチを回避するために必要。

## 外部API リファレンス

### Open-Meteo 天気予報 API

APIキー不要、無料（非商用利用）。CC BY 4.0 ライセンス。

```
GET https://api.open-meteo.com/v1/forecast
  ?latitude=35.6762
  &longitude=139.6503
  &daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max
  &timezone=Asia/Tokyo
  &forecast_days=4
```

レスポンス例:
```json
{
  "daily": {
    "time": ["2026-04-16", "2026-04-17", "2026-04-18", "2026-04-19"],
    "weather_code": [0, 2, 61, 3],
    "temperature_2m_max": [24.1, 22.5, 18.3, 20.7],
    "temperature_2m_min": [14.2, 13.8, 12.1, 13.5],
    "precipitation_probability_max": [0, 20, 85, 10]
  }
}
```

#### WMO Weather Code マッピング（主要コード）

| Code | 天気 | アイコン |
|------|------|---------|
| 0 | 快晴 | ☀️ |
| 1-3 | 晴れ〜曇り | ⛅️ / ☁️ |
| 45, 48 | 霧 | 🌫 |
| 51-55 | 霧雨 | 🌦 |
| 61-65 | 雨 | 🌧 |
| 71-75 | 雪 | ❄️ |
| 80-82 | にわか雨 | 🌧 |
| 95, 96, 99 | 雷雨 | ⛈️ |

> **実装上の注意**: `☀`(U+2600), `☁`(U+2601), `⛅`(U+26C5), `⛈`(U+26C8), `❄`(U+2744) は
> Unicode仕様上テキスト表示がデフォルトのため、黒いグリフで描画される。
> **Variation Selector-16 (U+FE0F)** を末尾に付与することで絵文字（カラー）表示を強制できる。
> 本番実装では **SVGアイコン**（例: Lucide / Weather Icons）に置き換えることで
> プラットフォーム間の表示差異を完全に排除する。

出典: https://open-meteo.com/en/docs

### Fly.io ステータス API

Atlassian Statuspage 標準 API。

```
GET https://status.flyio.net/api/v2/status.json
```

レスポンス例:
```json
{
  "status": {
    "indicator": "none",
    "description": "All Systems Operational"
  }
}
```

indicator 値マッピング: `none` → operational, `minor` → degraded, `major` / `critical` → down

出典: https://status.flyio.net/

### Bluesky ステータス API

Atlassian Statuspage 標準 API（Fly.io と同じパターン）。

```
GET https://bluesky.statuspage.io/api/v2/status.json
```

indicator 値マッピングは Fly.io と同一。

出典: https://bluesky.statuspage.io/

## フェーズ計画

### Phase 1: MVP（1〜2週間）
- [x] DESIGN.md 作成
- [x] Tauri v2 プロジェクト初期化
- [x] フレームレスウィンドウ + ドラッグ移動
- [x] ダークテーマ基本UI
- [x] システムトレイアイコン + メニュー（バージョン表示・再起動・終了）
- [x] 閉じるボタン → トレイ格納
- [x] フォーカス連動透過率
- [ ] アナログ時計 + カレンダー（ClockCalendar）
- [ ] PC メトリクス表示（sysinfo）
- [ ] 天気予報セクション（Open-Meteo API）

### Phase 2: サービス監視（1週間）
- [ ] 外部サービスステータス取得（Fly.io 含む）
- [ ] ヘルスチェック機能
- [ ] TOML 設定ファイル読み込み
- [ ] ステータスカラー表示

### Phase 3: UX改善（1週間）
- [ ] コンパクトモード
- [ ] 右クリックメニュー
- [ ] ウィジェット位置記憶

### Phase 4: 通知・拡張（将来）
- [ ] ステータス変化時のデスクトップ通知
- [ ] 履歴グラフ（ミニスパークライン）
- [ ] プラグインシステム（カスタム監視対象）
- [ ] ライトテーマ対応

## HANDOFF 用メモ

- プロジェクト名: `sentinel`
- リポジトリ: `osprey74/sentinel`（予定）
- CLAUDE.md / HANDOFF.md は Phase 1 着手時に作成
- Pencil.dev でのデザイン清書は本 DESIGN.md + React プロトタイプを参照
