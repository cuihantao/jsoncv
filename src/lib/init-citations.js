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
  // Create section header if it doesn't exist
  let sectionHeader = Array.from(container.getElementsByTagName('h3'))
    .find(h3 => h3.textContent.trim() === title);
  
  if (!sectionHeader) {
    sectionHeader = document.createElement('h3');
    sectionHeader.textContent = title;
    container.appendChild(sectionHeader);
  }

  // Create or find publications container
  let pubsContainer = sectionHeader.nextElementSibling;
  if (!pubsContainer?.classList.contains('publications')) {
    pubsContainer = document.createElement('div');
    pubsContainer.className = 'publications';
    sectionHeader.parentNode.insertBefore(pubsContainer, sectionHeader.nextSibling);
  }

  console.log(`[Debug][Citations] Updating ${title} section with ${publications.length} publications`);
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
    const journalPubs = publications.filter(p => p.type === 'article' || p.type === 'journal');
    const confPubs = publications.filter(p => p.type === 'inproceedings' || p.type === 'conference');
    const otherPubs = publications.filter(p => !journalPubs.includes(p) && !confPubs.includes(p));
    
    // Update each section
    let success = false;
    if (journalPubs.length > 0) {
      success = renderPublicationSection(pubsSection, 'Journal Articles', journalPubs) || success;
    }
    if (confPubs.length > 0) {
      success = renderPublicationSection(pubsSection, 'Conference Papers', confPubs) || success;
    }
    if (otherPubs.length > 0) {
      success = renderPublicationSection(pubsSection, 'Other Publications', otherPubs) || success;
    }
    
    return success;
  } catch (error) {
    console.error('[Debug][Citations] Failed to process BibTeX:', error);
    return false;
  }
} 