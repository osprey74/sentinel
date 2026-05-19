# Release Notes — v1.1.0

## 🐛 Bug Fixes

- **Memo persistence**: Memo content edited and saved would revert to the previous value after restarting Sentinel. The Tauri v2 WebView's `localStorage` is unreliable for cross-restart persistence in some environments, so the memo is now stored via a Rust-side file I/O command instead.

## 🔧 Maintenance

- **Memo storage location**: Memos are now persisted as a plain Markdown file at `~/.config/sentinel/memo.md` (Windows: `%APPDATA%\sentinel\memo.md`). You can open and edit this file in any text editor.

## ⚠️ Compatibility Notice

- Memos saved in `localStorage` by v1.0.2–v1.0.8 are **not automatically migrated**. The first launch of v1.1.0 will show an empty memo. If you need to preserve existing content, open the old version once, copy the memo text, then paste it back after upgrading.

---

# リリースノート — v1.1.0

## 🐛 バグ修正

- **メモの永続化**: メモを編集・保存した後に Sentinel を再起動すると、編集前の内容に戻ってしまう問題を修正。Tauri v2 WebView の `localStorage` は環境によって再起動を跨いだ永続化が信頼できないため、Rust 側でファイル I/O するコマンド経由の保存方式に変更しました。

## 🔧 メンテナンス

- **メモの保存先**: メモは `~/.config/sentinel/memo.md`（Windows: `%APPDATA%\sentinel\memo.md`）に Markdown ファイルとして保存されるようになりました。任意のテキストエディタで直接開いて編集することも可能です。

## ⚠️ 互換性に関する注意

- v1.0.2 〜 v1.0.8 で `localStorage` に保存されていたメモは **自動移行されません**。v1.1.0 を初めて起動するとメモは空の状態になります。既存のメモを残したい場合は、旧バージョンを一度開いてメモ内容をコピーし、アップグレード後に貼り直してください。
