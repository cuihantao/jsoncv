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

/**
 * Plugin to inject BibTeX content into HTML
 * @param {string} bibContent - BibTeX content to inject
 * @param {string} bibFilename - BibTeX filename
 */
export function InjectBibTeX(bibContent, bibFilename) {
  return {
    name: 'inject-bibtex',
    transformIndexHtml(html) {
      // Inject BibTeX content as a global variable before any other scripts
      return html.replace(
        '<head>',
        `<head>
          <script>
            // Make BibTeX content available globally
            window.__BIBTEX_CONTENT__ = ${JSON.stringify(bibContent)};
            window.__BIBTEX_FILENAME__ = ${JSON.stringify(bibFilename)};
            
            // Initialize localStorage if available
            if (typeof window === 'object' && window.localStorage) {
              try {
                localStorage.setItem('bibTeX', window.__BIBTEX_CONTENT__);
                localStorage.setItem('bibFileName', window.__BIBTEX_FILENAME__);
              } catch (error) {
                console.warn('[Debug][Init] Failed to initialize localStorage:', error);
              }
            }
          </script>`
      )
    }
  }
}
