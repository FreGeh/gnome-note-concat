// SPDX-License-Identifier: GPL-2.0-or-later

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import St from 'gi://St';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import {PopupAnimation} from 'resource:///org/gnome/shell/ui/boxpointer.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {appendNote} from './append.js';

const NoteEntry = GObject.registerClass(
class NoteEntry extends St.Entry {
    vfunc_allocate(box) {
        super.vfunc_allocate(box);

        // St.Entry centers its text vertically by default.
        const text = this.clutter_text;
        const textBox = text.get_allocation_box();
        const top = this.get_theme_node().get_padding(St.Side.TOP);
        const height = textBox.y2 - textBox.y1;
        textBox.y1 = top;
        textBox.y2 = top + height;
        text.allocate(textBox);
    }
});

export default class NoteConcat extends Extension {
    enable() {
        this._activation = Symbol();
        this._settings = this.getSettings();
        this._button = new PanelMenu.Button(0, 'Note Concat');
        this._button.add_child(new St.Icon({
            icon_name: 'document-edit-symbolic',
            style_class: 'system-status-icon',
        }));
        const menu = this._button.menu;

        const row = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
        const layout = new St.BoxLayout({vertical: true, x_expand: true, style_class: 'note-concat-layout'});
        row.add_child(layout);
        menu.addMenuItem(row);

        this._scroll = new St.ScrollView({
            x_expand: true,
            overlay_scrollbars: true,
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC,
        });
        const content = new St.BoxLayout({vertical: true, x_expand: true});
        this._scroll.set_child(content);
        layout.add_child(this._scroll);

        this._entry = new NoteEntry({
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
        this._saveButton.connect('clicked', () => this._closeAndSave());
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
        this._scroll.connect('notify::height', () => this._queueLayout());
        text.connect('key-press-event', (_actor, event) => {
            const key = event.get_key_symbol();
            if ((key === Clutter.KEY_Return || key === Clutter.KEY_KP_Enter) &&
                (event.get_state() & Clutter.ModifierType.CONTROL_MASK)) {
                this._closeAndSave();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        // Let the panel's menu manager take its modal grab before focusing the editor.
        Main.panel.addToStatusArea(this.uuid, this._button);
        this._menuSignal = menu.connect('open-state-changed', (_menu, open) => {
            if (open) {
                this._updateEditorSize();
                this._renderState();
                if (!this._pendingSave)
                    this._entry.grab_key_focus();
                this._queueLayout();
            } else if (!this._error && this._settings.get_boolean('save-on-close')) {
                this._save();
            }
        });
        this._settingsSignal = this._settings.connect('changed', (_settings, key) => {
            if (key === 'font-family' || key === 'font-size')
                this._updateEditorStyle();
            else if (key === 'editor-width' || key === 'editor-height')
                this._updateEditorSize();
        });
        this._monitorsSignal = Main.layoutManager.connect('monitors-changed', () => this._updateEditorSize());
        this._updateEditorStyle();
        this._updateEditorSize();
        this._renderState();
        if (this._pendingSave)
            this._finishSave(this._pendingSave);
    }

    _updateEditorStyle() {
        const family = this._settings.get_string('font-family');
        let style = `font-size: ${this._settings.get_int('font-size')}pt;`;
        if (family) {
            const escaped = family.replace(/["\\\u0000-\u001f\u007f]/g, char =>
                `\\${char.codePointAt(0).toString(16)} `);
            style += ` font-family: "${escaped}";`;
        }
        this._entry.set_style(style);
        this._queueLayout();
    }

    _updateEditorSize() {
        const monitor = Main.layoutManager.findMonitorForActor(this._button) ?? Main.layoutManager.primaryMonitor;
        if (!monitor)
            return;
        const workArea = Main.layoutManager.getWorkAreaForMonitor(monitor.index);
        const scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;
        // Leave room for menu padding, controls and the save status.
        const width = Math.min(this._settings.get_int('editor-width'), Math.max(1, Math.floor(workArea.width / scale) - 48));
        const height = Math.min(this._settings.get_int('editor-height'), Math.max(1, Math.floor(workArea.height / scale) - 112));
        this._button.menu.box.set_style(`width: ${width}px;`);
        this._scroll.set_style(`height: ${height}px;`);
        this._queueLayout();
    }

    _closeAndSave() {
        this._save();
        this._button.menu.close();
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
        const saving = Boolean(this._pendingSave);
        this._entry.clutter_text.editable = !saving;
        this._saveButton.reactive = !saving;
        this._saveButton.can_focus = !saving;
        this._status.text = saving ? 'Saving…' : (this._error ?? '');
        this._status.visible = Boolean(this._status.text);
    }

    _save() {
        if (this._pendingSave)
            return;
        const note = this._entry.get_text();
        if (!note.trim()) {
            this._entry.set_text('');
            this._draft = '';
            this._error = '';
            this._renderState();
            return;
        }

        this._draft = note;
        this._error = '';
        const destination = this._settings.get_string('destination');
        const cancellable = new Gio.Cancellable();
        const result = appendNote(destination, note, cancellable).then(
            () => null,
            error => error
        );
        this._pendingSave = {cancellable, result};
        this._finishSave(this._pendingSave);
    }

    async _finishSave(operation) {
        const activation = this._activation;
        const error = await operation.result;
        if (this._activation !== activation)
            return;

        this._pendingSave = null;
        if (!error) {
            this._draft = '';
            this._entry.set_text('');
        } else {
            if (error.matches?.(Gio.io_error_quark(), Gio.IOErrorEnum.CANCELLED)) {
                this._error = 'Save interrupted. Use Save to retry.';
            } else {
                this._error = error.message || 'Could not save note.';
                Main.notifyError('Note Concat: could not confirm save', this._error);
            }
        }
        this._renderState();
        if (this._button.menu.isOpen) {
            this._entry.grab_key_focus();
            this._queueLayout();
        }
    }

    disable() {
        if (this._layoutSource)
            GLib.Source.remove(this._layoutSource);
        this._layoutSource = 0;
        this._activation = null;
        if (this._pendingSave) {
            this._pendingSave.cancellable?.cancel();
            this._pendingSave.cancellable = null;
        }
        this._settings.disconnect(this._settingsSignal);
        Main.layoutManager.disconnect(this._monitorsSignal);
        this._button.menu.disconnect(this._menuSignal);
        // Keep the draft and any save warning through a Wayland lock/unlock.
        this._draft = this._entry.get_text();
        this._button.menu.close(PopupAnimation.NONE);
        this._button.destroy();
        this._menuSignal = 0;
        this._settingsSignal = 0;
        this._monitorsSignal = 0;
        this._button = null;
        this._entry = null;
        this._scroll = null;
        this._saveButton = null;
        this._status = null;
        this._settings = null;
    }
}
