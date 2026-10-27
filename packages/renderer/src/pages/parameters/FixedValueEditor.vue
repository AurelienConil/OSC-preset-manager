<!-- Role: editor of a fixed value, adapted to the parameter type (slider + number, switch, text). -->
<script setup lang="ts">
import { computed } from 'vue'
import type { OscValueDto, ParameterDeclDto } from '@template/plugin-show/dto'

const props = defineProps<{
  decl: ParameterDeclDto
  value: OscValueDto
}>()

const emit = defineEmits<{
  update: [value: OscValueDto]
}>()

const step = computed(() => (props.decl.type === 'int' ? 1 : (props.decl.max - props.decl.min) / 1000))
const numeric = computed(() => (typeof props.value === 'number' ? props.value : props.decl.min))

function submitNumber(raw: string): void {
  const value = Number.parseFloat(raw)
  if (Number.isFinite(value)) emit('update', value)
}
</script>

<template>
  <div v-if="decl.type === 'bool'">
    <v-switch :model-value="value === true" label="Activé" @update:model-value="(on) => emit('update', on === true)" />
  </div>
  <v-text-field
    v-else-if="decl.type === 'text'"
    :model-value="String(value)"
    label="Texte"
    @change="(event: Event) => emit('update', (event.target as HTMLInputElement).value)"
  />
  <div v-else class="d-flex align-center ga-3">
    <v-slider
      :model-value="numeric"
      :min="decl.min"
      :max="decl.max"
      :step="step"
      hide-details
      color="accent"
      @update:model-value="(next: number) => emit('update', next)"
    />
    <v-text-field
      :model-value="numeric"
      type="number"
      :step="step"
      class="field-narrow"
      @change="(event: Event) => submitNumber((event.target as HTMLInputElement).value)"
    />
  </div>
</template>
