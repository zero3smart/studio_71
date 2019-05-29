import React from "react"
import ReactGA from "react-ga"
import { connect } from "react-redux"
import { Button, ButtonProps, Dropdown, DropdownProps, Form, List, Icon, Message } from "semantic-ui-react"
import { FunctionsErrorCode, Role } from "../enums"
import { functions } from "../firebaseApp"
import { ITranscript } from "../interfaces"
import "../css/Share.scss"

const options = [
  { key: Role.Viewer, text: "Lese", value: Role.Viewer },
  { key: Role.Editor, text: "Skrive", value: Role.Editor },
  { key: Role.Owner, text: "Eie", value: Role.Owner }
]

interface IProps {
  transcriptId: string
  transcript: ITranscript
  user: firebase.User
}

interface IState {
  role: Role
  iconName: object
  hasError: boolean
  error: object
  hasWarning: boolean
  warning: object
  isLoadingShare: number
  isLoadingDelete: object
  isLoadingDropdown: object
}

class Share extends React.Component<IProps, IState> {
  public state: Readonly<IState> = {
    email: "",
    role: Role.Viewer,
    iconName: {},
    hasError: false,
    error: {},
    hasWarning: false,
    warning: {},
    isLoadingShare: 0,
    isLoadingDelete: {},
    isLoadingDropdown: {}
  }

  public render() {
    const { transcript } = this.props
    const { isLoadingShare, isLoadingDelete, isLoadingDropdown } = this.state
    let items = []

    if (transcript) {
      for (let [key, value] of Object.entries(transcript.roles)) {
        if (this.getOwnerCount() === 1 && value.role === Role.Owner)
          continue

        items.push(
          <List.Item key={key}>
            <List.Content>
              <span style={{ width: "274px", display: "inline-block" }}>{value.name}</span>
              {isLoadingDropdown.hasOwnProperty(key) && isLoadingDropdown[key] === 1 ?
                <Icon link name={"spinner"} style={{ marginLeft: "10px" }} />
                :
                <Dropdown onChange={this.handleRoleChangedForExisting} options={options} placeholder="Choose an option" selection name={key} value={value.role} />
              }

              {isLoadingDelete.hasOwnProperty(key) && isLoadingDelete[key] === 1 ?
                <Icon link name={"spinner"} style={{ marginLeft: "10px" }} />
                :
                <Icon link name={"close"} style={{ marginLeft: "10px" }} onClick={e => this.removeAccess(e, key)} />
              }
            </List.Content>
          </List.Item>,
        )
      }
    }

    return (
      <div className="share-container">
        <List divided verticalAlign="middle">
          {items}
        </List>

        <h3>Share with new user</h3>

        <Form>
          <Form.Group>
            <Form.Input value={this.state.email} placeholder="E-postadresse" name="email" onChange={this.handleEmailChanged} />
            <Dropdown onChange={this.handleRoleChanged} options={options} placeholder="Choose an option" selection value={this.state.role} />

            <Button positive onClick={this.handleShareAddButtonClicked} loading={isLoadingShare === 1 ? true : false} disabled={isLoadingShare === 1 ? true : false}>
              Legg til
            </Button>
          </Form.Group>
          <Form.Group>
            {this.state.hasError && (
              <Message negative>
                <p>{this.state.error.message}</p>
              </Message>
            )}
            {this.state.hasWarning && (
              <Message warning>
                <p>{this.state.warning.message}</p>
              </Message>
            )}
          </Form.Group>
        </Form>
      </div>
    )
  }

  private handleEmailChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      email: event.target.value
    })
  }

  private handleRoleChanged = (event: React.SyntheticEvent<HTMLElement, Event>, data: DropdownProps) => {
    this.setState({
      role: data.value as Role
    })
  }

  private getOwnerCount = () => {
    const { transcript, transcriptId } = this.props
    let ownerCnt = 0

    if (transcript) {
      for (let [key, value] of Object.entries(transcript.roles)) {
        if (value.role === Role.Owner) ownerCnt++
      }
    }

    return ownerCnt
  }

  private handleRoleChangedForExisting = async (event: React.SyntheticEvent<HTMLElement, Event>, data: DropdownProps) => {
    ReactGA.event({
      action: "dropdown pressed for changing the existing role",
      category: "transcript",
    })

    this.setState({ hasError: false, hasWarning: false, isLoadingDropdown: { [data.name]: 1 } })

    const transcriptId = this.props.transcriptId
    const shareTranscript = functions.httpsCallable("shareTranscript")

    let userId = data.name
    let role = data.value as Role
    console.log(userId, role)

    let ownerCnt = this.getOwnerCount()

    if (ownerCnt === 1 && this.props.user.uid === userId && role !== Role.Owner) {
      this.setState({
        hasWarning: true,
        warning: {
          message: "The transcript must have at least one owner",
        },
      })

      return
    }

    try {
      await shareTranscript({ userId, transcriptId, role })
      this.setState({ isLoadingDropdown: { [data.name]: 0 } })
    } catch (error) {
      this.setState({ isLoadingDropdown: { [data.name]: 0 } })

      if (error.code === FunctionsErrorCode.PermissionDenied)
        this.setState({
          hasError: true,
          error: { message: "You're not owner. You don't have the permission to change the role." },
        })
      console.error(error)
      ReactGA.exception({
        description: error.message,
        fatal: false,
      })
    }
  }

  private removeAccess = async (e: MouseEvent, key: string) => {
    ReactGA.event({
      action: "X button pressed",
      category: "transcript",
    })

    this.setState({ hasError: false, hasWarning: false, isLoadingDelete: { [key]: 1 } })

    const { transcriptId } = this.props
    const shareTranscript = functions.httpsCallable("shareTranscript")

    let userId = key
    let role = Role.None
    console.log(userId, role)

    let ownerCnt = this.getOwnerCount()

    if (ownerCnt === 1 && this.props.user.uid === userId) {
      this.setState({
        hasWarning: true,
        warning: {
          message: "The transcript must have at least one owner",
        },
      })

      return
    }

    try {
      await shareTranscript({ userId, transcriptId, role })
      this.setState({ isLoadingDelete: { [key]: 0 } })
    } catch (error) {
      this.setState({ isLoadingDelete: { [key]: 0 } })

      if (error.code === FunctionsErrorCode.PermissionDenied)
        this.setState({
          hasError: true,
          error: { message: "You're not owner. You don't have the permission to change the role." },
        })

      console.error(error)
      ReactGA.exception({
        description: error.message,
        fatal: false,
      })
    }
  }

  private handleShareAddButtonClicked = async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>, data: ButtonProps) => {
    ReactGA.event({
      action: "share button pressed",
      category: "transcript",
    })

    this.setState({ hasError: false, hasWarning: false, isLoadingShare: 1 })

    const transcriptId = this.props.transcriptId
    const shareTranscript = functions.httpsCallable("shareTranscript")

    const { email, role } = this.state
    console.log(email, role)

    try {
      await shareTranscript({ email, transcriptId, role })
      this.setState({ isLoadingShare: 0 })
    } catch (error) {
      this.setState({ isLoadingShare: 0 })

      if (error.code === FunctionsErrorCode.NotFound)
        this.setState({
          hasError: true,
          error: { message: "That user does not exist" },
        })
      else if (error.code === FunctionsErrorCode.AlreadyExists)
        this.setState({
          hasError: true,
          error: { message: "User has been already invited" },
        })

      console.error(error)
      ReactGA.exception({
        description: error.message,
        fatal: false,
      })
    }
  }
}

const mapStateToProps = (state: State): IProps => {
  return {
    user: state.firebase.auth
  }
}

export default connect(mapStateToProps)(Share)