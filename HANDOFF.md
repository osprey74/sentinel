# HANDOFF.md — Sentinel

**最終更新**: 2026-04-17
**フェーズ**: Phase 2 完了 → Phase 3 UX改善 準備中

---

## 現在の状態

### Phase 1: MVP（完了）

- [x] DESIGN.md 作成（全仕様を網羅）
- [x] Reactプロトタイプ作成（Claude.ai上で動作確認済み）
- [x] Tauri v2 プロジェクトスキャフォールド
- [x] CLAUDE.md 作成
- [x] GitHub リポジトリセットアップ（description, topics 設定済み）
- [x] 初回ビルド確認（`npm install` → `npm run tauri dev`）
- [x] トレイアイコン生成・配置（src-tauri/icons/）
- [x] capabilities/main.json 修正（tray:default → core:tray:default）
- [x] ヘッダー ✕ 閉じるボタン（ホバー赤ハイライト、クリックでトレイ格納）
- [x] トレイメニュー（Sentinel v{version} / Show / Settings / Restart / Quit）
- [x] トレイ左クリックのみウィンドウ表示（右クリック競合修正）
- [x] ClockCalendar（SVGアナログ時計 + 月間カレンダー）
- [x] WeatherForecast（Open-Meteo API 連携）
- [x] WeatherIcon（5種類のSVGスタイル: filled/line/neon/minimal/duotone）
- [x] PcMetrics（CPU/MEM/DISK/NET、C:ドライブのみ、色分け閾値）
- [x] Rust: sysinfo ポーリング（5秒間隔）
- [x] Rust: Open-Meteo ポーリング（30分間隔）
- [x] SettingsPanel: 天気アイコンスタイル切替（localStorage 永続化）
- [x] フォーカス透過率確認（Windows）
- [x] 透明ウィンドウ角丸クリップ（clip-path）
- [x] WebView2 ボーダー除去（shadow:false + theme:Dark）

### Phase 2: サービス監視（完了）

- [x] TOML 設定ファイル（~/.config/sentinel/config.toml）読み込み + デフォルト生成
- [x] Rust モジュール分割（config.rs / services.rs）
- [x] Statuspage API 共通パーサー（GitHub/Fly.io/Bluesky/Cloudflare/Anthropic）
- [x] ヘルスチェック（HTTP GET + レイテンシ計測 + タイムアウト）
- [x] ServiceStatus コンポーネント（ステータスドット + ラベル + クリックで URL 遷移）
- [x] HealthCheck コンポーネント（ステータスドット + レイテンシ表示）
- [x] useServiceStatus / useHealthStatus hooks（App レベルでリフト済み）
- [x] 設定ファイルからポーリング間隔・天気座標を読み込み

---

## 次のアクション（Phase 3: UX改善）

### 1. コンパクトモード本実装

現在の `CompactMode` コンポーネントはスタブ。DESIGN.md のコンパクトモード仕様に沿って実装:
- ステータスドットのみの1行表示
- ダブルクリックでフル表示に戻る

### 2. ウィンドウ位置記憶

- ウィジェットの位置を `config.toml` の `[general].position` に保存
- 起動時に復元

### 3. 右クリックコンテキストメニュー

- ウィジェット本体の右クリックメニュー（設定/終了）

---

## アーキテクチャ

### Rust モジュール構成

| ファイル | 役割 |
|---------|------|
| `lib.rs` | Tauri setup, トレイ, ポーリングタスク spawn |
| `config.rs` | TOML 設定ファイルの読み込み・デフォルト生成・型定義 |
| `services.rs` | Statuspage API パーサー, ヘルスチェック実行 |

### イベントフロー

```
Rust (tokio::spawn)          →  Tauri Event  →  React (listen)
─────────────────────────────────────────────────────────────
sysinfo polling (5s)         →  system-metrics  →  useSystemMetrics
Open-Meteo polling (30min)   →  weather-update  →  useWeather
Statuspage polling (60s)     →  service-status  →  useServiceStatus
Health check polling (30s)   →  health-status   →  useHealthStatus
```

### 設定ファイル

パス: `~/.config/sentinel/config.toml`（初回起動時にデフォルト生成）

主要セクション:
- `[weather]` — 座標、地名、ポーリング間隔
- `[metrics]` — ポーリング間隔
- `[services]` — ポーリング間隔 + `[[services.targets]]` でサービス定義
- `[health]` — タイムアウト、ポーリング間隔 + `[[health.targets]]` でエンドポイント定義

---

## 既知の注意点

1. **macOS Sonoma 透過グリッチ**: transparent ウィンドウのフォーカス切替で描画乱れ
   (tauri-apps/tauri#8255)。CSS opacity 方式で回避済み。要実機検証。

2. **天気アイコン**: Unicode 絵文字の描画不統一問題を SVG アイコンに置き換えて解決済み。
   5スタイル（filled/line/neon/minimal/duotone）を設定画面から切替可能。

3. **Statuspage API 共通パーサー**: GitHub, Fly.io, Bluesky, Cloudflare, Anthropic は
   Atlassian Statuspage ベース。`json_path` で任意のフィールドを指定可能。

4. **config.toml ホットリロード**: 未実装。`notify` クレートは依存に含まれているが、
   現在は起動時のみ読み込み。Phase 4 で対応予定。

---

## 参照ファイル

| ファイル | 内容 |
|---------|------|
| `DESIGN.md` | UI仕様、アーキテクチャ、API仕様、設定スキーマ、フェーズ計画 |
| `CLAUDE.md` | コーディング規約、制約、イベント一覧 |
| `src/types/index.ts` | 全型定義 + WMO コードマッピング + ステータスカラー |
| `src-tauri/src/config.rs` | 設定ファイル型定義 + デフォルト値 |
| `src-tauri/src/services.rs` | Statuspage API パーサー + ヘルスチェック |
