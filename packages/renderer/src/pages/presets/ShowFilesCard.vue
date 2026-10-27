<!-- Role: the open show file: switch to another show or create a new one. -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { injectShow } from '../../composables/show-context'
import { useAsyncAction } from '../../composables/use-async-action'

const show = injectShow()
const { snapshot } = show
const { pending, errorMessage, run } = useAsyncAction()

const newName = ref('')
const otherShows = computed(() => (snapshot.value?.shows ?? []).filter((name) => name !== snapshot.value?.showName))

function create(): void {
  const name = newName.value.trim()
  if (!name) return
  void run(async () => {
    await show.createShow(name)
    newName.value = ''
  })
}
</script>

<template>
  <v-card class="pa-4">
    <div class="section-title mb-1">
      <v-icon size="18">mdi-file-document-outline</v-icon>
      Show
    </div>
    <div class="section-sub mb-3">
      Un show = un fichier JSON (setup + presets), enregistré automatiquement à chaque modification.
    </div>
    <div class="stat-value mono mb-3">{{ snapshot?.showName }}</div>

    <v-alert v-if="snapshot?.warning" type="warning" variant="tonal" class="mb-3">{{ snapshot.warning }}</v-alert>
    <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-3" closable>{{ errorMessage }}</v-alert>

    <v-select
      v-if="otherShows.length > 0"
      :items="otherShows"
      label="Ouvrir un autre show"
      class="mb-3"
      :loading="pending"
      @update:model-value="(name: string | null) => name && run(() => show.openShow(name))"
    />
    <form class="d-flex align-center ga-2" @submit.prevent="create">
      <v-text-field v-model="newName" label="Nouveau show (lettres, chiffres, - _)" />
      <v-btn type="submit" variant="tonal" color="accent" :loading="pending" :disabled="!newName.trim()">Créer</v-btn>
    </form>
  </v-card>
</template>
