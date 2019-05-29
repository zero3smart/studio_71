import React, { Component } from "react"
import Dropzone from "react-dropzone"
import ReactGA from "react-ga"
import { Button, Header, Icon, List, Segment } from "semantic-ui-react"
import { UploadTaskStatus } from "../enums"
import { database } from "../firebaseApp"
import { IUploadTask } from "../interfaces"
import UploadTask from "./UploadTask"

interface IProps {
  files: File[]
  userId: string
  uploadTasks: {
    [transcriptId: string]: IUploadTask
  }
  handleUploadCompleted: (transcriptId: string) => void
  handleUploadFailed: (transcriptId: string, error: Error) => void
  handleUploadAborted: (transcriptId: string) => void
  handleUploadTaskCreated: (uploadTask: IUploadTask) => void
}

export default class UploadTasks extends Component<IProps, IState> {
  public componentDidMount() {
    this.processFiles(this.props.files)
  }

  public render() {
    return (
      <div className="file-upload-content">
        <Header as="h4">Filer</Header>

        <List selection={true} divided={true} relaxed={true} verticalAlign="middle">
          {Object.keys(this.props.uploadTasks).map((transcriptId, index) => {
            const uploadTask = this.props.uploadTasks[transcriptId]

            return (
              <UploadTask
                key={transcriptId}
                handleUploadCompleted={this.handleUploadCompleted}
                handleUploadAborted={this.handleUploadAborted}
                uploadTask={uploadTask}
                userId={this.props.userId}
                handleUploadFailed={this.props.handleUploadFailed}
              />
            )
          })}
        </List>
        <Segment placeholder={true}>
          <Dropzone accept="audio/*,video/*,application/mxf" onDrop={this.handleFileDrop}>
            {({ getRootProps, getInputProps, isDragActive }) => {
              return (
                <div {...getRootProps()} className="second-file-upload-content">
                  <input {...getInputProps()} />
                  <Header icon={true}>
                    <Icon name="file video outline" />
                    Slipp flere filer her
                  </Header>
                  <Button secondary={true}>Eller klikk for å velge</Button>
                </div>
              )
            }}
          </Dropzone>
        </Segment>
      </div>
    )
  }

  public handleUploadCompleted = (transcriptId: string) => {
    this.props.handleUploadCompleted(transcriptId)
  }

  public handleUploadAborted = (transcriptId: string) => {
    this.props.handleUploadAborted(transcriptId)
  }

  private async processFiles(files: File[]) {
    for (const file of files) {
      const transcriptId = await database.collection("/transcripts").doc().id

      const uploadTask: IUploadTask = {
        file,
        status: UploadTaskStatus.Uploading,
        transcriptId,
      }

      this.props.handleUploadTaskCreated(uploadTask)
    }
  }

  private handleFileDrop: any = (acceptedFiles: File[], rejectedFiles: File[], event: React.DragEvent<HTMLElement>) => {
    if (rejectedFiles.length > 0) {
      console.error(rejectedFiles)
      ReactGA.event({
        action: "upload failed",
        category: "transcript",
        label: rejectedFiles[0].type,
      })
    } else {
      this.processFiles(acceptedFiles)
    }
  }
}
