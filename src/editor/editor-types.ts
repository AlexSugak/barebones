import * as monaco from '../monaco'

type MonacoChange = monaco.editor.IModelContentChange

export interface ChangeRecord {
  readonly timestamp: number
  readonly changes: MonacoChange[]
  readonly invertedChanges: MonacoChange[]
}
