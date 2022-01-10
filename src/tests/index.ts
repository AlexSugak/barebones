import { FailureResult, runSpec, SpecificationResult, SuccessResult } from '../spec'
import { Colors, coloredLog } from '../output'
import { allWorksSpec } from '../tests/works.spec'
import { specs as specSpecs } from '../tests/spec.spec'
import { specs as routerSpecs } from '../tests/router.spec'
import { specs as serverSpecs } from '../tests/server.spec'
import { specs as authSpecs } from '../auth/auth.spec'
import { specs as dbSpecs } from '../db/db.spec'

const specs = [
  allWorksSpec,
  ...specSpecs,
  ...routerSpecs,
  ...serverSpecs,
  ...authSpecs,
  ...dbSpecs
]

const greenLog = coloredLog(Colors.FgGreen)
const redLog = coloredLog(Colors.FgRed)

console.log('Running all tests...')
console.time('exec time') 

const results: SpecificationResult[] = 
  (await Promise.all(specs.map(s => runSpec(s))))
  .flatMap(r => r)
const successTests: SuccessResult[] = results.filter(SpecificationResult.isSuccessResult)
const failureTests: FailureResult[] = results.filter(SpecificationResult.isFailureResult)

// successTests.forEach(ft => {
//   greenLog(`${ft.specName} -> OK`)
// })

failureTests.forEach(ft => {
  redLog(`${ft.specName} -> ${ft.errors.join(', ')}`)
})

console.log(`Run ${results.length} test(s)`)
greenLog(`${successTests.length} test(s) succeeded`)
if(failureTests.length > 0) {
  redLog(`${failureTests.length} test(s) failed`)
}
console.timeEnd('exec time')
