import { React } from '../react'
import * as monaco from '../monaco'
import { Disposable } from '../disposable'
import { filter, map, tap, Observable, Subject } from "../rx"
import { useDisposable, useSubscription } from '../hooks'

// TODO: do not hardcode localhost
const editorWs = 'ws://localhost:3000/editor/ws'

interface EditorWS extends Disposable{
  messages: Observable<string>
  send(msg: string): void
}

const getEditorWS = (): EditorWS => {
  const serverMessages = new Subject<string>()

  const ws = new WebSocket(editorWs)

  ws.onopen = (() => {
    console.info('opening editor ws')
    ws.send('hello from client editor')
  })

  ws.onclose = (() => {
    console.info('closing editor ws')
  })

  ws.onmessage = (e => {
    console.info('from editor server: ', e.data)
    serverMessages.next(e.data)
  })

  ws.onerror = (e => console.error('editor ws error', e))

  return {
    messages: serverMessages,
    send: msg => ws.send(msg),
    dispose: () => ws.close()
  }
}


export const Editor = ({}) => {
  const editorElementRef = React.useRef<HTMLDivElement | undefined>(undefined)

  React.useEffect(() => {
    const loaderScript = document.createElement('script')
    loaderScript.src = '/js/lib/monaco/min/vs/loader.js'
    loaderScript.async = true;
    document.body.appendChild(loaderScript)

    const editorSettings: monaco.editor.IStandaloneEditorConstructionOptions = {
      value: 'function hello() {}',
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

  const initEditor = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editor.getModel().pushEditOperations(
      [], 
      [{
        forceMoveMarkers: true,
        range: {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1
        },
        text: 'const a = "b" \n'
      }],
      null
    )
  }

  React.useEffect(() => {
    (window as any).initEditor = initEditor
  }, [])

  const editorWS = useDisposable(getEditorWS())
  // TODO: handle messages from server
  // useSubscription(editorWS.messages)

  return (
    <div 
      id="editorContainer" 
      ref={editorElementRef} 
      style={{width: '800px', height: '600px', border: '1px solid grey'}}>
    </div>
  )
}
