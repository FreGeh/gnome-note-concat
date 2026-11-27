// SPDX-License-Identifier: GPL-2.0-or-later

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {appendNote, appendNoteOnShutdown, readDraft, writeDraft, resolveDestination} from '../append.js';

function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}

const directory = GLib.dir_make_tmp('note-concat-XXXXXX');
const nested = GLib.build_filenamev([directory, 'nested']);
const path = GLib.build_filenamev([nested, 'inbox.md']);
const checkpoint = GLib.build_filenamev([directory, 'draft.json']);
try {
    assert(resolveDestination('~/inbox.md') === GLib.build_filenamev([GLib.get_home_dir(), 'inbox.md']), 'Home path');
    let failed = false;
    try {
        resolveDestination('relative.md');
    } catch {
        failed = true;
    }
    assert(failed, 'Reject relative path');
    assert(!await appendNote(path, ' \n\t'), 'Ignore blank notes');
    assert(!Gio.File.new_for_path(path).query_exists(null), 'Blank note does not create file');
    const cancellable = new Gio.Cancellable();
    const cancelledAppend = appendNote(path, 'Interrupted note', cancellable);
    cancellable.cancel();
    try {
        await cancelledAppend;
        throw new Error('Append succeeded after cancellation');
    } catch (error) {
        assert(error.matches?.(Gio.io_error_quark(), Gio.IOErrorEnum.CANCELLED), 'Report cancellation before writing');
    }
    assert(!Gio.File.new_for_path(path).query_exists(null), 'Cancelled append does not create the file');
    assert(await appendNote(path, '# First\n- grüß dich\n  indented'), 'First append');
    assert(await appendNote(path, 'Second 📝\n\nParagraph'), 'Second append');
    const [, bytes] = Gio.File.new_for_path(path).load_contents(null);
    assert(new TextDecoder().decode(bytes) === '# First\n- grüß dich\n  indented\n\nSecond 📝\n\nParagraph', 'Exact UTF-8 append and separator');
    failed = false;
    try {
        await appendNote(nested, 'Cannot write to a directory');
    } catch {
        failed = true;
    }
    assert(failed, 'Report write failure');
    assert(readDraft(checkpoint).note === '', 'Missing draft is empty');
    const draft = {note: 'A private 📝 draft', pending: true};
    writeDraft(checkpoint, draft);
    assert(readDraft(checkpoint).note === draft.note && readDraft(checkpoint).pending, 'Recover pending draft');
    const mode = Gio.File.new_for_path(checkpoint).query_info('unix::mode', Gio.FileQueryInfoFlags.NONE, null).get_attribute_uint32('unix::mode');
    assert((mode & 0o077) === 0, 'Draft is private');
    writeDraft(checkpoint, {note: ''});
    assert(!Gio.File.new_for_path(checkpoint).query_exists(null), 'Clear successful draft');
    assert(appendNoteOnShutdown(path, 'Session end'), 'Append on shutdown');
    const [, finalBytes] = Gio.File.new_for_path(path).load_contents(null);
    assert(new TextDecoder().decode(finalBytes).endsWith('\n\nSession end'), 'Shutdown append separator');
    print('All append and draft tests passed.');
} finally {
    GLib.unlink(checkpoint);
    GLib.unlink(path);
    GLib.rmdir(nested);
    GLib.rmdir(directory);
}
