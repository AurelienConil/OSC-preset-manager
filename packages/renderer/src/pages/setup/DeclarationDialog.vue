<!-- Role: form dialog declaring an OSC address: an output parameter, or an input (with its rate limit). -->
<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { ParamTypeDto } from '@template/plugin-show/dto'
import type { DeclarationForm } from './declaration-form'

const props = defineProps<{
  kind: 'parameter' | 'input'
  initial: DeclarationForm
  isNew: boolean
}>()

const emit = defineEmits<{
  save: [declaration: DeclarationForm]
}>()

const open = defineModel<boolean>({ required: true })
const form = reactive<DeclarationForm>({ ...props.initial })
const rateText = computed({
  get: () => (form.maxRateHz === null ? '' : String(form.maxRateHz)),
  set: (text: string) => {
    const rate = Number.parseFloat(text)
    form.maxRateHz = Number.isFinite(rate) && rate > 0 ? rate : null
  },
})

const TYPE_ITEMS: { title: string; value: ParamTypeDto }[] = [
  { title: 'Décimal', value: 'float' },
  { title: 'Entier', value: 'int' },
  { title: 'Booléen', value: 'bool' },
  { title: 'Texte', value: 'text' },
]
const hasRange = computed(() => form.type === 'float' || form.type === 'int')
const title = computed(() => {
  const what = props.kind === 'parameter' ? 'paramètre' : 'entrée'
  return props.isNew ? `Déclarer ${props.kind === 'parameter' ? 'un' : 'une'} ${what}` : `Modifier ${what === 'entrée' ? "l'entrée" : 'le paramètre'}`
})

watch(open, (isOpen) => {
  if (isOpen) Object.assign(form, { ...props.initial, keywords: [...props.initial.keywords] })
})

function submit(): void {
  emit('save', {
    ...form,
    address: form.address.trim(),
    min: Number(form.min),
    max: Number(form.max),
    keywords: form.keywords.map((keyword) => keyword.trim()).filter(Boolean),
  })
  open.value = false
}
</script>

<template>
  <v-dialog v-model="open" max-width="520">
    <v-card class="pa-4">
      <div class="section-title mb-3">{{ title }}</div>
      <form class="d-flex flex-column ga-3" @submit.prevent="submit">
        <v-text-field v-model="form.address" label="Adresse OSC" placeholder="/video/layer1/opacity" class="mono" autofocus />
        <v-select v-model="form.type" label="Type" :items="TYPE_ITEMS" />
        <div v-if="hasRange" class="d-flex ga-2">
          <v-text-field v-model.number="form.min" type="number" label="Min" />
          <v-text-field v-model.number="form.max" type="number" label="Max" />
        </div>
        <v-text-field v-model="form.description" label="Description" />
        <v-combobox v-model="form.keywords" label="Mots-clés" multiple chips closable-chips />
        <v-text-field
          v-if="kind === 'input'"
          v-model="rateText"
          type="number"
          label="Débit maximal (Hz, vide = illimité)"
        />
        <div class="d-flex ga-2">
          <v-spacer />
          <v-btn variant="text" @click="open = false">Annuler</v-btn>
          <v-btn type="submit" variant="tonal" color="accent">Enregistrer</v-btn>
        </div>
      </form>
    </v-card>
  </v-dialog>
</template>
