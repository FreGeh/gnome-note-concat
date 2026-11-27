# GNOME Shell 50 smoke test

Use a disposable Markdown file.

- Enable, disable and re-enable; verify exactly one panel icon and no Shell errors.
- Disable with an open draft. Verify nothing is written and the draft is available after re-enabling.
- Disable during a pending append and re-enable. Verify the draft clears after a successful save or stays with a warning after interruption. Dismiss and reopen the popup to verify an interrupted save is never retried automatically.
- Click icon: popup opens in place, keyboard focus is in the blank writing area.
- Type multiple lines, including Unicode and Markdown indentation; Enter inserts a newline and does not close.
- Type/paste a long wrapped note; check caret visibility, selection, arrow keys and vertical scrolling.
- Close via outside click, panel icon, Escape, Save and Ctrl+Enter; check that each nonblank draft is appended once and the next popup is empty.
- Save a multiline note and reopen immediately. If the save is still pending, check that the editor rejects typing and another Save. Verify the saved note appears exactly once, then type a new draft.
- Change font size and writing area dimensions in Settings. Close without saving and verify the previous values are retained. Then change them again, click Save Settings and verify the new sizes, top-left caret, wrapping and scrolling.
- Search for part of an installed font name (for example, `mono` in `DejaVu Sans Mono`). Select a filtered result, click Save Settings, and verify the editor uses it. Select System default and save again to restore the theme font family.
- Change and save several preferences. Click Reset to Defaults and verify the controls show their defaults. Close without saving and reopen to verify the saved preferences are still present. Reset again and click Save Settings to restore the defaults.
- Turn off Save on close. Dismiss a draft with Escape or an outside click, then reopen and check that the draft is intact and the file is unchanged. Verify Save and Ctrl+Enter each append once.
- Set an invalid destination, enter a note and close: verify error notification and retained draft. Fix path and retry.
- Append to an existing file and confirm prior bytes are unchanged.
- Check default and Ubuntu themes and a Wayland lock/unlock cycle.
- Verify the popup is never an external editor or visible on the lock screen.
