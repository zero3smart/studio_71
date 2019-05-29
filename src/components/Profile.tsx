import React, { Component } from "react"
import ReactGA from "react-ga"
import { connect } from "react-redux"
import { withFirebase } from "react-redux-firebase"
import { withRouter } from "react-router"
import { compose } from "redux"
import { Button, Container, Form, Input } from "semantic-ui-react"

interface IUser {
  displayName?: string
}

class Profile extends Component<any, IUser> {
  constructor(props: any) {
    super(props)

    this.state = {
      displayName: "",
    }
  }

  public componentWillMount() {
    console.log(this.props.auth.displayName)
    this.setState({ displayName: this.props.auth.displayName || "" })
  }

  public render() {
    return (
      <Container text={true}>
        <Form onSubmit={this.onSubmit}>
          <Form.Field required={true}>
            <label>Navn</label>
            <Input placeholder="Name" value={this.state.displayName} name="name" onChange={this.handleChangeName} />
          </Form.Field>

          <Button type="submit" primary={true} disabled={this.submitButtonIsDisabled()}>
            Lagre
          </Button>
        </Form>
      </Container>
    )
  }

  private handleChangeName = (event: React.ChangeEvent<HTMLInputElement>) => {
    const displayName = event.target.value
    this.setState({ displayName })
  }

  private submitButtonIsDisabled() {
    return this.state.displayName === ""
  }

  private onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const { displayName } = this.state

    try {
      await this.props.firebase.auth().currentUser.updateProfile({ displayName })
      window.location.href = "/profile"
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
    ({ firebase: { auth, profile } }) => ({ auth, profile }),
  ),
  withRouter,
)(Profile)
