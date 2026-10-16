// electron-vite configuration for the Electron build targets.
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  main: {
    build: {
      // CJS on purpose despite the root package.json's "type": "module":
      // importing "electron" from an ESM main entry crashes Electron's own
      // Node ESM/CJS interop (cjsPreparseModuleExports). CJS is the only
      // format that reliably loads the `electron` built-in module.
      lib: { entry: 'packages/main/src/index.ts', formats: ['cjs'] },
      rollupOptions: {
        // `ws` uses optional native-binding requires (bufferutil/utf-8-validate)
        // that break when bundled — keep it external, resolved from
        // node_modules at runtime instead.
        external: ['ws'],
      },
    },
  },
  preload: {
    build: {
      lib: { entry: 'packages/preload/src/index.ts', formats: ['cjs'] },
    },
  },
  renderer: {
    root: 'packages/renderer',
    // Vue must compile the .vue SFCs before vite-plugin-vuetify rewrites the
    // `<v-*>` tags it finds into per-component imports (tree-shaking: only the
    // Vuetify components actually used end up in the bundle).
    plugins: [vue(), vuetify({ autoImport: true })],
    // Force a single Vue copy (silences Vuetify's onScopeDispose warnings).
    resolve: { dedupe: ['vue'] },
    build: {
      rollupOptions: {
        input: 'packages/renderer/index.html',
      },
      outDir: 'out/renderer',
    },
  },
})
