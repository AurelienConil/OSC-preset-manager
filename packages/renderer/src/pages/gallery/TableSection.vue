<!-- Role: gallery showcase for v-table + status chips + row v-menu, plus an empty state. -->
<script setup lang="ts">
const rows = [
  { id: '1', name: 'Élément A', status: 'Finished', color: 'success' },
  { id: '2', name: 'Élément B', status: 'Waiting', color: 'grey' },
]

function noop(): void {}
</script>

<template>
  <v-card class="pa-4">
    <div class="section-title mb-3">
      <v-icon size="18">mdi-table</v-icon>
      Tableau
    </div>
    <v-table hover>
      <thead>
        <tr>
          <th>Nom</th>
          <th>Statut</th>
          <th class="col-actions"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id" class="table-row">
          <td class="cell-strong">{{ row.name }}</td>
          <td>
            <v-chip size="x-small" :color="row.color" variant="tonal">{{ row.status }}</v-chip>
          </td>
          <td>
            <div class="d-flex justify-end row-actions">
              <v-menu>
                <template #activator="{ props }">
                  <v-btn icon="mdi-dots-horizontal" variant="text" size="x-small" v-bind="props" />
                </template>
                <v-list density="compact">
                  <v-list-item prepend-icon="mdi-pencil-outline" title="Modifier" @click="noop" />
                  <v-list-item
                    prepend-icon="mdi-delete-outline"
                    title="Supprimer"
                    base-color="danger"
                    @click="noop"
                  />
                </v-list>
              </v-menu>
            </div>
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-card>

  <v-card class="pa-8 mt-3 d-flex flex-column align-center ga-2 text-center">
    <v-icon size="20" class="icon-faint">mdi-inbox-outline</v-icon>
    <div class="section-sub">Aucun élément</div>
  </v-card>
</template>
