import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {appendNote, resolveDestination} from '../append.js';

function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}

const directory = GLib.dir_make_tmp('note-concat-XXXXXX');
const nested = GLib.build_filenamev([directory, 'nested']);
const path = GLib.build_filenamev([nested, 'inbox.md']);
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
    print('All append tests passed.');
} finally {
    GLib.unlink(path);
    GLib.rmdir(nested);
    GLib.rmdir(directory);
}
