import { FailureResult, runSpec, SpecificationResult, SuccessResult } from './src/spec'
import { Colors, coloredLog } from './src/output'
import { allWorksSpec } from './src/tests/works.spec'
import { specs as specSpecs } from './src/tests/spec.spec'
import { specs as routerSpecs } from './src/tests/navigation.spec'

const specs = [
  allWorksSpec,
  ...specSpecs,
  ...routerSpecs
]

const greenLog = coloredLog(Colors.FgGreen)
const redLog = coloredLog(Colors.FgRed)

console.log('Running all tests...')

const results: SpecificationResult[] = specs.flatMap(s => runSpec(s))
const successTests: SuccessResult[] = results.filter(SpecificationResult.isSuccessResult)
const failureTests: FailureResult[] = results.filter(SpecificationResult.isFailureResult)

failureTests.forEach(ft => {
  redLog(`${ft.specName} -> ${ft.errors.join(', ')}`)
})

console.log(`Run ${results.length} test(s)`)
greenLog(`${successTests.length} test(s) succeeded`)
if(failureTests.length > 0) {
  redLog(`${failureTests.length} test(s) failed`)
}
