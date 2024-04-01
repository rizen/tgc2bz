import fs from 'fs';
import axios from 'axios';
import sanitizeFilename from 'sanitize-filename';

export const isDir = (path) => {
    return fs.existsSync(path) && fs.lstatSync(path).isDirectory();
}

export const isFile = (path) => {
    return fs.existsSync(path) && fs.lstatSync(path).isFile();
}

export const sanitize = (filename) => {
    const fixed = filename.replace(/\s+/g, '_');
    return sanitizeFilename(fixed);
}

export const downloadFile = async (url, path) => {
    const response = await axios(url, {
        responseType: "stream"
    });
    await response.data.pipe(fs.createWriteStream(path));
}

export const readConfig = async (path) => {
    return JSON.parse(await fs.promises.readFile(path));
}

export const writeConfig = async (path, data) => {
    await fs.promises.writeFile(path, JSON.stringify(data, undefined, 2));
}

export const mkdir = async (path) => {
    if (!fs.existsSync(path))
        await fs.promises.mkdir(path, { recursive: true });
}