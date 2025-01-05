import { Cite } from '@citation-js/core'
import '@citation-js/plugin-bibtex'
import '@citation-js/plugin-csl'
import { plugins } from '@citation-js/core'

// Fetch and register IEEE CSL template
fetch('https://raw.githubusercontent.com/citation-style-language/styles/master/ieee.csl')
  .then(response => response.text())
  .then(template => {
    plugins.config.get('@csl').templates.add('ieee', template)
    console.log('[Debug] Successfully registered IEEE CSL template')
  })
  .catch(error => {
    console.error('[Error] Failed to fetch IEEE CSL template:', error)
  })

/**
 * Map BibTeX entry types to CV publication types
 */
const PUBLICATION_TYPE_MAP = {
  // Journal types
  'article': 'journal',
  'article-journal': 'journal',
  'journal-article': 'journal',
  
  // Conference types
  'paper-conference': 'conference',
  'inproceedings': 'conference',
  'conference': 'conference',
  'conference-paper': 'conference',
  'proceedings-article': 'conference',
  
  // Keep other types mapped to 'other' by default
}

// Store the last uploaded BibTeX
let lastBibTeX = null

/**
 * Process BibTeX string and return publications in JSONCV format
 */
export function processBibTeX(bibtexStr, cvData) {
  // Store raw BibTeX
  lastBibTeX = bibtexStr
  
  try {
    // Parse BibTeX
    const cite = new Cite(bibtexStr)
    console.log('[Debug] Total entries in BibTeX:', cite.data.length)
    
    // Process each entry
    const publications = cite.data.map((entry, index) => {
      // Create a single-entry citation for formatting
      const singleCite = new Cite(entry)
      console.log(`[Debug] Entry ${index}:`, entry)
      
      // Format this entry using IEEE style
      let formattedHTML = singleCite.format('bibliography', {
        format: 'html',
        template: 'ieee',
        lang: 'en-US'
      })
      // Clean up the HTML structure and remove newlines between citation number and content
      const processedHTML = formattedHTML
        .replace(/>\s+</g, '><')  // Remove whitespace between tags
        .replace(/\s+/g, ' ')     // Replace multiple spaces with single space
        .replace(/(<div class="csl-left-margin">\[.*?\]<\/div>)\s*(<div class="csl-right-inline">)/, '$1$2')  // Remove space between number and content
        .replace(/, doi: .*?(?=<\/div>)/, '')  // Remove DOI from citation text
        .trim()                   // Remove leading/trailing whitespace
      console.log(`[Debug] Formatted citation ${index}:`, processedHTML)

      const pubType = PUBLICATION_TYPE_MAP[entry.type] || 'other'
      const pub = {
        name: entry.title,
        publisher: entry['container-title'] || entry.journal || '',
        releaseDate: entry.issued?.['date-parts']?.[0]?.[0]?.toString() || '',
        url: entry.DOI ? `https://doi.org/${entry.DOI}` : entry.URL || '',
        type: pubType,
        formattedHTML: `<div class="citation">${processedHTML}</div>`,  // Wrap in citation div after processing
        source: 'bibtex'
      }
      console.log(`[Debug] Created publication ${index}:`, pub)
      return pub
    })
    
    // Create a new CV data object with updated publications
    const newCvData = { ...cvData }
    
    // Get existing publications that aren't from BibTeX
    const existingPubs = (cvData.publications || []).filter(p => p.source !== 'bibtex')
    
    // Combine existing non-BibTeX publications with new ones
    newCvData.publications = [...existingPubs, ...publications]

    console.log('[Debug] CV publications after update:', {
      total: newCvData.publications.length,
      fromBibtex: publications.length,
      existing: existingPubs.length,
      sample: newCvData.publications[0]
    })
    return newCvData
  } catch (error) {
    console.error('[Error] Failed to process BibTeX:', error)
    return cvData
  }
}

/**
 * Get the last uploaded BibTeX data
 */
export function getLastBibTeX() {
  return lastBibTeX
}

/**
 * Parse stringified publication if needed
 */
function _parsePublication(pub) {
  if (typeof pub === 'string') {
    try {
      return JSON.parse(pub)
    } catch (e) {
      console.error('Failed to parse publication:', e)
      return pub
    }
  }
  return pub
}

/**
 * Update publications in CV data (for backward compatibility)
 */
export function updatePublications(cvData, publications) {
  // Just pass through to processBibTeX if we have BibTeX data
  if (lastBibTeX) {
    return processBibTeX(lastBibTeX, cvData)
  }
  return cvData
} 