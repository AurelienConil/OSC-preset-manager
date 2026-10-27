<!-- Role: display and control of one parameter in the active preset. Adapts to its mode
     (fixed value, curve, LFO); a second click on the active mode folds the editor. -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { OscValueDto, ParamModeDto, ParamStateDto, ParameterDeclDto } from '@template/plugin-show/dto'
import CurveCanvas from './CurveCanvas.vue'
import CurveEditorDialog from './CurveEditorDialog.vue'
import FixedValueEditor from './FixedValueEditor.vue'
import LfoEditor from './LfoEditor.vue'
import { addressSegments } from './address-groups'
import { formatValue } from './format-value'

const props = defineProps<{
  decl: ParameterDeclDto
  state: ParamStateDto
  value: OscValueDto | undefined
  playhead: number
  /** Driven by an input of the pin matrix: its own mode is paused. */
  driven: boolean
  /** In preset 0 every parameter is visible: no hide button. */
  canHide: boolean
}>()

const emit = defineEmits<{
  patch: [patch: Partial<ParamStateDto>]
  group: [group: string]
}>()

const segments = computed(() => addressSegments(props.decl.address))

const TYPE_LABELS: Record<ParameterDeclDto['type'], string> = {
  float: 'décimal',
  int: 'entier',
  bool: 'booléen',
  text: 'texte',
}

const expanded = ref(true)
const curveDialog = ref(false)

const modes = computed<{ value: ParamModeDto; label: string }[]>(() =>
  props.decl.type === 'text'
    ? [{ value: 'fixed', label: 'Fixe' }]
    : [
        { value: 'fixed', label: 'Fixe' },
        { value: 'curve', label: 'Courbe' },
        { value: 'lfo', label: 'LFO' },
      ],
)

function selectMode(mode: ParamModeDto): void {
  if (mode === props.state.mode) {
    expanded.value = !expanded.value
    return
  }
  expanded.value = true
  emit('patch', { mode })
}
</script>

<template>
  <v-card class="pa-3" :class="{ 'param-control--hidden': !state.visible }">
    <div class="param-control-head">
      <div class="param-control-title">
        <span class="mono cell-strong">
          <template v-for="(segment, index) in segments" :key="index">
            <span>/</span><button
              v-if="segment.group"
              type="button"
              class="address-link"
              :title="`Filtrer sur ${segment.group}`"
              @click="emit('group', segment.group)"
            >{{ segment.label }}</button><span v-else>{{ segment.label }}</span>
          </template>
        </span>
        <span class="section-sub">
          {{ TYPE_LABELS[decl.type] }}
          <template v-if="decl.type === 'float' || decl.type === 'int'"> · {{ decl.min }} → {{ decl.max }}</template>
          <template v-if="decl.description"> · {{ decl.description }}</template>
        </span>
      </div>
      <v-chip v-if="driven" size="x-small" color="warn" variant="tonal" prepend-icon="mdi-cable-data">
        Piloté par la pin matrix
      </v-chip>
      <span class="mono param-live-value">{{ formatValue(value) }}</span>
      <v-btn-toggle :model-value="state.mode" density="compact" variant="outlined" divided mandatory>
        <v-btn v-for="mode in modes" :key="mode.value" :value="mode.value" @click="selectMode(mode.value)">
          {{ mode.label }}
        </v-btn>
      </v-btn-toggle>
      <v-btn
        v-if="canHide"
        variant="text"
        size="small"
        :icon="state.visible ? 'mdi-eye-outline' : 'mdi-eye-off-outline'"
        :aria-label="state.visible ? 'Masquer dans ce preset' : 'Afficher dans ce preset'"
        @click="emit('patch', { visible: !state.visible })"
      />
    </div>

    <div v-if="expanded" class="mt-2">
      <FixedValueEditor
        v-if="state.mode === 'fixed' || decl.type === 'text'"
        :decl="decl"
        :value="state.fixed"
        @update="(fixed) => emit('patch', { fixed })"
      />
      <div v-else-if="state.mode === 'curve'" class="d-flex align-center ga-2">
        <CurveCanvas :points="state.curve" :playhead="playhead" class="curve-canvas--clickable" @click="curveDialog = true" />
        <v-btn variant="tonal" prepend-icon="mdi-pencil" @click="curveDialog = true">Éditer</v-btn>
      </div>
      <LfoEditor v-else :lfo="state.lfo" :playhead="playhead" @update="(lfo) => emit('patch', { lfo })" />
    </div>

    <CurveEditorDialog
      v-model="curveDialog"
      :address="decl.address"
      :points="state.curve"
      :playhead="playhead"
      @save="(curve) => emit('patch', { curve })"
    />
  </v-card>
</template>
