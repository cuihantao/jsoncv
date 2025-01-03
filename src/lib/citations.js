import { Cite } from '@citation-js/core'
import '@citation-js/plugin-bibtex'
import '@citation-js/plugin-doi'
import '@citation-js/plugin-csl'
import { plugins } from '@citation-js/core'
import { saveBibTeX, getCVData, getBibTeX, getBibFileName } from './store'

// Event bus for publication updates
const publicationEvents = new EventTarget()

// Event types
export const PUBLICATIONS_UPDATED = 'publications-updated'

// Configuration for name processing
const nameConfig = {
  owner: '',
  ownerStyle: 'bold',  // will be overridden by CV data
  advisees: [],
  adviseeStyle: 'plus'  // will be overridden by CV data
}

// Processed configuration with name variants for pattern matching
let processedNameConfig = {
  owner: {
    name: '',
    variants: [],
    style: 'bold'  // will be overridden by CV data
  },
  advisees: []  // will be populated with {name, variants, style} objects
}

// Publication state
let currentPublications = []
let currentBibTeX = getBibTeX() || ''

// Register plugins
plugins.add('@citation-js/plugin-bibtex')
plugins.add('@citation-js/plugin-doi')
plugins.add('@citation-js/plugin-csl')

// Initialize CSL plugin and template
let ieeeTemplatePromise = null;

async function initializeIEEETemplate() {
  if (ieeeTemplatePromise) return ieeeTemplatePromise;

  ieeeTemplatePromise = fetch('https://raw.githubusercontent.com/citation-style-language/styles/refs/heads/master/ieee.csl')
    .then(response => response.text())
    .then(template => {
      const cslPlugin = plugins.config.get('@csl')
      if (cslPlugin && cslPlugin.templates) {
        cslPlugin.templates.add('ieee', template)
        console.log('Successfully registered IEEE template')
      } else {
        throw new Error('CSL plugin not properly initialized')
      }
    })
    .catch(error => {
      console.error('Error loading IEEE CSL template:', error)
      throw error
    });

  return ieeeTemplatePromise;
}

// Debug: Log initial state
console.log('citations.js: Initializing...')
console.log('Initial BIB content length:', currentBibTeX.length)

// If we have content, process it immediately
if (currentBibTeX) {
  console.log('Processing initial BIB content...')
  processBibTeX(currentBibTeX).catch(error => {
    console.error('Failed to process initial BIB content:', error)
  })
}

/**
 * Get name configuration from CV data
 * @param {Object} cvData - The CV data object
 * @returns {Object} Name configuration object
 */
function getNameConfigFromCV(cvData) {
  // Get citation styles from meta, or use defaults
  const styles = cvData.meta?.citationStyles || { owner: 'bold', mentee: 'plus' }

  const config = {
    owner: cvData.basics?.name || '',
    ownerStyle: styles.owner,
    advisees: [],
    adviseeStyle: styles.mentee
  }

  // Get current students
  if (cvData.mentoring?.current_students) {
    config.advisees.push(...cvData.mentoring.current_students.map(s => s.name))
  }

  // Get past students
  if (cvData.mentoring?.past_students) {
    config.advisees.push(...cvData.mentoring.past_students.map(s => s.name))
  }

  // Get committee service students
  if (cvData.mentoring?.committee_service) {
    config.advisees.push(...cvData.mentoring.committee_service.map(s => s.name))
  }

  return config
}

/**
 * Generate variants of a name
 * @param {string} fullName - Full name in natural order (e.g., "Hantao Cui")
 * @returns {string[]} Array of name variants
 */
function generateNameVariants(fullName) {
  const variants = new Set([fullName])  // start with the full name
  
  // Split the name into parts
  const parts = fullName.split(' ')
  const lastName = parts[parts.length - 1]
  const firstName = parts[0]
  const middleNames = parts.slice(1, -1)
  
  // Generate first initial(s)
  const initials = parts.slice(0, -1).map(part => part[0])
  
  // Common variants for all names
  variants.add(`${lastName}, ${fullName}`)  // Cui, Hantao
  variants.add(`${initials.join('. ')}. ${lastName}`)  // H. Cui
  variants.add(`${lastName}, ${initials.join('.')}`)  // Cui, H.
  variants.add(`${lastName}, ${initials.join('. ')}.`)  // Cui, H.
  variants.add(`${initials.join(' ')} ${lastName}`)  // H Cui (without periods)
  variants.add(`${firstName} ${lastName}`)  // Hantao Cui (without middle names)
  
  // For names with middle names/initials
  if (middleNames.length > 0) {
    const firstInitial = firstName[0]
    const middleInitials = middleNames.map(part => part[0])
    
    // With periods
    variants.add(`${firstInitial}. ${middleInitials.join('. ')}. ${lastName}`)  // H. I. Cui
    variants.add(`${lastName}, ${firstInitial}. ${middleInitials.join('. ')}.`)  // Cui, H. I.
    variants.add(`${lastName}, ${firstInitial}.${middleInitials.join('.')}`)  // Cui, H.I.
    variants.add(`${lastName}, ${firstInitial}.${middleInitials.join('. ')}.`)  // Cui, H.I.
    
    // Without periods
    variants.add(`${firstInitial} ${middleInitials.join(' ')} ${lastName}`)  // H I Cui
    variants.add(`${lastName}, ${firstInitial} ${middleInitials.join(' ')}`)  // Cui, H I
    
    // First name with middle initials
    variants.add(`${firstName} ${middleInitials.join('. ')}. ${lastName}`)  // Hantao I. Cui
    variants.add(`${lastName}, ${firstName} ${middleInitials.join('.')}`)  // Cui, Hantao I
  }

  // Add flexible matching patterns for possible missing middle names
  // These patterns will match names with additional middle initials
  const firstInitial = firstName[0]
  variants.add(`${firstInitial}\\. [A-Z]\\. ${lastName}`)  // H. ?. Cui - matches any middle initial
  variants.add(`${firstInitial}\\. [A-Z]\\. [A-Z]\\. ${lastName}`)  // H. ?. ?. Cui - matches two middle initials
  variants.add(`${lastName}, ${firstInitial}\\. [A-Z]\\.`)  // Cui, H. ?.
  variants.add(`${lastName}, ${firstInitial}\\. [A-Z]\\. [A-Z]\\.`)  // Cui, H. ?. ?.
  
  const result = Array.from(variants)
  return result
}

/**
 * Process name configuration to generate variants for pattern matching
 */
function processNameConfig() {
  // Process owner name
  processedNameConfig.owner = {
    name: nameConfig.owner,
    variants: generateNameVariants(nameConfig.owner),
    style: nameConfig.ownerStyle
  }

  // Process advisee names
  processedNameConfig.advisees = nameConfig.advisees.map(name => ({
    name,
    variants: generateNameVariants(name),
    style: nameConfig.adviseeStyle
  }))
}

// Process the configuration immediately
processNameConfig()

/**
 * Apply name highlighting to a citation string based on processedNameConfig
 * @param {string} citation - The citation string to process
 * @returns {string} Citation with highlighted names
 */
function highlightNames(citation) {
  let result = citation

  // Helper function to escape regex special characters
  const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // Helper function to apply style
  function applyStyle(text, style) {
    switch (style) {
      case 'bold':
        return `<b>${text}</b>`
      case 'asterisk':
        return `${text}<sup>*</sup>`
      case 'plus':
        return `${text}<sup>+</sup>`
      default:
        return text
    }
  }

  // Helper function to count initials in a name
  function countInitials(name) {
    return (name.match(/[A-Z]\./g) || []).length
  }

  // Helper function to check if a name has more initials than expected
  function hasMoreInitials(originalName, matchedName) {
    const originalParts = originalName.split(' ')
    const originalInitialsCount = originalParts.length - 1  // All parts except last name can be initials
    const matchedInitialsCount = countInitials(matchedName)
    return matchedInitialsCount > originalInitialsCount
  }

  // Process owner name
  const ownerPatterns = processedNameConfig.owner.variants.map(escapeRegex)
  for (const pattern of ownerPatterns) {
    const regex = new RegExp(`\\b${pattern}\\b`, 'g')
    result = result.replace(regex, match => applyStyle(match, processedNameConfig.owner.style))
  }

  // Process advisee names
  for (const advisee of processedNameConfig.advisees) {
    const adviseePatterns = advisee.variants.map(escapeRegex)
    for (const pattern of adviseePatterns) {
      const regex = new RegExp(`\\b${pattern}\\b`, 'g')
      result = result.replace(regex, match => applyStyle(match, advisee.style))
    }

    // Check for names with additional initials
    const lastName = advisee.name.split(' ').pop()
    const regex = new RegExp(`\\b[A-Z](?:\\. [A-Z]\\.)* ${escapeRegex(lastName)}\\b`, 'g')
    const matches = result.match(regex)
    if (matches) {
      matches.forEach(match => {
        if (hasMoreInitials(advisee.name, match)) {
          console.warn(`Warning: Found advisee name with additional initials: "${match}". Consider updating CV with full name for "${advisee.name}".`)
        }
      })
    }
  }

  return result
}

/**
 * Format a single citation in IEEE style
 * @param {Object} entry - Citation entry from citation-js
 * @returns {string} Formatted citation
 */
export async function formatCitation(entry) {
  try {
    // Ensure IEEE template is loaded
    await initializeIEEETemplate();
    
    const cite = new Cite()
    
    // Ensure entry is in the correct format
    const formattedEntry = {
      ...entry,
      type: entry.type || 'article',
      title: entry.title || '',
      author: Array.isArray(entry.author) ? entry.author : [],
      issued: entry.issued || { 'date-parts': [[entry.year || '']] }
    }
    
    cite.add(formattedEntry)
    
    // Get the base citation without DOI/URL using IEEE style
    let baseCitation = cite.format('bibliography', {
      format: 'text',
      template: 'ieee',
      lang: 'en-US'
    })
      // Remove citation number [1]
      .replace(/^\[\d+\]\s*/, '')
      // First remove DOI URLs
      .replace(/\s*\bhttps?:\/\/(?:dx\.)?doi\.org\/[^\s]+\s*/, '')
      // Remove the first doi instance (lowercase) that appears in the middle of the citation
      .replace(/,\s*doi:\s*10\.\d+\/[^\s]+\s*\./, '.')
      .trim()
      // Fix all period and space issues
      .replace(/\s*\.\s*\.\s*$/, '.')  // Replace trailing period-space combinations with single period
      .replace(/\s+\./g, '.')  // Remove spaces before any remaining periods
    
    // Apply name highlighting
    baseCitation = highlightNames(baseCitation)
    
    // Return citation without DOI - the template will add the DOI link
    return baseCitation
  } catch (error) {
    console.error('Error formatting citation:', error)
    console.error('Entry data:', entry)
    return `[Error formatting citation: ${entry.title || 'Unknown title'}]`
  }
}

/**
 * Convert BibTeX entries to CV JSON format
 * @param {Object} groupedEntries - Entries grouped by type and year
 * @returns {Promise<Array>} Publications in CV JSON format
 */
export async function convertToCV(groupedEntries) {
  const publications = []
  
  // Process all entry types
  for (const [type, yearGroups] of Object.entries(groupedEntries)) {
    for (const [year, entries] of Object.entries(yearGroups).sort((a, b) => Number(b[0]) - Number(a[0]))) {
      for (const entry of entries) {
        // Get clean DOI without any URL prefixes
        const doi = entry.DOI?.replace(/^https?:\/\/(?:dx\.)?doi\.org\//, '')
        
        publications.push({
          type: type === 'paper-conference' ? 'conference' : 
                type === 'article' ? 'journal' : 'other',
          citation: await formatCitation(entry),
          doi: doi
        })
      }
    }
  }

  return publications
}

/**
 * Update publications and notify listeners
 * @param {Array} publications - New publications list
 */
function updatePublications(publications) {
  currentPublications = publications
  publicationEvents.dispatchEvent(new CustomEvent(PUBLICATIONS_UPDATED, {
    detail: { publications }
  }))
}

/**
 * Subscribe to publication updates
 * @param {Function} callback - Function to call when publications are updated
 */
export function onPublicationsUpdated(callback) {
  publicationEvents.addEventListener(PUBLICATIONS_UPDATED, (event) => {
    callback(event.detail.publications)
  })
}

/**
 * Process BibTeX content and update publications
 * @param {string} bibtexContent - Raw BibTeX content
 * @returns {Promise<Array>} Processed publications
 */
export async function processBibTeX(bibtexContent) {
  try {
    console.log('Processing BibTeX content, length:', bibtexContent?.length || 0)
    if (!bibtexContent) {
      console.warn('Empty BibTeX content provided to processBibTeX')
      return []
    }

    currentBibTeX = bibtexContent
    saveBibTeX(bibtexContent)
    
    // Get CV data for name highlighting
    const cvData = getCVData()
    if (cvData) {
      console.log('Got CV data for name highlighting')
      const newConfig = getNameConfigFromCV(cvData)
      nameConfig.owner = newConfig.owner
      nameConfig.advisees = newConfig.advisees
      processNameConfig()
    } else {
      console.warn('No CV data available for name highlighting')
    }
    
    const groupedEntries = await parseBibTeX(bibtexContent)
    console.log('Parsed BibTeX entries:', Object.keys(groupedEntries).length, 'types')
    
    const publications = await convertToCV(groupedEntries)
    console.log('Converted to CV format:', publications.length, 'publications')
    
    updatePublications(publications)
    return publications
  } catch (error) {
    console.error('Error processing BibTeX:', error)
    throw error
  }
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

// Add new utility functions
export function getCurrentPublications() {
  return currentPublications
}

export function getCurrentBibTeX() {
  return currentBibTeX
}

/**
 * Load BibTeX content from store and process it
 * @returns {Promise<Array>} Processed publications
 */
export function loadBibTeX() {
  try {
    const bibtexContent = getBibTeX()
    const filename = getBibFileName() || 'unknown'
    console.log(`Loading BibTeX from store (${filename}), content length:`, bibtexContent?.length || 0)
    if (!bibtexContent) {
      console.warn('No BibTeX content found in store')
      return []
    }
    return processBibTeX(bibtexContent)
  } catch (error) {
    console.error('Error loading BibTeX:', error)
    throw error
  }
}

// Replace the old loadSampleBibTeX with the new loadBibTeX function
export const loadSampleBibTeX = loadBibTeX 