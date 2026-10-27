<!-- Role: navigation in the OSC address hierarchy: breadcrumb back to the root, then the subgroups of the current group. -->
<script setup lang="ts">
import { computed } from 'vue'
import { childGroups, groupLabel, groupTrail } from './address-groups'

const props = defineProps<{
  addresses: readonly string[]
}>()

const group = defineModel<string>({ required: true })

const trail = computed(() => groupTrail(group.value))
const children = computed(() => childGroups(props.addresses, group.value))
</script>

<template>
  <div class="group-trail">
    <template v-for="(crumb, index) in trail" :key="crumb.path">
      <v-icon v-if="index > 0" size="16" class="icon-faint">mdi-chevron-right</v-icon>
      <v-btn
        variant="text"
        size="small"
        :class="{ 'cell-strong': index === trail.length - 1 }"
        :prepend-icon="index === 0 ? 'mdi-home-outline' : undefined"
        @click="group = crumb.path"
      >
        {{ crumb.label }}
      </v-btn>
    </template>
    <v-chip
      v-for="child in children"
      :key="child"
      size="small"
      variant="tonal"
      prepend-icon="mdi-folder-outline"
      class="ml-1"
      @click="group = child"
    >
      {{ groupLabel(child) }}
    </v-chip>
  </div>
</template>
