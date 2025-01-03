import { resolve } from 'path';
import { defineConfig } from 'vite';
import { ViteEjsPlugin } from 'vite-plugin-ejs';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'fs';

import { TransformEjs } from './src/lib/vite-plugins';
import { getRenderData } from './src/themes/data';
import { saveBibTeX } from './src/lib/store';

const dataFilename = process.env.DATA_FILENAME || './cui.cv.json'
const bibFilename = process.env.BIB_FILENAME || './cui.papers.bib'
const outDir = process.env.OUT_DIR || 'dist'

// Load and save BIB file content to store
try {
  const bibContent = fs.readFileSync(bibFilename, 'utf-8')
  console.log('Read BIB file content, length:', bibContent.length)
  
  // Check if localStorage is available
  if (typeof localStorage === 'undefined') {
    console.warn('localStorage not available during build, BIB content will not be saved to store')
  } else {
    saveBibTeX(bibContent, bibFilename)
    console.log('Saved BIB content to store')
  }
  
  console.log(`Successfully loaded BIB file from ${bibFilename}`)
} catch (error) {
  console.error(`Failed to read BIB file ${bibFilename}:`, error)
  process.exit(1)
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
  base: '/jsoncv/',  // Set base URL for all assets
  build: {
    outDir: outDir,
  },
  resolve: {
    alias: {
      // remove the "Module "fs" has been externalized" warning for ejs
      'fs': 'src/lib/fs-polyfill.js',
    },
  },
  plugins: [
    TransformEjs(),
    ViteEjsPlugin(
      renderData,
      {
        ejs: (viteConfig) => ({
          // ejs options goes here.
          views: [resolve(__dirname)],
        })
      }
    ),
    viteSingleFile(),
  ],
})
