import { resolve } from 'path';
import { defineConfig } from 'vite';
import { ViteEjsPlugin } from 'vite-plugin-ejs';
import { viteSingleFile } from 'vite-plugin-singlefile';

import { TransformEjs } from './src/lib/vite-plugins';
import { getRenderData } from './src/themes/data';

const dataFilename = process.env.DATA_FILENAME || './sample.cv.json'
const bibFilename = process.env.BIB_FILENAME || './sample.bib'
const outDir = process.env.OUT_DIR || 'dist'

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
