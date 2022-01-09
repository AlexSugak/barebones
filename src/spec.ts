import { equals as structEq } from './eq'

type boolFunc = () => boolean
type voidFunc = () => void
type asyncFunc = () => Promise<any>
type testFunc = boolFunc | voidFunc | asyncFunc

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

  export function notEmpty(
    actual: string, 
    errorMessage: string = 'Expected not empty string.'): void {
    if (actual === undefined || actual === '') {
      throw Error(
`${errorMessage}
    expected value to be not empty but got:
    ${actual}
`)
    }
  }
}

export interface SpecificationTest {
  name: string,
  body: testFunc
}

export function test(name: string, body: testFunc): SpecificationTest {
  return {
    name,
    body
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

export async function runSpec(spec: Specification): Promise<SpecificationResult[]> {
  const results: SpecificationResult[] = []
  for (let i = 0; i < spec.tests.length; i++) {
    const t = spec.tests[i];
    
    try {
      let error = null
      const testRes = await t.body()
      let result = true
      if (testRes !== undefined) {
        result = Boolean(testRes)
      } 
      
      if (result && error === null) {
        results.push({kind: 'Success', specName: `${spec.name}: ${t.name}`})
      } else {
        results.push({
          kind: 'Failure', 
          specName: `${spec.name}: ${t.name}`, 
          errors: [error || 'expected spec to return true but got false']
        })
      }
    } catch(e) {
      results.push({kind: 'Failure', specName: `${spec.name}: ${t.name}`, errors: [e.toString()]})
    }
  }

  return results
}
