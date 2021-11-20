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
        const p = matchLocationToPath('/posts/1')
        Expect.equals<Path>('/posts/(?<id>.*)', p.path)
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
        const postUrl = generatePathUrl('/posts/(?<id>.*)', { id: '123' })
        Expect.equals('/posts/123', postUrl)

        const calendarUrl = generatePathUrl(
          '/calendar/(?<year>.*)/(?<month>.*)', 
          { year: '2021', month: '11' })
        Expect.equals('/calendar/2021/11', calendarUrl)
      })
    ]
  )
]
