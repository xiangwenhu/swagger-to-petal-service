import fs, { PathLike } from 'fs';
import path from "path";

export function ensureDir(pathLike: PathLike) {
  if (fs.existsSync(pathLike)) {
    return;
  }
  fs.mkdirSync(pathLike, {
    recursive: true
  })
}

export async function copyFile(src: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(src);
    const writeStream = fs.createWriteStream(dest);

    readStream.on('error', (err) => {
      reject(err);
    });

    writeStream.on('error', (err) => {
      reject(err);
    });

    writeStream.on('close', () => {
      resolve();
    });

    readStream.pipe(writeStream);
  });
}

export async function copyFolder(src: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.mkdir(dest, { recursive: true }, (err) => {
      if (err) {
        reject(err);
        return;
      }

      fs.readdir(src, async (err, files) => {
        if (err) {
          reject(err);
          return;
        }

        for (const file of files) {
          const srcFile = path.join(src, file);
          const destFile = path.join(dest, file);

          const stats = fs.statSync(srcFile); 

          if (stats.isDirectory()) {
            await copyFolder(srcFile, destFile);
          } else {
            await copyFile(srcFile, destFile);
          }
        }

        resolve();
      });
    });
  });
}