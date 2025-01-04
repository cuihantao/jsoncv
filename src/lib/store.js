export const storeKeys = {
  cvJSON: 'cvJSON',
  cvSavedTime: 'cvSavedTime',
  primaryColor: 'primary-color',
  bibTeX: 'bibTeX',
  bibFileName: 'bibFileName',
  nameHighlighting: 'name-highlighting'
}

const defaultPrimaryColor = '#2A3FFB'

function updateSavedTime() {
  localStorage.setItem(storeKeys.cvSavedTime, Date.now())
}

export function saveCVJSON(str) {
  localStorage.setItem(storeKeys.cvJSON, str)
  updateSavedTime()
}

export function getCVData() {
  const v = localStorage.getItem(storeKeys.cvJSON)
  if (!v) return
  return JSON.parse(v)
}

export function getCVSavedTime() {
  return localStorage.getItem(storeKeys.cvSavedTime)
}

export function savePrimaryColor(color) {
  localStorage.setItem(storeKeys.primaryColor, color)
  updateSavedTime()
}

export function getPrimaryColor() {
  const color = localStorage.getItem(storeKeys.primaryColor) || defaultPrimaryColor;
  console.log('[Debug][Store] Getting primary color:', color);
  return color;
}

export function saveBibTeX(content, filename) {
  if (typeof window === 'undefined' || !window.localStorage) {
    console.warn('[Debug][Store] Cannot save BibTeX: localStorage not available');
    return;
  }

  console.log('[Debug][Store] Saving BibTeX to store, length:', content?.length || 0);
  localStorage.setItem(storeKeys.bibTeX, content);
  if (filename) {
    localStorage.setItem(storeKeys.bibFileName, filename);
  }
  updateSavedTime();
}

export function getBibTeX() {
  // In preview mode, prefer the injected content
  if (typeof window !== 'undefined' && window.__BIBTEX_CONTENT__) {
    return window.__BIBTEX_CONTENT__;
  }
  
  // In editor mode or as fallback, use localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    const content = localStorage.getItem(storeKeys.bibTeX);
    if (content) {
      console.log('[Debug][Store] Retrieved BibTeX from localStorage, length:', content.length);
      return content;
    }
  }
  
  console.warn('[Debug][Store] No BibTeX content available');
  return null;
}

export function getBibFileName() {
  const filename = localStorage.getItem(storeKeys.bibFileName)
  console.log('[Debug][Store] Getting BIB filename from store:', filename || 'none')
  return filename
}

export function saveNameHighlightingConfig(config) {
  localStorage.setItem(storeKeys.nameHighlighting, JSON.stringify(config))
  updateSavedTime()
}

export function getNameHighlightingConfig() {
  const stored = localStorage.getItem(storeKeys.nameHighlighting)
  return stored ? JSON.parse(stored) : null
}
