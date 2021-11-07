import { matchLocationToPath, Path } from "../navigation"
import { Expect, test, spec } from '../spec'

export const specs = [
  spec(
    'matchLocationToPath',
    [
      test('should match exact string', () => {
        const p = matchLocationToPath('/about')
        Expect.equals<Path>('/about', p.path)

        const p2 = matchLocationToPath('/')
        Expect.equals<Path>('/', p2.path)
      }),
      test('should match string with params', () => {
        const p = matchLocationToPath('/posts/1')
        Expect.equals<Path>('/posts/(?<id>.*)', p.path)
      })
    ]
  )
]
