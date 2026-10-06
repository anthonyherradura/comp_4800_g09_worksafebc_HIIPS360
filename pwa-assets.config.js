import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#ed8b00' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#ed8b00' } },
  },
  images: ['public/logo.svg'],
})
