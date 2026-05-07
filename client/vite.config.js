import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) return;
                    if (id.includes('react-quill') || id.includes('quill')) return 'editor';
                    if (id.includes('recharts') || id.includes('d3-')) return 'charts';
                    if (id.includes('leaflet') || id.includes('react-leaflet')) return 'maps';
                    if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) return 'forms';
                    if (id.includes('browser-image-compression')) return 'image-tools';
                    if (id.includes('lucide-react')) return 'icons';
                    if (id.includes('axios')) return 'http';
                    if (id.includes('date-fns')) return 'dates';
                    return 'vendor';
                }
            }
        }
    },
    server: {
        host: true,
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:5001',
                changeOrigin: true,
            }
        }
    }
})
