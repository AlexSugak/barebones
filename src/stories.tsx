import { React } from './react'
import { Actions, LoginFormStateManager, OnLogin } from './auth/auth-view';
import { LoginView } from './components'
import { delay, doNothing } from './utils'
import { filter, tap, EMPTY, withLatestFrom, BehaviorSubject, map, switchMap, Observable, Subject, of } from './rx'
import { View } from './hoc';
import { assertNever } from './errors';
import { getDevServerMessages, getSourceFilesUpdates } from './dev'
import { useSubscription } from './hooks';

function getNewInputValue(e) {
  const keysToIgnore = ['Meta']
  let newValue = e.target.value;
  let valueArray = newValue.split('');

  if(keysToIgnore.includes(e.key)) {
    return newValue
  }

  const selectionLength = (e.target.selectionEnd - e.target.selectionStart);
  if (e.key === 'Backspace') {
    if (selectionLength === 0 && e.target.selectionStart > 0) {
      valueArray.splice(e.target.selectionStart - 1, selectionLength + 1);
    } else {
      valueArray.splice(e.target.selectionStart, selectionLength);
    }
  } else if (e.key === 'Delete') {
    if (selectionLength === 0) {
      valueArray.splice(e.target.selectionStart, selectionLength + 1);
    } else {
      valueArray.splice(e.target.selectionStart, selectionLength);
    }
  } else {
    valueArray.splice(e.target.selectionStart, selectionLength, e.key);
  }
  newValue = valueArray.join('');
  return newValue;
}

type PropsWithLazyChildren<T> = {
  childProps: T,
  lazyChildren: (props: T) => React.ReactElement
}

type UserEvents = 
  | { kind: 'inputChange', value: string, targetId: string }
  | { kind: 'click', targetId: string }

interface Story {
  name: string,
  events: UserEvents[],
  htmls: string[]
}

type RecorderProps<T> = PropsWithLazyChildren<T> & {
  story?: Story,
  composerCollapsed: boolean,
  onSaveStory: (story: Story) => void
}

export const Recorder = <T, >({lazyChildren, childProps, story, composerCollapsed, onSaveStory}: RecorderProps<T>): React.ReactElement => {
  let [isValid, setIsValid] = React.useState(true)
  const checkValid = () => {
    if (recordedHtmlsRef.current.length === replayedHtmlsRef.current.length) {
      const zip = recordedHtmlsRef.current.map((rec, i) => [rec, replayedHtmlsRef.current[i]])
      console.log('validating', zip)
      const isSame = zip.every(([rec, rep]) => rec === rep)
      setIsValid(isSame)
    } else {
      setIsValid(false)
    }
  }

  const hasStory = !!story
  const wrapperRef = React.useRef<HTMLDivElement>()
  const [events, setEvents] = React.useState<UserEvents[]>(hasStory ? story.events : [])
  const eventsRef = React.useRef<UserEvents[]>()
  eventsRef.current = events

  const [states, setStates] = React.useState<T[]>([])
  const statesRef = React.useRef<T[]>()
  statesRef.current = states

  const [recordedHtmls, setRecordedHtmls] = React.useState<string[]>(hasStory ? story.htmls : [])
  const recordedHtmlsRef = React.useRef<string[]>()
  recordedHtmlsRef.current = recordedHtmls

  const [replayedHtmls, setReplayedHtmls] = React.useState<string[]>([])
  const replayedHtmlsRef = React.useRef<string[]>()
  replayedHtmlsRef.current = replayedHtmls

  let [isRecording, setIsRecording] = React.useState(false)
  const isRecordingRef = React.useRef<boolean>()
  isRecordingRef.current = isRecording

  let [showRecording, setShowRecording] = React.useState(true)
  let [collapse, setCollapse] = React.useState(hasStory)
  const collapseRef = React.useRef<boolean>()
  collapseRef.current = collapse
  React.useEffect(() => {
    if (!isValid && collapseRef.current) {
      setCollapse(false)
      setShowRecording(true)
    }
  }, [isValid])

  let [isReplaying, setIsReplaying] = React.useState(false)
  const isReplayingRef = React.useRef<boolean>()
  isReplayingRef.current = isReplaying

  let [storyName, setStoryName] = React.useState(hasStory ? story.name : '')

  React.useEffect(() => {
    if (hasStory) {
      replay()
    }
  }, [story])

  React.useEffect(() => {
    if (isReplaying || isRecording) {
      setStates(s => [...s, childProps])
    }
  }, [childProps, isReplaying, isRecording])

  const saveRecordedHtml = () => {
    setTimeout(() => {
      setRecordedHtmls(h => [...h, wrapperRef.current.innerHTML])
    }, 0)
  }

  React.useEffect(() => {
    if (isRecording) {
      saveRecordedHtml()
    }
  }, [childProps, isRecording])

  const saveReplayingHtml = () => {
    setTimeout(() => {
      setReplayedHtmls(h => [...h, wrapperRef.current.innerHTML])
    }, 0)
  }

  React.useEffect(() => {
    if (isReplaying) {
      saveReplayingHtml()
    }
  }, [childProps, isReplaying])

  React.useEffect(() => {
    if(wrapperRef.current) {
      wrapperRef.current.addEventListener('keydown', e => {
        if(!isRecordingRef.current || (e.target as any).tagName !== 'INPUT') {
          // TODO: handle textarea
          return
        }

        const newValue = getNewInputValue(e)
        const targetId: string = (e.target as any).id
        const event: UserEvents = {kind: 'inputChange', targetId, value: newValue}
        console.log({e, event})
        setEvents(events => [...events, event])
      })
  
      wrapperRef.current.addEventListener('click', e => {
        // TODO: handle other clickable inputs
        const allowedOn = ['INPUT', 'BUTTON']
        if(!isRecordingRef.current || !allowedOn.includes((e.target as any).tagName)) {
          return
        }

        const targetId: string = (e.target as any).id
        const event: UserEvents = {kind: 'click', targetId}
        console.log({e, event})
        setEvents(events => [...events, event])
      })
    }
  }, [wrapperRef])

  const replayEvent = (e: UserEvents) => {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set
    const el = wrapperRef.current.querySelector('#' + e.targetId)
    console.log('element', {id: e.targetId, el})
    switch (e.kind) {
      case 'inputChange':
        nativeInputValueSetter.call(el, e.value)
        const iev = new Event('input', { bubbles: true})
        el.dispatchEvent(iev)
        return
      case 'click':
        console.log('clicking', el)
        const cev = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
          buttons: 1
        })
        el.dispatchEvent(cev)
        if (el.nodeName === 'INPUT') {
          const fev = new FocusEvent('focus', {
            view: window,
            bubbles: true,
            cancelable: true
          })
          el.dispatchEvent(fev)
        }

        return
      default:
        assertNever(e)
    }
  }

  const replay = async () => {
    if (wrapperRef.current) {
      await delay(300)
      setIsReplaying(true)
      setStates([])

      for (let index = 0; index < events.length; index++) {
        const event = events[index];
        
        replayEvent(event)
        await delay(100)
      }

      setIsReplaying(false)
      setCollapse(true)
      checkValid()
    }
  }

  const toggleRecord = () => {
    if (isRecording) {
      setIsRecording(false)
    } else {
      setEvents([])
      setStates([])
      setRecordedHtmls([])
      setReplayedHtmls([])
      setIsRecording(true)
    }
  }

  const saveRecording = () => {
    const newStory: Story = {
      name: storyName,
      events: eventsRef.current,
      htmls: recordedHtmlsRef.current
    }

    console.log('saving:', newStory)
    onSaveStory(newStory)
  }

  const updateStory = () => {
    const updatedStory: Story = {
      name: storyName,
      events: story.events,
      htmls: replayedHtmlsRef.current
    }

    console.log('saving:', updatedStory)
    onSaveStory(updatedStory)
  }

  const toggleShowRecording = () => {
    setShowRecording(!showRecording)
  }

  const toggleCollapse = () => {
    setCollapse(!collapse)
  }

  const canSaveStory = storyName != '' && recordedHtmls.length > 1

  return (<div>
    {hasStory && (
      <div className="flex items-center">
        <button onClick={toggleCollapse}>
          <span className={isValid ? 'text-green-400' : 'text-red-400'}>{story.name}</span>
        </button>
        {!isValid && 
          <button 
            className="pl-2"
            onClick={updateStory}>
            <svg className="h-5 w-5 fill-green-400" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </button>}
      </div>
    )}
    <div className={collapse ? 'hidden' : ''}>
      <Collapsible 
        collapsedByDefault={composerCollapsed} 
        className='pl-1'
        expand={<>show composer</>}
        collapse={<>hide composer</>}
        >
        <div
          ref={wrapperRef}
          className="pb-1">
            {lazyChildren(childProps)}
        </div>
      </Collapsible>
      <div>
        <div className="flex items-center pt-2">
          <button
            className="inline-flex"
            name="play"
            onClick={replay}>
              {isReplaying 
                ? <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                : <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>}
          </button>
          <button
            className="inline-flex"
            name="record"
            onClick={toggleRecord}>
              {isRecording ? 
                <svg className="h-5 w-5 fill-red-500" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
                : <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>}
          </button>
          <button
            className="inline-flex"
            name="showRecording"
            onClick={toggleShowRecording}>
            {showRecording 
              ? <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2h1v-2h-1zm-2-2H7v4h6v-4zm2 0h1V9h-1v2zm1-4V5h-1v2h1zM5 5v2H4V5h1zm0 4H4v2h1V9zm-1 4h1v2H4v-2z" clipRule="evenodd" />
                </svg>
              : <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>}
          </button>
          {!hasStory && <>
            <input 
              name="story" 
              type="text"
              className="ml-1 px-1 py-1 h-6 focus:ring-indigo-500 focus:border-indigo-500 block rounded-md text-xs border-gray-300" 
              placeholder="story name"
              value={storyName} 
              onChange={e => setStoryName(e.target.value)} />
            <button
              className={!canSaveStory ? 'inline-flex fill-gray-300' : 'inline-flex'}
              disabled={!canSaveStory}
              name="saveRecording"
              onClick={saveRecording}>
              <svg 
                className={!canSaveStory ? 'h-5 w-5 stroke-gray-300' : 'h-5 w-5 stroke-black'}
                fill="none" 
                viewBox="0 0 24 24" 
                >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </button>
          </>}
        </div>
        {events.length > 0 && <>
          <div>Steps:</div>
          <div>
            {events.map((e, i) => 
              <div key={i}><span className="text-green-400">{e.kind} {e.targetId} {(e as any).value}</span></div>)}
          </div>
        </>}
        {showRecording && <div className="relative">
          <div className="flex flex-row">{
            states.map(s => <div className="shrink-0 px-1">{lazyChildren(s)}</div>)}</div>
          <div className="absolute opacity-30 top-0 left-0 flex flex-row">{
            recordedHtmls.map(h => 
              <div className="shrink-0 px-1" dangerouslySetInnerHTML={{__html: h}} />)}
          </div>
        </div>
        }
      </div>
    </div>
  </div>)
}

const onLogin: OnLogin = (userName: string, password: string) => {
  return of({kind: 'success' as const, user: 'alex'})
}

const LoginStory = ({story, composerCollapsed = true, onSaveStory}: 
  {story?: Story, composerCollapsed? : boolean, onSaveStory: (s: Story) => void}) => {

  const actions: Actions = new Subject()
  const sm = new LoginFormStateManager(actions, onLogin)
  return <div className="p-2" key={(story ? story.name : '')}> 
    <View stream={sm.state}>
      {s => 
        <Recorder
          story={story}
          onSaveStory={onSaveStory}
          composerCollapsed={composerCollapsed}
          childProps={s} 
          lazyChildren={s => 
            <LoginView state={s} actions={actions} />} 
        />}
    </View>
  </div>
}

const Plus = ({}) =>
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>

const Minus = ({}) =>
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>

type CollapsibleProps = React.PropsWithChildren<{
  className: string, 
  collapsedByDefault?: boolean,
  expand?: React.ReactNode,
  collapse?: React.ReactNode
}>

const Collapsible = ({
    children, 
    className, 
    collapsedByDefault = true, 
    expand = <Plus />, 
    collapse = <Minus />}: CollapsibleProps) => {
  const [collapsed, setCollapsed] = React.useState(collapsedByDefault)
  return (
    <div className={className}>
      <div>
        <button
          className={'inline-flex'}
          name="expand"
          onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? expand : collapse}
        </button>
      </div>
      <div className={collapsed ? 'hidden' : ''}>
        {children}
      </div>
    </div>
  )
}

export const Stories = ({}) => {
  const [stories, setStories] = React.useState<Story[]>([])

  useSubscription(getSourceFilesUpdates(getDevServerMessages()).pipe(
    filter(u => !u.fileName.includes('server')),
    tap(m => {
      setTimeout(() => {
        // instead of trying to do HMR for stories
        // just reload the page and let all stories run from scratch
        window.location.reload()
      }, 0)
    })
  ))

  const getStories = () => {
    fetch('/devApi/stories', {
      method: 'GET',
      cache: 'no-cache',
      credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(json => {
      setStories(json)
    })
  }

  const saveStory = (story: Story) => {
    fetch('/devApi/stories', {
      method: 'POST',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(story)
    })
    .then(response => {
      console.log('story saved', {status: response.status})
      if (response.status === 201) {
        window.location.reload()
      }
      return
    })
  }

  React.useEffect(() => getStories(), [])

  return (
    <div className='p-2'> 
      <Collapsible className='pl-1'>
        <LoginStory composerCollapsed={false} onSaveStory={saveStory} />
      </Collapsible>
      {stories.map(s => <LoginStory key={s.name} onSaveStory={saveStory} story={s} />)}
      <hr/>
    </div>
  )
}
