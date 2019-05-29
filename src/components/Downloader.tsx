import React, { Component } from "react"
import ReactGA from "react-ga"
import { connect } from "react-redux"
import { FirebaseReducer, withFirebase } from "react-redux-firebase"
import { withRouter } from "react-router"
import { compose } from "recompose"

interface IProps {
  transcriptId: string
}

interface IReduxStateToProps {
  auth: FirebaseReducer.Auth
}

class Downloader extends Component<IProps & IReduxStateToProps, any> {
  public render() {
    return (
      <>
        <button className="org-btn" onClick={() => this.handleExportTranscriptButtonClicked("docx")}>
          <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
            <g fill="none" fillRule="evenodd">
              <path d="M17 0H3a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V3a3 3 0 0 0-3-3z" fill="#252627" />
              <text fontFamily="Roboto-Medium, Roboto" fontSize="15" fontWeight="400" fill="#FFF" transform="translate(0 -2)">
                <tspan x="4.4" y="16">
                  w
                </tspan>
              </text>
            </g>
          </svg>{" "}
          docx
        </button>

        <button className="org-btn" onClick={() => this.handleExportTranscriptButtonClicked("xmp")}>
          <svg width="20" height="20" focusable="false" aria-hidden="true">
            <use xlinkHref="#icon-premiere" />
          </svg>{" "}
          xmp
        </button>

        <button className="org-btn" onClick={() => this.handleExportTranscriptButtonClicked("aaf")}>
          <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
            <g fill="none" fillRule="evenodd">
              <path d="M17 0H3a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V3a3 3 0 0 0-3-3z" fill="#252627" />
            </g>
          </svg>{" "}
          aaf
        </button>
      </>
    )
  }

  private handleExportTranscriptButtonClicked = async (type: string) => {
    ReactGA.event({
      action: "export button pressed",
      category: "transcript",
      label: type,
    })

    const transcriptId = this.props.transcriptId

    let url: string

    if (type === "aaf") {
      url = `${process.env.REACT_APP_FIREBASE_HTTP_CLOUD_FUNCTION_URL}/downloadAaf?transcriptId=${transcriptId}&type=${type}`
    } else {
      url = `${process.env.REACT_APP_FIREBASE_HTTP_CLOUD_FUNCTION_URL}/exportTranscript?transcriptId=${transcriptId}&type=${type}`
    }
    await this.download(url)
  }

  private download = async (url: string) => {
    const xhr = new XMLHttpRequest()
    xhr.open("GET", url, true)
    xhr.responseType = "arraybuffer"
    xhr.onload = function() {
      if (this.status === 200) {
        let filename = ""
        const disposition = xhr.getResponseHeader("Content-Disposition")
        if (disposition && disposition.indexOf("attachment") !== -1) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
          const matches = filenameRegex.exec(disposition)
          if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, "")
          }
        }
        const type = xhr.getResponseHeader("Content-Type")

        const blob = typeof File === "function" ? new File([this.response], filename, { type }) : new Blob([this.response], { type })
        if (typeof window.navigator.msSaveBlob !== "undefined") {
          // IE workaround for "HTML7007: One or more blob URLs were revoked by closing the blob for which they were created. These URLs will no longer resolve as the data backing the URL has been freed."
          window.navigator.msSaveBlob(blob, filename)
        } else {
          const URL = window.URL || window.webkitURL
          const downloadUrl = URL.createObjectURL(blob)

          if (filename) {
            // use HTML5 a[download] attribute to specify filename
            const a = document.createElement("a")
            // Safari doesn't support this yet
            if (typeof a.download === "undefined") {
              window.location = downloadUrl
            } else {
              a.href = downloadUrl
              a.download = filename
              document.body.appendChild(a)
              a.click()
            }
          } else {
            window.location = downloadUrl
          }

          setTimeout(function() {
            URL.revokeObjectURL(downloadUrl)
          }, 100) // cleanup
        }
      }
    }

    const accessToken = this.props.auth.stsTokenManager.accessToken

    console.log(accessToken)

    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`)
    xhr.send()
  }
}

export default compose(
  withFirebase,
  connect(
    // Map redux state to component props
    ({ firebase: { auth, profile } }) => ({
      auth,
      profile,
    }),
  ),
  withRouter,
)(Downloader)
