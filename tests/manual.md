# GNOME Shell 50 smoke test

Use a disposable Markdown file.

- Enable, disable and re-enable; verify exactly one panel icon and no Shell errors.
- Click icon: popup opens in place, keyboard focus is in the blank writing area.
- Type multiple lines, including Unicode and Markdown indentation; Enter inserts a newline and does not close.
- Type/paste a long wrapped note; check caret visibility, selection, arrow keys and vertical scrolling.
- Close via outside click, panel icon, Escape, Save and Ctrl+Enter; check that each nonblank draft is appended once and the next popup is empty.
- Reopen immediately after closing; check that a pending save cannot be duplicated.
- Set an invalid destination, enter a note and close: verify error notification and retained draft. Fix path and retry.
- Append to an existing file and confirm prior bytes are unchanged.
- Check default and Ubuntu themes and a Wayland lock/unlock cycle.
- Verify the popup is never an external editor or visible on the lock screen.
