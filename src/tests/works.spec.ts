import { Specification, SpecificationTest } from '../spec'

const testsWork: SpecificationTest = {
  name: 'tests work',
  body: () => {
    return true
  }
}

export const allWorksSpec: Specification = {
  name: 'Basic tests',
  tests: [
    testsWork
  ]
}
