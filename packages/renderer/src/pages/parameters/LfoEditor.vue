<!-- Role: settings of a parameter's oscillator (waveform, synced ratio, phase, amplitude, offset) with a preview. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { LfoSettingsDto } from '@template/plugin-show/dto'
import CurveCanvas from './CurveCanvas.vue'
import { RATIO_ITEMS, WAVEFORM_ITEMS, lfoPreview } from './lfo-options'

const props = defineProps<{
  lfo: LfoSettingsDto
  playhead: number
}>()

const emit = defineEmits<{
  update: [lfo: LfoSettingsDto]
}>()

const preview = computed(() => lfoPreview(props.lfo))
const set = <K extends keyof LfoSettingsDto>(key: K, value: LfoSettingsDto[K]) => emit('update', { ...props.lfo, [key]: value })

const sliders = [
  { key: 'phase', label: 'Phase' },
  { key: 'amplitude', label: 'Amplitude' },
  { key: 'offset', label: 'Centre' },
] as const
</script>

<template>
  <div class="lfo-grid">
    <v-select
      label="Forme"
      :items="WAVEFORM_ITEMS"
      :model-value="lfo.waveform"
      @update:model-value="(value: LfoSettingsDto['waveform']) => set('waveform', value)"
    />
    <v-select
      label="Fréquence (cycle)"
      :items="RATIO_ITEMS"
      :model-value="lfo.ratio"
      @update:model-value="(value: number) => set('ratio', value)"
    />
    <div v-for="slider in sliders" :key="slider.key">
      <div class="slider-label">{{ slider.label }} · {{ Math.round(lfo[slider.key] * 100) }} %</div>
      <v-slider
        :model-value="lfo[slider.key]"
        :min="0"
        :max="1"
        :step="0.01"
        hide-details
        color="accent"
        @update:model-value="(value: number) => set(slider.key, value)"
      />
    </div>
  </div>
  <CurveCanvas class="mt-2" :points="preview" :playhead="playhead" />
</template>
