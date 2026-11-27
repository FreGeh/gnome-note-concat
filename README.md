# Note Concat

A minimal GNOME Shell 50 extension for capturing thoughts and appending them to a local Markdown file without losing focus on your current task.

## Motivation

Inspired by **distractibility delay**, a technique used in cognitive behavioural therapy for ADHD [1], and research on **cognitive offloading** [2]: write down distracting thoughts instead of acting on them, return to your current task and review them later.

## Installation

**GNOME Extensions:** Link coming soon.
<!-- Replace with the Note Concat extension page once published. -->

### Manual installation

To install from source, run the following commands in the repository directory:

```sh
gnome-extensions pack --force --extra-source=append.js --extra-source=LICENSE .
gnome-extensions install --force note-concat@fregeh.shell-extension.zip
```

Enable **Note Concat** in Extensions. If it does not appear, log out and back in first.

## Usage

Click the pencil icon in the top panel to write a note. **Save** or **Ctrl+Enter** appends it to `~/Notes/inbox.md` by default.

The gear button opens settings for the destination, font, editor size and automatic saving. If **Save on close** is disabled, dismissing the popup keeps the draft in memory until you save it.

## License

GPL-2.0-or-later. See [LICENSE](LICENSE).

## References

1. Sprich et al. (2010). [Description and Demonstration of CBT for ADHD in Adults](https://pmc.ncbi.nlm.nih.gov/articles/PMC3874265/). *Cognitive and Behavioral Practice*, 17(1), 9–15.
2. Risko & Gilbert (2016). [Cognitive Offloading](https://doi.org/10.1016/j.tics.2016.07.002). *Trends in Cognitive Sciences*, 20(9), 676–688.
