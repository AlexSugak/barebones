type boolFunc = () => boolean

export interface SpecificationTest {
  name: string,
  test: boolFunc
}

export interface Specification {
  name: string,
  tests: SpecificationTest[]
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
