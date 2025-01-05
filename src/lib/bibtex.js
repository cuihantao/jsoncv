import { Cite } from '@citation-js/core'
import '@citation-js/plugin-bibtex'

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
  console.log('[Debug] Citation data:', cite.data)
  
  const highlightNames = _getHighlightNames(cvData)

  const publications = []  // Start with a flat array
  
  cite.data.forEach((entry) => {
    console.log('[Debug] Processing entry:', {
      title: entry.title,
      authors: entry.author,
      publisher: entry.publisher,
      date: entry.issued
    })
    
    // Process authors with highlighting
    const processedAuthors = entry.author?.map(a => {
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
        return `**${fullName}**`
      } else if (isMentee) {
        return `*${fullName}*`
      }
      return fullName
    }) || []

    // Format citation in IEEE style
    const citation = _formatIEEECitation(entry)

    const pub = {
      name: entry.title,
      venue: entry['container-title'] || entry.journal || '',
      releaseDate: entry.issued?.['date-parts']?.[0]?.[0]?.toString() || '',
      url: entry.DOI ? `https://doi.org/${entry.DOI}` : entry.URL || '',
      summary: entry.abstract || '',
      authors: processedAuthors,
      citation,  // Store the IEEE formatted citation
      highlightInfo: {
        hasOwner: processedAuthors.some(a => a.includes('**')),
        hasMentee: processedAuthors.some(a => a.includes('*'))
      }
    }

    publications.push(pub)  // Add to flat array
    console.log('[Debug] Processed publication:', pub)
  })
  
  // Return as a single array in 'other'
  return {
    journal: [],
    conference: [],
    other: publications  // Store all publications in 'other'
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
  // Ensure cvData has a valid publications structure
  if (!cvData.publications || typeof cvData.publications !== 'object') {
    cvData.publications = {
      journal: [],
      conference: [],
      other: []
    }
  }

  // Parse any stringified publications in existing data
  const existingPubs = {
    journal: (cvData.publications.journal || []).map(_parsePublication),
    conference: (cvData.publications.conference || []).map(_parsePublication),
    other: (cvData.publications.other || []).map(_parsePublication)
  }

  // If publications is an array, categorize it
  if (Array.isArray(publications)) {
    publications = {
      journal: publications.filter(p => p.type === 'article').map(_parsePublication),
      conference: publications.filter(p => ['inproceedings', 'conference'].includes(p.type)).map(_parsePublication),
      other: publications.filter(p => !['article', 'inproceedings', 'conference'].includes(p.type)).map(_parsePublication)
    }
  } else {
    // If it's already categorized, parse each category
    publications = {
      journal: (publications.journal || []).map(_parsePublication),
      conference: (publications.conference || []).map(_parsePublication),
      other: (publications.other || []).map(_parsePublication)
    }
  }

  // Simple merge or replace
  if (shouldMerge) {
    return {
      ...cvData,
      publications: {
        journal: [...existingPubs.journal, ...publications.journal],
        conference: [...existingPubs.conference, ...publications.conference],
        other: [...existingPubs.other, ...publications.other]
      }
    }
  }

  return {
    ...cvData,
    publications
  }
} 