import React, { Component } from "react"
import ReactGA from "react-ga"
import { connect } from "react-redux"
import { FirebaseReducer, withFirebase } from "react-redux-firebase"
import { RouteComponentProps, withRouter } from "react-router"
import { Link } from "react-router-dom"
import { compose } from "redux"
import { Button } from "semantic-ui-react"

interface IStateProps {
  auth: FirebaseReducer.Auth
  logout: () => void
}

class Auth extends Component<RouteComponentProps<{}> & IStateProps, any> {
  public componentDidUpdate() {
    console.log(this.props.auth)

    if (this.props.auth.isLoaded && !this.props.auth.isEmpty && !this.props.auth.displayName && this.props.location.pathname !== "/profile") {
      this.props.history.push("/profile")
    }
  }

  public render() {
    return (
      <div className="user">
        {(() => {
          if (this.props.auth.isLoaded === true && this.props.auth.uid) {
            let { displayName } = this.props.auth
            if (!displayName) {
              displayName = ""
            }
            if (process.env.NODE_ENV === "development") {
              displayName += ` (${this.props.auth.uid})`
            }
            return (
              <>
                <Button as={Link} to={"/profile"}>
                  {displayName}
                </Button>

                {/*<Button as={Link} to={"/api"}>
                  API
            </Button>*/}

                <button className="org-btn" onClick={this.logout}>
                  Logg ut
                </button>
              </>
            )
          } else {
            return <a href="/login">Logg inn</a>
          }
        })()}
      </div>
    )
  }

  private logout = () => {
    this.props.history.push("/")
    this.props.firebase.logout()

    ReactGA.event({
      action: "log out button pressed",
      category: "authentication",
    })
  }

  private goToApi = () => {
    this.props.history.push("/api")
  }
}
export default compose(
  withFirebase,
  connect(
    // Map redux state to component props
    ({ firebase: { auth, profile } }) => ({ auth, profile }),
  ),
  withRouter,
)(Auth)
