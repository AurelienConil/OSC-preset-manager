// Role: local state for the sidebar collapsed/expanded toggle.
import { ref } from 'vue'

export function useSidebarCollapse() {
  const collapsed = ref(false)

  function toggleCollapsed(): void {
    collapsed.value = !collapsed.value
  }

  return { collapsed, toggleCollapsed }
}
