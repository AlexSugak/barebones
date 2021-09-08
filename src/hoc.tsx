import { React } from './react.js'
import { equals } from './eq.js'
import { map, Observable, Subscription } from './rx.js'

export interface ObservableNodeProps {
  children?: Observable<React.ReactNode>
}

export interface ObservableNodeState {
  renderCache?: React.ReactNode | null
  subscription?: Subscription | null
}

/**
 * A wrapper component that allows to use observables of react nodes as children
 */
export class ObservableNode
 extends React.Component<ObservableNodeProps, ObservableNodeState> {

  state = ObservableNode._initState

  static _initState: ObservableNodeState = {
    renderCache: null,
    subscription: null
  }

  static _endState: ObservableNodeState = {
    subscription: null
  }

  render() {
    return this.state.renderCache || null
  }

  private _subscribe(newProps: ObservableNodeProps) {
    const { children } = newProps

    if (children) {
      let subscription = children.subscribe(
        (v: React.ReactNode) => this._handleValue(v),
        (e: any) => this._handleError(e),
        () => this._handleCompleted())
  
      // observable has completed and unsubscribed by itself
      if (subscription && subscription.closed) {
        subscription = null
      }

      this.setState({
        renderCache: this.state.renderCache,
        subscription
      })
    }
  }

  private _handleError = (e: any) => {
    throw e
  }

  private _handleValue(value: React.ReactNode) {
    const renderCache = React.createElement(React.Fragment, {}, value)

    this.setState(state =>
      !equals(state.renderCache, renderCache) ? { renderCache } : {}
    )
  }

  private _handleCompleted() {
    this.setState(ObservableNode._endState)
  }

  private _unsubscribe() {
    const subscription = this.state ? this.state.subscription : null
    if (subscription)
      subscription.unsubscribe()
    }

  UNSAFE_componentWillReceiveProps(newProps: ObservableNodeProps) {
    this._unsubscribe()
    this._subscribe(newProps)
  }

  UNSAFE_componentWillMount() {
    this._unsubscribe()
    this._subscribe(this.props)
  }

  componentWillUnmount() {
    this._unsubscribe()
    this.setState(ObservableNode._initState)
  }

  shouldComponentUpdate(
    _newProps: Readonly<ObservableNodeProps>,
    newState: Readonly<ObservableNodeState>,
    _newContext: any
  ) {
    return newState.renderCache !== this.state.renderCache
  }
}

export const Watch = <T,>({stream, children}: {stream: Observable<T>, children: (s: T) => React.ReactNode}) => 
(<ObservableNode>
  { stream.pipe(map(s => children(s))) }
</ObservableNode>)
