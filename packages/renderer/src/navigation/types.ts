// Role: shape of a navigable section (sidebar item + its content page).
import type { Component } from 'vue'

export interface NavigationSection {
  id: string
  label: string
  /** Material Design Icons name, e.g. 'mdi-view-grid-outline'. */
  icon: string
  component: Component
}
