import React, { Component } from "react"
import ReactGA from "react-ga"
import { connect } from "react-redux"
import { RouteComponentProps } from "react-router"
import { Dispatch } from "redux"
import { Menu, Sidebar } from "semantic-ui-react"
import { ProgressType } from "../enums"
import { ITranscript } from "../interfaces"
import { selectTranscript } from "../store/actions/transcriptActions"
import CreateTranscript from "./CreateTranscript"
import Progress from "./Progress"
import Transcript from "./Transcript"
import TranscriptsList from "./TranscriptsList"

interface IStateProps {
  transcripts: ITranscript[]
  user: firebase.User
}

interface IProps {
  history: History
}

interface IState {
  files?: File[]
  sidebarVisible: boolean
}

class Transcripts extends Component<RouteComponentProps<{}> & IStateProps, IState> {
  public state: Readonly<IState> = { sidebarVisible: false }

  constructor(props: IStateProps) {
    super(props)
    console.log(props)
  }

  public render() {
    return (
      <main id="transcripts">
        {this.props.user.uid ? (
          <>
            <Sidebar.Pushable>
              <Sidebar as={Menu} animation="overlay" direction="right" vertical={true} width="wide" visible={this.state.sidebarVisible} onHidden={this.handleSidebarHidden}>
                {(() => {
                  if (this.state.files !== undefined) {
                    return <CreateTranscript handleCreateTranscriptCompletedOrAborted={this.handleCreateTranscriptCompletedOrAborted} files={this.state.files} userId={this.props.user.uid} />
                  } else {
                    return
                  }
                })()}
              </Sidebar>
              <Sidebar.Pusher>
                <TranscriptsList userId={this.props.user.uid} selectedTranscriptId={this.props.match.params.id} handleFilesSelected={this.handleFilesSelected} handleTranscriptIdSelected={this.handleTranscriptIdSelected} />
              </Sidebar.Pusher>
            </Sidebar.Pushable>
            {(() => {
              if (this.props.match.params.id) {
                if (this.props.transcripts !== undefined) {
                  const transcriptId = this.props.match.params.id

                  // Check status

                  const transcript: ITranscript = this.props.transcripts[transcriptId]

                  if (transcript === undefined) {
                    // Transcript not found
                    ReactGA.event({
                      action: "not found",
                      category: "transcript",
                      label: this.props.transcriptId,
                    })
                    return <div>Fant ikke transkripsjon</div>
                  } else if (transcript.status && transcript.status.progress && transcript.status.progress !== ProgressType.Done) {
                    return <Progress transcript={transcript} />
                  }
                }
                return <Transcript transcriptId={this.props.match.params.id} history={this.props.history} />
              }

              return
            })()}
          </>
        ) : (
          ""
        )}
      </main>
    )
  }
  public handleFilesSelected = (files: File[]) => {
    this.setState({ files, sidebarVisible: true })
  }

  public handleCreateTranscriptCompletedOrAborted = () => {
    this.setState({ sidebarVisible: false })
  }

  public handleTranscriptIdSelected = (transcriptId: string) => {
    this.props.history.push(`/transcripts/${transcriptId}`)
  }

  private handleSidebarHidden = () => {
    this.setState({ files: undefined })
  }

  /*private transcriptCreated = (transcriptId: string) => {
    // Push the newly created transcript id
    this.props.history.push(`/transcripts/${transcriptId}`)
    // Remove file so that Transcript is shown, and not CreateTranscript
    this.setState({ file: undefined })
  }*/
}

const mapStateToProps = (state: State): IStateProps => {
  return {
    transcripts: state.firestore.data.transcripts,
    user: state.firebase.auth,
  }
}

const mapDispatchToProps = (dispatch: Dispatch): IDispatchProps => {
  return {
    selectTranscript: (transcriptId: string) => dispatch(selectTranscript(transcriptId)),
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Transcripts)
