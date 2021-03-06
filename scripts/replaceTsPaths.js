import fs from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { getFilesRecursive } from './common.js'

(async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const dir = __dirname + '/../dist/js'
  const tsConfigPath = __dirname + '/../tsconfig.json'

  const tsConfigString = fs.readFileSync(tsConfigPath, { encoding: 'utf-8' })
  const tsConfig = JSON.parse(tsConfigString)

  const paths = tsConfig.compilerOptions.paths
  const pathEntries = Object.keys(paths)

  const files = await getFilesRecursive(dir, {ignore: ['lib']})
  files
    .filter(fn => fn.endsWith('.js'))
    .forEach(file => {
      fs.readFile(file, 'utf8', function (err,data) {
        if (err) {
          return console.log(err)
        }
        let result = data
        let updated = false
        pathEntries.forEach(pe => {
          if (result.includes(`'${pe}'`)) {
            result = result.replace(`'${pe}'`, `'./${paths[pe]}'`)
            updated = true
          }
        })
      
        if (updated) {
          // console.log('updating ts path in', file)
          fs.writeFile(file, result, 'utf8', function (err) {
            if (err) return console.log(err)
          })
        }
      })
    })
})().catch(e => {
  console.error('job failed', e)
});
