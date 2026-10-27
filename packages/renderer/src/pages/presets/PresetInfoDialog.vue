<!-- Role: form dialog of a preset's name, description and cycle duration (create or edit). -->
<script setup lang="ts">
import { reactive, watch } from 'vue'
import { CYCLE_BEAT_OPTIONS, type PresetInfoDto } from '@template/plugin-show/dto'

const props = defineProps<{
  title: string
  initial: PresetInfoDto
}>()

const emit = defineEmits<{
  save: [info: PresetInfoDto]
}>()

const open = defineModel<boolean>({ required: true })
const form = reactive<PresetInfoDto>({ ...props.initial })

watch(open, (isOpen) => {
  if (isOpen) Object.assign(form, props.initial)
})

function submit(): void {
  if (!form.name.trim()) return
  emit('save', { ...form, name: form.name.trim() })
  open.value = false
}
</script>

<template>
  <v-dialog v-model="open" max-width="480">
    <v-card class="pa-4">
      <div class="section-title mb-3">{{ title }}</div>
      <form class="d-flex flex-column ga-3" @submit.prevent="submit">
        <v-text-field v-model="form.name" label="Nom" autofocus />
        <v-textarea v-model="form.description" label="Description" rows="2" auto-grow />
        <div>
          <div class="slider-label mb-1">Durée des courbes</div>
          <v-btn-toggle v-model="form.cycleBeats" mandatory density="compact" variant="outlined" divided>
            <v-btn v-for="beats in CYCLE_BEAT_OPTIONS" :key="beats" :value="beats">{{ beats }} temps</v-btn>
          </v-btn-toggle>
        </div>
        <div class="d-flex ga-2">
          <v-spacer />
          <v-btn variant="text" @click="open = false">Annuler</v-btn>
          <v-btn type="submit" variant="tonal" color="accent" :disabled="!form.name.trim()">Enregistrer</v-btn>
        </div>
      </form>
    </v-card>
  </v-dialog>
</template>
