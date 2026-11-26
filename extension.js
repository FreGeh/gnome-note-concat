import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';
import St from 'gi://St';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {appendNote} from './append.js';

export default class NoteConcat extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._button = new PanelMenu.Button(0, 'Note Concat');
        this._button.add_child(new St.Icon({
            icon_name: 'document-edit-symbolic',
            style_class: 'system-status-icon',
        }));
        const menu = this._button.menu;
        menu.box.add_style_class_name('note-concat-popup');

        const row = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
        const layout = new St.BoxLayout({vertical: true, x_expand: true, style_class: 'note-concat-layout'});
        row.add_child(layout);
        menu.addMenuItem(row);

        this._scroll = new St.ScrollView({
            style_class: 'note-concat-scroll',
            x_expand: true,
            overlay_scrollbars: true,
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC,
        });
        const content = new St.BoxLayout({vertical: true, x_expand: true});
        this._scroll.set_child(content);
        layout.add_child(this._scroll);

        this._entry = new St.Entry({
            style_class: 'note-concat-entry',
            accessible_name: 'Note',
            can_focus: true,
            x_expand: true,
            text: this._draft ?? '',
        });
        content.add_child(this._entry);
        const text = this._entry.clutter_text;
        text.single_line_mode = false;
        text.activatable = false;
        text.line_wrap = true;
        text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
        text.ellipsize = Pango.EllipsizeMode.NONE;

        const controls = new St.BoxLayout({x_expand: true, style_class: 'note-concat-controls'});
        const preferences = new St.Button({
            style_class: 'button',
            child: new St.Icon({icon_name: 'emblem-system-symbolic', icon_size: 16}),
            accessible_name: 'Settings',
            can_focus: true,
        });
        preferences.connect('clicked', () => {
            menu.close();
            this.openPreferences().catch(error => console.error(error));
        });
        controls.add_child(preferences);
        controls.add_child(new St.Widget({x_expand: true}));
        this._saveButton = new St.Button({label: 'Save', style_class: 'button', can_focus: true});
        this._saveButton.connect('clicked', () => menu.close());
        controls.add_child(this._saveButton);
        layout.add_child(controls);

        this._status = new St.Label({style_class: 'note-concat-status', visible: false});
        this._status.clutter_text.line_wrap = true;
        this._status.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
        this._status.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        layout.add_child(this._status);

        text.connect('text-changed', () => this._queueLayout());
        text.connect('notify::cursor-position', () => this._queueLayout());
        this._scroll.connect('notify::width', () => this._queueLayout());
        text.connect('key-press-event', (_actor, event) => {
            const key = event.get_key_symbol();
            if ((key === Clutter.KEY_Return || key === Clutter.KEY_KP_Enter) &&
                (event.get_state() & Clutter.ModifierType.CONTROL_MASK)) {
                menu.close();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        this._menuSignal = menu.connect('open-state-changed', (_menu, open) => {
            if (open) {
                this._renderState();
                if (!this._saving)
                    this._entry.grab_key_focus();
                this._queueLayout();
            } else {
                this._save();
            }
        });
        Main.panel.addToStatusArea(this.uuid, this._button);
        this._renderState();
    }

    _queueLayout() {
        if (this._layoutSource || !this._button?.menu.isOpen)
            return;
        this._layoutSource = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._layoutSource = 0;
            if (!this._entry?.mapped)
                return GLib.SOURCE_REMOVE;
            // St.Entry is naturally single-line-sized; give its wrapped text
            // enough room while keeping the outer scroll viewport fixed.
            const entry = this._entry;
            const text = entry.clutter_text;
            const theme = entry.get_theme_node();
            const width = Math.max(1, this._scroll.width - theme.get_horizontal_padding());
            const [, natural] = text.get_preferred_height(width);
            const height = Math.max(this._scroll.height, Math.ceil(natural + theme.get_vertical_padding()));
            if (entry.height !== height) {
                entry.height = height;
                // Scroll after the new allocation rather than the old one.
                this._queueLayout();
            } else {
                const position = text.get_cursor_position();
                const index = position < 0 ? Array.from(text.get_text()).length : position;
                const [valid, , y, lineHeight] = text.position_to_coords(index);
                if (valid) {
                    const adjustment = this._scroll.get_vadjustment();
                    const top = text.y + y;
                    const bottom = top + lineHeight + 8;
                    if (top < adjustment.value)
                        adjustment.value = Math.max(0, top - 8);
                    else if (bottom > adjustment.value + adjustment.page_size)
                        adjustment.value = Math.min(adjustment.upper - adjustment.page_size, bottom - adjustment.page_size);
                }
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    _renderState() {
        if (!this._entry)
            return;
        this._entry.clutter_text.editable = !this._saving;
        this._saveButton.reactive = !this._saving;
        this._saveButton.can_focus = !this._saving;
        this._status.text = this._saving ? 'Saving…' : (this._error ?? '');
        this._status.visible = Boolean(this._status.text);
    }

    async _save() {
        if (this._saving || !this._entry)
            return;
        const note = this._entry.get_text();
        if (!note.trim()) {
            this._entry.set_text('');
            this._draft = '';
            this._error = '';
            this._renderState();
            return;
        }

        // Snapshot the draft before closing. A rapid reopen cannot submit it
        // twice or edit it while the asynchronous append is in progress.
        this._draft = note;
        this._saving = true;
        this._error = '';
        const destination = this._settings.get_string('destination');
        this._renderState();
        try {
            await appendNote(destination, note);
            this._draft = '';
            this._entry?.set_text('');
        } catch (error) {
            this._error = error.message || 'Could not save note.';
            if (this._entry)
                this._entry.set_text(this._draft);
            Main.notifyError('Note Concat: note not saved', this._error);
        } finally {
            this._saving = false;
            this._renderState();
            if (this._button?.menu.isOpen) {
                this._entry.grab_key_focus();
                this._queueLayout();
            }
        }
    }

    disable() {
        if (this._button) {
            this._button.menu.disconnect(this._menuSignal);
            if (this._button.menu.isOpen)
                this._save();
            this._button.destroy();
        }
        if (this._layoutSource)
            GLib.Source.remove(this._layoutSource);
        this._layoutSource = 0;
        this._menuSignal = 0;
        this._button = null;
        this._entry = null;
        this._scroll = null;
        this._saveButton = null;
        this._status = null;
        this._settings = null;
    }
}
