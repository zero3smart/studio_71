import * as React from "react"
import ReactGA from "react-ga"
import { connect } from "react-redux"
import { BrowserRouter, Link, Redirect, Route, Switch } from "react-router-dom"
import "../css/App.scss"
import ApiKey from "./ApiKey"
import Auth from "./Auth"
import Index from "./Index"
import Login from "./Login"
import Profile from "./Profile"
import Transcripts from "./Transcripts"

const trackingCode = process.env.GOOGLE_ANALYTICS_PROPERTY_ID

if (trackingCode) {
  ReactGA.initialize(trackingCode, {
    debug: false, // process.env.NODE_ENV === "development",
    titleCase: false,
  })
  ReactGA.pageview(window.location.pathname + window.location.search)
}

interface IStateProps {
  user?: firebase.User
}

class App extends React.Component<IStateProps, IState> {
  public render() {
    // console.log(this.props.user.uid);
    return (
      <BrowserRouter>
        <div className="container">
          <header className="org-color-dark">
            <svg height="17" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 55.9 20" enableBackground="new 0 0 55.9 20" xmlSpace="preserve" />
            <h1 className="org-text-l logo">
              <Link to="/"> Transkribering {process.env.NODE_ENV === "development" ? "(utvikling)" : ""}</Link>
            </h1>

            <Auth />
          </header>
          <Switch>
            <Route path="/" exact={true} render={() => (this.props.user.uid ? <Redirect to="/transcripts" /> : <Index />)} />
            <Route path="/profile" render={() => (this.props.user.isLoaded===true ? <Profile/> : <Index />)} />
            <Route path="/transcripts/:id?" render={props => <Transcripts {...props} user={this.props.user} />} />
            <Route path="/login" component={Login} />
            <Route path="/api" render={props => <ApiKey {...props} user={this.props.user} />} />
          </Switch>
        </div>
      </BrowserRouter>
    )
  }
}

const mapStateToProps = (state: IStateProps): IStateProps => {
  return {
    user: state.firebase.auth,
  }
}

export default connect<IStateProps, void, void>(mapStateToProps)(App)
