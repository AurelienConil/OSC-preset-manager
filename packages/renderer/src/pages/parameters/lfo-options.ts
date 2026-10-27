// Role: display options of the LFO settings (waveform names, synced ratios).
import { CURVE_POINT_COUNT, LFO_RATIOS, type LfoSettingsDto, type WaveformDto } from '@template/plugin-show/dto'
import { lfoUnit } from '@template/plugin-show/modulation'

export const WAVEFORM_ITEMS: { title: string; value: WaveformDto }[] = [
  { title: 'Sinus', value: 'sine' },
  { title: 'Dent de scie', value: 'saw' },
  { title: 'Triangle', value: 'triangle' },
  { title: 'Carré', value: 'square' },
  { title: 'Aléatoire', value: 'random' },
]

export function ratioLabel(ratio: number): string {
  return ratio >= 1 ? `x${ratio}` : `/${Math.round(1 / ratio)}`
}

export const RATIO_ITEMS = LFO_RATIOS.map((ratio) => ({ title: ratioLabel(ratio), value: ratio }))

/** One preset cycle of the LFO, sampled like a curve, for the preview. */
export function lfoPreview(lfo: LfoSettingsDto): number[] {
  return Array.from({ length: CURVE_POINT_COUNT }, (_, index) => lfoUnit(lfo, index / CURVE_POINT_COUNT))
}
