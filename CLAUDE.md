# CLAUDE.md — Sentinel

## プロジェクト概要

**Sentinel** はデスクトップに常駐するコンパクトなステータスモニターウィジェット。
Tauri v2 + React + TypeScript + Rust で構築する。

## 技術スタック

- **フレームワーク**: Tauri v2（フレームレス + always-on-top + システムトレイ）
- **フロントエンド**: React 19 + TypeScript + Vite
- **バックエンド**: Rust（sysinfo, reqwest, tokio, serde）
- **設定**: TOML（~/.config/sentinel/config.toml）
- **フォント**: BIZ UDゴシック（UI） / JetBrains Mono（数値・コード）

## ディレクトリ構造

```
sentinel/
├── src/                    # React フロントエンド
│   ├── components/         # UIコンポーネント
│   ├── hooks/              # カスタムフック（useFocus, useSystemMetrics 等）
│   ├── types/              # TypeScript 型定義
│   ├── styles/             # CSS
│   ├── App.tsx             # メインアプリコンポーネント
│   └── main.tsx            # エントリポイント
├── src-tauri/              # Rust バックエンド
│   ├── src/
│   │   ├── lib.rs          # Tauri setup, トレイ, コマンド
│   │   └── main.rs         # エントリポイント
│   ├── capabilities/       # 権限設定
│   ├── Cargo.toml
│   └── tauri.conf.json
├── CLAUDE.md               # このファイル
├── DESIGN.md               # UI/UX仕様、アーキテクチャ、API仕様
├── HANDOFF.md              # タスク引き継ぎドキュメント
└── package.json
```

## コーディング規約

### TypeScript / React

- 関数コンポーネント + hooks のみ使用（class component 禁止）
- 型定義は `src/types/index.ts` に集約
- CSS-in-JS（inline style）を基本とし、共通スタイルのみ `global.css` に定義
- コンポーネントは 1 ファイル 1 エクスポート
- `any` 型の使用禁止 — 必ず型を明示する

### Rust

- `unwrap()` は開発時のみ許可 — 本番コードでは `?` 演算子でエラー伝播
- Tauri コマンドは `lib.rs` に定義
- バックグラウンドタスク（ポーリング）は `tokio::spawn` で管理
- 設定ファイルの変更は `notify` クレートで監視しホットリロード

### 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| React コンポーネント | PascalCase | `ServiceStatus.tsx` |
| hooks | camelCase, use接頭辞 | `useFocus.ts` |
| Rust 関数 | snake_case | `get_metrics` |
| Tauri イベント | kebab-case | `system-metrics` |
| CSS 変数 | kebab-case, --接頭辞 | `--color-ok` |

## ウィンドウ挙動ルール

- 常時 `alwaysOnTop: true`
- フォーカスあり → opacity 1.0 / フォーカスなし → opacity 0.35（0.3s transition）
- 閉じるボタン → `window.hide()` + `api.prevent_close()` でトレイ格納
- トレイクリック → `window.show()` + `window.set_focus()` で復帰
- 最大化・最小化は無効（maximizable: false, minimizable: false）

## 外部 API

| サービス | エンドポイント | 認証 |
|---------|--------------|------|
| Open-Meteo | `api.open-meteo.com/v1/forecast` | 不要 |
| GitHub Status | `githubstatus.com/api/v2/status.json` | 不要 |
| Fly.io Status | `status.flyio.net/api/v2/status.json` | 不要 |
| Bluesky Status | `bluesky.statuspage.io/api/v2/status.json` | 不要 |
| Cloudflare Status | `cloudflarestatus.com/api/v2/status.json` | 不要 |
| Anthropic Status | `status.anthropic.com/api/v2/status.json` | 不要 |
| AWS Health | `health.aws.amazon.com/health/status` | 不要 |

## Tauri イベント一覧

| イベント名 | 方向 | ペイロード |
|-----------|------|-----------|
| `system-metrics` | Rust → JS | `SystemMetrics` |
| `service-status` | Rust → JS | `ServiceTarget[]` |
| `health-status` | Rust → JS | `HealthTarget[]` |
| `weather-update` | Rust → JS | `DayForecast[]` |
| `open-settings` | Rust → JS | `()` (トレイメニューから) |

## 制約事項

- **terraform apply / destroy は絶対に実行しない**（Polaris Solutions 共通ルール）
- コード生成は自動、インフラ適用は手動
- アイコンファイル（src-tauri/icons/）は手動で配置する必要あり
- macOS では `macOSPrivateApi: true` が必須（透過ウィンドウのため）

## 参照ドキュメント

- `DESIGN.md` — UI仕様、レイアウト、カラー、設定ファイルスキーマ、API仕様、フェーズ計画
- `HANDOFF.md` — 現在のタスクと引き継ぎ状態
- Tauri v2 ドキュメント: https://v2.tauri.app/
- Open-Meteo API: https://open-meteo.com/en/docs
