import { processBibTeX } from './citations';
import { getBibTeX } from './store';

/**
 * Render a publications section with the given publications
 * @param {HTMLElement} container - The container element
 * @param {string} title - Section title (e.g., "Journal Articles")
 * @param {Array} publications - List of publications to render
 * @returns {boolean} - Whether the section was successfully rendered
 */
function renderPublicationSection(container, title, publications) {
  const h3Elements = Array.from(container.getElementsByTagName('h3'));
  const sectionHeader = h3Elements.find(h3 => h3.textContent.trim() === title);
  
  if (sectionHeader) {
    const pubsContainer = sectionHeader.nextElementSibling;
    if (pubsContainer?.classList.contains('publications')) {
      console.log(`[Debug][Citations] Found ${title} section, updating with`, publications.length, 'publications');
      pubsContainer.innerHTML = publications.map((item, index) => `
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
      return true;
    }
  }
  console.log(`[Debug][Citations] Section ${title} not found or invalid structure`);
  return false;
}

/**
 * Initialize citations and update the DOM
 * @returns {Promise<boolean>} Whether initialization was successful
 */
export async function initializeCitations() {
  console.log('[Debug][Citations] Starting initialization...');
  
  // Get BibTeX content from store (which handles both injected and localStorage content)
  const bibtexContent = getBibTeX();
  if (!bibtexContent) {
    console.warn('[Debug][Citations] No BibTeX content available');
    return false;
  }

  console.log('[Debug][Citations] Found BibTeX content, processing...');
  try {
    const publications = await processBibTeX(bibtexContent);
    console.log('[Debug][Citations] Processed publications:', publications.length);
    
    // Find and update the publications section
    const pubsSection = document.querySelector('.publications-section');
    if (!pubsSection) {
      console.warn('[Debug][Citations] Publications section not found');
      return false;
    }

    console.log('[Debug][Citations] Found publications section');
    
    // Group publications by type
    const journalPubs = publications.filter(p => p.type === 'journal');
    const confPubs = publications.filter(p => p.type === 'conference');
    
    // Update each section
    const journalSuccess = renderPublicationSection(pubsSection, 'Journal Articles', journalPubs);
    const confSuccess = renderPublicationSection(pubsSection, 'Conference Papers', confPubs);
    
    return journalSuccess || confSuccess;
  } catch (error) {
    console.error('[Debug][Citations] Failed to process BibTeX:', error);
    return false;
  }
} 