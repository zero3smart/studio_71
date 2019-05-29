import React, { Component } from "react"
import ReactGA from "react-ga"
import { connect } from "react-redux"
import { withFirebase } from "react-redux-firebase"
import { RouteComponentProps, withRouter } from "react-router"
import { compose } from "redux"

interface IState {
  email: string
  password: string
}

class Login extends Component<RouteComponentProps<{}>, IState> {
  constructor(props: any) {
    super(props)

    this.state = {
      email: "",
      password: "",
    }
  }

  public render() {
    return (
      <main id="transcript">
        <h1>Logg inn</h1>
        <form className="dropForm" onSubmit={this.handleSubmit}>
          <div>
            <label className="org-label">
              E-postadresse
              <input type="text" value={this.state.email} onChange={this.handleChangeEmail} />
            </label>
            <label className="org-label">
              Password
              <input type="text" value={this.state.password} onChange={this.handleChangePassword} />
            </label>
            <button className="org-btn org-btn--primary" disabled={this.submitButtonIsDisabled()} type="submit">
              Logg inn
            </button>
          </div>
        </form>
      </main>
    )
  }

  private submitButtonIsDisabled() {
    return this.state.email === "" || this.state.password === ""
  }

  private handleChangeEmail = (event: React.ChangeEvent<HTMLInputElement>) => {
    const email = event.target.value
    this.setState({ email })
  }

  private handleChangePassword = (event: React.ChangeEvent<HTMLInputElement>) => {
    const password = event.target.value
    this.setState({ password })
  }

  private handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const { email, password } = this.state

    console.log(email, password)

    try {
      await this.props.firebase.auth().signInWithEmailAndPassword(email, password)

      window.location.href = "/transcripts"
    } catch (error) {
      console.error(error)
      ReactGA.exception({
        description: error.message,
        fatal: false,
      })
    }
  }
}

export default compose(
  withFirebase,
  connect(
    // Map redux state to component props
    ({ firebase: { auth, profile } }) => ({
      auth,
      profile,
    }),
  ),
  withRouter,
)(Login)
