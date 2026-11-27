# Note Concat

A GNOME Shell 50 extension that appends Markdown notes from the top panel to a local file.

Click the pencil icon to write a note. **Save** or **Ctrl+Enter** appends it to `~/Notes/inbox.md` by default. The gear button opens settings for the destination, font, editor size, and automatic saving. If you turn off **Save on close**, dismissing the popup keeps the draft in memory.

GNOME Shell can disable Note Concat while the screen is locked. The draft and any save warning stay in memory during lock and unlock. Disabling cancels an active save. On re-enable, the editor waits for its outcome before accepting edits. Follow the on-screen message before retrying an interrupted save with **Save**.

## Build and install

```sh
gnome-extensions pack --force --extra-source=append.js --extra-source=LICENSE .
gnome-extensions install --force note-concat@fregeh.shell-extension.zip
```

Log out and back in, then enable **Note Concat** in Extensions.

## Tests

Run `gjs -m tests/append.js` and `glib-compile-schemas --strict --dry-run schemas`. See [tests/manual.md](tests/manual.md) for GNOME Shell checks.

## License

GPL-2.0-or-later. See [LICENSE](LICENSE).
