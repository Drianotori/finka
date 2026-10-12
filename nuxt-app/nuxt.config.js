export default {
  // Mode SPA: seluruh aplikasi ada di balik login dan token tersimpan di
  // sessionStorage browser, jadi server tidak bisa merender halaman yang sama
  // dengan klien. Dengan SSR, memuat ulang halaman (F5/bookmark) menyebabkan
  // error hidrasi dan halaman tidak responsif.
  ssr: false,

  head: {
    title: 'Finka',
    htmlAttrs: { lang: 'id' },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' }
    ],
    link: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap'
      }
    ]
  },

  // Dibaca saat server Nuxt dijalankan (nuxt start), jadi cukup set
  // API_BASE_URL di environment hosting tanpa perlu build ulang.
  publicRuntimeConfig: {
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3001/api'
  },

  css: ['~/assets/css/main.css'],
  plugins: ['~/plugins/api-config.js', '~/plugins/format.js', '~/plugins/auth-init.client.js'],
  components: true,
  buildModules: [],
  modules: [],
  build: {}
}

