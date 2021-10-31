import { Expect, runSpec, test, spec } from '../spec'

export const specs = [
  spec(
    'expect',
    [
      test('expectEqualsThrowsOnNotEqualValues', () => {
        try {
          Expect.equals(2, 1)
          return false
        } catch (e) {
          return true
        }
      }),
      test('expectEqualsDoesNotThrowOnEqualValues', () => {
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
      test('runSpec returns Success when test returns true', () => {
        const res = runSpec({name: 'test spec', tests: [
          {name: 'alwaysTrue', test: () => true}
        ]})
    
        Expect.equals(1, res.length, 'expected results to contain only one test result')
        Expect.equals('Success', res[0].kind, 'expected Success result')
      }),
      test('runSpec returns Failure when test return false', () => {
        const res = runSpec({name: 'test spec', tests: [
          {name: 'alwaysFalse', test: () => false}
        ]})
    
        Expect.equals(1, res.length, 'expected results to contain only one test result')
        Expect.equals('Failure', res[0].kind, 'expected Failure result')
      }),
      test('runSpec returns Failure when test throws', () => {
        const res = runSpec({name: 'test spec', tests: [
          {name: 'alwaysThrows', test: () => { throw new Error('boo!') }}
        ]})
    
        Expect.equals(1, res.length, 'expected results to contain only one test result')
        Expect.equals('Failure', res[0].kind, 'expected Failure result')
      })
    ]
  )
]
