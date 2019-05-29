import firebase from "firebase/app"
import React, { Component, createRef } from "react"
import ReactGA from "react-ga"
import { Icon, List, Loader, Popup } from "semantic-ui-react"
import { UploadTaskStatus } from "../enums"
import { storage } from "../firebaseApp"
import { IUploadTask } from "../interfaces"

interface IProps {
  handleUploadCompleted: (transcriptId: string) => void
  handleUploadFailed: (transcriptId: string, error: Error) => void
  handleUploadAborted: (transcriptId: string) => void

  uploadTask: IUploadTask

  userId: string
  abortTask?: boolean
}

interface IState {
  percent: number
  hover: boolean
}

export default class UploadTask extends Component<IProps, IState> {
  private uploadTask?: firebase.storage.UploadTask

  constructor(props) {
    super(props)
    this.state = {
      hover: false,
      percent: 0,
    }
  }

  public componentDidMount() {
    this.uploadFile()
  }

  public render() {
    if (this.props.uploadTask.status === UploadTaskStatus.Aborted) {
      return null
    }

    return (
      <List.Item key={this.props.uploadTask.transcriptId} onMouseLeave={this.handleOnMouseLeave} onMouseEnter={this.handleOnMouseEnter}>
        <List.Content floated="right">
          {(() => {
            if (this.state.hover) {
              return <Icon onClick={this.handleUploadAborted} link={true} name="close" color="red" />
            } else {
              switch (this.props.uploadTask.status) {
                case UploadTaskStatus.Uploading:
                  return <div>{this.state.percent}%</div>
                case UploadTaskStatus.Completed:
                  return <List.Icon name="checkmark" color="green" verticalAlign="middle" />
                case UploadTaskStatus.Failed:
                  return <Popup trigger={<List.Icon name="warning sign" color="orange" verticalAlign="middle" />} header={this.props.uploadTask.error.name} content={this.props.uploadTask.error.message} />

                default:
                  return
              }
            }
          })()}
        </List.Content>
        <List.Content>
          <List.Header>{this.props.uploadTask.file.name}</List.Header>
        </List.Content>
      </List.Item>
    )
  }

  public componentWillUnmount() {
    if (this.uploadTask) {
      this.uploadTask.cancel()
    }
  }

  private uploadFile() {
    // Immediately start uploading the file

    this.uploadTask = storage
      .ref(`/transcripts/${this.props.uploadTask.transcriptId}`)
      .child(`original`)
      .put(this.props.uploadTask.file)

    this.uploadTask.on(
      firebase.storage.TaskEvent.STATE_CHANGED,
      (snapshot: any) => {
        const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)

        this.setState({ percent })
      },
      (error: any) => {
        // https://firebase.google.com/docs/storage/web/handle-errors

        switch (error.code) {
          case "storage/canceled":
            // User canceled the upload
            break
          default:
            console.error(error)

            ReactGA.exception({
              description: error.message,
              fatal: false,
            })
            this.props.handleUploadFailed(this.props.uploadTask.transcriptId, error)
        }
      },
      () => {
        this.props.handleUploadCompleted(this.props.uploadTask.transcriptId)
      },
    )
  }

  private handleUploadAborted = async (info: any) => {
    // Cancel the upload task

    if (this.uploadTask && this.uploadTask.cancel()) {
      this.props.handleUploadAborted(this.props.uploadTask.transcriptId)
    }
    // If file upload if complete, we need to remove the file from storage
    else if (this.props.uploadTask.status === UploadTaskStatus.Completed) {
      try {
        await storage
          .ref(`/transcripts/${this.props.uploadTask.transcriptId}`)
          .child("original")
          .delete()

        this.props.handleUploadAborted(this.props.uploadTask.transcriptId)
      } catch (error) {
        console.log(error)
      }
    }
  }

  private handleOnMouseEnter = (info: any) => {
    if (this.props.uploadTask.error === undefined) {
      this.setState({ hover: true })
    }
  }

  private handleOnMouseLeave = (info: any) => {
    this.setState({ hover: false })
  }
}
