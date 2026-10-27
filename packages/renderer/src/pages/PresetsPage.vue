<!-- Role: preset management: recall, create (from preset 0), edit, duplicate, reorder, delete;
     plus the show file and its OSC ports. -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PresetInfoDto, PresetSummaryDto } from '@template/plugin-show/dto'
import { injectShow } from '../composables/show-context'
import { useAsyncAction } from '../composables/use-async-action'
import OscPortsCard from './presets/OscPortsCard.vue'
import PresetInfoDialog from './presets/PresetInfoDialog.vue'
import ShowFilesCard from './presets/ShowFilesCard.vue'

const show = injectShow()
const { snapshot } = show
const { errorMessage, run } = useAsyncAction()

const presets = computed(() => snapshot.value?.presets ?? [])
const activeId = computed(() => snapshot.value?.activePreset.id)

const EMPTY_INFO: PresetInfoDto = { name: '', description: '', cycleBeats: 4 }
const createDialog = ref(false)
const editDialog = ref(false)
const editing = ref<PresetSummaryDto>()
const deleting = ref<PresetSummaryDto>()

function edit(preset: PresetSummaryDto): void {
  editing.value = preset
  editDialog.value = true
}

function confirmDelete(): void {
  const preset = deleting.value
  deleting.value = undefined
  if (preset) void run(() => show.deletePreset(preset.id))
}
</script>

<template>
  <div class="mb-3">
    <div class="page-title text-h5 mb-1">Presets</div>
    <div class="section-sub">
      Le preset 0 est l'état neutre : chaque nouveau preset en est une copie. Le numéro d'un preset est sa position.
    </div>
  </div>

  <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-3" closable>{{ errorMessage }}</v-alert>

  <v-row>
    <v-col cols="12" lg="8">
      <v-card class="pa-4">
        <div class="d-flex align-center mb-2">
          <div class="section-title">
            <v-icon size="18">mdi-playlist-play</v-icon>
            Liste des presets
          </div>
          <v-spacer />
          <v-btn variant="tonal" color="accent" prepend-icon="mdi-plus" @click="createDialog = true">Nouveau preset</v-btn>
        </div>
        <v-table>
          <thead>
            <tr>
              <th>#</th>
              <th>Nom</th>
              <th class="d-none d-sm-table-cell">Temps</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(preset, index) in presets" :key="preset.id" :class="{ 'row-active': preset.id === activeId }">
              <td class="mono">{{ index }}</td>
              <td>
                <div class="cell-strong">{{ preset.name }}</div>
                <div class="section-sub">{{ preset.description }}</div>
              </td>
              <td class="d-none d-sm-table-cell">{{ preset.cycleBeats }}</td>
              <td class="text-right text-no-wrap">
                <v-btn
                  icon="mdi-play"
                  variant="text"
                  size="small"
                  :color="preset.id === activeId ? 'accent' : undefined"
                  aria-label="Rappeler"
                  @click="run(() => show.recallPreset(preset.id))"
                />
                <v-btn icon="mdi-pencil-outline" variant="text" size="small" aria-label="Modifier" @click="edit(preset)" />
                <v-btn
                  icon="mdi-content-copy"
                  variant="text"
                  size="small"
                  aria-label="Dupliquer"
                  @click="run(() => show.duplicatePreset(preset.id))"
                />
                <template v-if="index > 0">
                  <v-btn
                    icon="mdi-arrow-up"
                    variant="text"
                    size="small"
                    aria-label="Monter"
                    :disabled="index === 1"
                    @click="run(() => show.movePreset(preset.id, index - 1))"
                  />
                  <v-btn
                    icon="mdi-arrow-down"
                    variant="text"
                    size="small"
                    aria-label="Descendre"
                    :disabled="index === presets.length - 1"
                    @click="run(() => show.movePreset(preset.id, index + 1))"
                  />
                  <v-btn
                    icon="mdi-delete-outline"
                    variant="text"
                    size="small"
                    color="danger"
                    aria-label="Supprimer"
                    @click="deleting = preset"
                  />
                </template>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </v-col>
    <v-col cols="12" lg="4" class="d-flex flex-column ga-4">
      <ShowFilesCard />
      <OscPortsCard />
    </v-col>
  </v-row>

  <PresetInfoDialog
    v-model="createDialog"
    title="Nouveau preset (copie du preset 0)"
    :initial="EMPTY_INFO"
    @save="(info) => run(() => show.createPreset(info))"
  />
  <PresetInfoDialog
    v-model="editDialog"
    title="Modifier le preset"
    :initial="editing ?? EMPTY_INFO"
    @save="(info) => editing && run(() => show.updatePresetInfo(editing!.id, info))"
  />
  <v-dialog :model-value="deleting !== undefined" max-width="420" @update:model-value="deleting = undefined">
    <v-card class="pa-4">
      <div class="section-title mb-2">Supprimer « {{ deleting?.name }} » ?</div>
      <div class="section-sub mb-3">Cette action est définitive.</div>
      <div class="d-flex ga-2">
        <v-spacer />
        <v-btn variant="text" @click="deleting = undefined">Annuler</v-btn>
        <v-btn variant="tonal" color="danger" @click="confirmDelete">Supprimer</v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>
