# Note Concat

A minimal GNOME Shell 50 extension for capturing thoughts and appending them to a local Markdown file without losing focus on your current task.

## Motivation

Note Concat is inspired by **distractibility delay**, a technique used in cognitive behavioural therapy for adults with ADHD, and research on **cognitive offloading**.

When an unrelated thought, idea or reminder comes to mind during focused work, write it down instead of immediately pursuing it or trying to remember it. Return to your current task and review the captured thoughts later.

Note Concat makes this process as simple as possible by providing a writing area directly in the GNOME top panel, without opening another application.

### References

- Sprich et al. (2010). [Description and Demonstration of CBT for ADHD in Adults](https://pmc.ncbi.nlm.nih.gov/articles/PMC3874265/). *Cognitive and Behavioral Practice*, 17(1), 9–15.
- Risko & Gilbert (2016). [Cognitive Offloading](https://doi.org/10.1016/j.tics.2016.07.002). *Trends in Cognitive Sciences*, 20(9), 676–688.

## Usage

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
