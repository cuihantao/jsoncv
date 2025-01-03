import fs from 'fs'
import path from 'path'

/*
 * This plugin allows for importing ejs files as strings.
 *
 * ref 1: https://vitejs.dev/guide/api-plugin.html#transforming-custom-file-types
 * ref 2: https://github.com/vitejs/vite/issues/594#issuecomment-665915643
 */
export function TransformEjs() {
  return {
    name: 'transform-ejs',

    transform(src, id) {
      if (id.endsWith('.ejs')) {
        return {
          code: `export default ${JSON.stringify(src)}`,
          map: null, // provide source map if available
        }
      }
    },
  }
}

/*
 * This plugin allows for importing bib files as strings.
 */
export function TransformBib() {
  return {
    name: 'transform-bib',

    transform(src, id) {
      if (id.endsWith('.bib')) {
        return {
          code: `export default ${JSON.stringify(src)}`,
          map: null,
        }
      }
    },
  }
}
