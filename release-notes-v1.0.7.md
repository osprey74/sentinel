## What's New / 新機能・変更点

### English

#### New Features

- **Japanese public holidays in the calendar.** The mini calendar now fetches the official public-holiday list from `holidays-jp.github.io/api/v1/date.json` on startup and renders holiday dates in red (the same `--sunday` color used for Sundays). Hovering a holiday cell shows the holiday name as a tooltip, and when today is a holiday the name is also displayed below the calendar grid. The fetched data is cached in `localStorage` and refetched only when the calendar year rolls over or the cache is older than 30 days, so the app starts instantly and works offline once seeded.

- **Per-state opacity sliders in Settings.** A new "Opacity" section in the settings panel lets you tune the widget's transparency separately for two states:
  - **Active (focused)** — applied when click-through is OFF and the window has focus (previously hardcoded to 100%)
  - **Dim (unfocused / click-through)** — applied when click-through is ON, or when click-through is OFF but the window is unfocused (previously hardcoded to 35%)

  Both sliders cover 10–100% in 5% steps, and the values are persisted to `localStorage` so they survive restarts.

---

### 日本語

#### 新機能

- **カレンダーに日本の祝日表示を追加。** ミニカレンダーが起動時に `holidays-jp.github.io/api/v1/date.json` から公式の祝日一覧を取得し、祝日の日付を赤字（日曜日と同じ `--sunday` カラー）で表示します。祝日セルにマウスを乗せると祝日名がツールチップとして表示され、今日が祝日のときはカレンダー下部にも祝日名を表示します。取得した祝日データは `localStorage` にキャッシュされ、年が変わるかキャッシュが30日以上古くなった場合のみ再取得するため、起動は即時で、一度キャッシュされればオフラインでも動作します。

- **設定パネルに状態別の透過率スライダーを追加。** 設定パネルに「Opacity」セクションを新設し、ウィジェットの透過率を 2 つの状態それぞれで個別に調整できるようにしました:
  - **Active (focused)** — クリックスルー OFF かつウィンドウにフォーカスがあるときの透過率（従来は 100% 固定）
  - **Dim (unfocused / click-through)** — クリックスルー ON、またはクリックスルー OFF でフォーカスが外れているときの透過率（従来は 35% 固定）

  どちらも 10–100% を 5% 刻みで指定でき、値は `localStorage` に保存されるためアプリ再起動後も維持されます。
