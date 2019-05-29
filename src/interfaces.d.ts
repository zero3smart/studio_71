import { ProgressType, InteractionType, MicrophoneDistance, OriginalMediaType, RecordingDeviceType, Timestamp, UploadTaskStatus, Role } from "./enums"

interface ITranscript {
  createdAt?: firebase.firestore.Timestamp | firebase.firestore.FieldValue
  id?: string
  name?: string
  gsUrls?: {
    audio: string
  }
  status?: {
    error?: any
    percent?: number
    progress?: ProgressType
  }
  metadata?: IMetadata
  paragraphs?: Array<IParagraph>
  roles?: {
    [userId: string]: {
      name: string
      role: Role
    }
  }
  speakerNames?: {
    [key: number]: string
  }
  userIds?: Array<string>
}

interface IMetadata {
  audioDuration?: number
  audioTopic?: string
  fileExtension?: string
  industryNaicsCodeOfAudio?: number | string
  interactionType: InteractionType
  languageCodes: Array<string>
  microphoneDistance: MicrophoneDistance
  originalMediaType: OriginalMediaType
  originalMimeType?: string
  recordingDeviceName?: string
  recordingDeviceType: RecordingDeviceType
  speechContexts?: Array<ISpeechContext>
  startTime?: number
}

interface ISpeechContext {
  phrases: Array<string>
}

interface IParagraph {
  id: string
  speaker?: number
  startTime: number
  words: Array<IWord>
}

interface IWord {
  confidence: number
  deleted?: boolean
  text: string
  endTime: number
  startTime: number
}

interface IUploadTask {
  status: UploadTaskStatus
  error?: Error
  file: File
  transcriptId: string
}
