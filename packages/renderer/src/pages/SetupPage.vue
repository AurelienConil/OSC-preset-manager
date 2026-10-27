<!-- Role: setup of the show: declared output parameters, declared inputs, and the addresses
     received on the input but not declared yet. -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { InputDeclDto, ParameterDeclDto, SetupDto } from '@template/plugin-show/dto'
import { injectShow } from '../composables/show-context'
import { useAsyncAction } from '../composables/use-async-action'
import { formatInputValue, formatRange, formatValue } from './parameters/format-value'
import DeclarationDialog from './setup/DeclarationDialog.vue'
import SetupJsonDialog from './setup/SetupJsonDialog.vue'
import { guessInputDeclaration, type DeclarationForm } from './setup/declaration-form'

type Kind = 'parameter' | 'input'

const show = injectShow()
const { snapshot, inputs: liveInputs } = show
const { errorMessage, run } = useAsyncAction()

const setup = computed(() => snapshot.value?.setup)
const parameters = computed(() => setup.value?.parameters ?? [])
const inputs = computed(() => setup.value?.inputs ?? [])
const undeclared = computed(() => {
  const declared = new Set(inputs.value.map((input) => input.address))
  return Object.keys(liveInputs.value)
    .filter((address) => !declared.has(address))
    .sort()
})

const BLANK: DeclarationForm = {
  address: '/',
  type: 'float',
  min: 0,
  max: 1,
  description: '',
  keywords: [],
  maxRateHz: null,
}

const dialog = ref(false)
const jsonDialog = ref(false)
const editing = ref<{ kind: Kind; index: number | null; initial: DeclarationForm }>({ kind: 'parameter', index: null, initial: BLANK })

function openDialog(kind: Kind, index: number | null, initial: DeclarationForm): void {
  editing.value = { kind, index, initial }
  dialog.value = true
}

function toParameter({ maxRateHz: _rate, ...decl }: DeclarationForm): ParameterDeclDto {
  return decl
}

function replaced<T>(list: readonly T[], index: number | null, item: T | undefined): T[] {
  if (index === null) return item ? [...list, item] : [...list]
  return list.flatMap((current, position) => (position !== index ? [current] : item ? [item] : []))
}

function apply(next: Partial<SetupDto>): void {
  const current = setup.value
  if (current) void run(() => show.updateSetup({ ...current, ...next }))
}

function save(declaration: DeclarationForm): void {
  const { kind, index } = editing.value
  if (kind === 'parameter') apply({ parameters: replaced(parameters.value, index, toParameter(declaration)) })
  else apply({ inputs: replaced(inputs.value, index, declaration) })
}

const asForm = (decl: ParameterDeclDto | InputDeclDto): DeclarationForm => ({ maxRateHz: null, ...decl })
const liveText = (input: InputDeclDto) => formatInputValue(input, liveInputs.value[input.address])
</script>

<template>
  <div class="d-flex align-center flex-wrap ga-2 mb-3">
    <div>
      <div class="page-title text-h5 mb-1">Setup</div>
      <div class="section-sub">Déclaration des messages OSC du show : paramètres pilotés en sortie, entrées écoutées.</div>
    </div>
    <v-spacer />
    <v-btn variant="tonal" prepend-icon="mdi-code-json" @click="jsonDialog = true">Éditer en JSON</v-btn>
  </div>

  <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-3" closable>{{ errorMessage }}</v-alert>

  <v-card class="pa-4 mb-4">
    <div class="d-flex align-center mb-2">
      <div class="section-title">
        <v-icon size="18">mdi-tune-vertical</v-icon>
        Paramètres (sorties) · {{ parameters.length }}
      </div>
      <v-spacer />
      <v-btn variant="tonal" color="accent" prepend-icon="mdi-plus" @click="openDialog('parameter', null, BLANK)">Ajouter</v-btn>
    </div>
    <v-table class="scroll-list-tall">
      <thead>
        <tr>
          <th>Adresse</th>
          <th>Type</th>
          <th class="d-none d-sm-table-cell">Plage</th>
          <th class="d-none d-md-table-cell">Description</th>
          <th class="col-actions-wide" />
        </tr>
      </thead>
      <tbody>
        <tr v-for="(decl, index) in parameters" :key="decl.address" class="table-row">
          <td class="mono cell-strong">{{ decl.address }}</td>
          <td>{{ decl.type }}</td>
          <td class="d-none d-sm-table-cell mono">{{ formatRange(decl) }}</td>
          <td class="d-none d-md-table-cell">
            {{ decl.description }}
            <v-chip v-for="keyword in decl.keywords" :key="keyword" size="x-small" class="ml-1">{{ keyword }}</v-chip>
          </td>
          <td class="text-right text-no-wrap">
            <v-btn icon="mdi-pencil-outline" variant="text" size="small" aria-label="Modifier" @click="openDialog('parameter', index, asForm(decl))" />
            <v-btn
              icon="mdi-delete-outline"
              variant="text"
              size="small"
              color="danger"
              aria-label="Supprimer"
              @click="apply({ parameters: replaced(parameters, index, undefined) })"
            />
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-card>

  <v-row>
    <v-col cols="12" md="7">
      <v-card class="pa-4">
        <div class="d-flex align-center mb-2">
          <div class="section-title">
            <v-icon size="18">mdi-import</v-icon>
            Entrées · {{ inputs.length }}
          </div>
          <v-spacer />
          <v-btn variant="tonal" color="accent" prepend-icon="mdi-plus" @click="openDialog('input', null, BLANK)">Ajouter</v-btn>
        </div>
        <v-table>
          <thead>
            <tr>
              <th>Adresse</th>
              <th>Type</th>
              <th class="d-none d-sm-table-cell">Plage</th>
              <th class="d-none d-sm-table-cell">Débit max</th>
              <th class="col-actions-wide" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="(input, index) in inputs" :key="input.address">
              <td>
                <div class="mono cell-strong">{{ input.address }}</div>
                <div class="section-sub mono" :class="{ 'value-saturated': liveText(input).saturated }" :title="liveText(input).title">
                  {{ liveText(input).text }}
                </div>
              </td>
              <td>{{ input.type }}</td>
              <td class="d-none d-sm-table-cell mono">{{ formatRange(input) }}</td>
              <td class="d-none d-sm-table-cell">{{ input.maxRateHz === null ? 'illimité' : `${input.maxRateHz} Hz` }}</td>
              <td class="text-right text-no-wrap">
                <v-btn icon="mdi-pencil-outline" variant="text" size="small" aria-label="Modifier" @click="openDialog('input', index, input)" />
                <v-btn
                  icon="mdi-delete-outline"
                  variant="text"
                  size="small"
                  color="danger"
                  aria-label="Supprimer"
                  @click="apply({ inputs: replaced(inputs, index, undefined) })"
                />
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </v-col>
    <v-col cols="12" md="5">
      <v-card class="pa-4">
        <div class="section-title mb-1">
          <v-icon size="18">mdi-radar</v-icon>
          Adresses reçues non déclarées
        </div>
        <div class="section-sub mb-3">
          Bougez un contrôle de votre interface OSC : son adresse apparaît ici (port {{ setup?.inputPort }}).
        </div>
        <v-list v-if="undeclared.length > 0" class="scroll-list">
          <v-list-item v-for="address in undeclared" :key="address">
            <v-list-item-title class="mono">{{ address }}</v-list-item-title>
            <v-list-item-subtitle class="mono">{{ formatValue(liveInputs[address]) }}</v-list-item-subtitle>
            <template #append>
              <v-btn
                variant="tonal"
                size="small"
                prepend-icon="mdi-plus"
                @click="openDialog('input', null, guessInputDeclaration(address, liveInputs[address]))"
              >
                Déclarer
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
        <div v-else class="section-sub">Rien reçu pour l'instant.</div>
      </v-card>
    </v-col>
  </v-row>

  <DeclarationDialog
    v-model="dialog"
    :kind="editing.kind"
    :initial="editing.initial"
    :is-new="editing.index === null"
    @save="save"
  />
  <SetupJsonDialog v-if="setup" v-model="jsonDialog" :setup="setup" @save="(next) => apply(next)" />
</template>
