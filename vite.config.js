import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualEditPlugin } from './vite-plugins/visual-edit-plugin.js'
import { errorOverlayPlugin } from './vite-plugins/error-overlay-plugin.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [
      mode === 'development' && visualEditPlugin(),
      react(),
      errorOverlayPlugin(),
      {
        name: 'iframe-hmr',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // Allow iframe embedding
            res.setHeader('X-Frame-Options', 'ALLOWALL');
            res.setHeader('Content-Security-Policy', "frame-ancestors *;");
            next();
          });
        }
      }
    ].filter(Boolean),
    esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : undefined,
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          // Treat import errors as fatal errors
          if (
            warning.code === "UNRESOLVED_IMPORT" ||
            warning.code === "MISSING_EXPORT"
          ) {
            throw new Error(`Build failed: ${warning.message}`);
          }
          // Use default for other warnings
          warn(warning);
        },
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-radix': [
              '@radix-ui/react-accordion', '@radix-ui/react-alert-dialog', '@radix-ui/react-aspect-ratio',
              '@radix-ui/react-avatar', '@radix-ui/react-checkbox', '@radix-ui/react-collapsible',
              '@radix-ui/react-context-menu', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-hover-card', '@radix-ui/react-label', '@radix-ui/react-menubar',
              '@radix-ui/react-navigation-menu', '@radix-ui/react-popover', '@radix-ui/react-progress',
              '@radix-ui/react-radio-group', '@radix-ui/react-scroll-area', '@radix-ui/react-select',
              '@radix-ui/react-separator', '@radix-ui/react-slider', '@radix-ui/react-slot',
              '@radix-ui/react-switch', '@radix-ui/react-tabs', '@radix-ui/react-toast',
              '@radix-ui/react-toggle', '@radix-ui/react-toggle-group', '@radix-ui/react-tooltip'
            ],
            'vendor-charts': ['recharts'],
            'vendor-editor': ['react-quill'],
            'vendor-query': ['@tanstack/react-query'],
          },
        },
      },
    },
    server: {
      host: '0.0.0.0', // Bind to all interfaces for container access
      port: 5173,
      strictPort: true,
      // Allow all hosts - essential for Modal tunnel URLs
      allowedHosts: true,
      watch: {
        // Enable polling for better file change detection in containers
        usePolling: true,
        interval: 100, // Check every 100ms for responsive HMR
      },
      hmr: {
        protocol: 'wss',
        clientPort: 443
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    }
  }
});