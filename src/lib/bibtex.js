import { Cite } from '@citation-js/core'
import '@citation-js/plugin-bibtex'

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
 * Simple name matching considering common variations
 */
function _matchName(authorName, targetName) {
  // Convert both to lowercase for comparison
  authorName = authorName.toLowerCase()
  targetName = targetName.toLowerCase()
  
  // Direct match
  if (authorName === targetName) return true
  
  // Split names into parts
  const authorParts = authorName.split(' ')
  const targetParts = targetName.split(' ')
  
  // Match last name and first initial
  if (authorParts.length > 0 && targetParts.length > 0) {
    const authorLast = authorParts[authorParts.length - 1]
    const targetLast = targetParts[targetParts.length - 1]
    
    if (authorLast === targetLast) {
      // If last names match, check first initial
      const authorFirst = authorParts[0][0]
      const targetFirst = targetParts[0][0]
      if (authorFirst === targetFirst) return true
    }
  }
  
  return false
}

/**
 * Extract names to highlight from CV data
 */
function _getHighlightNames(cvData) {
  return {
    owner: [cvData.basics?.name || ''],  // Owner's name from CV basics
    mentees: cvData.mentees?.map(m => m.name) || []  // Mentee names if available
  }
}

/**
 * Format citation in IEEE style without relying on CSL template
 */
function _formatIEEECitation(entry) {
  const authors = entry.author?.map(a => {
    const given = (a.given || '').split(' ').map(n => n[0]).join('. ')
    const family = a.family || ''
    return `${given}. ${family}`
  }) || []

  // IEEE style: up to 6 authors, then et al.
  let authorText = ''
  if (authors.length > 6) {
    authorText = authors.slice(0, 6).join(', ') + ' et al.'
  } else {
    authorText = authors.join(', ')
  }

  // Build citation parts
  const parts = [
    authorText,
    `"${entry.title}"`,
    entry['container-title'] || entry.journal || '',
    entry.volume ? `vol. ${entry.volume}` : '',
    entry.issue ? `no. ${entry.issue}` : '',
    entry.page ? `pp. ${entry.page}` : '',
    entry.issued?.['date-parts']?.[0]?.[0] || ''
  ].filter(Boolean)  // Remove empty parts

  return parts.join(', ') + '.'
}

/**
 * Process BibTeX string and return publications in JSONCV format
 */
export async function processBibTeX(bibtexStr, cvData) {
  // Store raw BibTeX
  lastBibTeX = bibtexStr
  
  const cite = await Cite.async(bibtexStr)
  console.log('[Debug] Total entries in BibTeX:', cite.data.length)
  console.log('[Debug] Raw BibTeX data:', cite.data)
  
  const highlightNames = _getHighlightNames(cvData)
  const publications = []  // Start with a flat array
  
  cite.data.forEach((entry, index) => {
    console.log(`\n[Debug] Processing entry ${index + 1}/${cite.data.length}:`, {
      title: entry.title,
      type: entry.type,
      rawEntry: entry
    })
    
    try {
      // Process authors with highlighting
      const processedAuthors = entry.author?.map(a => {
        try {
          // Handle both object and string formats
          const author = typeof a === 'string' ? JSON.parse(a) : a
          // Extract firstName and lastName from either format
          const firstName = author.given || author.firstName || ''
          const lastName = author.family || author.lastName || ''
          const fullName = `${firstName}${lastName ? ` ${lastName}` : ''}`.trim()
          
          // Determine highlight status
          const isOwner = highlightNames.owner.some(name => _matchName(fullName, name))
          const isMentee = highlightNames.mentees.some(name => _matchName(fullName, name))
          
          // Apply highlighting markers
          if (isOwner) {
            return `<strong>${fullName}</strong>`
          } else if (isMentee) {
            return `<em>${fullName}</em>`
          }
          return fullName
        } catch (e) {
          console.error('[Error] Failed to process author:', a, e)
          return ''
        }
      }) || []

      // Format citation in IEEE style with HTML
      const formattedHTML = _formatIEEECitationHTML(entry, processedAuthors)

      // Determine publication type with debug info
      const pubType = PUBLICATION_TYPE_MAP[entry.type] || 'other'
      console.log('[Debug] Type determination:', {
        entryTitle: entry.title,
        entryType: entry.type,
        mappedType: pubType,
        hasType: entry.type in PUBLICATION_TYPE_MAP
      })

      const pub = {
        name: entry.title,
        publisher: entry['container-title'] || entry.journal || '',
        releaseDate: entry.issued?.['date-parts']?.[0]?.[0]?.toString() || '',
        url: entry.DOI ? `https://doi.org/${entry.DOI}` : entry.URL || '',
        summary: entry.abstract || '',
        type: pubType,
        formattedHTML,
        source: 'bibtex'
      }

      publications.push(pub)
      console.log('[Debug] Successfully processed publication:', pub)
    } catch (e) {
      console.error('[Error] Failed to process entry:', entry, e)
    }
  })
  
  console.log(`\n[Debug] Final processing summary:`, {
    totalBibTeXEntries: cite.data.length,
    processedPublications: publications.length,
    byType: publications.reduce((acc, pub) => {
      acc[pub.type] = (acc[pub.type] || 0) + 1
      return acc
    }, {})
  })
  
  return publications
}

/**
 * Format citation in IEEE style with HTML
 */
function _formatIEEECitationHTML(entry, processedAuthors) {
  // Use processed authors that already have HTML tags
  const authorText = processedAuthors.length > 6 
    ? processedAuthors.slice(0, 6).join(', ') + ' et al.'
    : processedAuthors.join(', ')

  // Build citation parts
  const parts = [
    authorText,
    `"${entry.title}"`,
    entry['container-title'] || entry.journal || '',
    entry.volume ? `vol. ${entry.volume}` : '',
    entry.issue ? `no. ${entry.issue}` : '',
    entry.page ? `pp. ${entry.page}` : '',
    entry.issued?.['date-parts']?.[0]?.[0] || ''
  ].filter(Boolean)  // Remove empty parts

  return parts.join(', ') + '.'
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
      return JSON.parse(pub);
    } catch (e) {
      console.error('Failed to parse publication:', e);
      return pub;
    }
  }
  return pub;
}

/**
 * Update publications in CV data (replace or merge)
 */
export function updatePublications(cvData, publications, shouldMerge = false) {
  // Ensure cvData has a valid publications array
  if (!Array.isArray(cvData.publications)) {
    cvData.publications = []
  }

  // For merging, we want to:
  // 1. Keep existing manual entries
  // 2. Replace or add BibTeX entries
  if (shouldMerge) {
    // Keep manual entries
    const manualPubs = cvData.publications.filter(p => p.source === 'manual')
    // Add new BibTeX entries
    return {
      ...cvData,
      publications: [...manualPubs, ...publications]
    }
  }

  return {
    ...cvData,
    publications
  }
} 