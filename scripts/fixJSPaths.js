import fs from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { getFilesRecursive } from './common.js'

(async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  
  const dir = __dirname + '/../dist/js'

  const files = await getFilesRecursive(dir, {ignore: ['lib']})

  files
    .filter(fn => fn.endsWith('.js'))
    .forEach(file => {
      fs.readFile(file, 'utf8', function (err,data) {
        if (err) {
          return console.log(err)
        }
        let result = []
        let updated = false
        const lines = data.split('\n')
        lines.forEach(ln => {
          let res = ln
          if(!ln.match(/.*\.js.*/)) {
            const importMatch = ln.match(/.*[from |Import\(|import\(]['\''"]\.{1,2}(\/[\.a-z]*)+/)
            if(importMatch) {
              updated = true
              res = ln.replace(importMatch[0], importMatch[0] + '.js')
            }
          }
          result.push(res)
        })

        if (updated) {
          // console.log('updating .js in', file)
          fs.writeFile(file, result.join('\n'), 'utf8', function (err) {
            if (err) return console.error(err)
          })
        }
      })
    })
})().catch(e => {
  console.error('job failed', e)
});
