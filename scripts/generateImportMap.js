import fs from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getFilesRecursive } from './common.js'

(async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  
  const dirDist = __dirname + '/../dist'
  const dir = dirDist + '/js'

  const files = await getFilesRecursive(dir, {ignore: ['lib']})

  const importStrings = new Set()
  const filesByNames = new Map()
  
  await Promise.all(files
    .filter(fn => fn.endsWith('.js'))
    .map(file => {
      // remove extension and possible hash from file names
      const shortName = file.replace(/(\.[a-z\d]{40})?\.js/, '')
      filesByNames.set(shortName, file)
      importStrings.add(shortName)

      return fs.promises
        .readFile(file, 'utf8')
        .then(data => {
          const lines = data.split('\n')

          lines.forEach(ln => {
            const importMatch = ln.match(/.*(from |Import\(|import\()['\''"](\.{1,2}\/[\/\-\.a-z]*)+/)
            if(importMatch) {
              importStrings.add(resolve(`${dirname(file)}/${importMatch[2]}`))
            }
          })
      })
    })
  )

  const importMapOverrides = [
  ]
  const importMap = {
    imports: Object.fromEntries(
      Array
        .from(importStrings.values())
        .filter(i => !i.includes('/lib/') && filesByNames.has(i))
        .map(i => {
          const abs = resolve(dirDist)
          const relative = i.replace(abs, '')
          return [relative, filesByNames.get(i).replace(abs, '')]
        })
        .concat(importMapOverrides),
    )
  }

  await fs.promises.writeFile(`${dir}/importMap.json`, JSON.stringify(importMap, null, 2))

  const policy = {
    dependencies: true,
    scopes: {
      "/": {
        cascade: true,
        integrity: true,
        dependencies: Object.fromEntries(
          Array
            .from(importStrings.values())
            .filter(i => !i.includes('/lib/') && filesByNames.has(i))
            .map(i => {
              const abs = resolve(dir)
              const relative = i.replace(abs, '.')
              return [relative, filesByNames.get(i).replace(abs, '.')]
            })
        )
      }
    }
  }

  await fs.promises.writeFile(`${dir}/policy.json`, JSON.stringify(policy, null, 2))
})().catch(e => {
  console.error('job failed', e)
});
