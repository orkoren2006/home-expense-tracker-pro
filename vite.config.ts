import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
	resolve: {
		alias: { '@': path.resolve(__dirname, './src') },
		dedupe: ['react', 'react-dom', 'react-router'],
	},
	plugins: [tailwindcss(), react()],
	build: { assetsInlineLimit: 100000 },
});
