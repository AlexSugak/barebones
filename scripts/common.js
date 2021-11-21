import { resolve } from 'path'
import fs from 'fs'

export async function getFilesRecursive(dir, options = {ignore: []}) {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = resolve(dir, dirent.name);
    return dirent.isDirectory() && !options.ignore.includes(dirent.name) ? getFilesRecursive(res) : res;
  }));
  return Array.prototype.concat(...files);
}
