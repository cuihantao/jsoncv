import { processBibTeX, onPublicationsUpdated } from './citations';
import { getBibTeX } from './store';

/**
 * Render publications into the DOM
 * @param {Array} publications - List of publications to render
 * @returns {boolean} - Whether rendering was successful
 */
function renderPublications(publications) {
  // Find the Publications heading at any level
  console.log('[Debug][Citations] Looking for Publications heading...');
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  console.log('[Debug][Citations] Found', headings.length, 'headings');
  
  for (const heading of headings) {
    console.log('[Debug][Citations] Checking heading:', heading.tagName, heading.textContent.trim());
    if (heading.textContent.trim() === 'Publications') {
      console.log('[Debug][Citations] Found Publications heading');
      
      // Find the section container
      const section = heading.closest('.publications-section');
      if (!section) {
        console.warn('[Debug][Citations] Could not find publications section');
        return false;
      }

      // Clear existing publications but preserve the heading and note
      const existingContent = Array.from(section.children);
      existingContent.forEach(child => {
        if (!child.classList.contains('section-title') && !child.classList.contains('note')) {
          child.remove();
        }
      });

      // Group by type
      const journalPubs = publications.filter(p => p.type === 'article' || p.type === 'journal');
      const confPubs = publications.filter(p => p.type === 'inproceedings' || p.type === 'conference');
      const otherPubs = publications.filter(p => 
        !['article', 'journal', 'inproceedings', 'conference'].includes(p.type)
      );

      console.log('[Debug][Citations] Publication counts - Journals:', journalPubs.length, 
                 'Conferences:', confPubs.length, 'Others:', otherPubs.length);

      // Render each section
      if (journalPubs.length > 0) {
        const h3 = document.createElement('h3');
        h3.textContent = 'Journal Articles';
        section.appendChild(h3);

        const div = document.createElement('div');
        div.className = 'publications';
        div.innerHTML = journalPubs.map((item, index) => `
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
        section.appendChild(div);
      }

      if (confPubs.length > 0) {
        const h3 = document.createElement('h3');
        h3.textContent = 'Conference Papers';
        section.appendChild(h3);

        const div = document.createElement('div');
        div.className = 'publications';
        div.innerHTML = confPubs.map((item, index) => `
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
        section.appendChild(div);
      }

      if (otherPubs.length > 0) {
        const h3 = document.createElement('h3');
        h3.textContent = 'Other Publications';
        section.appendChild(h3);

        const div = document.createElement('div');
        div.className = 'publications';
        div.innerHTML = otherPubs.map((item, index) => `
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
        section.appendChild(div);
      }

      console.log('[Debug][Citations] Successfully rendered publications');
      return true;
    }
  }
  console.warn('[Debug][Citations] Publications heading not found');
  return false;
}

/**
 * Initialize citations and update the DOM
 * @returns {Promise<boolean>} Whether initialization was successful
 */
export async function initializeCitations() {
  console.log('[Debug][Citations] Starting initialization...');
  
  // Set up publications update listener
  onPublicationsUpdated(async (publications) => {
    console.log('[Debug][Citations] Received publications update:', publications.length);
    return renderPublications(publications);
  });
  
  // Initial render from stored BibTeX
  const bibtexContent = getBibTeX();
  if (!bibtexContent) {
    console.warn('[Debug][Citations] No BibTeX content available');
    return false;
  }

  try {
    const publications = await processBibTeX(bibtexContent);
    console.log('[Debug][Citations] Processing initial publications:', publications.length);
    return renderPublications(publications);
  } catch (error) {
    console.error('[Debug][Citations] Failed to process BibTeX:', error);
    return false;
  }
} 