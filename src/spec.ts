import { equals as structEq } from './eq'

type boolFunc = () => boolean
type anyFunc = () => any

export namespace Expect {
  export function equals<T>(
    expected: T, 
    actual: T, 
    errorMessage: string = 'Expected value did not match the actual value.'): void {
    if (!structEq(expected, actual)) {
      throw Error(
`${errorMessage}
    expected:
    ${JSON.stringify(expected)}
    actual:
    ${JSON.stringify(actual)}
`)
    }
  }
}

export interface SpecificationTest {
  name: string,
  test: boolFunc
}

export function test(name: string, body: anyFunc): SpecificationTest {
  return {
    name,
    test: () => { 
      const res = body(); 
      if (res !== undefined) {
        return Boolean(res)
      } else {
        return true 
      }
    }
  }
} 

export interface Specification {
  name: string,
  tests: SpecificationTest[]
}

export function spec(name: string, tests: SpecificationTest[]): Specification {
  return {
    name,
    tests
  }
}

export interface SpecificationResultBase {
  kind: 'Failure' | 'Success',
  specName: string
} 

export interface FailureResult extends SpecificationResultBase {
  kind: 'Failure',
  errors: string[]
}

export interface SuccessResult extends SpecificationResultBase {
  kind: 'Success'
}

export type SpecificationResult = 
  | SuccessResult
  | FailureResult

export namespace SpecificationResult {
  export const isFailureResult = (res: SpecificationResult): res is FailureResult => {
    return res.kind === 'Failure'
  }

  export const isSuccessResult = (res: SpecificationResult): res is SuccessResult => {
    return res.kind === 'Success'
  }
}

export function runSpec(spec: Specification): SpecificationResult[] {
  const results: SpecificationResult[] = []
  spec.tests.forEach(tst => {
    try{
      if (tst.test()) {
        results.push({kind: 'Success', specName: spec.name})
      } else {
        results.push({
          kind: 'Failure', 
          specName: `${spec.name}: ${tst.name}`, 
          errors: ['expected spec to return true but got false']
        })
      }
    } catch(e) {
      results.push({kind: 'Failure', specName: spec.name, errors: [e.toString()]})
    }
  })

  return results
}
