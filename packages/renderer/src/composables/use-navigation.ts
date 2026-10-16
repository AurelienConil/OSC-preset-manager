// Role: local state for which section is currently active.
import { computed, ref } from 'vue'
import { navigationSections } from '../navigation/sections'

export function useNavigation() {
  const firstSection = navigationSections[0]
  if (!firstSection) throw new Error('navigationSections must not be empty')

  const activeId = ref(firstSection.id)

  const activeSection = computed(() => {
    const found = navigationSections.find((section) => section.id === activeId.value)
    return found ?? firstSection
  })

  function setActive(id: string): void {
    activeId.value = id
  }

  return { activeId, activeSection, setActive }
}
