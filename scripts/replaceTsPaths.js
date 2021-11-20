import fs from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dir = __dirname + '/../dist/js'
const tsConfigPath = __dirname + '/../tsconfig.json'

const tsConfigString = fs.readFileSync(tsConfigPath, { encoding: 'utf-8' })
const tsConfig = JSON.parse(tsConfigString)

const paths = tsConfig.compilerOptions.paths
const pathEntries = Object.keys(paths)

fs.readdirSync(dir)
  .filter(fn => fn.endsWith('.js'))
  .forEach(file => {
    const path = `${dir}/${file}`

    fs.readFile(path, 'utf8', function (err,data) {
      if (err) {
        return console.log(err)
      }
      let result = data
      pathEntries.forEach(pe => {
        if (result.includes(`'${pe}'`)) {
          result = result.replace(`'${pe}'`, `'./${paths[pe]}'`)
        }
      })
    
      fs.writeFile(path, result, 'utf8', function (err) {
         if (err) return console.log(err)
      })
    })
  })
