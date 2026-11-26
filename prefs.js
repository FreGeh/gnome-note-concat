import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class NoteConcatPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage({title: 'Note Concat', icon_name: 'document-edit-symbolic'});
        const group = new Adw.PreferencesGroup({
            title: 'Storage',
            description: 'Use an absolute path or ~/ (for example ~/Notes/inbox.md). Missing directories and the file are created when saving.',
        });
        const row = new Adw.EntryRow({title: 'Markdown file'});
        settings.bind('destination', row, 'text', Gio.SettingsBindFlags.DEFAULT);
        group.add(row);
        page.add(group);
        window.add(page);
    }
}
