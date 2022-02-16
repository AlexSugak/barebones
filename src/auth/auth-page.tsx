import { React } from '../react'
import { Actions, LoginFormStateManager, LoginProps } from './auth-view'
import { LoginView } from '../components'
import { Subject } from '../rx'
import { View } from '../hoc'

export const Login = ({onLogin}: LoginProps) => {
  const actions: Actions = new Subject()
  const sm = new LoginFormStateManager(actions, onLogin)

  return (
    <View stream={sm.state}>
      { s => <LoginView state={s} actions={actions} /> }
    </View>
  )
}
