import { processBibTeX, onPublicationsUpdated, initializeBibTeXState } from './citations';
import { getBibTeX } from './store';

// Constants
const PUBLICATION_TYPES = {
  JOURNAL: ['article', 'journal'],
  CONFERENCE: ['inproceedings', 'conference']
};

const DOM_SELECTORS = {
  PUBLICATIONS_SECTION: '.publications-section',
  SECTION_TITLE: '.section-title',
  NOTE: '.note'
};

const RETRY_CONFIG = {
  MAX_ATTEMPTS: 10,
  DELAY_MS: 100
};

/**
 * @typedef {Object} Publication
 * @property {string} type - Type of publication (e.g., 'article', 'inproceedings')
 * @property {string} citation - Formatted citation text
 * @property {string} [doi] - Optional DOI identifier
 */

/**
 * Create a publication section with given title and items
 * @param {string} title - Section title
 * @param {Publication[]} items - List of publications
 * @returns {DocumentFragment} Fragment containing the section
 */
function createPublicationSection(title, items) {
  const fragment = document.createDocumentFragment();
  
  const h3 = document.createElement('h3');
  h3.textContent = title;
  fragment.appendChild(h3);

  const div = document.createElement('div');
  div.className = 'publications';
  div.innerHTML = items.map((item, index) => `
    <div class="publication section-item">
      <div class="citation">
        <span class="number">[${index + 1}]</span>
        <span class="text">
          ${item.citation}
          ${item.doi ? `<a href="https://doi.org/${item.doi}" target="_blank">[${item.doi}]</a>` : ''}
        </span>
      </div>
    </div>
  `).join('');
  
  fragment.appendChild(div);
  return fragment;
}

/**
 * Wait for an element to be present in the DOM
 * @param {string} selector - CSS selector
 * @returns {Promise<Element>} The found element
 */
async function waitForElement(selector) {
  let element = null;
  let attempts = 0;

  while (!element && attempts < RETRY_CONFIG.MAX_ATTEMPTS) {
    element = document.querySelector(selector);
    if (!element) {
      await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.DELAY_MS));
      attempts++;
    }
  }

  if (!element) {
    throw new Error(`Element ${selector} not found after ${attempts} attempts`);
  }

  return element;
}

/**
 * Group publications by their type
 * @param {Publication[]} publications - List of publications
 * @returns {Object} Grouped publications
 */
function groupPublications(publications) {
  return {
    journals: publications.filter(p => PUBLICATION_TYPES.JOURNAL.includes(p.type)),
    conferences: publications.filter(p => PUBLICATION_TYPES.CONFERENCE.includes(p.type)),
    others: publications.filter(p => 
      ![...PUBLICATION_TYPES.JOURNAL, ...PUBLICATION_TYPES.CONFERENCE].includes(p.type)
    )
  };
}

/**
 * Render publications into the DOM
 * @param {Publication[]} publications - List of publications to render
 * @returns {Promise<boolean>} - Whether rendering was successful
 */
async function renderPublications(publications) {
  try {
    // Find the Publications section
    const section = await waitForElement(DOM_SELECTORS.PUBLICATIONS_SECTION);

    // Preserve important elements
    const title = section.querySelector(DOM_SELECTORS.SECTION_TITLE);
    const note = section.querySelector(DOM_SELECTORS.NOTE);
    
    // Clear and restore preserved elements
    section.innerHTML = '';
    if (title) section.appendChild(title);
    if (note) section.appendChild(note);

    // Group and render publications
    const grouped = groupPublications(publications);

    if (grouped.journals.length > 0) {
      section.appendChild(createPublicationSection('Journal Articles', grouped.journals));
    }

    if (grouped.conferences.length > 0) {
      section.appendChild(createPublicationSection('Conference Papers', grouped.conferences));
    }

    if (grouped.others.length > 0) {
      section.appendChild(createPublicationSection('Other Publications', grouped.others));
    }

    return true;
  } catch (error) {
    console.error('Failed to render publications:', error);
    return false;
  }
}

/**
 * Initialize citations and update the DOM
 * @returns {Promise<boolean>} Whether initialization was successful
 */
export async function initializeCitations() {
  try {
    // Initialize BibTeX state
    const initialBibTeX = initializeBibTeXState();
    if (!initialBibTeX) {
      console.warn('No initial BibTeX content available');
      return false;
    }

    // Set up publications update listener
    onPublicationsUpdated(renderPublications);
    
    // Initial render from stored BibTeX
    const bibtexContent = getBibTeX();
    if (!bibtexContent) {
      console.warn('No BibTeX content available');
      return false;
    }

    const publications = await processBibTeX(bibtexContent);
    return renderPublications(publications);
  } catch (error) {
    console.error('Failed to initialize citations:', error);
    return false;
  }
} 