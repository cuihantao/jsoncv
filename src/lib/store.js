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
  return localStorage.getItem(storeKeys.primaryColor) || defaultPrimaryColor
}

export function saveBibTeX(content, filename) {
  console.log('Saving BIB content to store, length:', content?.length || 0)
  console.log('Saving BIB filename to store:', filename)
  localStorage.setItem(storeKeys.bibTeX, content)
  if (filename) {
    localStorage.setItem(storeKeys.bibFileName, filename)
  }
  updateSavedTime()
}

export function getBibTeX() {
  const content = localStorage.getItem(storeKeys.bibTeX)
  console.log('Getting BIB content from store, length:', content?.length || 0)
  return content
}

export function getBibFileName() {
  const filename = localStorage.getItem(storeKeys.bibFileName)
  console.log('Getting BIB filename from store:', filename || 'none')
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
