// Role: renderer entry point. Bootstraps the Vue app with Vuetify and the plugin connection.
import { createApp } from 'vue'
import { createPluginConnection } from '@template/sdk/frontend'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import { createClientTransport } from './transport/create-client-transport'

createApp(App)
  .use(vuetify)
  .use(createPluginConnection(createClientTransport()))
  .mount('#app')
