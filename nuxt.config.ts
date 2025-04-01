export default defineNuxtConfig({
  nitro:{
    experimental: {
      websocket: true
    }
  },
  runtimeConfig: {
    public: {
      CLOUDFLARE_WORKER: process.env.CLOUDFLARE_WORKER || false
    }
  },
  compatibilityDate: '2024-12-21',
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt']
})