<!-- Role: pin matrix of the active preset: which declared OSC inputs drive which parameters. -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { InputDeclDto, PinLinkDto } from '@template/plugin-show/dto'
import { injectShow } from '../composables/show-context'
import { useAsyncAction } from '../composables/use-async-action'
import { ROOT_GROUP, allGroups, matchesFilter } from './parameters/address-groups'
import { formatInputValue, formatRange } from './parameters/format-value'

const show = injectShow()
const { snapshot, inputs: liveInputs } = show
const { errorMessage, run } = useAsyncAction()

const group = ref(ROOT_GROUP)
const text = ref('')

const setup = computed(() => snapshot.value?.setup)
const links = computed(() => snapshot.value?.activePreset.links ?? [])
const declaredInputs = computed(() => setup.value?.inputs ?? [])
const outputs = computed(() =>
  (setup.value?.parameters ?? []).filter((decl) => matchesFilter(decl, { group: group.value, text: text.value, types: [] })),
)
const groupItems = computed(() => [
  { title: 'Tous les groupes', value: ROOT_GROUP },
  ...allGroups((setup.value?.parameters ?? []).map((decl) => decl.address)).map((path) => ({ title: path, value: path })),
])

const liveText = (input: InputDeclDto) => formatInputValue(input, liveInputs.value[input.address])

const key = (input: string, output: string) => `${input} ${output}`
const linked = computed(() => new Set(links.value.map((link) => key(link.input, link.output))))

function toggle(input: string, output: string): void {
  const next: PinLinkDto[] = linked.value.has(key(input, output))
    ? links.value.filter((link) => key(link.input, link.output) !== key(input, output))
    : [...links.value, { input, output }]
  void run(() => show.setLinks(next))
}
</script>

<template>
  <div class="mb-3">
    <div class="page-title text-h5 mb-1">Pin matrix</div>
    <div class="section-sub">
      Relie une entrée OSC à un ou plusieurs paramètres, pour le preset
      <strong>{{ snapshot?.activePreset.name }}</strong>. Un paramètre relié suit son entrée (mise à l'échelle
      sur son min / max) au lieu de son propre mode.
    </div>
  </div>

  <div class="filter-bar mb-3">
    <v-select v-model="group" :items="groupItems" label="Groupe" class="filter-bar-types" />
    <v-text-field v-model="text" label="Filtrer les paramètres" prepend-inner-icon="mdi-magnify" clearable class="filter-bar-search" />
  </div>

  <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-3" closable>{{ errorMessage }}</v-alert>

  <div v-if="declaredInputs.length === 0" class="section-sub">
    Aucune entrée déclarée : déclarez-en dans la page Setup (les adresses reçues y sont proposées).
  </div>
  <v-card v-else class="pin-matrix">
    <v-table>
      <thead>
        <tr>
          <th class="pin-matrix-row-head">Entrée ↓ · Sortie →</th>
          <th v-for="output in outputs" :key="output.address" class="pin-matrix-col" :title="output.description">
            <span class="mono">{{ output.address }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="input in declaredInputs" :key="input.address">
          <th class="pin-matrix-row-head">
            <div class="mono cell-strong">{{ input.address }}</div>
            <div class="section-sub mono">{{ formatRange(input) }}</div>
            <div class="section-sub mono" :class="{ 'value-saturated': liveText(input).saturated }" :title="liveText(input).title">
              {{ liveText(input).text }}
            </div>
          </th>
          <td v-for="output in outputs" :key="output.address" class="pin-matrix-cell">
            <v-checkbox-btn
              :model-value="linked.has(key(input.address, output.address))"
              color="accent"
              :aria-label="`${input.address} → ${output.address}`"
              @update:model-value="toggle(input.address, output.address)"
            />
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>
