// Role: runs a user-triggered async action and exposes its pending state and error message.
import { ref } from 'vue'

export function useAsyncAction() {
  const pending = ref(false)
  const errorMessage = ref<string>()

  async function run(action: () => Promise<unknown>): Promise<void> {
    pending.value = true
    errorMessage.value = undefined
    try {
      await action()
    } catch (error) {
      // Shown to the user: a plugin rejection carries the backend's error message.
      errorMessage.value = error instanceof Error ? error.message : String(error)
    } finally {
      pending.value = false
    }
  }

  return { pending, errorMessage, run }
}
