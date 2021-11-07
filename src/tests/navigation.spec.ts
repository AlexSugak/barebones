import { matchLocationToPath, Path } from "../navigation"
import { Expect, test, spec } from '../spec'

export const specs = [
  spec(
    'matchLocationToPath',
    [
      test('should match exact string', () => {
        const [path] = matchLocationToPath('/about')
        Expect.equals<Path>('/about', path)

        const [path2] = matchLocationToPath('/')
        Expect.equals<Path>('/', path2)
      }),
      test('should match string with params', () => {
        const [path] = matchLocationToPath('/posts/1')
        Expect.equals<Path>('/posts/(?<id>.*)', path)
      })
    ]
  )
]
