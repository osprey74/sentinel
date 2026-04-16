# HANDOFF.md — Sentinel

**最終更新**: 2026-04-16
**フェーズ**: Phase 1 MVP — スキャフォールド完了、実装開始前

---

## 現在の状態

### 完了済み

- [x] DESIGN.md 作成（596行、全仕様を網羅）
- [x] Reactプロトタイプ作成（Claude.ai上で動作確認済み）
- [x] Tauri v2 プロジェクトスキャフォールド
  - [x] package.json / tsconfig.json / vite.config.ts
  - [x] tauri.conf.json（フレームレス、always-on-top、トレイ格納設定）
  - [x] Cargo.toml（全依存クレート定義済み）
  - [x] lib.rs（トレイアイコン、close-to-tray、コマンドスタブ）
  - [x] capabilities/main.json（必要な権限設定）
  - [x] App.tsx + コンポーネントスタブ（Header 以外は TODO）
  - [x] useFocus / useSystemMetrics hooks
  - [x] 型定義（types/index.ts）
  - [x] global.css（ダークテーマ変数、基本レイアウト）
- [x] CLAUDE.md 作成

### 未完了（Phase 1 タスク）

- [ ] `npm install` → `npm run tauri dev` で初回ビルド確認
- [ ] トレイアイコン用画像の配置（src-tauri/icons/）
- [ ] ClockCalendar コンポーネント実装（アナログ時計 + 月間カレンダー）
- [ ] WeatherForecast コンポーネント実装（Open-Meteo API 連携）
- [ ] PcMetrics コンポーネント実装（sysinfo 連携）
- [ ] Rust バックエンド: sysinfo ポーリング + イベント emit
- [ ] Rust バックエンド: Open-Meteo API 呼び出し
- [ ] フォーカス透過率の動作確認（macOS / Windows）

---

## 次のアクション（優先順）

### 1. 初回ビルド確認

```bash
cd sentinel
npm install
npm run tauri dev
```

ビルドが通り、空のウィジェットウィンドウが表示されることを確認。
トレイアイコンが表示され、閉じるとトレイに格納されることを確認。

### 2. アナログ時計 + カレンダー（ClockCalendar）

DESIGN.md「アナログ時計仕様」「カレンダー仕様」セクション参照。

**時計仕様**:
- SVGで描画、文字盤に数字なし
- 5分単位: 大きな白い点（12個）
- 1分単位: 小さな点（48個）
- 時針: 白、太め（3px）、分針: 白（2px）、秒針: 赤（#E24B4A、0.8px）
- 1秒ごとに更新

**カレンダー仕様**:
- 当月の月間カレンダー
- 日曜 = 赤（#E24B4A）、土曜 = 青（#85B7EB）
- 当日 = ティール背景ハイライト
- JetBrains Mono 9px

Reactプロトタイプ（sentinel-prototype.jsx）の AnalogClock / MiniCalendar コンポーネントをそのまま TypeScript に移植可能。

### 3. PC メトリクス（PcMetrics + Rust バックエンド）

**Rust 側**:
```rust
// lib.rs に追加: sysinfo でメトリクス取得、tokio::interval で定期 emit
use sysinfo::System;
use std::sync::Mutex;
use tauri::async_runtime;

// setup() 内で spawn
let app_handle = app.handle().clone();
async_runtime::spawn(async move {
    let mut sys = System::new_all();
    let mut interval = tokio::time::interval(
        tokio::time::Duration::from_secs(5)
    );
    loop {
        interval.tick().await;
        sys.refresh_all();
        let metrics = SystemMetrics {
            cpu: sys.global_cpu_usage(),
            mem: sys.used_memory() as f32 / sys.total_memory() as f32 * 100.0,
            // ... disk, network
        };
        let _ = app_handle.emit("system-metrics", &metrics);
    }
});
```

**React 側**: `useSystemMetrics` hook は既に `listen("system-metrics")` を実装済み。

### 4. 天気予報（WeatherForecast + Rust バックエンド）

**Rust 側**: reqwest で Open-Meteo API を呼び出し。

```
GET https://api.open-meteo.com/v1/forecast
  ?latitude=35.6762&longitude=139.6503
  &daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max
  &timezone=Asia/Tokyo&forecast_days=4
```

30分間隔でポーリング。レスポンスを `DayForecast[]` に変換して emit。

---

## Phase 2 以降のタスク（参考）

### Phase 2: サービス監視
- Statuspage API パーサー（GitHub/Fly.io/Bluesky/Cloudflare/Anthropic 共通）
- AWS Health API パーサー（形式が異なる）
- ヘルスチェック（reqwest で HTTP GET → レスポンスコード + レイテンシ）
- TOML 設定ファイル読み込み + notify ホットリロード
- ServiceStatus / HealthCheck コンポーネント実装
- SettingsPanel 実装（サービス追加・削除 UI）

### Phase 3: UX 改善
- CompactMode 本実装（ステータスドット集約表示）
- 右クリックコンテキストメニュー
- ウィンドウ位置記憶（config.toml に保存）
- 透過率の実機検証（macOS Sonoma グリッチ対応）

### Phase 4: 通知・拡張
- ステータス変化時のデスクトップ通知
- 履歴グラフ（ミニスパークライン）
- プラグインシステム
- ライトテーマ

---

## 既知の注意点

1. **macOS Sonoma 透過グリッチ**: transparent ウィンドウのフォーカス切替で描画が乱れる
   報告あり (tauri-apps/tauri#8255)。CSS opacity 方式で回避予定だが要実機検証。

2. **Unicode 絵文字 VS-16**: 天気アイコン ☀☁⛅⛈❄ は `\uFE0F` を付与して
   絵文字表示を強制。本番は SVG アイコン（Lucide 等）への置き換えを推奨。

3. **esbuild macOS 問題**: macOS 15 + bun 環境で esbuild がSIGKILLされる既知問題。
   `~/` パスのネイティブバイナリが VS Code/Claude Code の子プロセスとして
   実行されると発生。fix: `/opt/homebrew/bin/` にコピー + シェルラッパースクリプト。

4. **Statuspage API 共通パーサー**: GitHub, Fly.io, Bluesky, Cloudflare, Anthropic は
   すべて Atlassian Statuspage ベース。`status.indicator` フィールドで
   `none` → ok, `minor` → warn, `major`/`critical` → crit にマッピング。
   AWS のみ異なるフォーマットなので個別パーサーが必要。

---

## 参照ファイル

| ファイル | 内容 |
|---------|------|
| `DESIGN.md` | UI仕様、アーキテクチャ、API仕様、設定スキーマ、フェーズ計画 |
| `CLAUDE.md` | コーディング規約、制約、イベント一覧 |
| `src/types/index.ts` | 全型定義 + WMO コードマッピング + ステータスカラー |
| `sentinel-prototype.jsx` | 動作するReactプロトタイプ（Claude.ai Artifacts） |
