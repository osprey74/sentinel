## What's New / 新機能・変更点

### English

**Sentinel v1.0.1** — First public release of Sentinel, a compact desktop status monitor widget.

#### Features
- **Clock & Calendar** — SVG analog clock with second hand + monthly calendar (today highlighted, color-coded weekends)
- **Weather Forecast** — 4-day forecast via Open-Meteo API with precipitation probability, city search via Geocoding API
- **5 Weather Icon Styles** — Filled, Line, Neon, Minimal, Duotone (switchable in settings)
- **PC Metrics** — CPU, Memory, Disk (multi-drive toggle), Network with sparkline history graphs
- **Service Monitoring** — Statuspage API parser for GitHub, Fly.io, Bluesky, Cloudflare, Anthropic
- **Health Checks** — HTTP endpoint monitoring with latency measurement and timeout detection
- **Desktop Notifications** — Alerts on service/health status changes (down, degraded, recovered)
- **Settings Panel** — Weather location search, icon style, theme, autostart, service/health target management (add/remove/reorder)
- **Dark & Light Themes** — Full theme support with persistent preference
- **System Tray** — Show/Settings/Lock Position/Restart/Quit with version display
- **Right-click Context Menu** — Settings, Lock Position (synced with tray), Hide to Tray, Quit
- **Lock Position** — Disable window dragging while keeping all click interactions functional
- **Window Auto-resize** — Height adjusts to content dynamically
- **Window Position Memory** — Saved to config.toml, restored on startup
- **Autostart** — Optional launch on system login
- **Config Hot Reload** — File watcher on ~/.config/sentinel/config.toml

#### System Requirements
- Windows 10/11 (x64)
- macOS 12+ (Apple Silicon + Intel universal binary)

---

### 日本語

**Sentinel v1.0.1** — デスクトップ常駐型ステータスモニターウィジェット Sentinel の初回公開リリースです。

#### 機能一覧
- **時計・カレンダー** — SVG アナログ時計（秒針付き）+ 月間カレンダー（当日ハイライト、土日色分け）
- **天気予報** — Open-Meteo API による4日分予報、降水確率表示、都市名検索（Geocoding API）
- **5種類の天気アイコン** — Filled / Line / Neon / Minimal / Duotone（設定画面で切替）
- **PC メトリクス** — CPU / メモリ / ディスク（複数ドライブ切替）/ ネットワーク、スパークライングラフ付き
- **サービス監視** — GitHub / Fly.io / Bluesky / Cloudflare / Anthropic の Statuspage API パーサー
- **ヘルスチェック** — HTTP エンドポイント監視（レイテンシ計測、タイムアウト検知）
- **デスクトップ通知** — サービス/ヘルスチェックのステータス変化時にアラート通知
- **設定パネル** — 天気地点検索、アイコンスタイル、テーマ、自動起動、サービス/ヘルスチェック管理（追加・削除・並べ替え）
- **ダーク/ライトテーマ** — 完全なテーマ対応、設定は永続化
- **システムトレイ** — Show / Settings / Lock Position / Restart / Quit、バージョン表示
- **右クリックメニュー** — Settings / Lock Position（トレイと同期）/ Hide to Tray / Quit
- **位置ロック** — ドラッグ移動を無効化しつつ、クリック操作は全て使用可能
- **ウィンドウ自動伸縮** — コンテンツに応じて高さが動的に変化
- **ウィンドウ位置記憶** — config.toml に保存、起動時に復元
- **自動起動** — システムログイン時の起動オプション
- **設定ホットリロード** — ~/.config/sentinel/config.toml のファイル監視

#### 動作環境
- Windows 10/11 (x64)
- macOS 12 以降（Apple Silicon + Intel ユニバーサルバイナリ）
