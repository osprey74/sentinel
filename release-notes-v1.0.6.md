## What's New / 新機能・変更点

### English

#### Bug Fixes

- **CPU usage display was severely inflated.** The polling loop called `sys.refresh_cpu_usage()` and `sys.refresh_cpu_frequency()` back-to-back, which under sysinfo 0.32 on Windows causes two PDH (`\Processor(_Total)\% Idle Time`) samples to be taken microseconds apart. The second sample's tiny window made the idle counter return ~0% idle, and the resulting "100 − idle" value (~100%) overwrote the correct 5-second-window reading. CPU usage frequently appeared at 70–100% even on a near-idle system.

  Fixed by collapsing both refreshes into a single `sys.refresh_cpu_specifics(CpuRefreshKind::new().with_cpu_usage().with_frequency())` call, which produces only one PDH sample per tick.

- **CPU clock display was stuck at the base frequency.** sysinfo 0.32 caches CPU frequency on the first read on Windows and never refreshes it, so the CPU card kept showing the base clock (e.g. `2.10 GHz` on i7-12700) instead of the live Turbo Boost speed.

  Fixed by querying `CallNtPowerInformation(ProcessorInformation, ...)` directly via the `windows` crate each tick, bypassing sysinfo's frequency cache. The CPU card now shows the actual current frequency (e.g. `3.45 GHz`).

---

### 日本語

#### バグ修正

- **CPU 使用率が著しく過大表示されていた問題を修正。** ポーリングループ内で `sys.refresh_cpu_usage()` と `sys.refresh_cpu_frequency()` を連続で呼び出していたため、sysinfo 0.32 の Windows 実装ではどちらも内部で PDH カウンタ `\Processor(_Total)\% Idle Time` のサンプルを取得し、2 回のサンプル取得間隔がマイクロ秒オーダーとなっていました。極小ウィンドウでは idle 時間がほぼ 0% と計測されるため、「100 − idle」の値（≒100%）が直前に得られた正しい 5 秒平均値を上書きし、ほぼアイドル状態のシステムでも CPU 使用率が 70〜100% と表示されていました。

  両方の refresh を `sys.refresh_cpu_specifics(CpuRefreshKind::new().with_cpu_usage().with_frequency())` の単一呼び出しに統合し、1 ティックあたり PDH サンプル取得を 1 回にすることで修正しました。

- **CPU クロック表示が基本速度のまま固定されていた問題を修正。** sysinfo 0.32 は Windows 上で CPU 周波数を初回取得時にキャッシュし、以降は更新しません。このため CPU カードには Turbo Boost 込みの現在クロックではなく基本速度（i7-12700 なら `2.10 GHz`）が表示され続けていました。

  `windows` クレートの `CallNtPowerInformation(ProcessorInformation, ...)` を毎ティック直接呼び出して sysinfo のキャッシュをバイパスするように修正しました。CPU カードに現在の動作周波数（例: `3.45 GHz`）が表示されるようになりました。
