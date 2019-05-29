import equal from "fast-deep-equal"
import React, { Component } from "react"
import ReactGA from "react-ga"
import KeyboardEventHandler from "react-keyboard-event-handler"
import TrackVisibility from "react-on-screen"
import { connect } from "react-redux"
import { withFirestore } from "react-redux-firebase"
import { compose } from "recompose"
import { Dispatch } from "redux"
import { ActionCreators as UndoActionCreators } from "redux-undo"
import { database } from "../firebaseApp"
import { IParagraph, ITranscript, IWord } from "../interfaces"
import nanoSecondsToFormattedTime from "../nanoSecondsToFormattedTime"
import { updateMarkers } from "../store/actions/markersActions"
import { deleteWords, joinParagraphs, readParagraphs, splitParagraphs, updateSpeaker, updateSpeakerName, updateStartTime, updateWords } from "../store/actions/transcriptActions"
import Player from "./Player"
import Word from "./Word"
import { Role } from "../enums"

interface IState {
  currentTime: number
  cursorWordIndex?: number
  cursorCharacterIndex?: number
  markerParagraphIndex?: number
  markerWordIndexStart?: number
  markerWordIndexEnd?: number
  edits?: string[]
  selectingForward: boolean
}

interface IReduxStateToProps {
  markers: {
    future: [
      {
        paragraphIndex: number
        wordIndexStart: number
        wordIndexEnd: number
      }
    ]
    past: [
      {
        paragraphIndex: number
        wordIndexStart: number
        wordIndexEnd: number
      }
    ]
    present: {
      paragraphIndex?: number
      wordIndexStart?: number
      wordIndexEnd?: number
    }
  }
  transcript: {
    future: ITranscript[]
    past: ITranscript[]
    present: ITranscript
  }
  transcriptId: string
  role: string
}

interface IReduxDispatchToProps {
  joinParagraphs: (paragraphIndex: number, wordIndex: number) => void
  onRedo: () => void
  onUndo: () => void
  readParagraphs: (paragraphs: IParagraph[]) => void
  splitParagraphs: (paragraphIndex: number, wordIndex: number) => void
  deleteWords: (paragraphIndex: number, wordIndexStart: number, wordIndexEnd: number) => void
  updateMarkers: (paragraphIndex: number, wordIndexStart: number, wordIndexEnd: number) => void
  updateSpeaker: (paragraphIndex: number, speaker: number) => void
  updateSpeakerName: (speaker: number, name: string, paragraphIndex?: number) => void
  updateStartTime: (startTime: number) => void
  updateWords: (paragraphIndex: number, wordIndexStart: number, wordIndexEnd: number, words: string[], recalculate: boolean) => void
}

class Paragraphs extends Component<IReduxStateToProps & IReduxDispatchToProps, IState> {
  public readonly state: IState = {
    currentTime: 0,
    selectingForward: true,
  }
  private playerRef = React.createRef<Player>()

  public componentDidUpdate(prevProps: IReduxStateToProps & IReduxDispatchToProps, prevState: IState) {
    const transcriptId = this.props.transcriptId
    const prevTranscriptId = prevProps.transcriptId

    if (transcriptId !== prevTranscriptId) {
      this.fetchParagraphs(transcriptId)

      // Reset state
      this.setState({
        currentTime: 0,
        markerParagraphIndex: undefined,
        markerWordIndexEnd: undefined,
        markerWordIndexStart: undefined,
      })
      return
    }
    // Check if markers have been updated
    else if (prevProps.markers) {
      let markers

      if (prevProps.markers.past.length > this.props.markers.past.length) {
        markers = prevProps.markers.present
      } else if (prevProps.markers.future.length > this.props.markers.future.length) {
        markers = this.props.markers.present
      }

      // Set state if the current marker is different from the saved one
      if (markers !== undefined && (this.state.markerParagraphIndex !== markers.paragraphIndex || this.state.markerWordIndexStart !== markers.wordIndexStart || this.state.markerWordIndexEnd !== markers.wordIndexEnd)) {
        this.setState({
          markerParagraphIndex: markers.paragraphIndex,
          markerWordIndexEnd: markers.wordIndexEnd,
          markerWordIndexStart: markers.wordIndexStart,
        })
      }
    }

    // Check if we need to save to Firebase

    if (Math.abs(prevProps.transcript.past.length - this.props.transcript.past.length) === 1) {
      this.save(prevProps.transcript.present, this.props.transcript.present)
    }
  }

  public async componentDidMount() {
    const transcriptId = this.props.transcriptId

    this.fetchParagraphs(transcriptId)
  }
  public handleTimeUpdate = (currentTime: number) => {
    // Find the next current paragraph and word

    const { markerParagraphIndex, markerWordIndexStart } = this.state

    if (this.props.transcript === undefined || this.props.transcript.present.paragraphs === undefined) {
      return
    }

    const paragraphs = this.props.transcript.present.paragraphs

    // First, we check if the current word is still being said

    if (markerParagraphIndex !== undefined && markerWordIndexStart !== undefined) {
      const currentWord = paragraphs[markerParagraphIndex].words[markerWordIndexStart]

      if (currentTime < currentWord.endTime * 1e-9) {
        return
      }
    }
    // The current word has been said, start scanning for the next word
    // We assume that it will be the next word in the current paragraph

    let nextWordIndex = 0
    let nextParagraphIndex = 0

    if (markerParagraphIndex !== undefined && markerWordIndexStart !== undefined) {
      nextWordIndex = markerWordIndexStart ? markerWordIndexStart + 1 : 0
      nextParagraphIndex = markerParagraphIndex

      if (nextWordIndex === paragraphs[markerParagraphIndex].words.length) {
        // This was the last word, reset word index and move to next paragraph

        nextWordIndex = 0
        nextParagraphIndex = nextParagraphIndex + 1
      }
    }

    // Start scanning for next word
    for (let i = nextParagraphIndex; i < paragraphs.length; i++) {
      const words = paragraphs[i].words

      for (let j = nextWordIndex; j < words.length; j++) {
        const word = words[j]

        const { startTime, endTime } = word

        if (currentTime < startTime * 1e-9) {
          // This word hasn't started yet, returning and waiting to be called again on new current time update
          return
        }

        if (currentTime > endTime * 1e-9) {
          // This word is no longer being said, go to next
          continue
        }

        this.setState({
          currentTime,
          markerParagraphIndex: i,
          markerWordIndexEnd: j,
          markerWordIndexStart: j,
        })

        return
      }
    }
  }
  public setCurrentPlayingWord = (word: IWord, paragraphIndex: number, wordIndex: number) => {
    this.playerRef.current!.setTime(word.startTime * 1e-9)

    this.setState({
      edits: undefined,
      markerParagraphIndex: paragraphIndex,
      markerWordIndexEnd: wordIndex,
      markerWordIndexStart: wordIndex,
    })
  }

  public render() {
    return (
      <>
        <KeyboardEventHandler handleKeys={["all"]} onKeyEvent={this.handleKeyPressed} />
        {this.props.transcript &&
          this.props.transcript.present &&
          this.props.transcript.present.paragraphs &&
          this.props.transcript.present.paragraphs.map((paragraph, i) => {
            const { speaker, startTime } = paragraph
            const formattedStartTime = nanoSecondsToFormattedTime(this.props.transcript.present.metadata.startTime || 0, startTime, true, false)

            return (
              <React.Fragment key={i}>
                <div key={`startTime-${i}`} className="startTime" onClick={i === 0 ? this.handleChangeStartTime() : undefined}>
                  {formattedStartTime}
                  {speaker && this.props.transcript.present.speakerNames ? (
                    <span className={`speaker speaker-${speaker}`} onClick={this.handleChangeSpeakerName(speaker)}>
                      {this.props.transcript.present.speakerNames[speaker][0].toUpperCase()}
                    </span>
                  ) : (
                    <span>&nbsp;</span>
                  )}
                </div>
                <div key={`paragraph-${i}`} className="paragraph">
                  <TrackVisibility partialVisibility={true}>
                    {({ isVisible }) => {
                      if (isVisible) {
                        return paragraph.words.map((word, j) => {
                          const isMarked = this.state.markerParagraphIndex === i && this.state.markerWordIndexStart <= j && j <= this.state.markerWordIndexEnd

                          if (isMarked && this.state.edits !== undefined) {
                            // Only show the last word
                            if (j < this.state.markerWordIndexEnd) {
                              return
                            }

                            return this.state.edits.map((edit, k) => {
                              const isLastWord = this.state.edits.length - 1 === k

                              // Marked words that are being edited
                              return (
                                <Word
                                  cursorCharacterIndex={k === this.state.cursorWordIndex ? this.state.cursorCharacterIndex : undefined}
                                  key={`word-${i}-${j}-${k}`}
                                  confidence={Math.round(word.confidence * 100)}
                                  isMarking={isMarked}
                                  isEditing={true}
                                  isNextWordDeleted={false}
                                  paragraphIndex={i}
                                  shouldMarkSpace={!isLastWord}
                                  setCurrentWord={this.setCurrentPlayingWord}
                                  text={edit}
                                  wordIndex={j}
                                  role={this.props.role}
                                />
                              )
                            })
                          } else {
                            const shouldMarkSpace = this.state.markerParagraphIndex === i && this.state.markerWordIndexStart <= j && j < this.state.markerWordIndexEnd
                            const isNextWordDeleted = j + 1 < paragraph.words.length && paragraph.words[j + 1].deleted !== undefined && paragraph.words[j + 1].deleted === true

                            return (
                              <Word
                                key={`word-${i}-${j}`}
                                confidence={Math.round(word.confidence * 100)}
                                word={word}
                                isMarking={isMarked}
                                isEditing={false}
                                isNextWordDeleted={isNextWordDeleted}
                                paragraphIndex={i}
                                shouldMarkSpace={shouldMarkSpace}
                                setCurrentWord={this.setCurrentPlayingWord}
                                text={word.text}
                                wordIndex={j}
                                role={this.props.role}
                              />
                            )
                          }
                        })
                      } else {
                        return paragraph.words.map(word => {
                          return word.text + " "
                        })
                      }
                    }}
                  </TrackVisibility>
                </div>
              </React.Fragment>
            )
          })}

        <Player ref={this.playerRef} audioGsUrl={this.props.transcript.present.gsUrls.audio} handleTimeUpdate={this.handleTimeUpdate} />
      </>
    )
  }

  private async fetchParagraphs(transcriptId: string) {
    try {
      const querySnapshot = await this.props.firestore.get({ collection: `transcripts/${transcriptId}/paragraphs`, orderBy: "startTime" })

      const paragraphs = new Array()

      querySnapshot.docs.forEach(doc => {
        const paragraph = doc.data()
        const id = doc.id
        paragraphs.push({ id, ...paragraph })
      })

      this.props.readParagraphs(paragraphs)
    } catch (error) {
      console.error("Error fetching paragraphs: ", error)
      ReactGA.exception({
        description: error.message,
        fatal: false,
      })
    }
  }

  private commitEdits(stopEditing: boolean, edits = this.state.edits) {
    if (edits !== undefined) {
      const copyOfEdits = [...edits]

      this.setWords(this.state.markerParagraphIndex, this.state.markerWordIndexStart, this.state.markerWordIndexEnd, copyOfEdits, stopEditing)
    }
  }

  private handleChangeStartTime = () => (event: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
    let startTime = 0

    if (this.props.transcript.present.metadata && this.props.transcript.present.metadata.startTime) {
      startTime = this.props.transcript.present.metadata.startTime
    }

    const formattedStartTime = nanoSecondsToFormattedTime(0, startTime, true, true)

    const newStartTimeCode = window.prompt("Starttid:", formattedStartTime)

    if (newStartTimeCode) {
      const units = newStartTimeCode.split(":")

      if (units.length === 4) {
        const nanoseconds =
          parseInt(units[0], 10) * 3600e9 + // Hours
          parseInt(units[1], 10) * 60e9 + // Minutes
          parseInt(units[2], 10) * 1e9 + // Seconds
          parseInt(units[3], 10) * 1e7 // Centiseconds

        this.props.updateStartTime(nanoseconds)

        ReactGA.event({
          action: "start time changed",
          category: "editor",
        })
      }
    }
  }

  private handleChangeSpeakerName = (speaker: number) => (event: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
    if (this.props.transcript.present.speakerNames !== undefined) {
      const currentSpeakerName = this.props.transcript.present.speakerNames[speaker]

      const newSpeakerName = window.prompt(`Navn på person ${speaker}:`, currentSpeakerName)

      if (newSpeakerName) {
        this.props.updateSpeakerName(speaker, newSpeakerName)

        ReactGA.event({
          action: "speaker name changed",
          category: "editor",
        })
      }
    }
  }

  private handleKeyPressed = (_key: string, event: KeyboardEvent) => {
    if (event.defaultPrevented) {
      return // Do nothing if the event was already processed
    }

    const key = event.key
    const { markerParagraphIndex: markerParagraphIndex, markerWordIndexStart, markerWordIndexEnd, cursorWordIndex, cursorCharacterIndex } = this.state

    if (key !== "ArrowLeft" && key !== "Left" && (key !== "ArrowRight" && key !== "Right") && (key !== "ArrowUp" && key !== "Up") && (key !== "ArrowDown" && key !== "Down")) {
      if (this.props.role === Role.Viewer) {
        return
      }
    }

    // Exit early if no word is selected
    if (markerParagraphIndex === undefined || markerWordIndexStart === undefined || markerWordIndexEnd === undefined) {
      // If arrow keys are pressed, we reset the indeces to 0,0
      // so that the first word is highlighted
      if (key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown") {
        this.setState({
          markerParagraphIndex: 0,
          markerWordIndexEnd: 0,
          markerWordIndexStart: 0,
        })
      }

      return
    }

    // First, we check for meta or control keys
    if (event.getModifierState("Meta") || event.getModifierState("Control")) {
      switch (event.key) {
        // Join
        case "Backspace":
          // Works only if a single word is selected
          if (markerWordIndexStart === markerWordIndexEnd) {
            this.joinParagraphs(markerParagraphIndex, markerWordIndexStart)
          }
          break
        // Split
        case "Enter":
          // Works only if a single word is selected
          if (markerWordIndexStart === markerWordIndexEnd) {
            this.splitParagraph(markerParagraphIndex, markerWordIndexStart)
          }
          break

        // Undo/redo
        case "z":
          if (event.getModifierState("Shift")) {
            this.props.onRedo()

            ReactGA.event({
              action: "redo",
              category: "editor",
            })
          } else if (this.state.edits) {
            this.setState({ edits: undefined })
          } else {
            this.props.onUndo()

            ReactGA.event({
              action: "undo",
              category: "editor",
            })
          }
          break

        // Speaker name
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          this.handleSetSpeaker(key, markerParagraphIndex)
          break
        // If we don't regonize the command, return and let the browser handle it
        default:
          return
      }
    } else {
      const editingForward = this.state.selectingForward
      const paragraphs = this.props.transcript.present.paragraphs!

      const currentWord = paragraphs![markerParagraphIndex].words[markerWordIndexEnd].text

      switch (event.key) {
        // Cancel edit
        case "Escape": {
          this.setState({
            cursorCharacterIndex: undefined,
            cursorWordIndex: undefined,
            edits: undefined,
          })
          break
        }

        // Go in and out of edit mode
        case "Enter":
          // Go out of edit mode
          if (this.state.edits !== undefined) {
            this.commitEdits(true)
          }
          // Go into edit mode if only one word is selected
          else if (markerWordIndexStart === markerWordIndexEnd) {
            this.setState({
              cursorCharacterIndex: currentWord.length,
              cursorWordIndex: 0,
              edits: [currentWord],
            })
          }
          this.playerRef.current!.pause()
          break

        // Select navigation
        case "ArrowLeft":
        case "Left":
          if (event.getModifierState("Shift")) {
            this.playerRef.current!.pause()

            // Decrease selection
            if (editingForward && markerWordIndexStart < markerWordIndexEnd && markerWordIndexEnd > 0) {
              this.setState({
                edits: undefined,
                markerWordIndexEnd: markerWordIndexEnd - 1,
              })
              // Increase selection
            } else if (markerWordIndexStart > 0) {
              this.setState({
                edits: undefined,
                markerWordIndexStart: markerWordIndexStart - 1,
                selectingForward: false,
              })
            }

            // Move cursor left inside the cursor character index
          } else if (cursorCharacterIndex !== undefined && cursorCharacterIndex > 0) {
            this.setState({
              cursorCharacterIndex: cursorCharacterIndex - 1,
            })
            // Move cursor left to the previous cursor word index
          } else if (cursorWordIndex !== undefined && cursorWordIndex > 0) {
            // Check if the cursor is pointing at an empty words
            // If so, we pop it

            if (this.state.edits[cursorWordIndex] === "") {
              const newEdits = [...this.state.edits]
              newEdits.pop()

              this.setState({
                edits: newEdits,
              })
            }

            this.setState({
              cursorCharacterIndex: this.state.edits[cursorWordIndex - 1].length,
              cursorWordIndex: cursorWordIndex - 1,
            })
          } else {
            this.commitEdits(true)

            // Move marker

            if (markerWordIndexStart > 0) {
              // Mark previous word in current paragraph
              const currentParagraphIndex = markerParagraphIndex
              const previousWordIndex = markerWordIndexStart - 1
              const previousWord = paragraphs[markerParagraphIndex].words[previousWordIndex]

              this.setCurrentPlayingWord(previousWord, currentParagraphIndex, previousWordIndex)
            } else if (markerParagraphIndex > 0) {
              // Mark last word in previous paragraph

              const previousParagraphIndex = markerParagraphIndex - 1
              const previousWordIndex = paragraphs[markerParagraphIndex - 1].words.length - 1
              const previousWord = paragraphs[previousParagraphIndex].words[previousWordIndex]

              this.setCurrentPlayingWord(previousWord, previousParagraphIndex, previousWordIndex)
            }
          }

          break

        case "ArrowRight":
        case "Right":
          if (event.getModifierState("Shift")) {
            this.playerRef.current!.pause()

            if (editingForward === false && markerWordIndexStart < markerWordIndexEnd) {
              this.setState({
                edits: undefined,
                markerWordIndexStart: markerWordIndexStart + 1,
              })
            }
            // Increase selection
            else if (markerWordIndexEnd + 1 < paragraphs[markerParagraphIndex].words.length) {
              this.setState({
                edits: undefined,
                markerWordIndexEnd: markerWordIndexEnd + 1,
                selectingForward: true,
              })
              // Decrease selection
            }

            // Move character cursor right to next cursor character index
          } else if (
            cursorCharacterIndex !== undefined &&
            ((this.state.edits !== undefined && cursorCharacterIndex < this.state.edits[this.state.edits.length - 1].length) || (this.state.edits === undefined && cursorCharacterIndex < currentWord.length))
          ) {
            this.setState({
              cursorCharacterIndex: cursorCharacterIndex + 1,
            })
            // Move character cursor to next cursor word index's
          } else if (cursorWordIndex !== undefined && this.state.edits !== undefined && cursorWordIndex < this.state.edits.length - 1) {
            this.setState({
              cursorCharacterIndex: 0,
              cursorWordIndex: cursorWordIndex + 1,
            })
          } else {
            this.commitEdits(true)

            // Move marker

            const largestSelectedIndex = Math.max(markerWordIndexStart, markerWordIndexEnd)
            // If shift key is pressed, check if there is another word after markerWordIndexEnd
            if (largestSelectedIndex + 1 < paragraphs[markerParagraphIndex].words.length) {
              // Mark next word in current paragraph

              const currentParagraphIndex = markerParagraphIndex
              const nextWordIndex = largestSelectedIndex + 1
              const nextWord = paragraphs[currentParagraphIndex].words[nextWordIndex]
              this.setCurrentPlayingWord(nextWord, currentParagraphIndex, nextWordIndex)
              // Mark first word in next paragraph
            } else if (markerParagraphIndex + 1 < paragraphs.length) {
              const nextParagraphIndex = markerParagraphIndex + 1
              const firstWordIndex = 0
              const firstWord = paragraphs[nextParagraphIndex].words[firstWordIndex]

              this.setCurrentPlayingWord(firstWord, nextParagraphIndex, firstWordIndex)
            }
          }

          break

        case "ArrowUp":
        case "Up":
          this.commitEdits(true)

          // Jump to first word in current paragraph
          if (markerWordIndexStart > 0) {
            const currentParagraphIndex = markerParagraphIndex
            const firstWordIndex = 0
            const firstWord = paragraphs[currentParagraphIndex].words[firstWordIndex]
            this.setCurrentPlayingWord(firstWord, currentParagraphIndex, firstWordIndex)

            // Jump to previous paragraph
          } else if (markerParagraphIndex > 0) {
            const previousParagraphIndex = markerParagraphIndex - 1
            const firstWordIndex = 0
            const firstWord = paragraphs[previousParagraphIndex].words[firstWordIndex]
            this.setCurrentPlayingWord(firstWord, previousParagraphIndex, firstWordIndex)
          }

          break

        case "ArrowDown":
        case "Down":
          this.commitEdits(true)

          // Jump to next paragraph if it exists

          if (markerParagraphIndex < paragraphs.length - 1) {
            const nextParagraphIndex = markerParagraphIndex + 1
            const nextWordIndex = 0
            const nextWord = paragraphs[nextParagraphIndex].words[nextWordIndex]

            this.setCurrentPlayingWord(nextWord, nextParagraphIndex, nextWordIndex)
          }
          // Jump to last word in last paragraph
          else {
            const paragraphIndex = markerParagraphIndex
            const lastWordIndex = paragraphs[markerParagraphIndex].words.length - 1
            const lastWord = paragraphs[paragraphIndex].words[lastWordIndex]

            this.setCurrentPlayingWord(lastWord, paragraphIndex, lastWordIndex)
          }

          break

        // Tab will toggle the word from lowercase, first letter capitalized
        // Only works when not in edit mode, and only on a single word
        case "Tab":
          this.playerRef.current!.pause()

          if (this.state.edits === undefined && markerWordIndexStart === markerWordIndexEnd) {
            // Lower case to capitalised case
            if (currentWord === currentWord.toLowerCase()) {
              this.updateWordsAndMarkers(markerParagraphIndex, markerWordIndexStart, markerWordIndexEnd, [currentWord[0].toUpperCase() + currentWord.substring(1)], false)
            }
            // Lower case
            else {
              this.updateWordsAndMarkers(markerParagraphIndex, markerWordIndexStart, markerWordIndexEnd, [currentWord.toLowerCase()], false)
            }
          }
          break

        // Delete
        case "Delete":
          this.playerRef.current!.pause()

          this.deleteWords(markerParagraphIndex, markerWordIndexStart, markerWordIndexEnd)
          break

        // Punctation, when we're not in edit mode
        case ".":
        case ",":
        case "!":
        case "?":
          if (this.state.edits === undefined && markerWordIndexStart === markerWordIndexEnd) {
            this.playerRef.current!.pause()

            const wordText = paragraphs![markerParagraphIndex].words[markerWordIndexEnd].text
            const nextWord = paragraphs[markerParagraphIndex].words[markerWordIndexEnd + 1]
            const wordTextLastChar = wordText.charAt(wordText.length - 1)

            let removePuncation = false
            let addPuncation = false
            let nextWordToLowerCase = false
            let nextWordToUpperCase = false

            //
            // Remove punctation
            //

            // If last char is a punctation char, we remove it

            if (wordTextLastChar === "." || wordTextLastChar === "," || wordTextLastChar === "!" || wordTextLastChar === "?") {
              removePuncation = true

              // Lower case next word if it exist and is not lower case

              if (nextWord !== undefined && (key === "." || key === "!" || key === "?") && nextWord.text[0] === nextWord.text[0].toUpperCase()) {
                nextWordToLowerCase = true
              }
            }

            //
            // Add punctation
            //

            if (wordTextLastChar !== key) {
              // Add punctation

              addPuncation = true

              // Check to see if we need to lower case the next word
              if (nextWord !== undefined) {
                if (key === "." || key === "!" || key === "?") {
                  if (nextWord.text[0] !== nextWord.text[0].toUpperCase()) {
                    nextWordToUpperCase = true
                  } else {
                    // Next word is already uppercase, cancel the effect of nextWordToLowerCase = true from above
                    nextWordToLowerCase = false
                  }
                } else if (nextWord.text[0] !== nextWord.text[0].toLowerCase()) {
                  nextWordToLowerCase = true
                }
              }
            }

            let firstWordText = wordText
            let nextWordText = null

            if (removePuncation) {
              firstWordText = firstWordText.slice(0, -1)
            }
            if (addPuncation) {
              firstWordText += key
            }

            if (nextWordToUpperCase) {
              nextWordText = nextWord.text[0].toUpperCase() + nextWord.text.substring(1)
            } else if (nextWordToLowerCase) {
              nextWordText = nextWord.text[0].toLowerCase() + nextWord.text.substring(1)
            }

            const words = [firstWordText, nextWordText].filter(word => word)

            this.updateWordsAndMarkers(markerParagraphIndex, markerWordIndexStart, markerWordIndexEnd + words.length - 1, words, false)

            break
          }
        case "-":
          // Only if two words are selected
          if (markerWordIndexStart < markerWordIndexEnd) {
            // Join the selected words into one

            const wordsWithoutSpaces = [
              paragraphs![markerParagraphIndex].words
                .slice(markerWordIndexStart, markerWordIndexEnd + 1)
                .map(word => word.text)
                .join(""),
            ]

            this.updateWordsAndMarkers(markerParagraphIndex, markerWordIndexStart, markerWordIndexEnd, wordsWithoutSpaces, true)

            // Only one word should be marked now
            this.setState({
              markerWordIndexEnd: markerWordIndexStart,
            })

            break
          }

        case "(":
        case "[":
        case "{":
        case '"':
          if (this.state.edits === undefined) {
            // Short cut for adding the key both in front and back of the word(s)

            const words = paragraphs![markerParagraphIndex].words.slice(markerWordIndexStart, markerWordIndexEnd + 1).map(word => word.text)

            words[0] = key + words[0]

            let closingKey
            if (key === "(") {
              closingKey = ")"
            } else if (key === "[") {
              closingKey = "]"
            } else if (key === "{") {
              closingKey = "}"
            } else {
              closingKey = '"'
            }

            words[words.length - 1] = words[words.length - 1] + closingKey

            this.updateWordsAndMarkers(markerParagraphIndex, markerWordIndexStart, markerWordIndexEnd, words, false)
            break
          }
        case "!":
        case "\\":
        case "#":
        case "$":
        case "%":
        case "&":
        case ")":
        case "*":
        case "/":
        case "–":
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
        case ":":
        case "=":
        case ">":
        case "@":
        case "A":
        case "B":
        case "C":
        case "D":
        case "E":
        case "F":
        case "G":
        case "H":
        case "I":
        case "J":
        case "K":
        case "L":
        case "M":
        case "N":
        case "O":
        case "P":
        case "Q":
        case "R":
        case "S":
        case "T":
        case "U":
        case "V":
        case "W":
        case "X":
        case "Y":
        case "Z":
        case "\\":
        case "]":
        case "^":
        case "_":
        case "`":
        case "a":
        case "b":
        case "c":
        case "d":
        case "e":
        case "f":
        case "g":
        case "h":
        case "i":
        case "j":
        case "k":
        case "l":
        case "m":
        case "n":
        case "o":
        case "p":
        case "q":
        case "r":
        case "s":
        case "t":
        case "u":
        case "v":
        case "w":
        case "x":
        case "y":
        case "z":
        case "|":
        case "}":
        case "~":
        case "¡":
        case "¢":
        case "£":
        case "¤":
        case "¥":
        case "¦":
        case "§":
        case "¨":
        case "ª":
        case "«":
        case "¬":
        case "®":
        case "¯":
        case "±":
        case "²":
        case "³":
        case "´":
        case "µ":
        case "¶":
        case "·":
        case "¸":
        case "º":
        case "»":
        case "¼":
        case "½":
        case "¾":
        case "¿":
        case "À":
        case "Á":
        case "Â":
        case "Ã":
        case "Ä":
        case "Å":
        case "Æ":
        case "Ç":
        case "È":
        case "É":
        case "Ê":
        case "Ë":
        case "Ì":
        case "Í":
        case "Î":
        case "Ï":
        case "Ð":
        case "Ñ":
        case "Ò":
        case "Ó":
        case "Ô":
        case "Õ":
        case "Ö":
        case "×":
        case "Ø":
        case "Ù":
        case "Ú":
        case "Û":
        case "Ü":
        case "Ý":
        case "Þ":
        case "ß":
        case "à":
        case "á":
        case "â":
        case "ã":
        case "ä":
        case "å":
        case "æ":
        case "ç":
        case "è":
        case "é":
        case "ê":
        case "ë":
        case "ì":
        case "í":
        case "î":
        case "ï":
        case "ð":
        case "ñ":
        case "ò":
        case "ó":
        case "ô":
        case "õ":
        case "ö":
        case "÷":
        case "ø":
        case "ù":
        case "ú":
        case "û":
        case "ü":
        case "ý":
        case "þ":
        case "ÿ":
        case "…":
        case "Backspace":
        case " ":
          let newEdits = this.state.edits ? [...this.state.edits] : undefined // Copy edits from state

          let newCursorCharacterIndex = this.state.cursorCharacterIndex
          let newCursorWordIndex = this.state.cursorWordIndex

          if (key === " ") {
            if (this.state.edits === undefined) {
              this.playerRef.current!.togglePlay()

              break

              // If last character is not space
              // and cursor is not before the first character
              // and cursor is not on last character unless last word
            } else if (
              this.state.edits[this.state.edits.length - 1] !== "" &&
              this.state.cursorCharacterIndex > 0 &&
              (this.state.cursorCharacterIndex < this.state.edits[this.state.cursorWordIndex].length || this.state.cursorWordIndex === this.state.edits.length - 1)
            ) {
              // Find where to split

              const wordToSplit = this.state.edits[this.state.cursorWordIndex]

              const splitted = [wordToSplit.slice(0, cursorCharacterIndex), wordToSplit.slice(cursorCharacterIndex)]

              newEdits.splice(this.state.cursorWordIndex, 1, ...splitted)

              this.commitEdits(false, newEdits) // Don't stop editing

              break

              // If we're on the last character
            } else if (this.state.cursorCharacterIndex === this.state.edits[this.state.cursorWordIndex].length) {
              // If we're on the last space in the last words, we commit
              if (this.state.cursorWordIndex === this.state.edits.length - 1) {
                this.commitEdits(true)
                break
              }
              // Else we move the cursor to the first character of next word
              else {
                newCursorWordIndex++
                newCursorCharacterIndex = 0
              }
            }
          } else if (key === "Backspace") {
            // If not in edit mode, or all characters have been removed,  delete the word
            if (newEdits === undefined) {
              this.deleteWords(markerParagraphIndex, markerWordIndexStart, markerWordIndexEnd)
              // If in edit mode, and we're at the first cursor character index, merge word with previous
            } else if (cursorCharacterIndex === 0 && cursorWordIndex > 0) {
              const mergedWords = newEdits[cursorWordIndex - 1] + newEdits[cursorWordIndex]

              newCursorWordIndex--
              newCursorCharacterIndex = newEdits[cursorWordIndex - 1].length

              newEdits.splice(cursorWordIndex - 1, 2, mergedWords)

              // Stop editing if there are no characters in edits
              // Otherwise, continue editing

              this.commitEdits(newEdits.length === 0)

              // Else we remove the character before cursor index if exists
            } else if (newEdits.length > 0 && cursorCharacterIndex && cursorCharacterIndex > 0) {
              newEdits[newEdits.length - 1] = newEdits[newEdits.length - 1].slice(0, cursorCharacterIndex - 1) + newEdits[newEdits.length - 1].slice(cursorCharacterIndex)

              newCursorCharacterIndex--
              // Do nothing
            } else {
              return
            }
          }

          // Add character to last word at cursor index
          else if (newEdits !== undefined) {
            newEdits[cursorWordIndex] = newEdits[cursorWordIndex].slice(0, cursorCharacterIndex) + key + newEdits[cursorWordIndex].slice(cursorCharacterIndex)
            newCursorCharacterIndex++
          }
          // Replace marked word with entered character
          else {
            newEdits = [key]
            newCursorCharacterIndex = 1
            newCursorWordIndex = 0
          }

          this.setState({ edits: newEdits, cursorCharacterIndex: newCursorCharacterIndex, cursorWordIndex: newCursorWordIndex })
          this.playerRef.current!.pause()

          break
      }
    }

    // Cancel the default action to avoid it being handled twice

    event.preventDefault()
    event.stopPropagation()
  }

  private async save(pastTranscript: ITranscript, presentTranscript: ITranscript) {
    const transcriptDocumentReference = database.doc(`transcripts/${presentTranscript.id}/`)

    // Get a new write batch
    const batch = database.batch()

    // Check if we have changes in the transcript

    if (presentTranscript.speakerNames !== undefined && Object.is(pastTranscript.speakerNames, presentTranscript.speakerNames) !== true) {
      batch.update(transcriptDocumentReference, {
        speakerNames: presentTranscript.speakerNames,
      })
    }

    // Check if we have changes in start time

    if (presentTranscript.metadata && presentTranscript.metadata.startTime !== pastTranscript.metadata.startTime) {
      batch.update(transcriptDocumentReference, {
        "metadata.startTime": presentTranscript.metadata.startTime,
      })
    }

    const pastParagraphs = pastTranscript.paragraphs
    const presentParagraphs = presentTranscript.paragraphs

    // Changes in paragraphs
    if (pastParagraphs !== undefined && presentParagraphs !== undefined) {
      // Create an array with all paragraph ids

      const pastParagraphsIds = pastParagraphs.map(paragraph => paragraph.id)
      const presentParagraphsIds = presentParagraphs.map(paragraph => paragraph.id)

      const paragraphsIds = new Set([...pastParagraphsIds, ...presentParagraphsIds])

      const updateParagraphs: IParagraph[] = new Array()
      const createParagraphs: IParagraph[] = new Array()
      const deleteIds: string[] = new Array()

      for (const paragraphId of paragraphsIds) {
        // If in both arrays, need to compare them
        if (pastParagraphsIds.includes(paragraphId) && presentParagraphsIds.includes(paragraphId)) {
          const pastParagraph = pastParagraphs.filter(paragraph => paragraph.id === paragraphId)[0]
          const presentParagraph = presentParagraphs.filter(paragraph => paragraph.id === paragraphId)[0]

          if (equal(pastParagraph, presentParagraph) === false) {
            updateParagraphs.push(presentParagraph)
          }
          // If only in past, need to delete
        } else if (pastParagraphsIds.includes(paragraphId)) {
          deleteIds.push(paragraphId)
          // If only in present, need to add
        } else {
          const presentParagraph = presentParagraphs.filter(paragraph => paragraph.id === paragraphId)[0]

          createParagraphs.push(presentParagraph)
        }
      }

      // Set the value in update ids

      const paragraphsCollectionReference = transcriptDocumentReference.collection("paragraphs")

      for (const paragraph of updateParagraphs) {
        batch.update(paragraphsCollectionReference.doc(paragraph.id), paragraph)
      }

      for (const paragraph of createParagraphs) {
        batch.set(paragraphsCollectionReference.doc(paragraph.id), paragraph)
      }
      for (const paragraphId of deleteIds) {
        batch.delete(paragraphsCollectionReference.doc(paragraphId))
      }
    }

    try {
      await batch.commit()
    } catch (error) {
      console.error("Error saving to Firebase: ", error)
      ReactGA.exception({
        description: error.message,
        fatal: false,
      })
    }
  }

  private deleteWords(paragraphIndex: number, wordIndexStart: number, wordIndexEnd: number) {
    this.props.deleteWords(paragraphIndex, wordIndexStart, wordIndexEnd)

    // Saving marker in undo history
    this.props.updateMarkers(paragraphIndex, wordIndexStart, wordIndexEnd)

    ReactGA.event({
      action: "words deleted",
      category: "editor",
    })
  }

  private setWords(paragraphIndex: number, wordIndexStart: number, wordIndexEnd: number, words: string[], stopEditing: boolean) {
    this.updateWordsAndMarkers(paragraphIndex, wordIndexStart, wordIndexEnd, words, true)

    const numberOfWords = words.length - (words[words.length - 1] === "" ? 1 : 0) // If the last word is a space is does'nt count

    this.setState({
      cursorCharacterIndex: stopEditing ? undefined : 0,
      cursorWordIndex: stopEditing ? undefined : this.state.cursorWordIndex + 1,
      edits: stopEditing ? undefined : words,
      markerWordIndexEnd: Math.max(wordIndexStart, wordIndexStart + numberOfWords - 1), // Using max so that end with not be smaller than start and thus not drawn
    })

    ReactGA.event({
      action: "words changed",
      category: "editor",
    })
  }

  private handleSetSpeaker(key: string, markerParagraphIndex: number) {
    // Check that the speaker exists, otherwise, ask for their name

    if (this.props.transcript.present.speakerNames && this.props.transcript.present.speakerNames[parseInt(key, 10)] !== undefined) {
      this.props.updateSpeaker(markerParagraphIndex, parseInt(key, 10))
    } else {
      const speakerName = window.prompt(`Navn på person ${key}:`)

      if (speakerName) {
        this.props.updateSpeakerName(parseInt(key, 10), speakerName, markerParagraphIndex)

        ReactGA.event({
          action: "speaker name set",
          category: "editor",
        })
      }
    }
  }

  private updateWordsAndMarkers(paragraphIndex: number, wordIndexStart: number, wordIndexEnd: number, words: string[], recalculate: boolean) {
    const copyOfWords = [...words] // Make a copy since words is state

    // We need to remove the last space if it exists.
    // Otherwise it will be committed to Firebase
    if (copyOfWords[copyOfWords.length - 1] === "") {
      copyOfWords.splice(-1, 1)
    }

    this.props.updateWords(paragraphIndex, wordIndexStart, wordIndexEnd, copyOfWords, recalculate)
    this.props.updateMarkers(paragraphIndex, wordIndexStart, wordIndexEnd)
  }

  private joinParagraphs(paragraphIndex: number, wordIndex: number) {
    // Calculating where the marker will be in the joined paragraph

    if (paragraphIndex > 0 && wordIndex === 0) {
      const paragraph = this.props.transcript.present.paragraphs[paragraphIndex - 1]

      // Saving marker in undo history
      this.props.updateMarkers(this.state.markerParagraphIndex, 0, 0)

      // Setting new marker state
      this.setState({
        markerParagraphIndex: paragraphIndex - 1,
        markerWordIndexEnd: paragraph.words.length,
        markerWordIndexStart: paragraph.words.length,
      })
      this.props.joinParagraphs(paragraphIndex, wordIndex)

      ReactGA.event({
        action: "paragraphs joined",
        category: "editor",
      })
    }
  }

  private splitParagraph(paragraphIndex: number, wordIndex: number) {
    this.props.splitParagraphs(paragraphIndex, wordIndex)

    // Saving marker in undo history
    this.props.updateMarkers(paragraphIndex, wordIndex, wordIndex)

    // Setting marker to the next paragraph
    this.setState({
      markerParagraphIndex: paragraphIndex + 1,
      markerWordIndexEnd: 0,
      markerWordIndexStart: 0,
    })

    ReactGA.event({
      action: "paragraphs split",
      category: "editor",
    })
  }
}

// Redux

const mapStateToProps = (state: State): IReduxStateToProps => {
  return {
    markers: state.markers,
    transcript: state.transcript,
  }
}

const mapDispatchToProps = (dispatch: Dispatch): IReduxDispatchToProps => {
  return {
    deleteWords: (paragraphIndex: number, wordIndexStart: number, wordIndexEnd: number) => dispatch(deleteWords(paragraphIndex, wordIndexStart, wordIndexEnd)),
    joinParagraphs: (paragraphIndex: number, wordIndex: number) => dispatch(joinParagraphs(paragraphIndex, wordIndex)),
    onRedo: () => dispatch(UndoActionCreators.redo()),
    onUndo: () => dispatch(UndoActionCreators.undo()),
    readParagraphs: (paragraphs: IParagraph[]) => dispatch(readParagraphs(paragraphs)),
    splitParagraphs: (paragraphIndex: number, wordIndex: number) => dispatch(splitParagraphs(paragraphIndex, wordIndex)),
    updateMarkers: (paragraphIndex: number, wordIndexStart: number, wordIndexEnd: number) => dispatch(updateMarkers(paragraphIndex, wordIndexStart, wordIndexEnd)),
    updateSpeaker: (paragraphIndex: number, speaker: number) => dispatch(updateSpeaker(paragraphIndex, speaker)),
    updateSpeakerName: (speaker: number, name: string, paragraphIndex?: number) => dispatch(updateSpeakerName(speaker, name, paragraphIndex)),
    updateStartTime: (startTime: number) => dispatch(updateStartTime(startTime)),
    updateWords: (paragraphIndex: number, wordIndexStart: number, wordIndexEnd: number, words: string[], recalculate: boolean) => dispatch(updateWords(paragraphIndex, wordIndexStart, wordIndexEnd, words, recalculate)),
  }
}

const enhance = compose(
  withFirestore,
  connect<void, IDispatchProps, void>(
    mapStateToProps,
    mapDispatchToProps,
  ),
)

export default enhance(Paragraphs)
