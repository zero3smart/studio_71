import React, { Component } from "react"
import Dropzone, { DropFilesEventHandler } from "react-dropzone"
import ReactGA from "react-ga"

interface IProps {
  handleFilesSelected: (files: File[]) => void
}

class UploadButton extends Component<IProps, any> {
  public render() {
    const style = { alignContent: "center", borderColor: "rgb(102, 102, 102)", borderRadius: "5px", borderStyle: "dashed", borderWidth: "2px", display: "grid", height: "100px", justifyContent: "center", position: "relative", width: "100%" }

    return (
      <Dropzone accept="audio/*,video/*,application/mxf" onDrop={this.handleFileDrop}>
        {({ getRootProps, getInputProps, isDragActive }) => {
          return (
            <div {...getRootProps()} style={style}>
              <input {...getInputProps()} />
              <button id="new-trans" className="org-btn org-btn--primary org-btn--round">
                <svg width="40" height="40" aria-hidden="true">
                  <use xlinkHref="#icon-pluss" />
                </svg>
              </button>
            </div>
          )
        }}
      </Dropzone>
    )
  }
  private handleFileDrop: DropFilesEventHandler = (acceptedFiles: File[], rejectedFiles: File[], event: React.DragEvent<HTMLElement>) => {
    if (rejectedFiles.length > 0) {
      console.error(rejectedFiles)

      ReactGA.event({
        action: "upload failed",
        category: "transcript",
        label: rejectedFiles[0].type,
      })
    } else {
      this.props.handleFilesSelected(acceptedFiles)
    }
  }
}

export default UploadButton
