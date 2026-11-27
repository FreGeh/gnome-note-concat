// SPDX-License-Identifier: GPL-2.0-or-later

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

// Keep promisification local: do not modify GI prototypes in GNOME Shell.
function call(object, method, ...args) {
    return new Promise((resolve, reject) => {
        object[method + '_async'](...args, (source, result) => {
            try {
                resolve(source[method + '_finish'](result));
            } catch (error) {
                reject(error);
            }
        });
    });
}

function isError(error, code) {
    return error.matches?.(Gio.io_error_quark(), code) ?? false;
}

export function resolveDestination(path) {
    if (path.startsWith('~/'))
        path = GLib.build_filenamev([GLib.get_home_dir(), path.slice(2)]);
    if (!GLib.path_is_absolute(path) || path.endsWith('/'))
        throw new Error('Choose an absolute file path or a path starting with ~/.');
    return path;
}

async function ensureDirectory(directory, cancellable) {
    if (!directory)
        return;
    try {
        await call(directory, 'make_directory', GLib.PRIORITY_DEFAULT, cancellable);
    } catch (error) {
        if (isError(error, Gio.IOErrorEnum.EXISTS))
            return;
        if (!isError(error, Gio.IOErrorEnum.NOT_FOUND))
            throw error;
        const parent = directory.get_parent();
        if (!parent)
            throw error;
        await ensureDirectory(parent, cancellable);
        await ensureDirectory(directory, cancellable);
    }
}

export async function appendNote(destination, note, cancellable = null) {
    if (!note.trim())
        return false;

    const file = Gio.File.new_for_path(resolveDestination(destination));
    await ensureDirectory(file.get_parent(), cancellable);
    const stream = await call(file, 'append_to', Gio.FileCreateFlags.PRIVATE, GLib.PRIORITY_DEFAULT, cancellable);

    let attemptedWrite = false;
    try {
        const info = await call(stream, 'query_info', 'standard::size', GLib.PRIORITY_DEFAULT, cancellable);
        const prefix = info.get_size() > 0 ? '\n\n' : '';
        const bytes = new TextEncoder().encode(prefix + note);
        let offset = 0;
        while (offset < bytes.length) {
            cancellable?.set_error_if_cancelled();
            attemptedWrite = true;
            const count = await call(stream, 'write_bytes', new GLib.Bytes(bytes.subarray(offset)), GLib.PRIORITY_DEFAULT, cancellable);
            if (count <= 0)
                throw new Error('No bytes written.');
            offset += count;
        }
    } catch (error) {
        try {
            // Closing must finish even after cancellation.
            await call(stream, 'close', GLib.PRIORITY_DEFAULT, null);
        } catch {
            // Preserve the original error.
        }
        if (attemptedWrite)
            throw new Error('Append may be incomplete. Check the destination before retrying.');
        throw error;
    }

    try {
        await call(stream, 'close', GLib.PRIORITY_DEFAULT, null);
    } catch {
        throw new Error('Could not close the file. Check the destination before retrying.');
    }
    return true;
}

// Checkpoint drafts separately from the user's append-only notes file.
export function draftPath() {
    return GLib.build_filenamev([GLib.get_user_state_dir(), 'note-concat', 'draft.json']);
}

export function readDraft(path) {
    const file = Gio.File.new_for_path(path);
    try {
        const [, bytes] = file.load_contents(null);
        const state = JSON.parse(new TextDecoder().decode(bytes));
        if (typeof state.note !== 'string')
            throw new Error('Invalid saved draft.');
        return state;
    } catch (error) {
        if (isError(error, Gio.IOErrorEnum.NOT_FOUND))
            return {note: '', error: '', autoSave: false};
        throw error;
    }
}

export function writeDraft(path, state) {
    const file = Gio.File.new_for_path(path);
    if (!state.note.trim() && !state.error) {
        try {
            file.delete(null);
        } catch (error) {
            if (!isError(error, Gio.IOErrorEnum.NOT_FOUND))
                throw error;
        }
        return;
    }

    if (GLib.mkdir_with_parents(file.get_parent().get_path(), 0o700) !== 0)
        throw new Error('Could not create the private draft directory.');
    const bytes = new TextEncoder().encode(JSON.stringify(state));
    file.replace_contents(bytes, null, false,
        Gio.FileCreateFlags.PRIVATE | Gio.FileCreateFlags.REPLACE_DESTINATION, null);
}

// The Shell shutdown signal cannot await async work. Only use this at
// shutdown; interactive saves continue to use the asynchronous implementation.
export function appendNoteOnShutdown(destination, note) {
    if (!note.trim())
        return false;
    const file = Gio.File.new_for_path(resolveDestination(destination));
    try {
        file.get_parent().make_directory_with_parents(null);
    } catch (error) {
        if (!isError(error, Gio.IOErrorEnum.EXISTS))
            throw error;
    }
    const stream = file.append_to(Gio.FileCreateFlags.PRIVATE, null);
    let attemptedWrite = false;
    try {
        const prefix = stream.query_info('standard::size', null).get_size() > 0 ? '\n\n' : '';
        const bytes = new TextEncoder().encode(prefix + note);
        attemptedWrite = true;
        const [ok, written] = stream.write_all(bytes, null);
        if (!ok || written !== bytes.length)
            throw new Error('Incomplete append.');
        stream.close(null);
    } catch (error) {
        try {
            stream.close(null);
        } catch {
            // Preserve the original error.
        }
        if (attemptedWrite)
            throw new Error('Append may be incomplete. Check the destination before retrying.');
        throw error;
    }
    return true;
}
