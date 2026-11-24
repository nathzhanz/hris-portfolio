import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Build menghasilkan satu file dist/index.html yang bisa langsung dibuka atau di-host di mana saja.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
})
