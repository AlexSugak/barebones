import { Specification, SpecificationTest } from '../spec.js'

const testsWork: SpecificationTest = {
  name: 'tests work',
  test: () => {
    return true
  }
}

export const allWorksSpec: Specification = {
  name: 'Basic tests',
  tests: [
    testsWork
  ]
}
