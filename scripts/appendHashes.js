import fs from 'fs'
import crypto from 'crypto'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { getFilesRecursive } from './common.js'

function calculateHash(path) {
  return new Promise((resolve => {
    const fd = fs.createReadStream(path)
    const hash = crypto.createHash('sha1')
    hash.setEncoding('hex')
    
    fd.on('end', function() {
      hash.end()
      resolve(hash.read())
    })

    fd.pipe(hash)
  }))
}

(async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  
  const dirDist = __dirname + '/../dist'
  const dir = dirDist + '/js'

  const files = await getFilesRecursive(dir, {ignore: ['lib', 'tests']})

  files
    .filter(fn => fn.endsWith('.js'))
    .forEach(file => {
      calculateHash(file).then(hash => {
        const newName = file.replace('.js', `.${hash}.js`)
        fs.rename(file, newName, () => {})

        // TODO: handle source map files (requires .map file content updates too)
        // if (fs.existsSync(`${file}.map`)){
        //   const newMapName = file.replace('.js', `.${hash}.js.map`)
        //   fs.rename(`${file}.map`, newMapName, () => {})
        // }
      })
    })
})().catch(e => {
  console.error('job failed', e)
});
