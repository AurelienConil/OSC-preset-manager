// Role: static list of navigable sections (sidebar items + their page component).
import ComponentsGalleryPage from '../pages/ComponentsGalleryPage.vue'
import ExamplePage from '../pages/ExamplePage.vue'
import type { NavigationSection } from './types'

export const navigationSections: NavigationSection[] = [
  {
    id: 'components',
    label: 'Composants',
    icon: 'mdi-view-grid-outline',
    component: ComponentsGalleryPage,
  },
  // EXAMPLE — page of the example plugins: delete with them (CLAUDE.md §5.1).
  {
    id: 'example',
    label: 'Exemple',
    icon: 'mdi-puzzle-outline',
    component: ExamplePage,
  },
]
