import { Expect, runSpec, test, spec, FailureResult } from '../spec'

export const specs = [
  spec(
    'Expect.equals',
    [
      test('throws on not equal values', () => {
        try {
          Expect.equals(2, 1)
          return false
        } catch (e) {
          return true
        }
      }),
      test('does not throw on equal values', () => {
        try {
          Expect.equals(1, 1)
          return true
        } catch (e) {
          return false
        }
      })
    ]
  ),
  spec(
    'runSpec',
    [
      test('returns Success when test returns true', async () => {
        const res = await runSpec({name: 'test spec', tests: [
          {name: 'alwaysTrue', body: () => true}
        ]})
    
        Expect.equals(1, res.length, 'expected results to contain only one test result')
        Expect.equals('Success', res[0].kind, 'expected Success result')
      }),
      test('returns Failure when test return false', async () => {
        const res = await runSpec({name: 'test spec', tests: [
          {name: 'alwaysFalse', body: () => false}
        ]})
    
        Expect.equals(1, res.length, 'expected results to contain only one test result')
        Expect.equals('Failure', res[0].kind, 'expected Failure result')
      }),
      test('returns Failure when test throws', async () => {
        const res = await runSpec({name: 'test spec', tests: [
          {name: 'alwaysThrows', body: () => { throw new Error('sync error!') }}
        ]})
    
        Expect.equals(1, res.length, 'expected results to contain only one test result')
        Expect.equals('Failure', res[0].kind, 'expected Failure result')
      }),
      test('catches exceptions in async test body', async () => {
        const res = await runSpec({name: 'test spec', tests: [
          {
            name: 'alwaysThrowsAsync', 
            body: async () => {
              const timeout = new Promise(resolve => setTimeout(resolve, 0))
              await timeout
              throw new Error('async error!')
            }
          }
        ]})
    
        Expect.equals(1, res.length, 'expected results to contain only one test result')
        Expect.equals('Failure', res[0].kind, 'expected Failure result')
        Expect.equals(
          'Error: async error!', 
          (res[0] as FailureResult).errors[0], 'expected Failure to contain async error')
      })
    ]
  )
]
