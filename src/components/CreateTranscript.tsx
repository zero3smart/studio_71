import firebase from "firebase/app"
import React, { Component } from "react"
import ReactGA from "react-ga"
import { Button, Form, Grid, Header } from "semantic-ui-react"
import { InteractionType, MicrophoneDistance, OriginalMediaType, RecordingDeviceType, Role, UploadTaskStatus } from "../enums"
import { database, storage } from "../firebaseApp"
import { IMetadata, ITranscript, IUploadTask } from "../interfaces"
import Languages from "./Languages"
import UploadMetadata from "./UploadMetadata"
import UploadTasks from "./UploadTasks"

interface IProps {
  files: File[]
  userId: string
  handleCreateTranscriptCompletedOrAborted: () => void
}

interface IState {
  audioTopic: string
  cancelButtonPressed: boolean
  industryNaicsCodeOfAudio: string
  interactionType: InteractionType
  isSending: boolean
  languageCodes: string[]
  microphoneDistance: MicrophoneDistance
  originalMediaType: OriginalMediaType
  recordingDeviceName: string
  recordingDeviceType: RecordingDeviceType
  sendButtonPressed: boolean
  speechContextsPhrases: string
  uploadTasks: {
    [transcriptId: string]: IUploadTask
  }
}

export default class CreateTranscript extends Component<IProps, IState> {
  public state: Readonly<IState> = {
    audioTopic: "",
    cancelButtonPressed: false,
    industryNaicsCodeOfAudio: "",
    interactionType: InteractionType.Unspecified,
    isSending: false,
    languageCodes: ["nb-NO"],
    microphoneDistance: MicrophoneDistance.Unspecified,
    originalMediaType: OriginalMediaType.Unspecified,
    recordingDeviceName: "",
    recordingDeviceType: RecordingDeviceType.Unspecified,
    sendButtonPressed: false,
    speechContextsPhrases: "",
    uploadTasks: {},
  }

  public async componentDidUpdate(prevProps: IProps, prevState: IState) {
    // If send button has been pressed, check if we're waiting for files to upload
    if (this.state.sendButtonPressed && this.state.isSending === false && Object.entries(this.state.uploadTasks).filter(([k, uploadTask]) => uploadTask.status === UploadTaskStatus.Uploading).length === 0) {
      this.handleSend()
    }
  }

  public render() {
    const files = this.props.files
    const userId = this.props.userId

    const sendButtonDisabled =
      this.state.languageCodes.length === 0 ||
      this.state.isBusy ||
      Object.entries(this.state.uploadTasks).filter(([k, uploadTask]) => uploadTask.status === UploadTaskStatus.Completed || uploadTask.status === UploadTaskStatus.Uploading).length === 0

    return (
      <Grid>
        <Grid.Column width={16}>
          <Header as="h1">Ny transkripsjon</Header>
          <Form loading={this.state.isBusy}>
            <Languages languageCodes={this.state.languageCodes} handleLanguageChanged={this.handleLanguageChanged} />
            <UploadMetadata
              audioTopic={this.state.audioTopic}
              industryNaicsCodeOfAudio={this.state.industryNaicsCodeOfAudio}
              interactionType={this.state.interactionType}
              microphoneDistance={this.state.microphoneDistance}
              originalMediaType={this.state.originalMediaType}
              recordingDeviceName={this.state.recordingDeviceName}
              recordingDeviceType={this.state.recordingDeviceType}
              speechContextsPhrases={this.state.speechContextsPhrases}
              handleInteractionTypeChange={this.handleInteractionTypeChange}
              handleAudioTopicChange={this.handleAudioTopicChange}
              handleIndustryNaicsCodeOfAudioChange={this.handleIndustryNaicsCodeOfAudioChange}
              handleMicrophoneDistanceChange={this.handleMicrophoneDistanceChange}
              handleOriginalMediaTypeChange={this.handleOriginalMediaTypeChange}
              handleRecordingDeviceNameChange={this.handleRecordingDeviceNameChange}
              handleRecordingDeviceTypeChange={this.handleRecordingDeviceTypeChange}
              handleSpeechContextsPhrasesChange={this.handleSpeechContextsPhrasesChange}
            />
            {(() => {
              if (files) {
                return (
                  <UploadTasks
                    handleUploadTaskCreated={this.handleUploadTaskCreated}
                    uploadTasks={this.state.uploadTasks}
                    handleUploadCompleted={this.handleUploadCompleted}
                    handleUploadFailed={this.handleUploadFailed}
                    handleUploadAborted={this.handleUploadAborted}
                    files={files}
                    userId={userId}
                  />
                )
              }

              return
            })()}
            <Button loading={this.state.sendButtonPressed} disabled={sendButtonDisabled} primary={true} type="submit" onClick={this.handleSendButtonPressed}>
              Send
            </Button>
            <Button loading={this.state.cancelButtonPressed} floated="right" type="submit" onClick={this.handleAbortButtonPressed}>
              Avbryt
            </Button>
          </Form>
        </Grid.Column>
      </Grid>
    )
  }

  private handleLanguageChanged = (languageCodes: string[]) => {
    this.setState({ languageCodes })
  }

  private handleUploadCompleted = (transcriptId: string) => {
    const uploadTasks = { ...this.state.uploadTasks }
    const uploadTask = uploadTasks[transcriptId]
    uploadTask.status = UploadTaskStatus.Completed

    this.setState({ uploadTasks })
  }

  private handleUploadFailed = (transcriptId: string, error: Error) => {
    const uploadTasks = { ...this.state.uploadTasks }
    const uploadTask = uploadTasks[transcriptId]
    uploadTask.error = error
    uploadTask.status = UploadTaskStatus.Failed

    this.setState({ uploadTasks })
  }

  private handleUploadAborted = (transcriptId: string) => {
    const uploadTasks = { ...this.state.uploadTasks }
    const uploadTask = uploadTasks[transcriptId]
    uploadTask.status = UploadTaskStatus.Aborted

    this.setState({ uploadTasks })
  }

  private handleAbortButtonPressed = async () => {
    this.setState({ cancelButtonPressed: true, sendButtonPressed: false })

    for (const transcriptId of Object.keys(this.state.uploadTasks)) {
      const uploadTask = this.state.uploadTasks[transcriptId]

      // Deleting all uploaded files that are not already removed
      if (uploadTask.status === UploadTaskStatus.Completed) {
        try {
          await storage
            .ref(`/transcripts/${transcriptId}`)
            .child("original")
            .delete()
        } catch (error) {
          console.log(error)
        }
      }
    }

    this.props.handleCreateTranscriptCompletedOrAborted()
  }

  private handleUploadTaskCreated = (uploadTask: IUploadTask) => {
    const uploadTasks = { ...this.state.uploadTasks }

    uploadTasks[uploadTask.transcriptId] = uploadTask

    this.setState({ uploadTasks })
  }

  private handleInteractionTypeChange = (interactionType: InteractionType) => {
    this.setState({ interactionType })
  }

  private handleAudioTopicChange = (audioTopic: string) => {
    this.setState({ audioTopic })
  }
  private handleIndustryNaicsCodeOfAudioChange = (industryNaicsCodeOfAudio: string) => {
    this.setState({ industryNaicsCodeOfAudio })
  }
  private handleOriginalMediaTypeChange = (originalMediaType: OriginalMediaType) => {
    this.setState({ originalMediaType })
  }
  private handleMicrophoneDistanceChange = (microphoneDistance: MicrophoneDistance) => {
    this.setState({ microphoneDistance })
  }
  private handleRecordingDeviceNameChange = (recordingDeviceName: string) => {
    this.setState({ recordingDeviceName })
  }
  private handleRecordingDeviceTypeChange = (recordingDeviceType: RecordingDeviceType) => {
    this.setState({ recordingDeviceType })
  }
  private handleSpeechContextsPhrasesChange = (speechContextsPhrases: string) => {
    this.setState({ speechContextsPhrases })
  }

  private handleSendButtonPressed = async () => {
    this.setState({ sendButtonPressed: true })
  }

  private handleSend = async () => {
    this.setState({ isSending: true })

    // Get a new write batch
    const batch = database.batch()

    const completedUploadTasks = Object.entries(this.state.uploadTasks).filter(([k, uploadTask]) => uploadTask.status === UploadTaskStatus.Completed)

    for (const [transcriptId, uploadTask] of completedUploadTasks) {
      const file = uploadTask.file

      const fileNameAndExtension = [file.name.substr(0, file.name.lastIndexOf(".")), file.name.substr(file.name.lastIndexOf(".") + 1, file.name.length)]

      let name = ""
      let fileExtension = ""
      if (fileNameAndExtension.length === 2) {
        name = fileNameAndExtension[0]
        fileExtension = fileNameAndExtension[1]
      }

      // Metadata

      const metadata: IMetadata = {
        fileExtension,
        interactionType: this.state.interactionType,
        languageCodes: this.state.languageCodes,
        microphoneDistance: this.state.microphoneDistance,
        originalMediaType: this.state.originalMediaType,
        originalMimeType: file.type,
        recordingDeviceType: this.state.recordingDeviceType,
      }

      // Add non empty fields

      if (this.state.audioTopic !== "") {
        metadata.audioTopic = this.state.audioTopic
      }

      const industryNaicsCodeOfAudio = parseInt(this.state.industryNaicsCodeOfAudio, 10)

      if (!isNaN(industryNaicsCodeOfAudio)) {
        metadata.industryNaicsCodeOfAudio = industryNaicsCodeOfAudio
      }

      if (this.state.recordingDeviceName !== "") {
        metadata.recordingDeviceName = this.state.recordingDeviceName
      }

      // Clean up phrases

      const phrases = this.state.speechContextsPhrases
        .split(",")
        .filter(phrase => {
          return phrase.trim()
        })
        .map(phrase => phrase.trim())

      if (phrases.length > 0) {
        metadata.speechContexts = [{ phrases }]
      }

      const transcript: ITranscript = {
        metadata,
        name,
        userIds: [this.props.userId],
      }

      batch.set(database.doc(`transcripts/${transcriptId}`), transcript)
    }

    try {
      // Commit the batch
      await batch.commit()

      this.props.handleCreateTranscriptCompletedOrAborted()
    } catch (error) {
      ReactGA.exception({
        description: error.message,
        fatal: false,
      })

      console.error(error)
    }
  }
}
