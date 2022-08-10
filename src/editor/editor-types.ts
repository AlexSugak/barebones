import * as monaco from '../monaco'

export type Change = monaco.editor.IModelContentChange

export interface ChangesWithUndo { 
  changes: Change[], 
  invertedChanges: Change[] 
}

export interface EditorChange { 
  changes: Change[], 
  prevContent: string 
}

export interface ChangeMessage extends ChangesWithUndo {
  readonly timestamp: number
}
