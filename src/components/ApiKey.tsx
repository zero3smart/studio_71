import axios from "axios"
import moment from "moment"
import React, { Component } from "react"
import { connect } from "react-redux"
import { Button, Container, Header, Icon, Label, Popup } from "semantic-ui-react"

interface IState {
  apiKey?: string
  createdAt?: Date
  isLoading: boolean
}

interface IAPI {
  apiKey?: string
  createdAt?: Date
}

class ApiKey extends Component<any, IState> {
  public state: Readonly<IState> = { apiKey: undefined, createdAt: undefined, isLoading: true }

  private api = axios.create({
    baseURL: process.env.API_URL,
  })

  constructor(props: any) {
    super(props)
  }

  public async componentDidMount() {
    if (this.props.user.uid !== undefined) {
      await this.getApiKey()
    }
  }

  public async componentDidUpdate(prevProps: any) {
    if (this.props.user.uid !== prevProps.user.uid && this.props.user.uid) {
      await this.getApiKey()
    }
  }

  public render() {
    return (
      <Container fluid={true} textAlign="center">
        <Header className="api-key-header-wrapper" as="h1" icon={true} textAlign="center" style={{ color: "#2b4662" }}>
          <Icon name="key" circular={true} size="huge" />
          <Header.Content>API-tilgang</Header.Content>
        </Header>
        {(() => {
          if (!this.state.isLoading) {
            return this.renderAPIKey()
          } else {
            return null
          }
        })()}
      </Container>
    )
  }

  private async getApiKey() {
    try {
      const token = this.props.user.stsTokenManager.accessToken
      const response = await this.api.get("/apiKey", { headers: { Authorization: `Bearer ${token}` } })
      const data = response.data as IAPI

      if (data) {
        this.setState({
          apiKey: data.apiKey,
          createdAt: data.createdAt,
          isLoading: false,
        })
      }
    } catch (error) {
      this.setState({
        apiKey: undefined,
        createdAt: undefined,
        isLoading: false,
      })
    }
  }

  private createAPIKey = async () => {
    try {
      const token = this.props.user.stsTokenManager.accessToken
      const { data } = await this.api.post("/apiKey", {}, { headers: { Authorization: `Bearer ${token}` } })
      this.setState({
        apiKey: data.apiKey,
        createdAt: undefined,
      })
    } catch (error) {
      console.log(error)
    }
  }

  private renderAPIKey() {
    if (!this.state.createdAt && !this.state.apiKey) {
      return (
        <div>
          <p style={{ color: "#b71c1c", fontSize: "20px" }}>Du har ikke laget en API-passord ennå. </p>
          <Button primary={true} onClick={this.createAPIKey}>
            Lag API-passord
          </Button>
        </div>
      )
    } else if (this.state.apiKey) {
      return (
        <div>
          <p style={{ color: "#546a81", fontSize: "20px" }}>Vennligst kopier ID og passord og lagre de på et trygt sted.</p>
          <p style={{ color: "#b71c1c", fontSize: "20px" }}>Av sikkerhetsmessige årsaker kan vi ikke vise deg passordet igjen.</p>
          <Label className="api-key-text">ID: {this.props.user.uid}</Label>
          <Label className="api-key-text">Passord: {this.state.apiKey}</Label>
        </div>
      )
    } else if (this.state.createdAt) {
      return (
        <div>
          <p style={{ color: "#b71c1c", fontSize: "20px" }}>
            Du laget et API-passord{" "}
            {moment(this.state.createdAt)
              .locale("nb")
              .format("LLL")}
            .
          </p>
          <Popup
            trigger={<Button color="red" primary={true} content="Lag et nytt API-passord" />}
            content={
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "16px" }}>Er du sikker på at du vil lage et nytt API-passord? Det vil føre til at det gamle slutter å fungere.</p>
                <Button color="green" onClick={this.createAPIKey} content="OK" />
              </div>
            }
            on="click"
            position="bottom center"
          />
        </div>
      )
    }

    return null
  }
}

const mapStateToProps = (state: any) => ({
  user: state.firebase.auth,
})

export default connect(mapStateToProps)(ApiKey)
