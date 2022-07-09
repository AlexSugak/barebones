import { React } from '../react'
import { Actions, LoginFormStateManager, LoginProps } from './auth-view'
import { LoginView } from '../components'
import { Subject } from '../rx'
import { View } from '../hoc'
import { useDisposable } from '../hooks'

export const Login = ({onLogin}: LoginProps) => {
  const actions: Actions = new Subject()
  const model = new LoginFormStateManager(actions, onLogin)

  useDisposable(model)

  return (
    <View stream={model.state}>
      { s => <LoginView state={s} actions={actions} /> }
    </View>
  )
}
