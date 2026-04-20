## What's New / 新機能・変更点

### English

#### New Features
- **Click-through mode** — Widget now launches in click-through mode by default (`set_ignore_cursor_events(true)`), allowing mouse clicks to pass through to the window behind the widget while it remains visible and always-on-top
  - **`Ctrl+Alt+S`** — Global keyboard shortcut toggles click-through on/off (primary escape hatch, since the widget itself cannot receive clicks in click-through mode)
  - **Tray menu** — "Enable / Disable Click-Through" item toggles the same state
  - **Context menu** — "Click-Through" toggle with ON/OFF indicator (available when click-through is OFF)
  - Widget opacity is fixed at 0.35 while click-through is ON; when OFF, the original focus-based opacity (1.0 focused / 0.35 unfocused) applies

---

### 日本語

#### 新機能
- **クリックスルー モード** — ウィジェット起動時にクリックスルー状態で立ち上がるようになりました（`set_ignore_cursor_events(true)`）。常時最前面表示のまま、マウスクリックは裏のウィンドウに貫通します
  - **`Ctrl+Alt+S`** — グローバルショートカットで ON/OFF トグル（クリックスルー中はウィジェット自身がクリックを受け取れないため、最主要な復帰手段）
  - **トレイメニュー** — 「Enable / Disable Click-Through」項目で同一状態をトグル
  - **右クリックメニュー** — 「Click-Through」項目に ON/OFF インジケーター（クリックスルー OFF 時のみ開ける）
  - クリックスルー ON 中は opacity が 0.35 に固定、OFF 時は従来のフォーカス連動（focused 1.0 / unfocused 0.35）に戻ります
