import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { eazoSdkBrowserShims } from '../../config/eazo-sdk-browser-shims.ts';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // The Eazo SDK reads process.env at runtime (browser). Inject only the
  // public, non-secret keys so the provider can resolve EAZO_APP_ID.
  const publicEnv: Record<string, string> = {};
  for (const key of Object.keys(env)) {
    if (/^(EAZO_|NEXT_PUBLIC_|VITE_)/.test(key)) {
      const value = env[key];
      if (value !== undefined) publicEnv[key] = value;
    }
  }
  publicEnv.EAZO_APP_ID ??= 'ideal-day-lab';
  publicEnv.VITE_EAZO_APP_ID ??= publicEnv.EAZO_APP_ID;
  return {
    server: {
      host: '0.0.0.0',
      allowedHosts: ['.e2b.app'],
    },
    preview: {
      host: '0.0.0.0',
      allowedHosts: ['.e2b.app'],
    },
    plugins: [react(), eazoSdkBrowserShims()],
    base: './',
    publicDir: 'content',
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: {
      'typeof process': '"object"',
      'process.env': JSON.stringify(publicEnv),
    },
    build: { sourcemap: true, assetsInlineLimit: 4096, chunkSizeWarningLimit: 1300 },
  };
});
