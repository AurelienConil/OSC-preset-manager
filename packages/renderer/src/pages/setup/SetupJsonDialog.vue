<!-- Role: bulk edition of the whole setup as JSON (paste a list of parameters, copy a setup between shows). -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import type { SetupDto } from '@template/plugin-show/dto'

const props = defineProps<{
  setup: SetupDto
}>()

const emit = defineEmits<{
  /** Raw parsed JSON: the backend validates it against the contract. */
  save: [setup: SetupDto]
}>()

const open = defineModel<boolean>({ required: true })
const text = ref('')
const parseError = ref<string>()

watch(open, (isOpen) => {
  if (!isOpen) return
  text.value = JSON.stringify(props.setup, null, 2)
  parseError.value = undefined
})

function submit(): void {
  try {
    emit('save', JSON.parse(text.value) as SetupDto)
    open.value = false
  } catch (error) {
    parseError.value = `JSON invalide : ${(error as Error).message}`
  }
}
</script>

<template>
  <v-dialog v-model="open" max-width="900">
    <v-card class="pa-4">
      <div class="section-title mb-1">Setup en JSON</div>
      <div class="section-sub mb-3">Le setup est vérifié par le backend avant d'être appliqué.</div>
      <v-alert v-if="parseError" type="error" variant="tonal" class="mb-3">{{ parseError }}</v-alert>
      <v-textarea v-model="text" rows="20" class="json-editor" spellcheck="false" />
      <div class="d-flex ga-2 mt-3">
        <v-spacer />
        <v-btn variant="text" @click="open = false">Annuler</v-btn>
        <v-btn variant="tonal" color="accent" @click="submit">Appliquer</v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>
