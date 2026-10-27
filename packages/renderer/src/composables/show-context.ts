// Role: one app-wide instance of the show state, provided by App.vue and injected by every page.
import { inject, provide, type InjectionKey } from 'vue'
import { useShow, type ShowApi } from '@template/plugin-show/frontend'

const SHOW_KEY: InjectionKey<ShowApi> = Symbol('show')

/** Call once, in App.vue's setup. */
export function provideShow(): ShowApi {
  const show = useShow()
  provide(SHOW_KEY, show)
  return show
}

export function injectShow(): ShowApi {
  const show = inject(SHOW_KEY)
  if (!show) throw new Error('injectShow() needs provideShow() in App.vue')
  return show
}
