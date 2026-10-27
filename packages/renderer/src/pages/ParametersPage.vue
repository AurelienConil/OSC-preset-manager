<!-- Role: parameters of the active preset: navigation by group, filtering, and one control per parameter. -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ParamStateDto, ParamTypeDto } from '@template/plugin-show/dto'
import { injectShow } from '../composables/show-context'
import { useAsyncAction } from '../composables/use-async-action'
import { ROOT_GROUP, matchesFilter } from './parameters/address-groups'
import GroupNavigator from './parameters/GroupNavigator.vue'
import ParamControl from './parameters/ParamControl.vue'

const show = injectShow()
const { snapshot, values, playhead } = show
const { errorMessage, run } = useAsyncAction()

const group = ref(ROOT_GROUP)
const text = ref('')
const types = ref<ParamTypeDto[]>([])
const showHidden = ref(false)

const TYPE_ITEMS: { title: string; value: ParamTypeDto }[] = [
  { title: 'Décimal', value: 'float' },
  { title: 'Entier', value: 'int' },
  { title: 'Booléen', value: 'bool' },
  { title: 'Texte', value: 'text' },
]

const preset = computed(() => snapshot.value?.activePreset)
const isPresetZero = computed(() => preset.value?.id === snapshot.value?.presets[0]?.id)
const parameters = computed(() => snapshot.value?.setup.parameters ?? [])
const addresses = computed(() => parameters.value.map((decl) => decl.address))
const driven = computed(() => new Set(preset.value?.links.map((link) => link.output)))

const rows = computed(() =>
  parameters.value.flatMap((decl) => {
    const state = preset.value?.params[decl.address]
    return state ? [{ decl, state }] : []
  }),
)
const hiddenCount = computed(() => rows.value.filter(({ state }) => !state.visible).length)
const shownRows = computed(() =>
  rows.value.filter(
    ({ decl, state }) =>
      (state.visible || showHidden.value) && matchesFilter(decl, { group: group.value, text: text.value, types: types.value }),
  ),
)

const patch = (address: string, patch: Partial<ParamStateDto>) => run(() => show.setParamState({ address, patch }))
</script>

<template>
  <div class="d-flex align-center flex-wrap ga-2 mb-3">
    <div class="page-title text-h5">Paramètres</div>
    <v-chip v-if="preset" size="small" variant="tonal" color="accent" prepend-icon="mdi-playlist-play">
      {{ preset.name }} · {{ preset.cycleBeats }} temps
    </v-chip>
  </div>

  <div class="filter-bar mb-2">
    <v-text-field
      v-model="text"
      label="Filtrer (nom, description, mot-clé)"
      prepend-inner-icon="mdi-magnify"
      clearable
      class="filter-bar-search"
    />
    <v-select v-model="types" label="Types" :items="TYPE_ITEMS" multiple chips closable-chips class="filter-bar-types" />
    <v-switch
      v-if="!isPresetZero"
      v-model="showHidden"
      :label="`Afficher les masqués (${hiddenCount})`"
    />
  </div>

  <GroupNavigator v-model="group" :addresses="addresses" class="mb-3" />

  <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-3" closable>{{ errorMessage }}</v-alert>

  <div v-if="shownRows.length > 0" class="param-list">
    <ParamControl
      v-for="{ decl, state } in shownRows"
      :key="decl.address"
      :decl="decl"
      :state="state"
      :value="values[decl.address]"
      :playhead="playhead.phase"
      :driven="driven.has(decl.address)"
      :can-hide="!isPresetZero"
      @patch="(next) => patch(decl.address, next)"
      @group="group = $event"
    />
  </div>
  <div v-else class="section-sub">
    {{ parameters.length === 0 ? 'Aucun paramètre déclaré : voir la page Setup.' : 'Aucun paramètre ne correspond.' }}
  </div>
</template>
