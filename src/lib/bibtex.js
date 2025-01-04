import { Cite } from '@citation-js/core'
import '@citation-js/plugin-bibtex'

// Store the last uploaded BibTeX
let lastBibTeX = null

/**
 * Process BibTeX string and return publications in JSONCV format
 */
export async function processBibTeX(bibtexStr) {
  // Store raw BibTeX
  lastBibTeX = bibtexStr
  
  const cite = await Cite.async(bibtexStr)
  return cite.data.map(entry => ({
    name: entry.title,
    publisher: entry.publisher || '',
    releaseDate: entry.issued?.['date-parts']?.[0]?.[0]?.toString() || '',
    url: entry.DOI ? `https://doi.org/${entry.DOI}` : entry.URL || '',
    summary: entry.abstract || '',
    authors: entry.author?.map(a => ({
      firstName: a.given || '',
      lastName: a.family || ''
    })) || []
  }))
}

/**
 * Get the last uploaded BibTeX data
 */
export function getLastBibTeX() {
  return lastBibTeX
}

/**
 * Update publications in CV data (replace or merge)
 */
export function updatePublications(cvData, publications, shouldMerge = false) {
  return {
    ...cvData,
    publications: shouldMerge ? 
      [...(cvData.publications || []), ...publications] : 
      publications
  }
} 