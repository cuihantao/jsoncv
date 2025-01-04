// Core dependencies first
import { JSONEditor } from '@json-editor/json-editor/dist/jsoneditor';
import $ from 'cash-dom';
import dayjs from 'dayjs';
import objectPath from 'object-path';

// Local imports
import * as sampleModule from '../../sample/sample.cv.prof.json';
import * as jsoncvSchemaModule from '../../schema/jsoncv.schema.json';
import { processBibTeX, updatePublications, getLastBibTeX } from '../lib/bibtex';
import {
  getCVData,
  getPrimaryColor,
  saveCVJSON,
  savePrimaryColor,
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

// Load iconify last as it's optional for UI
import 'iconify-icon';

const propertiesInOrder = ['basics', 'education', 'work', 'projects', 'sideProjects', 'skills', 'languages', 'interests', 'references', 'awards', 'publications', 'volunteer', 'certificates', 'meta']
const basicsPropertiesInOrder = ['name', 'label', 'email', 'phone', 'url', 'summary', 'image', 'location', 'profiles']

// toc elements
const elToc = document.querySelector('.editor-toc')
const tocUl = createElement('ul', {
  parent: elToc
})
const basicsUl = createElement('ul', {
  parent: tocUl
})


// copy the object to remove the readonly restriction on module
const jsoncvSchema = {...jsoncvSchemaModule.default}

// add propertyOrder to schema, and add links to toc
propertiesInOrder.forEach((name, index) => {
  jsoncvSchema.properties[name].propertyOrder = index

  const li = createElement('li', {parent: tocUl})
  createElement('a', {
    text: name,
    attrs: {
      href: `#root.${name}`
    },
    parent: li,
  })

  if (name === 'basics') {
    li.appendChild(basicsUl)
  }
})
basicsPropertiesInOrder.forEach((name, index) => {
  jsoncvSchema.properties.basics.properties[name].propertyOrder = index
  // only add location and profiles to basics toc
  if (!['location', 'profiles'].includes(name)) return
  const li = createElement('li', {parent: basicsUl})
  createElement('a', {
    text: name,
    attrs: {
      href: `#root.basics.${name}`
    },
    parent: li,
  })
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
  'basics.properties.summary': 'textarea',
  'work.items.properties.description': 'textarea',
  'work.items.properties.summary': 'textarea',
  'work.items.properties.highlights.items': 'textarea',
  'projects.items.properties.description': 'textarea',
  'projects.items.properties.highlights.items': 'textarea',
  'sideProjects.items.properties.description': 'textarea',
  'skills.items.properties.summary': 'textarea',
  'languages.items.properties.summary': 'textarea',
  'references.items.properties.reference': 'textarea',
  'awards.items.properties.summary': 'textarea',
  'publications.items.properties.summary': 'textarea',
  'volunteer.items.properties.summary': 'textarea',
  'volunteer.items.properties.highlights.items': 'textarea',
}
for (const [key, format] of Object.entries(keyFormatMap)) {
  objectPath.get(jsoncvSchema.properties, key).format = format
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
const editor = new JSONEditor(elEditorContainer, {
  schema: jsoncvSchema,
  theme: 'mytheme',
  iconlib: 'myiconlib',
  disable_array_delete_all_rows: true,
  no_additional_properties: true,
  startval: data,
});
editor.on('ready',() => {
  // add anchor to each schema element
  document.querySelectorAll('[data-schemapath]').forEach(el => {
    const schemapath = el.getAttribute('data-schemapath')
    el.id = schemapath
  })
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

// listen to change
editor.on('change', () => {
  console.log('on editor change')
  const {json} = getEditorData()
  $outputJSON.text(json)

  // save to localstorage
  saveCVJSON(json)
})

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

$inputUploadData.on('change', () => {
  const files = $inputUploadData.get(0).files
  if (files.length === 0) return

  const reader = new FileReader()
  reader.onload = (e) => {
    let data
    try {
      data = JSON.parse(e.target.result)
    } catch (e) {
      const error = 'Invalid JSON file: ' + new String(e).toString()
      console.log(error)
      throw e
    }
    editor.setValue(data)
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

$btnLoadSample.on('click', () => {
  if (!confirm('Are you sure to load sample data? Your current data will be replaced.')) return

  editor.setValue(sampleModule.default)
})

$btnPrintPreview.on('click', () => {
  outputHTMLIframe.contentWindow.print()
})


// primary color

$inputColorPicker.on('change', (e) => {
  const color = e.target.value
  console.log('color', color)
  $colorValue.text(color)
  savePrimaryColor(color)
})

const primaryColor = getPrimaryColor()
$colorValue.text(primaryColor)
$inputColorPicker.val(primaryColor)

// BibTeX handling
const $btnUploadBibTeX = $('#fn-upload-bibtex')
const $btnDownloadBibTeX = $('#fn-download-bibtex')
const $inputUploadBibTeX = $('input[name=upload-bibtex]')

$btnUploadBibTeX.on('click', () => {
  $inputUploadBibTeX.trigger('click')
})

$inputUploadBibTeX.on('change', async () => {
  const files = $inputUploadBibTeX.get(0).files
  if (files.length === 0) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const bibtexStr = e.target.result
      const publications = await processBibTeX(bibtexStr)
      const currentData = editor.getValue()
      
      // Get current mode from radio buttons
      const shouldMerge = $('input[name="bibtex-mode"]:checked').val() === 'merge'
      const newData = updatePublications(currentData, publications, shouldMerge)
      editor.setValue(newData)
    } catch (e) {
      console.error('Error processing BibTeX:', e)
      alert('Error processing BibTeX file. Please check the console for details.')
    }
  }

  reader.readAsText(files[0])
})

$btnDownloadBibTeX.on('click', () => {
  const bibtexStr = getLastBibTeX()
  if (!bibtexStr) {
    alert('No BibTeX data available. Please upload a BibTeX file first.')
    return
  }
  downloadContent('references.bib', bibtexStr)
})
