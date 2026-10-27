<!-- Role: modal editor of a parameter's curve: draw with the mouse or a finger, clear to 50 %, apply or cancel. -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import CurveCanvas from './CurveCanvas.vue'

const props = defineProps<{
  address: string
  points: readonly number[]
  playhead: number
}>()

const emit = defineEmits<{
  save: [points: number[]]
}>()

const open = defineModel<boolean>({ required: true })
const draft = ref<number[]>([])

watch(open, (isOpen) => {
  if (isOpen) draft.value = [...props.points]
})

function apply(): void {
  emit('save', draft.value)
  open.value = false
}
</script>

<template>
  <v-dialog v-model="open" max-width="900">
    <v-card class="pa-4">
      <div class="section-title mb-1">
        <v-icon size="18">mdi-chart-bell-curve-cumulative</v-icon>
        Courbe — <span class="mono">{{ address }}</span>
      </div>
      <div class="section-sub mb-3">
        Dessinez la courbe à la souris ou au doigt. Elle est jouée en boucle sur la durée du preset.
      </div>
      <CurveCanvas :points="draft" :playhead="playhead" editable @draw="(points) => (draft = points)" />
      <div class="d-flex ga-2 mt-3">
        <v-btn variant="text" prepend-icon="mdi-eraser" @click="draft = draft.map(() => 0.5)">Effacer</v-btn>
        <v-spacer />
        <v-btn variant="text" @click="open = false">Annuler</v-btn>
        <v-btn variant="tonal" color="accent" @click="apply">Appliquer</v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>
