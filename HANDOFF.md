# HANDOFF.md — Sentinel

**最終更新**: 2026-04-17
**バージョン**: v1.0.0
**フェーズ**: Phase 1〜4 完了、v1.0.0 リリース

---

## 現在の状態

### v1.0.0 で実装済みの機能

#### Phase 1: MVP
- Tauri v2 プロジェクト（フレームレス + always-on-top + システムトレイ）
- ヘッダー（ドラッグ移動、設定ボタン、閉じるボタン → トレイ格納）
- トレイメニュー（Sentinel v{version} / Show / Settings / Restart / Quit）
- ClockCalendar（SVG アナログ時計 + 月間カレンダー）
- WeatherForecast（Open-Meteo API 4日分予報 + 降水確率 + 地点検索）
- WeatherIcon（5種類のSVGスタイル: filled/line/neon/minimal/duotone）
- PcMetrics（CPU/MEM/DISK/NET、全ドライブ切替、スパークライン）
- フォーカス連動透過率（CSS opacity 方式）

#### Phase 2: サービス監視
- TOML 設定ファイル（~/.config/sentinel/config.toml）自動生成・読み込み
- Statuspage API 共通パーサー（GitHub/Fly.io/Bluesky/Cloudflare/Anthropic）
- ヘルスチェック（HTTP GET + レイテンシ計測 + タイムアウト）
- ServiceStatus / HealthCheck コンポーネント（ステータスドット + クリック遷移）

#### Phase 3: UX改善
- 設定パネル（天気地点検索、アイコンスタイル、テーマ、自動起動、サービス/ヘルスチェック編集）
- サービス/ヘルスチェック設定 UI（追加・削除・ドラッグ並べ替え）
- ウィンドウ高さ自動伸縮（ResizeObserver）
- ウィンドウ位置記憶（config.toml 保存・起動時復元）
- 右クリックコンテキストメニュー（Settings / Hide to Tray / Quit）

#### Phase 4: 通知・拡張
- デスクトップ通知（サービス/ヘルスチェックのステータス変化時）
- config.toml ホットリロード（notify クレート）
- CPU/MEM スパークライングラフ（直近30サンプル）
- ライトテーマ / ダークテーマ切替
- PC 起動時の自動起動オプション（tauri-plugin-autostart）

### 保留・見送り
- コンパクトモード（Windows 透明ウィンドウでクリック/ドラッグ競合のため保留）
- プラグインシステム（設定 UI で十分なため見送り）

---

## アーキテクチャ

### Rust モジュール構成

| ファイル | 役割 |
|---------|------|
| `lib.rs` | Tauri setup, トレイ, ポーリングタスク spawn, コマンド |
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
notify file watcher          →  config-reloaded →  (frontend reload)
```

### 設定ファイル

パス: `~/.config/sentinel/config.toml`（初回起動時にデフォルト生成）

---

## 参照ファイル

| ファイル | 内容 |
|---------|------|
| `DESIGN.md` | UI仕様、アーキテクチャ、API仕様、設定スキーマ、フェーズ計画 |
| `CLAUDE.md` | コーディング規約、制約、イベント一覧 |
| `src/types/index.ts` | 全型定義 + WMO コードマッピング + ステータスカラー |
| `src-tauri/src/config.rs` | 設定ファイル型定義 + デフォルト値 |
| `src-tauri/src/services.rs` | Statuspage API パーサー + ヘルスチェック |
