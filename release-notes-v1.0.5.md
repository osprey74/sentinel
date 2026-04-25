## What's New / 新機能・変更点

### English

#### New Features

- **GPU monitoring (NVIDIA)** — A new GPU card is shown in PC METRICS when an NVIDIA driver is present. Reads usage, temperature, and VRAM directly via NVML — no admin privileges required. The card includes a sparkline of recent GPU usage.
- **Per-component temperatures**
  - **GPU temperature** — from NVML (no admin)
  - **NVMe SSD temperature** — read from the drive's SMART/Health Information Log via `IOCTL_STORAGE_QUERY_PROPERTY` (no admin, no third-party driver)
  - **CPU and (DDR5) memory temperatures** — via optional LibreHardwareMonitor integration (see below)
  - Temperatures are color-coded (warn at 70 °C, crit at 85 °C) and shown next to each card's main value.
- **CPU clock speed** — current frequency shown as a hint on the CPU card (e.g. `4.20 GHz`).
- **Memory capacity** — used / total shown as a hint on the MEM card (e.g. `19G / 32GB`).
- **Per-disk temperature on the DISK card** — clicking through drive letters now displays each drive's actual temperature, mapped to its physical drive via `IOCTL_VOLUME_GET_VOLUME_DISK_EXTENTS` and matched to NVMe SMART (NVMe path) or LHM model name (SATA path). The card also shows the drive model in its hint area.
- **LibreHardwareMonitor sidecar integration** — Sentinel can bundle LHM (MPL-2.0) and register a Windows scheduled task with `RL HIGHEST` so LHM auto-starts elevated at logon. New "Hardware Sensors" section in Settings:
  - Status indicators: bundled binary / auto-start task / process running / HTTP server detected
  - **Enable Auto-Start** button — registers the task (one UAC prompt) and launches LHM immediately
  - **Disable** button — removes the task
  - **Launch Now** button — start LHM elevated for the current session
  - Sentinel reads CPU / memory / SATA-disk temperatures from LHM's `127.0.0.1:8085/data.json` (Options → Remote Web Server → Run must be enabled in LHM).
- **Setup script** — `scripts/setup-lhm.ps1` downloads the latest LHM portable archive into `src-tauri/resources/lhm/` and bundles the MPL-2.0 license alongside.

#### Notes

- DDR4 modules do not expose temperature sensors, so memory temperature only appears on DDR5 systems regardless of LHM state.
- All new sensor paths fail gracefully: missing NVIDIA driver, no NVMe drive, or LHM not running simply hide the relevant fields without errors.

---

### 日本語

#### 新機能

- **GPU モニタリング（NVIDIA）** — NVIDIA ドライバがある環境で PC METRICS に GPU カードを追加表示します。使用率・温度・VRAM を NVML から直接取得（管理者権限不要）。最近の使用率推移をスパークラインで表示します。
- **各種温度表示**
  - **GPU 温度** — NVML 経由（管理者権限不要）
  - **NVMe SSD 温度** — NVMe SMART/Health Information Log を `IOCTL_STORAGE_QUERY_PROPERTY` で読み取り（管理者権限不要・サードパーティドライバ不要）
  - **CPU 温度・(DDR5) メモリ温度** — LibreHardwareMonitor 連携（オプション、後述）
  - 温度は 70 °C で警告色、85 °C で危険色に変化し、各カードの主値の右に小さく併記されます。
- **CPU クロック周波数** — CPU カード右上に現在の周波数を表示（例: `4.20 GHz`）。
- **メモリ容量** — MEM カード右上に使用量／総容量を表示（例: `19G / 32GB`）。
- **DISK カードのドライブ別温度** — ドライブレター切替時に、そのドライブの物理ディスク温度が表示されるようになりました。`IOCTL_VOLUME_GET_VOLUME_DISK_EXTENTS` で物理ドライブ番号を取得し、NVMe SMART（物理ドライブ番号一致）または LHM のモデル名（部分一致）で温度を紐付けています。ヒント領域にはドライブのモデル名も表示されます。
- **LibreHardwareMonitor サイドカー統合** — Sentinel に LHM（MPL-2.0）を同梱し、Windows のタスクスケジューラに `RL HIGHEST` で登録してログオン時に管理者権限で自動起動できます。設定パネルに「Hardware Sensors」セクションを新設:
  - ステータス表示: バンドル有無 / 自動起動タスク登録状態 / プロセス稼働状態 / HTTP サーバー検出
  - **Enable Auto-Start** ボタン — タスク登録（UAC 1 回）＋ LHM 即時起動
  - **Disable** ボタン — タスク削除
  - **Launch Now** ボタン — その場で LHM を昇格起動
  - Sentinel は LHM の `127.0.0.1:8085/data.json` から CPU・メモリ・SATA ディスクの温度を取得します（LHM 側で Options → Remote Web Server → Run を有効化する必要があります）。
- **セットアップスクリプト** — `scripts/setup-lhm.ps1` で最新の LHM portable アーカイブを `src-tauri/resources/lhm/` にダウンロード・展開し、MPL-2.0 ライセンス全文も同梱します。

#### 注意事項

- DDR4 メモリは温度センサーを持たないため、LHM の有無にかかわらずメモリ温度は DDR5 環境でのみ表示されます。
- 新しいセンサー経路はすべて段階的縮退します: NVIDIA ドライバ不在、NVMe ドライブ不在、LHM 未起動などの状態でもエラーにはならず、該当項目が単に表示されないだけです。
