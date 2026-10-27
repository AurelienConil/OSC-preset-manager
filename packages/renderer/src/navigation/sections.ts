// Role: static list of navigable sections (sidebar items + their page component).
import ComponentsGalleryPage from '../pages/ComponentsGalleryPage.vue'
import ParametersPage from '../pages/ParametersPage.vue'
import PinMatrixPage from '../pages/PinMatrixPage.vue'
import PresetsPage from '../pages/PresetsPage.vue'
import SetupPage from '../pages/SetupPage.vue'
import type { NavigationSection } from './types'

export const navigationSections: NavigationSection[] = [
  { id: 'parameters', label: 'Paramètres', icon: 'mdi-tune-vertical', component: ParametersPage },
  { id: 'pin-matrix', label: 'Pin matrix', icon: 'mdi-grid', component: PinMatrixPage },
  { id: 'presets', label: 'Presets', icon: 'mdi-playlist-play', component: PresetsPage },
  { id: 'setup', label: 'Setup', icon: 'mdi-cog-outline', component: SetupPage },
  {
    id: 'components',
    label: 'Composants',
    icon: 'mdi-view-grid-outline',
    component: ComponentsGalleryPage,
  },
]
