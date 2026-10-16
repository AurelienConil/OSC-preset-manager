<!-- Role: gallery showcase for the StatCard primitive (placeholder values only). -->
<script setup lang="ts">
import StatCard from '../../components/ui/StatCard.vue'
</script>

<template>
  <v-row>
    <v-col cols="12" sm="4">
      <StatCard label="Métrique A" />
    </v-col>
    <v-col cols="12" sm="4">
      <StatCard label="Métrique B" />
    </v-col>
    <v-col cols="12" sm="4">
      <StatCard label="Métrique C" />
    </v-col>
  </v-row>
</template>
