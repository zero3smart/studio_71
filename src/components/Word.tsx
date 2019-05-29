import * as React from "react"
import { IWord } from "../interfaces"
import { Role } from "../enums"

interface IProps {
  cursorCharacterIndex?: number
  confidence: number
  isMarking: boolean
  isEditing: boolean
  isNextWordDeleted: boolean
  paragraphIndex: number
  shouldMarkSpace: boolean
  text: string
  word?: IWord
  wordIndex: number
  role: string
  setCurrentWord(word: IWord, paragraphIndex: number, wordIndex: number): void
}

class Word extends React.Component<IProps, {}> {
  public render() {
    let className: string
    if (this.props.isEditing) {
      className = "editing"
    } else if (this.props.isMarking) {
      className = "marking"
    } else {
      className = ""
    }

    return (
      <>
        <span onClick={this.handleWordClick} className={`word ${this.props.role !== Role.Viewer ? 'confidence' + '-' + this.props.confidence : ''} ${className}`}>
          {(() => {
            if (this.props.word && this.props.word.deleted && this.props.word.deleted === true) {
              return <s>{this.props.text}</s>
            } else if (this.props.cursorCharacterIndex !== undefined) {
              const before = this.props.text.slice(0, this.props.cursorCharacterIndex)
              const after = this.props.text.slice(this.props.cursorCharacterIndex)

              return (
                <>
                  <span className="typewriter">{before}</span>
                  <span>{after}</span>
                </>
              )
            } else {
              return this.props.text
            }
          })()}
        </span>
        {(() => {
          // Space
          const strikeThrough = this.props.word && this.props.word.deleted && this.props.word.deleted === true && this.props.isNextWordDeleted === true
          if (this.props.shouldMarkSpace) {
            if (strikeThrough) {
              // tslint:disable-next-line:jsx-self-close
              return <s className={className}> </s>
            } else {
              // tslint:disable-next-line:jsx-self-close

              // console.log("text inni WORRD", this.props.text, this.props.cursorCharacterIndex)

              // tslint:disable-next-line:jsx-self-close
              return <span className={className}> </span>
            }
          } else if (strikeThrough) {
            // tslint:disable-next-line:jsx-self-close
            return <s> </s>
          } else {
            return " "
          }
        })()}
      </>
    )
  }

  private handleWordClick = (event: React.MouseEvent<HTMLTableRowElement, MouseEvent>) => {
    if (this.props.word) {
      this.props.setCurrentWord(this.props.word, this.props.paragraphIndex, this.props.wordIndex)
    }
  }
}

export default Word
