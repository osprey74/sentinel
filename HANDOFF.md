# HANDOFF.md — Sentinel

**最終更新**: 2026-05-19
**バージョン**: v1.1.0（リリース準備完了・タグプッシュ待ち）
**フェーズ**: Phase 1〜5 完了 + v1.0.6 ホットフィックス + v1.0.7 / v1.0.8 / v1.1.0 機能追加

> v1.0.5 は LibreHardwareMonitor との連携設計を当初の WMI から HTTP/JSON ベースに切り替えて完成（v0.9.6 で WMI Provider が UI から削除されたため）。詳細は下の Phase 5 セクションを参照。
> v1.0.6 は v1.0.5 でリグレッションした **CPU 使用率と CPU 周波数の表示バグ**のホットフィックス。
> v1.0.7 はカレンダーへの**日本祝日表示**と、設定パネルでの**透過率スライダー**追加。
> v1.0.8 は Self-Hosted ヘルスチェックがダウンした際の**経過時間表示**追加。
> v1.1.0 はメモ機能の永続化方式を WebView の `localStorage` から Rust 側のファイル I/O に変更し、再起動を跨いだ確実な保存を実現。

---

## v1.1.0 機能追加

### 内容

- **メモ永続化のバグ修正**: メモを編集・保存後にアプリを再起動すると編集前の内容に戻る問題を解消。Tauri v2 WebView の `localStorage` は環境によって再起動を跨いだ永続化が信頼できないため、Rust 側でファイル I/O する方式に切り替え
- メモは `~/.config/sentinel/memo.md`（Windows: `%APPDATA%\sentinel\memo.md`）に Markdown ファイルとして保存。ユーザーが任意のエディタで直接編集することも可能

### 実装方針

- Rust 側 (`config.rs`): `memo_path()` を追加し、`config_path()` と同じディレクトリに `memo.md` を配置
- `lib.rs`: `load_memo()` / `save_memo(content)` の Tauri コマンドを追加し、`invoke_handler` に登録
- フロントエンド (`MemoSection.tsx`): `localStorage` を撤去。マウント時に `invoke<string>("load_memo")` で読み込み、保存時に `invoke("save_memo", { content })` で書き込み

### 影響範囲

- 変更: `src-tauri/src/config.rs`, `src-tauri/src/lib.rs`, `src/components/MemoSection.tsx`
- 新規ファイル: なし
- **互換性注意**: v1.0.2 以降の `localStorage` に保存されていたメモは自動移行されない。v1.1.0 で初めて起動するとメモが空になるため、必要に応じて旧バージョンでメモを開いてコピーし、新バージョンで貼り直す

---

## v1.0.8 機能追加

### 内容

- **Self-Hosted ダウン時の経過時間表示**: ヘルスチェック対象が応答しなくなった場合、従来の `timeout` 表示から「最後に応答してから何秒経過したか」を秒単位で表示（例: `45s`）。1 秒刻みでカウントアップし、復旧時は通常の `123ms` 表示に戻る。一度も応答実績がない（起動直後から失敗継続）場合は従来通り `timeout`
- **NSIS インストーラに pre-install / pre-uninstall フック追加**: 上書き対象の DLL を握っているバックグラウンドプロセス（`Sentinel.exe`, `LibreHardwareMonitor.exe`）をインストール前に強制終了。これがないと、トレイに常駐したまま再インストールを走らせた際に `Aga.Controls.dll` などで `Error opening file for writing` が出る

### 実装方針

- Rust 側 (`services.rs`): `HealthResult` に `last_success_at: Option<u64>`（epoch ms）を追加。`poll_health` が `LastSuccessMap = Arc<Mutex<HashMap<String, u64>>>` を受け取り、ok/warn（has_response = true）時に現在時刻で更新、crit 時はそのまま据え置く
- `lib.rs`: ポーリングタスク用に `health_last_success_map` を生成し、長期保持。`set_health_targets` の即時再ポーリングはエフェメラル Map で済ませる（次サイクルで本流の Map に再収束）
- フロントエンド (`HealthCheck.tsx`): `useTicker(enabled)` フックで、ダウン中のターゲットがあるときだけ 1 秒間隔で再レンダリング。`latency === null && lastSuccessAt !== null` のときに `Math.floor((Date.now() - lastSuccessAt) / 1000)` を `Xs` 形式で表示
- インストーラフック: `src-tauri/installer.nsh` に `NSIS_HOOK_PREINSTALL` / `NSIS_HOOK_PREUNINSTALL` を定義し、`taskkill /F /T /IM` で両プロセスを終了 → 500ms スリープでハンドル解放を待つ。`tauri.conf.json` の `bundle.windows.nsis.installerHooks` から参照

### 影響範囲

- 変更: `src-tauri/src/services.rs`, `src-tauri/src/lib.rs`, `src/components/HealthCheck.tsx`, `src/types/index.ts`, `src-tauri/tauri.conf.json`
- 新規: `src-tauri/installer.nsh`
- バックエンド・フロント双方の `HealthResult` / `HealthTarget` に新フィールド追加（serde camelCase で `lastSuccessAt`）
- ダウン中ターゲットが無い時のみ 1 秒タイマーが停止するため、平常時の負荷は実質ゼロ
- フックは Windows ビルドのみに影響、macOS バンドルには無関係

---

## v1.0.7 機能追加

### 内容

- **日本の祝日表示**: ミニカレンダーが `holidays-jp.github.io/api/v1/date.json` から祝日辞書を取得し、祝日セルを `--sunday`（赤）で表示。ツールチップに祝日名、今日が祝日ならカレンダー下に祝日名も表示
- **透過率スライダー**: 設定パネルに Opacity セクション新設。Active（フォーカス時）と Dim（非アクティブ／クリックスルー時）を 10–100% 5%刻みで個別指定。従来ハードコードだった 1.0 / 0.35 を変更可能に

### 実装方針

- 祝日データは `useHolidays` フック（`src/hooks/useHolidays.ts`）で取得・`localStorage` にキャッシュ。年が変わるか30日以上経過した場合のみ再取得
- 透過率は `localStorage` の `sentinel-active-opacity` / `sentinel-dim-opacity` で永続化。`App.tsx` の widget-root opacity 計算に反映
- いずれもフロントエンド完結。Rust バックエンドは無変更

### 影響範囲

- 新規: `src/hooks/useHolidays.ts`
- 変更: `src/App.tsx`, `src/components/ClockCalendar.tsx`, `src/components/SettingsPanel.tsx`
- 機能リグレッションなし（既存ハードコード値が新規 localStorage キーのフォールバックとして使われるため、初回起動時の見た目は v1.0.6 と同じ）

---

## v1.0.6 ホットフィックス

### 背景

v1.0.5 の Phase 5 拡張で `sys.refresh_cpu_frequency()` を polling ループに追加した結果、CPU カードに 2 つのリグレッションが発生していた:

1. **CPU 使用率が常時 70〜100% 表示** — Task Manager の値（数 % 〜 20%）と大きく乖離
2. **CPU 周波数が基本速度（2.10 GHz）で固定** — Turbo Boost 後の現在速度（3.45 GHz など）が反映されない

### 原因

| 症状 | 根本原因 |
|------|---------|
| CPU 使用率が過大 | `refresh_cpu_usage()` と `refresh_cpu_frequency()` を連続で呼び出すと、sysinfo 0.32 の Windows 実装ではどちらも内部で `query.refresh()` (= `PdhCollectQueryData()`) を実行する。`\Processor(_Total)\% Idle Time` カウンタは**連続する 2 サンプル間隔**の平均値を返すため、μs オーダーで取られる 2 回目のサンプルでは idle ≒ 0% と計測され、「100 − idle ≒ 100%」が直前の正しい 5 秒平均値を上書きしていた |
| 周波数が固定 | sysinfo 0.32 の `CpusWrapper::get_frequencies()` は `got_cpu_frequency` フラグで一度しか実行されない。`refresh_cpu_frequency()` を毎ループ呼んでも、起動直後にキャプチャした基本速度をずっと表示し続ける |

### 修正内容

- `lib.rs` のポーリングループ: 2 つの refresh 呼び出しを `sys.refresh_cpu_specifics(CpuRefreshKind::new().with_cpu_usage().with_frequency())` の **1 回呼び出し**に統合
- `metrics.rs` に `cpu_current_freq_mhz()` を追加: `CallNtPowerInformation(ProcessorInformation, ...)` で `PROCESSOR_POWER_INFORMATION.CurrentMhz` を直接取得し、sysinfo のキャッシュをバイパス
- `Cargo.toml`: `windows` クレートに `Win32_System_Power` feature を追加

### 影響範囲

- 修正対象: `src-tauri/src/lib.rs`, `src-tauri/src/metrics.rs`, `src-tauri/Cargo.toml`
- 機能リグレッションなし（GPU/温度/NVMe SMART/LHM 連携はすべて Phase 5 のまま）
- 非 Windows ビルドへの影響なし（`cpu_current_freq_mhz()` は `cfg(not(windows))` で `None` を返し sysinfo の値にフォールバック）

---

## 次バージョン作業（未リリース）

### Phase 5: PC METRICS 拡張 — GPU・温度モニタリング

#### 取得項目の追加

| 項目 | 取得方法 | admin 必要？ | 備考 |
|------|---------|-------------|------|
| GPU 名・使用率・温度・VRAM | NVML（`nvml-wrapper`） | 不要 | NVIDIA のみ。GPU 不在時は表示せず |
| NVMe SSD 温度 | `IOCTL_STORAGE_QUERY_PROPERTY` 自前実装 | **不要** | LHM 起動状態に依存しない |
| CPU パッケージ温度 | LibreHardwareMonitor HTTP `/data.json`（127.0.0.1:8085） | LHM 側で必要 | "CPU Package" → "Tctl/Tdie" → "Core Average" → "Core Max" の優先順 |
| メモリ温度 | LibreHardwareMonitor HTTP `/data.json` | LHM 側で必要 | DDR5 等センサーありの場合のみ。DDR4 はハード側にセンサー無し |
| SATA SSD/HDD 温度 | LibreHardwareMonitor HTTP `/data.json` | LHM 側で必要 | NVMe IOCTL でカバーできない部分の補完 |

> **重要**: 当初は LHM の WMI namespace `ROOT\LibreHardwareMonitor` を使う設計だったが、**LHM v0.9.6 で WMI Provider オプションが UI から削除**されたため、HTTP/JSON ベースに切り替えた（`Options → Remote Web Server` を ON にする必要あり）。`wmi` クレートは依存から削除済み。

#### LibreHardwareMonitor 連携の二段構成

1. **HTTP クエリ**: LHM の Remote Web Server（`127.0.0.1:8085/data.json`）を blocking reqwest で取得し、JSON ツリーを再帰的に walk して `ImageURL` に "temperature" を含むノードを抽出。親ノードの `ImageURL` / `Text` で CPU・メモリ・ストレージに分類
2. **サイドカー方式**: LHM を Sentinel 同梱で配布し、Windows タスクスケジューラに `RL HIGHEST` で登録 → ログオン時に UAC 無しで自動昇格起動。設定パネルから 1 クリック（UAC 1 回）で有効化／解除。**ユーザー側追加作業**: LHM 初回起動時に Options → Remote Web Server をチェック ON する（永続化される）

#### 新規モジュール構成

| ファイル | 役割 |
|---------|------|
| `src-tauri/src/metrics.rs` | GPU（NVML）+ LHM HTTP `/data.json` 温度取得の統合エントリ。`tokio::task::spawn_blocking` で async ループから分離。`reqwest::blocking` で 2 秒タイムアウトの GET、JSON ツリーを再帰的に walk |
| `src-tauri/src/nvme.rs` | NVMe Health Information Log（Page 0x02）の自前リーダー。`-20℃〜150℃` サニティチェック付き |
| `src-tauri/src/lhm_sidecar.rs` | バンドル済み LHM の状態取得・スケジュールタスク登録/削除・即時起動。ShellExecuteEx + `runas` で UAC 昇格 |
| `scripts/setup-lhm.ps1` | GitHub Releases から最新 LHM portable をダウンロードし `src-tauri/resources/lhm/` に展開、MPL ライセンスも同梱 |
| `src-tauri/resources/lhm/` | LHM 配置先（バンドルリソース）。空でもビルド可（ステータス UI で「未バンドル」と表示） |

#### 新規 Tauri コマンド

| コマンド | 用途 |
|---------|------|
| `lhm_status` | バンドル有無 / タスク登録状態 / プロセス稼働状態を返す |
| `lhm_install_autostart` | スケジュールタスク登録（UAC）＋ LHM 即時起動 |
| `lhm_remove_autostart` | スケジュールタスク削除（UAC） |
| `lhm_launch_now` | LHM を即時昇格起動（UAC） |

#### `SystemMetrics`（`Rust` / `TypeScript`）拡張フィールド

- `gpu: GpuMetrics | null` — `{ name, usage, temp, memUsed, memTotal }`
- `cpuTemp: number | null` / `memTemp: number | null`
- `diskTemps: DiskTemp[]` — NVMe IOCTL + LHM の合算（UI は max を表示）
- `lhmAvailable: boolean` — LHM HTTP サーバ（`127.0.0.1:8085/data.json`）の到達可能性

#### UI 変更点

- **PcMetrics**: GPU カードを新設（使用率＋スパークライン＋VRAM ヒント＋温度）。各カードに温度を主値の右側に小さく併記。70℃ で warn、85℃ で crit に色変化
- **SettingsPanel**: 「Hardware Sensors」セクション刷新。`LhmPanel` で:
  - WMI 検出バッジ（クリック再取得）
  - Bundled binary / Auto-start task / Process の状態テーブル
  - Enable Auto-Start / Disable / Launch Now ボタン（busy 時 disable、未バンドル時グレーアウト）
  - LHM 未バンドル時は `pwsh ./scripts/setup-lhm.ps1` 実行を促す警告ボックス
  - MPL-2.0 ライセンス明記

#### 依存追加・変更

- `nvml-wrapper = "0.10"`（Windows のみ）— NVIDIA NVML
- `windows = "0.59"`（Windows のみ）— IOCTL（NVMe）+ ShellExecuteEx（昇格起動）+ CallNtPowerInformation（v1.0.6 で追加: 現在 CPU 周波数）。features: `Win32_Foundation`, `Win32_Security`, `Win32_Storage_FileSystem`, `Win32_System_IO`, `Win32_System_Ioctl`, `Win32_System_Power`, `Win32_System_Registry`, `Win32_System_Threading`, `Win32_UI_Shell`, `Win32_UI_WindowsAndMessaging`
- `reqwest` に `"blocking"` feature を追加（LHM HTTP 取得を `spawn_blocking` 内で行うため）
- ~~`wmi = "0.14"`~~ — 当初導入したが、LHM v0.9.6 で WMI Provider が削除されたため**削除済み**

#### v1.0.5 で完了

- [x] `pwsh scripts/setup-lhm.ps1` を GitHub Actions のワークフローに組み込み（Windows ジョブのみ）
- [x] バージョン番号 v1.0.5 確定 → `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` 更新 + `Cargo.lock` 再生成

#### v1.0.6 で完了

- [x] CPU 使用率の過大表示バグ修正（PDH サンプル間隔の問題）
- [x] CPU 周波数表示が基本速度で固定されるバグ修正（`CallNtPowerInformation` 直叩き）
- [x] バージョン番号 v1.0.6 確定 → `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` 更新 + `Cargo.lock` 再生成

#### v1.0.7 で完了

- [x] カレンダーに日本の祝日表示を追加（holidays-jp API + localStorage キャッシュ）
- [x] 設定パネルに透過率スライダー追加（Active / Dim それぞれ 10–100%）
- [x] バージョン番号 v1.0.7 確定 → `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` 更新 + `Cargo.lock` 再生成

#### v1.0.8 で完了

- [x] Self-Hosted ヘルスチェックのダウン時に最後の応答からの経過秒数を表示（`timeout` から `Xs` ベースへ）
- [x] NSIS インストーラ pre-install / pre-uninstall フックで `Sentinel.exe` / `LibreHardwareMonitor.exe` を強制終了（バンドル DLL ロックの解消）
- [x] バージョン番号 v1.0.8 確定 → `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` 更新 + `Cargo.lock` 再生成

#### v1.1.0 で完了

- [x] メモ機能の永続化方式を `localStorage` から Rust 側ファイル I/O へ変更（`~/.config/sentinel/memo.md`）
- [x] `load_memo` / `save_memo` Tauri コマンドを追加
- [x] `config.rs` に `memo_path()` を追加
- [x] バージョン番号 v1.1.0 確定 → `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` 更新 + `Cargo.lock` 再生成

#### v1.1.1 以降の候補

- [ ] **LHM `user.config` の pre-seed**: クリーンインストール直後の初回起動から「Start Minimized / Minimize To Tray / Minimize On Close / Remote Web Server → Run」が ON の状態にする。`%LOCALAPPDATA%\LibreHardwareMonitor\<assemblyHash>\<version>\user.config` の XML を Sentinel の Enable Auto-Start 実行時に書き込む方式が最有力。`<assemblyHash>` 部分の決定方法（`StrongName`/`Url` ベースの ApplicationSettings の hashing アルゴリズム）の調査が必要
- [ ] **LHM v0.9.6 のクラッシュ再発時の対策**: 現状は `%LOCALAPPDATA%\LibreHardwareMonitor` を一度クリアすれば落ち着くが、再発する環境があれば `setup-lhm.ps1` のデフォルトを v0.9.4 にピン留めする。Sentinel 側のパース（HTTP `data.json` 構造）は v0.9.4 でも互換のはず
- [ ] **LHM HTTP サーバのポート番号を Sentinel 設定で変更可能に**（現状 8085 ハードコード）
- [ ] About / クレジット表示に LHM の MPL-2.0 ライセンス表記を追加（現在は SettingsPanel フッターのみ）
- [ ] **sysinfo クレートを 0.38 系へアップデート検討**: 0.32 のまま運用しているが、Windows 周辺で挙動が変わっている可能性がある（特に CPU 使用率・周波数の取得 API）。アップデート時に v1.0.6 のワークアラウンドが不要になるか確認

#### v1.0.5 リリース時に観測されたトラブル（記録）

- **WiX `light.exe` failure**: 初回ビルドで MSI 生成に失敗。原因は LHM 同梱物の数（11 言語サブディレクトリ + PDB + XML）が多くファイル ID 衝突 / long-path 制約に触れたため。`setup-lhm.ps1` で PDB / XML / 言語サブディレクトリを strip して 80→30 ファイルに削減 → ビルド成功
- **LHM v0.9.6 クラッシュダイアログ**: バンドル LHM 初回起動時に `Aga.Controls.Tree.TreeNodeAdv.get_NextNode()` で `ArgumentOutOfRangeException`。ダイアログで Continue 押下後は LHM が動作するため機能影響はなし。`%LOCALAPPDATA%\LibreHardwareMonitor` を削除して再起動するとクラッシュは消えた。同所のキャッシュ初期化が原因と推測

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
