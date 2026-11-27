# GNOME Shell 50 smoke test

Use a disposable Markdown file.

- Enable, disable and re-enable; verify exactly one panel icon and no Shell errors.
- Click icon: popup opens in place, keyboard focus is in the blank writing area.
- Type multiple lines, including Unicode and Markdown indentation; Enter inserts a newline and does not close.
- Type/paste a long wrapped note; check caret visibility, selection, arrow keys and vertical scrolling.
- Close via outside click, panel icon, Escape, Save and Ctrl+Enter; check that each nonblank draft is appended once and the next popup is empty.
- Reopen immediately after closing; check that a pending save cannot be duplicated.
- Change font size and writing area height in Settings. Close without saving and verify the previous values are retained. Then change them again, click Save Settings and verify the new sizes, top-left caret, wrapping and scrolling.
- Search for part of an installed font name (for example, `mono` in `DejaVu Sans Mono`). Select a filtered result, click Save Settings, and verify the editor uses it. Select System default and save again to restore the theme font family.
- Turn off Save on close. Dismiss a draft with Escape or an outside click, then reopen and check that the draft is intact and the file is unchanged. Verify Save and Ctrl+Enter each append once.
- Set an invalid destination, enter a note and close: verify error notification and retained draft. Fix path and retry.
- Append to an existing file and confirm prior bytes are unchanged.
- Check default and Ubuntu themes and a Wayland lock/unlock cycle.
- Verify the popup is never an external editor or visible on the lock screen.
