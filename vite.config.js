import { resolve } from 'path';
import { defineConfig } from 'vite';
import { ViteEjsPlugin } from 'vite-plugin-ejs';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'fs';

import { TransformEjs } from './src/lib/vite-plugins';
import { getRenderData } from './src/themes/data';

const dataFilename = process.env.DATA_FILENAME || './cui.cv.json'
const bibFilename = process.env.BIB_FILENAME || './cui.papers.bib'
const outDir = process.env.OUT_DIR || 'dist'

// Load and validate BIB file
let bibContent = ''
try {
  bibContent = fs.readFileSync(bibFilename, 'utf-8')
  console.log('[Debug][Config] Successfully loaded BIB file:', bibFilename)
  console.log('[Debug][Config] BIB content length:', bibContent.length)
  console.log('[Debug][Config] First 100 chars:', bibContent.substring(0, 100))
} catch (error) {
  console.warn('[Debug][Config] Failed to read BIB file:', bibFilename, error)
}

const data = require(dataFilename)
const renderData = getRenderData(data)

renderData.theme = process.env.THEME || 'reorx'
renderData.isProduction = process.env.NODE_ENV === 'production'
renderData.bibFilename = bibFilename
renderData.meta = {
  title: data.basics.name,
  description: data.basics.summary.replace('\n', ' '),
}

// Add base URL for GitHub Pages deployment
renderData.baseUrl = '/jsoncv/'

export default defineConfig({
  base: '/jsoncv/',
  build: {
    outDir: outDir,
  },
  resolve: {
    alias: {
      'fs': 'src/lib/fs-polyfill.js',
      '@': resolve(__dirname, 'src'),
    },
  },
  assetsInclude: ['**/*.bib'],  // Include .bib files as assets
  plugins: [
    {
      name: 'inject-bibtex',
      transformIndexHtml(html) {
        // Inject BibTeX content as a global variable before any other scripts
        return html.replace(
          '<head>',
          `<head>
          <script>
            console.log('[Debug][Init] Starting BibTeX injection...');
            window.__BIBTEX_CONTENT__ = ${JSON.stringify(bibContent)};
            window.__BIBTEX_FILENAME__ = ${JSON.stringify(bibFilename)};
            console.log('[Debug][Init] BibTeX content length:', window.__BIBTEX_CONTENT__?.length || 0);
            console.log('[Debug][Init] First 100 chars:', window.__BIBTEX_CONTENT__?.substring(0, 100));
            // Initialize localStorage only in browser context
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem('bibTeX', window.__BIBTEX_CONTENT__);
              window.localStorage.setItem('bibFileName', window.__BIBTEX_FILENAME__);
              console.log('[Debug][Init] Initialized localStorage with BibTeX');
              console.log('[Debug][Init] Verify localStorage content length:', window.localStorage.getItem('bibTeX')?.length || 0);
            }
          </script>`
        )
      }
    },
    TransformEjs(),
    ViteEjsPlugin(
      renderData,
      {
        ejs: (viteConfig) => ({
          views: [resolve(__dirname)],
        })
      }
    ),
    viteSingleFile(),
  ],
})
