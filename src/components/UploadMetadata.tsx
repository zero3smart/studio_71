import React, { Component } from "react"
import { Accordion, AccordionTitleProps, CheckboxProps, Form, Icon, Radio, TextArea, TextAreaProps } from "semantic-ui-react"
import { InteractionType, MicrophoneDistance, OriginalMediaType, RecordingDeviceType } from "../enums"

interface IState {
  active: boolean
}

interface IProps {
  audioTopic: string
  industryNaicsCodeOfAudio: string
  interactionType: InteractionType
  microphoneDistance: MicrophoneDistance
  originalMediaType: OriginalMediaType
  recordingDeviceName: string
  recordingDeviceType: RecordingDeviceType
  speechContextsPhrases: string

  handleInteractionTypeChange: (interactionType: InteractionType) => void
  handleAudioTopicChange: (audioTopic: string) => void
  handleIndustryNaicsCodeOfAudioChange: (industryNaicsCodeOfAudio: string) => void
  handleMicrophoneDistanceChange: (microphoneDistance: MicrophoneDistance) => void
  handleOriginalMediaTypeChange: (originalMediaType: OriginalMediaType) => void
  handleRecordingDeviceNameChange: (recordingDeviceName: string) => void
  handleRecordingDeviceTypeChange: (recordingDeviceType: RecordingDeviceType) => void
  handleSpeechContextsPhrasesChange: (speechContextsPhrases: string) => void
}

class UploadMetadata extends Component<IProps, IState> {
  public state: Readonly<IState> = {
    active: false,
  }

  public render() {
    return (
      <div>
        <Accordion>
          <Accordion.Title active={this.state.active} onClick={this.handleToggleActive}>
            <Icon name="dropdown" />
            Avanserte innstillinger
          </Accordion.Title>
          <Accordion.Content className="upload-options-content" active={this.state.active}>
            <Form.Field>
              <label>Type</label>
              <Radio label="Ukjent eller annen type" name="type" value={InteractionType.Unspecified} checked={this.props.interactionType === InteractionType.Unspecified} onChange={this.handleInteractionTypeChange} />
            </Form.Field>
            <Form.Field>
              <Radio
                label="Diskusjon - Flere personer i samtale eller diskusjon, for eksempel i møte med to eller flere aktive deltakere"
                name="type"
                value={InteractionType.Discussion}
                checked={this.props.interactionType === InteractionType.Discussion}
                onChange={this.handleInteractionTypeChange}
              />
            </Form.Field>
            <Form.Field>
              <Radio
                label="Presentasjon - En eller flere personer foreleser eller presenterer til andre, stort sett uten avbrudd"
                name="type"
                value={InteractionType.Presentaton}
                checked={this.props.interactionType === InteractionType.Presentaton}
                onChange={this.handleInteractionTypeChange}
              />
            </Form.Field>
            <Form.Field>
              <Radio
                label="Telefon- eller videokonferansesamtale - To eller flere personer, som ikke er i samme rom, deltar aktivt i samtale."
                name="type"
                value={InteractionType.PhoneCall}
                checked={this.props.interactionType === InteractionType.PhoneCall}
                onChange={this.handleInteractionTypeChange}
              />
            </Form.Field>
            <Form.Field>
              <Radio
                label="Talepostmelding/mobilsvar - Opptak som er ment for en annen person å lytte til."
                name="type"
                value={InteractionType.Voicemail}
                checked={this.props.interactionType === InteractionType.Voicemail}
                onChange={this.handleInteractionTypeChange}
              />
            </Form.Field>
            <Form.Field>
              <Radio
                label="Profesjonelt produsert - Eksempelvis TV-show, podkast"
                name="type"
                value={InteractionType.ProfessionallyProduced}
                checked={this.props.interactionType === InteractionType.ProfessionallyProduced}
                onChange={this.handleInteractionTypeChange}
              />
            </Form.Field>
            <Form.Field>
              <Radio
                label="Diksjon - Opplesning av dokumenter som tekstmeldinger, e-post eller rapporter."
                name="type"
                value={InteractionType.Dictation}
                checked={this.props.interactionType === InteractionType.Dictation}
                onChange={this.handleInteractionTypeChange}
              />
            </Form.Field>

            <Form.Field>
              <label>NAICS-kode</label>
              Den 6-sifrede NAICS-koden som ligger tettest opptil emnene det snakkes om i lydfilen.
              <input value={this.props.industryNaicsCodeOfAudio} placeholder="NAICS-kode" onChange={this.handleIndustryNaicsCodeOfAudioChange} />
            </Form.Field>

            <Form.Field>
              <label>Mikrofonavstand</label>

              <Radio label="Ukjent" name="microphoneDistance" value={MicrophoneDistance.Unspecified} checked={this.props.microphoneDistance === MicrophoneDistance.Unspecified} onChange={this.handleMicrophoneDistanceChange} />
            </Form.Field>
            <Form.Field>
              <Radio label="Mindre enn 1 meter" name="MicrophoneDistance" value={MicrophoneDistance.Nearfield} checked={this.props.microphoneDistance === MicrophoneDistance.Nearfield} onChange={this.handleMicrophoneDistanceChange} />
            </Form.Field>
            <Form.Field>
              <Radio label="Mindre enn 3 meter" name="microphoneDistance" value={MicrophoneDistance.Midfield} checked={this.props.microphoneDistance === MicrophoneDistance.Midfield} onChange={this.handleMicrophoneDistanceChange} />
            </Form.Field>
            <Form.Field>
              <Radio label="Mer enn 3 meter" name="microphoneDistance" value={MicrophoneDistance.Farfield} checked={this.props.microphoneDistance === MicrophoneDistance.Farfield} onChange={this.handleMicrophoneDistanceChange} />
            </Form.Field>

            <Form.Field>
              <label>Opprinnelig mediatype</label>

              <Radio label="Ukjent" name="originalMediaType" value={OriginalMediaType.Unspecified} checked={this.props.originalMediaType === OriginalMediaType.Unspecified} onChange={this.handleOriginalMediaTypeChange} />
            </Form.Field>
            <Form.Field>
              <Radio label="Audio" name="originalMediaType" value={OriginalMediaType.Audio} checked={this.props.originalMediaType === OriginalMediaType.Audio} onChange={this.handleOriginalMediaTypeChange} />
            </Form.Field>
            <Form.Field>
              <Radio label="Video" name="originalMediaType" value={OriginalMediaType.Video} checked={this.props.originalMediaType === OriginalMediaType.Video} onChange={this.handleOriginalMediaTypeChange} />
            </Form.Field>

            <Form.Field>
              <label> Hvor eller hvordan ble opptaket gjort?</label>

              <Radio label="Ukjent" name="recordingDeviceType" value={RecordingDeviceType.Unspecified} checked={this.props.recordingDeviceType === RecordingDeviceType.Unspecified} onChange={this.handleRecordingDeviceTypeChange} />
            </Form.Field>
            <Form.Field>
              <Radio label="Smarttelefon" name="recordingDeviceType" value={RecordingDeviceType.Smartphone} checked={this.props.recordingDeviceType === RecordingDeviceType.Smartphone} onChange={this.handleRecordingDeviceTypeChange} />
            </Form.Field>
            <Form.Field>
              <Radio label="Telefonlinje" name="recordingDeviceType" value={RecordingDeviceType.PhoneLine} checked={this.props.recordingDeviceType === RecordingDeviceType.PhoneLine} onChange={this.handleRecordingDeviceTypeChange} />
            </Form.Field>
            <Form.Field>
              <Radio label="Kjøretøy" name="recordingDeviceType" value={RecordingDeviceType.Vehicle} checked={this.props.recordingDeviceType === RecordingDeviceType.Vehicle} onChange={this.handleRecordingDeviceTypeChange} />
            </Form.Field>
            <Form.Field>
              <Radio
                label="Utendørs"
                name="recordingDeviceType"
                value={RecordingDeviceType.OtherOutdoorDevice}
                checked={this.props.recordingDeviceType === RecordingDeviceType.OtherOutdoorDevice}
                onChange={this.handleRecordingDeviceTypeChange}
              />
            </Form.Field>
            <Form.Field>
              <Radio
                label="Innendørs"
                name="recordingDeviceType"
                value={RecordingDeviceType.OtherIndoorDevice}
                checked={this.props.recordingDeviceType === RecordingDeviceType.OtherIndoorDevice}
                onChange={this.handleRecordingDeviceTypeChange}
              />
            </Form.Field>

            <Form.Field>
              <label> Navn på opptaksutstyr</label>
              Eksempel: iPhone X, Polycom SoundStation IP 6000, POTS, VOIP eller Cardioid Microphone
              <input value={this.props.recordingDeviceName} onChange={this.handleRecordingDeviceNameChange} />
            </Form.Field>

            <Form.Field>
              <label>Emne</label>
              Hva handler lydfilen om?
              <input value={this.props.audioTopic} onChange={this.handleAudioTopicChange} />
            </Form.Field>

            <Form.Field>
              <label>Kontekst</label>
              Gi "hint" til talegjenkjenningen for å favorisere bestemte ord og uttrykk i resultatene, i form av en kommaseparert liste.
              <TextArea value={this.props.speechContextsPhrases} onChange={this.handleSpeechContextsPhrasesChange} />
            </Form.Field>
          </Accordion.Content>
        </Accordion>
      </div>
    )
  }
  private handleToggleActive = (event: React.MouseEvent<HTMLDivElement, MouseEvent>, data: AccordionTitleProps) => {
    this.setState({ active: !this.state.active })
  }

  private handleInteractionTypeChange = (event: React.FormEvent<HTMLInputElement>, data: CheckboxProps) => {
    this.props.handleInteractionTypeChange(data.value as InteractionType)
  }

  private handleMicrophoneDistanceChange = (event: React.FormEvent<HTMLInputElement>, data: CheckboxProps) => {
    this.props.handleMicrophoneDistanceChange(data.value as MicrophoneDistance)
  }

  private handleAudioTopicChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.props.handleAudioTopicChange(event.target.value)
  }
  private handleIndustryNaicsCodeOfAudioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.props.handleIndustryNaicsCodeOfAudioChange(event.target.value)
  }
  private handleOriginalMediaTypeChange = (event: React.FormEvent<HTMLInputElement>, data: CheckboxProps) => {
    this.props.handleOriginalMediaTypeChange(data.value as OriginalMediaType)
  }
  private handleRecordingDeviceNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.props.handleRecordingDeviceNameChange(event.target.value)
  }
  private handleRecordingDeviceTypeChange = (event: React.FormEvent<HTMLInputElement>, data: CheckboxProps) => {
    this.props.handleRecordingDeviceTypeChange(data.value as RecordingDeviceType)
  }
  private handleSpeechContextsPhrasesChange = (event: React.FormEvent<HTMLTextAreaElement>, data: TextAreaProps) => {
    this.props.handleSpeechContextsPhrasesChange(event.target.value)
  }
}

export default UploadMetadata
