import { React } from '../react'
import * as monaco from '../monaco'

export interface EditorProps {
  onChange: (e: monaco.editor.IModelContentChangedEvent, contentBeforeChange: string) => void
  defaultContent: string
}

export const Editor = React.forwardRef<monaco.editor.IStandaloneCodeEditor, EditorProps>(({onChange, defaultContent}, ref) => {
  React.useEffect(() => {
    const loaderScript = document.createElement('script')
    loaderScript.src = '/js/lib/monaco/min/vs/loader.js'
    loaderScript.async = true;
    document.body.appendChild(loaderScript)

    const editorSettings: monaco.editor.IStandaloneEditorConstructionOptions = {
      value: '',
      language: 'javascript',
      minimap: {
        enabled: false
      },
      tabSize: 2,
      insertSpaces: true
    }
    const initScript = document.createElement('script')
    initScript.async = true;
    initScript.innerHTML = `
    require.config({ paths: { vs: '/js/lib/monaco/min/vs' } });
    require(['vs/editor/editor.main'], function () {
      window.monacoEditor = monaco.editor.create(document.getElementById('editorContainer'), ${JSON.stringify(editorSettings)});
      window.initEditor(window.monacoEditor)
    });
    `

    loaderScript.onload = () => {
      document.body.appendChild(initScript)
    }
  
    return () => {
      document.body.removeChild(loaderScript)
      document.body.removeChild(initScript)
    }
  }, [])

  React.useEffect(() => {
    (window as any).initEditor = initEditor
  }, [])

  const initEditor = (editor: monaco.editor.IStandaloneCodeEditor) => {
    if (typeof ref === 'function') {
      ref(editor)
    } else {
      ref.current = editor
    }
    const model = editor.getModel()
    let content = model.getValue()

    model.onDidChangeContent(e => {
      onChange(e, content)
      content = model.getValue()
    })

    requestAnimationFrame(() => 
      model.pushEditOperations(
        [], 
        [{
          forceMoveMarkers: true,
          range: {
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: 1,
              endColumn: 1
          },
          text: defaultContent
        }],
        null
      ))
  }

  return (
    <div 
      id="editorContainer" 
      style={{width: '300px', height: '200px', border: '1px solid grey'}}>
    </div>
  )
})
