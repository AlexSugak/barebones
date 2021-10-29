import { Specification, SpecificationTest } from '../spec.js'

const testsWork: SpecificationTest = {
  name: 'tests work',
  test: () => {
    return false
  }
}

export const allWorksSpec: Specification = {
  name: 'Basic tests',
  specs: [
    testsWork
  ]
}
