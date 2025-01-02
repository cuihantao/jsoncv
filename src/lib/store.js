export const storeKeys = {
  cvJSON: 'cvJSON',
  cvSavedTime: 'cvSavedTime',
  primaryColor: 'primary-color',
  bibTeX: 'bibTeX',
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
  return localStorage.getItem(storeKeys.primaryColor) || defaultPrimaryColor
}

export function saveBibTeX(content) {
  localStorage.setItem(storeKeys.bibTeX, content)
  updateSavedTime()
}

export function getBibTeX() {
  return localStorage.getItem(storeKeys.bibTeX)
}

export function saveNameHighlightingConfig(config) {
  localStorage.setItem(storeKeys.nameHighlighting, JSON.stringify(config))
  updateSavedTime()
}

export function getNameHighlightingConfig() {
  const stored = localStorage.getItem(storeKeys.nameHighlighting)
  return stored ? JSON.parse(stored) : null
}
