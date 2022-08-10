import { React } from '../react'

export const Player = React.forwardRef<HTMLVideoElement, {}>(({}, ref) => {
  return (
    <div>
      <div>
        <video style={{backgroundColor: 'gray'}} ref={ref} height={"200"} width={"300"} autoPlay muted />
      </div>
    </div>
  )
})

export const PlayBtn = ({onClick, isPlaying}: {onClick: () => void, isPlaying: boolean}) => {
  return (
    <button
      className="inline-flex pointer"
      name="play"
      onClick={onClick}>
        {isPlaying 
          ? <svg style={{height: "1.25rem", width: "1.25rem"}} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          : <svg style={{height: "1.25rem", width: "1.25rem"}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>}
    </button>
  )
}

export const RecordBtn = ({onClick, isRecording}: {onClick: () => void, isRecording: boolean}) => {
  return (
    <button
      className="inline-flex pointer"
      name="record"
      onClick={onClick}>
        {isRecording 
          ? <svg style={{height: "1.25rem", width: "1.25rem"}} className="redFill" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
          : <svg style={{height: "1.25rem", width: "1.25rem"}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>}
    </button>
  )
}
