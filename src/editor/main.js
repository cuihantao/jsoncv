import 'iconify-icon'; // import only

import $ from 'cash-dom';
import dayjs from 'dayjs';
import objectPath from 'object-path';

import { JSONEditor } from '@json-editor/json-editor/dist/jsoneditor';

import * as sampleModule from '../../sample.cv.prof.json';
import * as jsoncvSchemaModule from '../../schema/jsoncv.schema.prof.json';
import {
  getCVData,
  getPrimaryColor,
  saveCVJSON,
  savePrimaryColor,
  getBibTeX,
} from '../lib/store';
import {
  createElement,
  downloadContent,
  downloadIframeHTML,
  propertiesToObject,
  traverseDownObject,
} from '../lib/utils';
import { getCVTitle } from '../themes/data';
import { registerIconLib } from './je-iconlib';
import { registerTheme } from './je-theme';
import { 
  processBibTeX, 
  onPublicationsUpdated, 
  getCurrentPublications,
  getCurrentBibTeX,
  PUBLICATIONS_UPDATED,
  loadSampleBibTeX
} from '../lib/citations';

const propertiesInOrder = [
  'basics', 
  'education',
  'work',
  'researchAreas',
  'publications',
  'projects',
  'teaching',
  'presentations',
  'awards',
  'services',
  'certificates',
  'software',
  'skills',
  'languages',
  'meta'
]

// Define nested properties for sections that need sub-navigation
const nestedPropertiesMap = {
  basics: ['location', 'profiles'],
  presentations: ['invitedTalks', 'conferences', 'outreach'],
  services: ['editorialBoards', 'societyServices', 'reviewServices', 'departmental'],
  mentoring: ['current_students', 'past_students', 'committee_service']
}

// toc elements
const elToc = document.querySelector('.editor-toc')
const tocUl = createElement('ul', {
  parent: elToc
})

// Create nested navigation
function createNestedNav(parentUl, sectionName, properties) {
  const nestedUl = createElement('ul', {
    parent: parentUl.lastElementChild
  })
  
  properties.forEach(prop => {
    const li = createElement('li', {parent: nestedUl})
    createElement('a', {
      text: prop,
      attrs: {
        href: `#root.${sectionName}.${prop}`
      },
      parent: li,
    })
  })
  return nestedUl
}

// copy the object to remove the readonly restriction on module
const jsoncvSchema = {...jsoncvSchemaModule.default}

// add propertyOrder to schema, and add links to toc
propertiesInOrder.forEach((name, index) => {
  if (!jsoncvSchema.properties[name]) {
    console.warn(`Property ${name} not found in schema`);
    return;
  }
  jsoncvSchema.properties[name].propertyOrder = index

  const li = createElement('li', {parent: tocUl})
  createElement('a', {
    text: name,
    attrs: {
      href: `#root.${name}`
    },
    parent: li,
  })

  // Add nested navigation if this section has sub-properties
  if (nestedPropertiesMap[name]) {
    createNestedNav(tocUl, name, nestedPropertiesMap[name])
  }
})

// add headerTemplate for each type:array in schema
traverseDownObject(jsoncvSchema, (key, obj) => {
  let noun = key
  if (noun.endsWith('s')) noun = noun.slice(0, -1)
  if (obj.type === 'array' && obj.items) {
    obj.items.headerTemplate = `${noun} {{i1}}`
  }
})

// add format to schema
const keyFormatMap = {
  // basics
  'basics.properties.summary': 'textarea',
  // education
  'education.items.properties.area': 'textarea',
  'education.items.properties.dissertation': 'textarea',
  'education.items.properties.thesis': 'textarea',
  // work
  'work.items.properties.summary': 'textarea',
  'work.items.properties.highlights.items': 'textarea',
  // researchAreas
  'researchAreas.items.properties.contributions.items': 'textarea',
  // publications
  'publications.items.properties.summary': 'textarea',
  // projects
  'projects.items.properties.description': 'textarea',
  'projects.items.properties.highlights.items': 'textarea',
  // teaching
  'teaching.items.properties.courseName': 'textarea',
  'teaching.items.properties.description': 'textarea',
  // presentations
  'presentations.properties.invitedTalks.items.properties.title': 'textarea',
  'presentations.properties.conferences.items.properties.title': 'textarea',
  'presentations.properties.conferences.items.properties.description': 'textarea',
  'presentations.properties.outreach.items.properties.activity': 'textarea',
  'presentations.properties.outreach.items.properties.description': 'textarea',
  // awards
  'awards.items.properties.summary': 'textarea',
  // services
  'services.properties.editorialBoards.items.properties.details': 'textarea',
  'services.properties.reviewServices.items.properties.details': 'textarea',
  // software
  'software.items.properties.description': 'textarea',
  // skills and languages
  'skills.items.properties.summary': 'textarea',
  'languages.items.properties.summary': 'textarea'
}

for (const [key, format] of Object.entries(keyFormatMap)) {
  const path = objectPath.get(jsoncvSchema.properties, key)
  if (!path) {
    console.warn(`Path ${key} not found in schema`)
    continue
  }
  path.format = format
}

// change schema title
jsoncvSchema.title = 'CV Schema'

// change some descriptions
jsoncvSchema.properties.meta.properties.lastModified.description += '. This will be automatically updated when downloading.'


// init data
let data = getCVData()
if (!data) data = sampleModule.default

// initialize editor
registerTheme(JSONEditor)
registerIconLib(JSONEditor)
const elEditorContainer = document.querySelector('.editor-container')

async function initEditor() {
  try {
    let data = getCVData()
    if (!data) data = sampleModule.default
    
    // Initialize the editor with current data
    const editor = new JSONEditor(elEditorContainer, {
      schema: jsoncvSchema,
      theme: 'mytheme',
      iconlib: 'myiconlib',
      disable_array_delete_all_rows: true,
      no_additional_properties: true,
      startval: data,
    });

    // Set up publication updates listener
    onPublicationsUpdated((publications) => {
      const currentData = editor.getValue()
      editor.setValue({
        ...currentData,
        publications
      })
    })

    // Try to load cached BibTeX if available
    const cachedBibTeX = getBibTeX()
    if (cachedBibTeX) {
      try {
        await processBibTeX(cachedBibTeX)
      } catch (error) {
        console.warn('Failed to process cached BibTeX:', error)
      }
    }

    editor.on('ready',() => {
      // add anchor to each schema element
      document.querySelectorAll('[data-schemapath]').forEach(el => {
        const schemapath = el.getAttribute('data-schemapath')
        el.id = schemapath
      })
    })

    return editor;
  } catch (error) {
    console.error('Error initializing editor:', error)
    throw error
  }
}

// Initialize the editor and store the instance
let editor;
initEditor().then(e => {
  editor = e;
  
  // Set up editor change handler
  editor.on('change', () => {
    console.log('on editor change')
    const {data, json} = getEditorData()
    $outputJSON.text(json)

    // save to localstorage
    saveCVJSON(json)

    // Update preview with new data
    if (outputHTMLIframe.contentWindow) {
      outputHTMLIframe.contentWindow.postMessage({
        type: 'update',
        data: data
      }, '*')
    }
  })
}).catch(error => {
  console.error('Failed to initialize editor:', error)
})

function getEditorData() {
  const data = editor.getValue()
  return {
    data,
    json: JSON.stringify(data, null, 2),
  }
}

const $outputJSON = $('.output-json')
const $outputHTML = $('.output-html')
const outputHTMLIframe = $outputHTML.get(0)

// actions
const $btnTogglePreview = $('#fn-toggle-preview')
const $btnNewData = $('#fn-new-data')
const $btnUploadData = $('#fn-upload-data')
const $inputUploadData = $('input[name=upload-data]')
const $btnDownloadJSON = $('#fn-download-json')
const $btnDownloadHTML = $('#fn-download-html')
const $btnLoadSample = $('#fn-load-sample')
const $btnPrintPreview = $('#fn-print-preview')
const $inputColorPicker = $('#fn-color-picker')
const $colorValue = $('.color-picker .value')

const isElementHidden = elt =>
	! (elt.offsetWidth || elt.offsetHeight || elt.getClientRects().length);
$btnTogglePreview.on('click', () => {
  if (isElementHidden(outputHTMLIframe)) {
    $outputJSON.hide()
    $outputHTML.show()
  } else {
    $outputHTML.hide()
    $outputJSON.show()
  }
})

$btnNewData.on('click', () => {
  if (!confirm('Are you sure to create an empty CV? Your current data will be lost.')) return

  const v = propertiesToObject(jsoncvSchema.properties)
  console.log('new value', v)
  editor.setValue(v)
})

$btnUploadData.on('click', () => {
  if (!confirm('Are you sure to upload an existing CV data? Your current data will be replaced.')) return
  $inputUploadData.trigger('click')
})

// primary color
function updateColorPickerUI(color) {
  $colorValue.text(color)
  $inputColorPicker.val(color)
  savePrimaryColor(color)
}

function syncColorWithEditor(color) {
  const data = editor.getValue()
  if (!data.meta) data.meta = {}
  data.meta.colorPrimary = color
  editor.setValue(data)
}

$inputColorPicker.on('change', (e) => {
  const color = e.target.value
  updateColorPickerUI(color)
  if (editor) {
    syncColorWithEditor(color)
  }
})

// Initialize with stored color
const primaryColor = getPrimaryColor()
updateColorPickerUI(primaryColor)

// Update color picker when loading data
function updateColorFromData(data) {
  if (data.meta?.colorPrimary) {
    updateColorPickerUI(data.meta.colorPrimary)
  }
}

// Update the data loading handlers
$inputUploadData.on('change', () => {
  const files = $inputUploadData.get(0).files
  if (files.length === 0) return

  const reader = new FileReader()
  reader.onload = (e) => {
    let data
    try {
      data = JSON.parse(e.target.result)
      editor.setValue(data)
      updateColorFromData(data)
    } catch (e) {
      const error = 'Invalid JSON file: ' + new String(e).toString()
      console.log(error)
      throw e
    }
  }

  reader.readAsText(files[0])
})

function downloadCV(contentType) {
  const data = editor.getValue()
  const meta = data.meta || (data.meta = {})
  const title = getCVTitle(data)

  // update data
  meta.lastModified = dayjs().format('YYYY-MM-DDTHH:mm:ssZ[Z]')

  // download
  if (contentType === 'json') {
    let filename = `${title}.json`
    downloadContent(filename, JSON.stringify(data, null, 2))
  } else if (contentType === 'html') {
    let filename = `${title}.html`
    downloadIframeHTML(filename, outputHTMLIframe)
  }

  // update editor value
  editor.getEditor('root.meta').setValue(meta)
}

$btnDownloadJSON.on('click', () => {
  downloadCV('json')
})

$btnDownloadHTML.on('click', () => {
  downloadCV('html')
})

$btnLoadSample.on('click', async () => {
  if (!confirm('Are you sure to load sample data? Your current data will be replaced.')) return

  try {
    // Load sample CV data
    const sampleData = sampleModule.default
    editor.setValue(sampleData)
    updateColorFromData(sampleData)

    // Load sample BibTeX
    await loadSampleBibTeX()
  } catch (error) {
    console.error('Error loading sample data:', error)
    alert('Failed to load sample data: ' + error.message)
  }
})

$btnPrintPreview.on('click', () => {
  outputHTMLIframe.contentWindow.print()
})

// Add BibTeX file upload handling
const $btnUploadBibTeX = $('#fn-upload-bibtex')
const $btnDownloadBibTeX = $('#fn-download-bibtex')
const $inputUploadBibTeX = $('input[name=upload-bibtex]')

// Handle BibTeX file upload
$inputUploadBibTeX.on('change', async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  try {
    const content = await file.text()
    await processBibTeX(content)
  } catch (error) {
    console.error('Error processing BibTeX file:', error)
    alert('Failed to process BibTeX file: ' + error.message)
  }
  
  // Clear the input to allow uploading the same file again
  event.target.value = ''
})

// Handle BibTeX upload button click
$btnUploadBibTeX.on('click', () => {
  $inputUploadBibTeX.get(0).click()
})

// Handle BibTeX download
$btnDownloadBibTeX.on('click', () => {
  const bibtex = getCurrentBibTeX()
  if (!bibtex) {
    alert('No BibTeX data available to download')
    return
  }
  
  const data = editor.getValue()
  const title = getCVTitle(data)
  downloadContent(`${title}.bib`, bibtex)
})
