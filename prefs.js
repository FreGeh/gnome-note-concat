// SPDX-License-Identifier: GPL-2.0-or-later

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class NoteConcatPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        settings.delay();
        const page = new Adw.PreferencesPage({title: 'Note Concat', icon_name: 'document-edit-symbolic'});
        const editor = new Adw.PreferencesGroup({title: 'Editor'});
        const currentFont = settings.get_string('font-family');
        const installedFonts = new Set(window.get_pango_context().list_families().map(font => font.get_name()));
        if (currentFont)
            installedFonts.add(currentFont);
        const fonts = ['', ...Array.from(installedFonts).sort((a, b) => a.localeCompare(b))];
        const fontRow = new Adw.ComboRow({
            title: 'Font family',
            model: Gtk.StringList.new(['System default', ...fonts.slice(1)]),
            expression: Gtk.PropertyExpression.new(Gtk.StringObject.$gtype, null, 'string'),
            selected: fonts.indexOf(currentFont),
            enable_search: true,
            search_match_mode: Gtk.StringFilterMatchMode.SUBSTRING,
        });
        fontRow.connect('notify::selected', () => {
            const font = fonts[fontRow.selected];
            if (font !== undefined && font !== settings.get_string('font-family'))
                settings.set_string('font-family', font);
        });
        editor.add(fontRow);
        editor.set_description('The popup shrinks to fit the screen when needed.');
        for (const [key, title, step] of [
            ['font-size', 'Font size (pt)', 1],
            ['editor-width', 'Writing area width (px)', 1],
            ['editor-height', 'Writing area height (px)', 1],
        ]) {
            const [, range] = settings.settings_schema.get_key(key).get_range().deepUnpack();
            const [lower, upper] = range.deepUnpack();
            const row = new Adw.SpinRow({
                title,
                adjustment: new Gtk.Adjustment({lower, upper, step_increment: step}),
            });
            settings.bind(key, row, 'value', Gio.SettingsBindFlags.DEFAULT);
            editor.add(row);
        }
        page.add(editor);

        const group = new Adw.PreferencesGroup({
            title: 'Storage',
            description: 'Use an absolute path or a path starting with ~/.',
        });
        const row = new Adw.EntryRow({title: 'Markdown file'});
        settings.bind('destination', row, 'text', Gio.SettingsBindFlags.DEFAULT);
        group.add(row);
        const includeTimestamps = new Adw.SwitchRow({
            title: 'Include timestamps',
            subtitle: 'Prefix each note with its local creation time (YYYY-MM-DD HH:MM).',
        });
        settings.bind('include-timestamps', includeTimestamps, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(includeTimestamps);
        const saveOnClose = new Adw.SwitchRow({
            title: 'Save on popup close',
            subtitle: 'Append the note whenever the popup is dismissed.',
        });
        settings.bind('save-on-close', saveOnClose, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(saveOnClose);
        const saveOnSessionEnd = new Adw.SwitchRow({
            title: 'Save on session end',
            subtitle: 'Append on screen lock, suspend or logout; recover interrupted drafts on return.',
        });
        settings.bind('save-on-session-end', saveOnSessionEnd, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(saveOnSessionEnd);
        page.add(group);

        const actions = new Adw.PreferencesGroup();
        const buttons = new Gtk.Box({halign: Gtk.Align.END, spacing: 8});
        const reset = new Gtk.Button({label: 'Reset to Defaults'});
        reset.connect('clicked', () => {
            for (const key of settings.settings_schema.list_keys())
                settings.reset(key);
            fontRow.selected = fonts.indexOf(settings.get_string('font-family'));
        });
        buttons.append(reset);
        const save = new Gtk.Button({
            label: 'Save Settings',
            css_classes: ['suggested-action'],
        });
        settings.bind_property('has-unapplied', save, 'sensitive', GObject.BindingFlags.SYNC_CREATE);
        save.connect('clicked', () => settings.apply());
        buttons.append(save);
        actions.add(buttons);
        page.add(actions);
        window.add(page);
    }
}
