// Default values of a show: parameter state, demo setup and the initial show file.
import {
  CURVE_POINT_COUNT,
  DEFAULT_INPUT_PORT,
  DEFAULT_OUTPUT_HOST,
  DEFAULT_OUTPUT_PORT,
  DEFAULT_OUTPUT_RATE_HZ,
  type ParamStateDto,
  type ParameterDeclDto,
  type PresetDto,
  type SetupDto,
  type ShowDto,
} from '../../show.dto'
import { defaultValue } from '../../modulation'

export const PRESET_ZERO_NAME = 'Preset 0'

export function defaultParamState(decl: ParameterDeclDto): ParamStateDto {
  return {
    mode: 'fixed',
    visible: true,
    fixed: defaultValue(decl),
    // "Effacer" a curve brings it back to 50 % (ofxGuiModulator behaviour).
    curve: flatCurve(),
    lfo: { waveform: 'sine', ratio: 1, phase: 0, amplitude: 1, offset: 0.5 },
  }
}

export function flatCurve(): number[] {
  return new Array<number>(CURVE_POINT_COUNT).fill(0.5)
}

/** Small demo setup, so that a new show is not an empty screen. */
export function demoSetup(): SetupDto {
  const param = (
    address: string,
    type: ParameterDeclDto['type'],
    min: number,
    max: number,
    description: string,
    keywords: string[],
  ): ParameterDeclDto => ({ address, type, min, max, description, keywords })
  return {
    inputPort: DEFAULT_INPUT_PORT,
    output: { host: DEFAULT_OUTPUT_HOST, port: DEFAULT_OUTPUT_PORT },
    outputRateHz: DEFAULT_OUTPUT_RATE_HZ,
    parameters: [
      param('/video/master/opacity', 'float', 0, 1, 'Opacité générale', ['vidéo', 'master']),
      param('/video/layer1/hue', 'float', 0, 360, 'Teinte du calque 1', ['vidéo', 'couleur']),
      param('/video/layer1/speed', 'int', 0, 10, 'Vitesse du calque 1', ['vidéo']),
      param('/video/layer1/strobe', 'bool', 0, 1, 'Stroboscope du calque 1', ['vidéo', 'effet']),
      param('/video/title', 'text', 0, 1, 'Texte affiché', ['vidéo', 'texte']),
      param('/audio/reverb/mix', 'float', 0, 1, 'Dosage de la réverbération', ['audio', 'effet']),
      param('/audio/master/mute', 'bool', 0, 1, 'Coupure du son', ['audio', 'master']),
    ],
    inputs: [
      { address: '/fader1', type: 'float', min: 0, max: 1, description: 'Fader 1 du contrôleur', keywords: [], maxRateHz: 100 },
    ],
  }
}

export function presetZero(setup: SetupDto, id: string): PresetDto {
  return {
    id,
    name: PRESET_ZERO_NAME,
    description: 'État neutre : tous les paramètres visibles et réglables.',
    cycleBeats: 4,
    params: Object.fromEntries(setup.parameters.map((decl) => [decl.address, defaultParamState(decl)])),
    links: [],
  }
}

export function createDefaultShow(createId: () => string): ShowDto {
  const setup = demoSetup()
  return { version: 1, setup, presets: [presetZero(setup, createId())] }
}
