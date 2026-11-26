# GNOME Note Concat

Capture thoughts without leaving the current task.

## Requirements

- GNOME Shell 50: one symbolic top-panel icon, one native anchored popup.
- Open directly into an empty, focused, multiline writing area; Enter inserts a newline, text wraps, and long notes scroll.
- Closing the popup (including Escape or clicking outside) appends nonblank text to one configurable local Markdown file. Ctrl+Enter saves and closes.
- Preserve Markdown, Unicode, indentation and line breaks. Separate captures with blank lines. Never rewrite existing file contents.
- Clear the editor only after successful saving; retain a failed draft and show an error. No timestamps, history, previews or additional editor windows.
- One preference: destination file. Default: `~/Notes/inbox.md`. Create missing parent directories and file.
- Native Shell widgets and theme, minimal CSS, asynchronous file I/O, no external runtime dependencies, network or polling.

## Install / update

From the repository root:

```sh
gnome-extensions pack --force --extra-source=append.js . &&
gnome-extensions install --force note-concat@fregeh.shell-extension.zip
```

Log out and back in (Wayland), then enable:

```sh
gnome-extensions enable note-concat@fregeh
gnome-extensions prefs note-concat@fregeh
```

Set an absolute destination path or use `~/`. The popup itself contains only the writing area and a small settings/save row.

## Development

`gjs -m tests/append.js` exercises real local append operations.
`glib-compile-schemas --strict --dry-run schemas` validates preferences.
See `tests/manual.md` for Shell integration checks.
