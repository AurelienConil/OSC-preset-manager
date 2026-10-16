<!-- Role: gallery showcase for buttons, chips, keyboard badge, avatar and alerts —
     grouped as small one-off showcases with no logic of their own. -->
<template>
  <v-card class="pa-4">
    <div class="section-title mb-3">
      <v-icon size="18">mdi-gesture-tap-button</v-icon>
      Boutons, chips & divers
    </div>

    <div class="d-flex flex-wrap ga-2 mb-3">
      <v-btn color="accent" variant="flat">Primaire</v-btn>
      <v-btn variant="tonal">Tonal</v-btn>
      <v-btn variant="outlined">Contour</v-btn>
      <v-btn variant="text">Texte</v-btn>
    </div>

    <div class="d-flex flex-wrap align-center ga-2 mb-3">
      <v-chip size="small" variant="tonal" color="accent">Accent</v-chip>
      <v-chip size="small" variant="tonal">Neutre</v-chip>
      <v-chip size="small" variant="tonal" color="warn">Attention</v-chip>
      <v-chip size="small" variant="tonal" color="danger">Erreur</v-chip>
      <span class="kbd">⌘K</span>
      <v-avatar size="26" color="accent" class="avatar-initials text-white">??</v-avatar>
    </div>

    <v-alert type="info" variant="tonal" text="Message d'information." />
  </v-card>
</template>
