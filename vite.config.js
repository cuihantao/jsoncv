import { resolve } from 'path';
import { defineConfig } from 'vite';
import { ViteEjsPlugin } from 'vite-plugin-ejs';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'fs';

import { TransformEjs, InjectBibTeX } from './src/lib/vite-plugins';
import { getRenderData } from './src/themes/data';

const dataFilename = process.env.DATA_FILENAME || './sample.cv.prof.json'
const bibFilename = process.env.BIB_FILENAME || './sample.bib'
const outDir = process.env.OUT_DIR || 'dist'

// Load and validate BIB file
let bibContent = ''
try {
  bibContent = fs.readFileSync(bibFilename, 'utf-8')
  console.log('[Debug][Config] Successfully loaded BIB file:', bibFilename)
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
    InjectBibTeX(bibContent, bibFilename),
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
