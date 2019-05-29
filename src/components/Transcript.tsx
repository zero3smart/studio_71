import * as React from "react"
import ReactGA from "react-ga"
import { connect } from "react-redux"
import { RouteComponentProps, withRouter } from "react-router"
import { ActionCreators } from "redux-undo"
import { Button, Icon, Popup } from "semantic-ui-react"
import { functions } from "../firebaseApp"
import { ITranscript } from "../interfaces"
import { selectTranscript } from "../store/actions/transcriptActions"
import Downloader from "./Downloader"
import Paragraphs from "./Paragraphs"
import Share from "./Share"
import { Role } from "../enums"
import { database } from "../firebaseApp"
import { FirebaseApp } from "@firebase/app-types";

interface IProps {
  history: History
  transcriptId: string
  transcript: {
    future: ITranscript[]
    past: ITranscript[]
    present: ITranscript
  }
  transcripts: ITranscript[]
  user: firebase.User
}

interface IReduxDispatchToProps {
  clearHistory: () => void
  selectTranscript: (transcriptId: string, transcript: ITranscript) => void
}

class Transcript extends React.Component<IProps & IReduxDispatchToProps> {
  public componentDidMount() {
    const { transcripts, transcriptId } = this.props

    if (transcriptId !== undefined && transcripts !== undefined) {
      const transcript = transcripts[transcriptId]

      this.props.selectTranscript(transcriptId, transcript)
    }
  }

  public componentDidUpdate(prevProps: IReduxStateToProps & IReduxDispatchToProps) {
    const transcriptId = this.props.transcriptId

    // If transcript has not yet been loaded, or user has selected a new ID, select transcript
    if (Object.entries(this.props.transcript.present).length === 0 || transcriptId !== prevProps.transcriptId) {
      const transcript = this.props.transcripts[transcriptId]

      this.props.selectTranscript(transcriptId, transcript)
    }

    // When the paragraphs are loaded the first time, we reset the undo history
    // This is to stop users from undoing back to a state before the paragraphs were loaded
    if (prevProps.transcript.present.paragraphs === undefined && this.props.transcript.present.paragraphs !== undefined) {
      this.props.clearHistory()
    }
  }

  public render() {
    const transcript = this.props.transcript.present
    const { user, transcripts, transcriptId } = this.props

    let isOwner = false;
    let role;

    if (transcript && transcript.roles) {
      for (let [key, value] of Object.entries(transcript.roles)) {
        if (key === user.uid) {
          role = value.role;
          if (role === Role.Owner) {
            isOwner = true;
            break;
          }
        }
      }
    }

    // Loading from Firebase
    if (Object.entries(transcript).length === 0) {
      return "Laster inn"
    } else {
      return (
        <main id="transcript">
          <section className="org-bar">
            <span className="org-text-l">{transcript.name}</span>

            {isOwner &&
              <Popup
                trigger={
                  <Button basic={true} compact={true} icon={true} labelPosition="left">
                    <Icon name="share" />
                    Del
                </Button>
                }
                content={<Share transcriptId={transcriptId} transcript={transcripts[transcriptId]} />}
                on="click"
                position="top right"
              />}

            <Downloader transcriptId={this.props.transcript.present.id} />

            {isOwner === true ?
              <button className="org-btn" onClick={e => this.handleDeleteButtonClicked(e, isOwner)}>
                <svg width="20" height="20" focusable="false" aria-hidden="true">
                  <use xlinkHref="#icon-garbage" />
                </svg>{" "}
                Slett
            </button> :
              <button className="org-btn" onClick={e => this.handleDeleteButtonClicked(e, isOwner)}>
                <svg width="20" height="20" focusable="false" aria-hidden="true">
                  <use xlinkHref="#icon-garbage" />
                </svg>{" "}
                Fjern
            </button>}
          </section>
          <div className="paragraphs">
            <Paragraphs transcriptId={transcript.id} role={role} />
          </div>
        </main>
      )
    }
  }

  private handleDeleteButtonClicked = async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>, isOwner: boolean) => {
    ReactGA.event({
      action: "delete button pressed",
      category: "transcript",
    })

    if (isOwner) {
      const transcriptId = this.props.transcriptId
      const deleteTranscript = functions.httpsCallable("deleteTranscript")

      try {
        this.props.history.push("/transcripts/")
        await deleteTranscript({ transcriptId })
      } catch (error) {
        console.error(error)
        ReactGA.exception({
          description: error.message,
          fatal: false,
        })
      }
    } else {
      /*let transcript = this.props.transcript.present;
      let ids = transcript.userIds.filter(e => e != this.props.user.uid);
      let roles = transcript.roles;
      let none = Role.None;
      let userId = this.props.user.uid;

      database.collection("transcripts").doc(this.props.transcriptId).set({ ...transcript, userIds: ids, roles: { ...roles, [userId]: none }}, {merge: true}).then(() => {
        console.log("Access removed");
      }).catch(error => {
        console.log(error);
      });*/
      const transcriptId = this.props.transcriptId
      const shareTranscript = functions.httpsCallable("shareTranscript")
      const role = Role.None;
      const email = this.props.user.email;

      try {
        this.props.history.push("/transcripts/")
        await shareTranscript({ email, transcriptId, role })
      } catch (error) {
        console.error(error)
        ReactGA.exception({
          description: error.message,
          fatal: false,
        })
      }
    }
  }
}

const mapStateToProps = (state: State): IReduxStateToProps => {
  return {
    transcript: state.transcript,
    transcripts: state.firestore.data.transcripts,
    user: state.firebase.auth,
  }
}

const mapDispatchToProps = (dispatch: React.Dispatch): IReduxDispatchToProps => {
  return {
    clearHistory: () => dispatch(ActionCreators.clearHistory()),
    selectTranscript: (transcriptId: string, transcript: ITranscript) => dispatch(selectTranscript(transcriptId, transcript)),
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Transcript)
