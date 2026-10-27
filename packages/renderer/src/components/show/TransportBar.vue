<!-- Role: global transport in the top bar: play / stop, tempo, beat counter, cycle progress,
     quick preset recall and OSC network status. -->
<script setup lang="ts">
import { computed } from 'vue'
import { injectShow } from '../../composables/show-context'
import { useAsyncAction } from '../../composables/use-async-action'

const show = injectShow()
const { snapshot, transport, playhead } = show
const { run } = useAsyncAction()

const BEATS_PER_BAR = 4
const playing = computed(() => transport.value?.playing === true)
const position = computed(() => {
  const beat = Math.floor(playhead.value.beat)
  return `${Math.floor(beat / BEATS_PER_BAR) + 1}.${(beat % BEATS_PER_BAR) + 1}`
})
const presetItems = computed(() =>
  (snapshot.value?.presets ?? []).map((preset, index) => ({ title: `${index} · ${preset.name}`, value: preset.id })),
)
const io = computed(() => snapshot.value?.io)
const ioLabel = computed(() => {
  if (!io.value) return 'Connexion…'
  if (io.value.error) return io.value.error
  return `Entrée UDP ${io.value.listeningPort} · sortie ${io.value.output.host}:${io.value.output.port}`
})

function submitBpm(raw: string): void {
  const bpm = Number.parseFloat(raw)
  if (Number.isFinite(bpm)) void run(() => show.setTransport({ bpm }))
}
</script>

<template>
  <div class="transport-bar">
    <v-btn
      :icon="playing ? 'mdi-stop' : 'mdi-play'"
      :color="playing ? 'accent' : undefined"
      variant="tonal"
      size="small"
      :aria-label="playing ? 'Stop' : 'Play'"
      @click="run(() => show.setTransport({ playing: !playing }))"
    />
    <v-text-field
      :model-value="transport?.bpm"
      type="number"
      label="BPM"
      class="field-bpm"
      @change="(event: Event) => submitBpm((event.target as HTMLInputElement).value)"
    />
    <span class="mono transport-beat">{{ position }}</span>
    <v-progress-linear
      :model-value="playhead.phase * 100"
      :transition="false"
      color="accent"
      rounded
      height="6"
      class="transport-progress d-none d-sm-flex"
    />
    <v-select
      :model-value="snapshot?.activePreset.id"
      :items="presetItems"
      label="Preset"
      class="transport-preset"
      @update:model-value="(id: string) => run(() => show.recallPreset(id))"
    />
    <v-tooltip :text="ioLabel" location="bottom">
      <template #activator="{ props: tooltip }">
        <v-icon
          v-bind="tooltip"
          class="d-none d-sm-flex"
          :color="io?.error ? 'danger' : io ? 'success' : undefined"
        >
          {{ io?.error ? 'mdi-lan-disconnect' : 'mdi-lan-connect' }}
        </v-icon>
      </template>
    </v-tooltip>
  </div>
</template>
