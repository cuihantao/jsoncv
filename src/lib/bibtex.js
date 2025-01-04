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
  console.log('[Debug] Citation data:', cite.data)
  
  return cite.data.map(entry => {
    console.log('[Debug] Processing entry:', {
      title: entry.title,
      authors: entry.author,
      publisher: entry.publisher,
      date: entry.issued
    })
    
    const pub = {
      name: entry.title,
      venue: entry['container-title'] || entry.journal || '',
      releaseDate: entry.issued?.['date-parts']?.[0]?.[0]?.toString() || '',
      url: entry.DOI ? `https://doi.org/${entry.DOI}` : entry.URL || '',
      summary: entry.abstract || '',
      authors: entry.author?.map(a => {
        // Handle both object and string formats
        const author = typeof a === 'string' ? JSON.parse(a) : a;
        // Extract firstName and lastName from either format
        const firstName = author.given || author.firstName || '';
        const lastName = author.family || author.lastName || '';
        // Return formatted name string
        return `${firstName}${lastName ? ` ${lastName}` : ''}`.trim();
      }) || []
    }
    console.log('[Debug] Processed publication:', pub)
    return pub
  })
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