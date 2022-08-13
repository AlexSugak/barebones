import { generatePathUrl, matchLocationToPath, Path } from "../router"
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
        const p = matchLocationToPath('/reels/1')
        Expect.equals<Path>('/reels/(?<id>.*)', p.path)
      })
    ]
  ),
  spec(
    'generatePathUrl',
    [
      test('should generate url for static path', () => {
        const url = generatePathUrl('/about', {})
        Expect.equals('/about', url)
      }),
      test('should generate url for path with params', () => {
        const url = generatePathUrl('/reels/(?<id>.*)', { id: '123' })
        Expect.equals('/reels/123', url)
      })
    ]
  )
]
