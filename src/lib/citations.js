import { Cite } from '@citation-js/core'
import '@citation-js/plugin-bibtex'
import '@citation-js/plugin-doi'
import '@citation-js/plugin-csl'
import { saveBibTeX } from './store'

// Initialize Cite with plugins
const plugins = Cite.plugins
if (plugins && plugins.add) {
  plugins.add('@citation-js/plugin-doi')
}

/**
 * Clean BibTeX content by removing YAML frontmatter and other non-BibTeX content
 * @param {string} content - Raw BibTeX content
 * @returns {string} Cleaned BibTeX content
 */
function cleanBibTeX(content) {
  // Remove YAML frontmatter if present
  content = content.replace(/^---\n[\s\S]*?\n---\n/, '')
  
  // Remove any leading/trailing whitespace
  content = content.trim()
  
  return content
}

/**
 * Parse BibTeX content and return formatted citations grouped by type and year
 * @param {string} bibtexContent - Raw BibTeX content
 * @returns {Object} Formatted citations grouped by type and year
 */
export async function parseBibTeX(bibtexContent) {
  try {
    const cleanedContent = cleanBibTeX(bibtexContent)
    console.log('Cleaned BibTeX content first 100 chars:', cleanedContent.substring(0, 100))
    
    // Create a new Cite instance
    const cite = new Cite()
    cite.add(cleanedContent, {
      format: 'bibtex',
      type: 'string'
    })
    
    if (!cite || !cite.data) {
      throw new Error('Failed to parse BibTeX content')
    }
    
    const entries = cite.data

    // Group by type and year
    const groupedEntries = entries.reduce((acc, entry) => {
      // Map BibTeX types to our categories
      let type = entry.type || 'other'
      if (type === 'article-journal' || type === 'article') {
        type = 'article'  // This will be mapped to 'journal' later
      } else if (type === 'paper-conference' || type === 'inproceedings') {
        type = 'paper-conference'  // This will be mapped to 'conference' later
      }
      
      const year = entry.issued?.['date-parts']?.[0]?.[0] || entry.year || 'unknown'
      
      if (!acc[type]) acc[type] = {}
      if (!acc[type][year]) acc[type][year] = []
      
      acc[type][year].push(entry)
      return acc
    }, {})

    return groupedEntries
  } catch (error) {
    console.error('Error parsing BibTeX:', error)
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    })
    throw error
  }
}

/**
 * Format a single citation in IEEE style
 * @param {Object} entry - Citation entry from citation-js
 * @returns {string} Formatted citation
 */
export function formatCitation(entry) {
  try {
    const cite = new Cite()
    cite.add(entry)
    
    // Get the base citation without DOI/URL using IEEE CSL style
    let baseCitation = cite.format('bibliography', {
      format: 'text',
      style: 'citation-ieee',  // Use citation-ieee style instead of template
      lang: 'en-US'
    })
      // First remove DOI URLs
      .replace(/\s*\bhttps?:\/\/(?:dx\.)?doi\.org\/[^\s]+\s*/, '')
      .trim()
      // Fix all period and space issues
      .replace(/\s*\.\s*\.\s*$/, '.')  // Replace trailing period-space combinations with single period
      .replace(/\s+\./g, '.')  // Remove spaces before any remaining periods
    
    // Return citation without DOI - the template will add the DOI link
    return baseCitation
  } catch (error) {
    console.error('Error formatting citation:', error)
    return `[Error formatting citation: ${entry.title || 'Unknown title'}]`
  }
}

/**
 * Convert BibTeX entries to CV JSON format
 * @param {Object} groupedEntries - Entries grouped by type and year
 * @returns {Array} Publications in CV JSON format
 */
export function convertToCV(groupedEntries) {
  const publications = []
  
  // Process all entry types
  Object.entries(groupedEntries).forEach(([type, yearGroups]) => {
    Object.entries(yearGroups)
      .sort((a, b) => Number(b[0]) - Number(a[0])) // Sort years descending
      .forEach(([year, entries]) => {
        entries.forEach(entry => {
          // Get clean DOI without any URL prefixes
          const doi = entry.DOI?.replace(/^https?:\/\/(?:dx\.)?doi\.org\//, '')
          
          publications.push({
            type: type === 'paper-conference' ? 'conference' : 
                  type === 'article' ? 'journal' : 'other',
            citation: formatCitation(entry),
            doi: doi
          })
        })
      })
  })

  return publications
}

/**
 * Load and process BibTeX file
 * @param {string} path - Path to BibTeX file
 * @returns {Promise<Array>} Publications in CV JSON format
 */
export async function loadBibTeXFile(path) {
  try {
    console.log('Attempting to load BibTeX file from:', path)
    console.log('Current location:', window.location.href)
    
    // Try to fetch with absolute path
    const absolutePath = new URL(path, window.location.href).href
    console.log('Trying absolute path:', absolutePath)
    
    const response = await fetch(path, {
      headers: {
        'Accept': 'text/plain',
        'Cache-Control': 'no-cache'
      }
    })
    
    if (!response.ok) {
      console.error('HTTP Error:', response.status, response.statusText)
      console.error('Response headers:', Object.fromEntries(response.headers.entries()))
      throw new Error(`Failed to load BibTeX file: ${response.statusText}`)
    }
    
    const bibtexContent = await response.text()
    if (!bibtexContent.trim()) {
      throw new Error('BibTeX file is empty')
    }
    
    console.log('Successfully loaded BibTeX content, first 100 chars:', bibtexContent.substring(0, 100))
    console.log('Content length:', bibtexContent.length)
    saveBibTeX(bibtexContent)  // Cache the BibTeX content
    
    console.log('Parsing BibTeX content...')
    const groupedEntries = await parseBibTeX(bibtexContent)
    console.log('Grouped entries by type:', Object.keys(groupedEntries))
    
    const publications = convertToCV(groupedEntries)
    console.log('Converted to CV format, total publications:', publications.length)
    
    return publications
  } catch (error) {
    console.error('Error loading BibTeX file:', error)
    console.error('Stack trace:', error.stack)
    throw error
  }
} 