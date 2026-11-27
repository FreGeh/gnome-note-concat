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

async function ensureDirectory(directory) {
    if (!directory)
        return;
    try {
        await call(directory, 'make_directory', GLib.PRIORITY_DEFAULT, null);
    } catch (error) {
        if (isError(error, Gio.IOErrorEnum.EXISTS))
            return;
        if (!isError(error, Gio.IOErrorEnum.NOT_FOUND))
            throw error;
        const parent = directory.get_parent();
        if (!parent)
            throw error;
        await ensureDirectory(parent);
        await ensureDirectory(directory);
    }
}

export async function appendNote(destination, note) {
    if (!note.trim())
        return false;

    const file = Gio.File.new_for_path(resolveDestination(destination));
    await ensureDirectory(file.get_parent());
    const stream = await call(file, 'append_to', Gio.FileCreateFlags.PRIVATE, GLib.PRIORITY_DEFAULT, null);

    let attemptedWrite = false;
    try {
        const info = await call(stream, 'query_info', 'standard::size', GLib.PRIORITY_DEFAULT, null);
        const prefix = info.get_size() > 0 ? '\n\n' : '';
        const bytes = new TextEncoder().encode(prefix + note);
        let offset = 0;
        while (offset < bytes.length) {
            attemptedWrite = true;
            const count = await call(stream, 'write_bytes', new GLib.Bytes(bytes.subarray(offset)), GLib.PRIORITY_DEFAULT, null);
            if (count <= 0)
                throw new Error('No bytes written.');
            offset += count;
        }
    } catch (error) {
        try {
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
