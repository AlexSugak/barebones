import { FailureResult, runSpec, SpecificationResult, SuccessResult } from './src/spec'
import { Colors, coloredLog } from './src/output'
import { allWorksSpec } from './src/tests/works'

const specs = [
  allWorksSpec
]

const greenLog = coloredLog(Colors.FgGreen)
const redLog = coloredLog(Colors.FgRed)

console.log('Running all tests...')

const results: SpecificationResult[] = specs.flatMap(s => runSpec(s))

const successTests: SuccessResult[] = results.filter(SpecificationResult.isSuccessResult)
const failureTests: FailureResult[] = results.filter(SpecificationResult.isFailureResult)

failureTests.forEach(ft => {
  redLog(`Failed ${ft.specName}: ${ft.errors.join(', ')}`)
})

console.log(`Run ${results.length} tests`)
greenLog(`${successTests.length} tests succeeded`)
redLog(`${failureTests.length} tests failed`)
