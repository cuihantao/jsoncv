import { processBibTeX, onPublicationsUpdated, initializeBibTeXState } from './citations';
import { getBibTeX } from './store';

// Track initialization state
let isInitialized = false;
let initializationTimer = null;

/**
 * Render publications into the DOM
 * @param {Array} publications - List of publications to render
 * @returns {boolean} - Whether rendering was successful
 */
function renderPublications(publications) {
  // Find the Publications heading at any level
  console.log('[Debug][Citations] Starting renderPublications with', publications.length, 'publications');
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  console.log('[Debug][Citations] Found', headings.length, 'headings');
  
  let foundHeading = false;
  for (const heading of headings) {
    console.log('[Debug][Citations] Checking heading:', {
      tag: heading.tagName,
      text: heading.textContent.trim(),
      parent: heading.parentElement?.className
    });
    
    if (heading.textContent.trim() === 'Publications') {
      foundHeading = true;
      console.log('[Debug][Citations] Found Publications heading');
      
      // Find the section container
      const section = heading.closest('.publications-section');
      if (!section) {
        console.warn('[Debug][Citations] Could not find publications section from heading');
        return false;
      }

      // Log section state before modification
      console.log('[Debug][Citations] Section before modification:', {
        children: section.children.length,
        html: section.innerHTML.substring(0, 100)
      });

      // Clear existing publications but preserve the heading and note
      const existingContent = Array.from(section.children);
      existingContent.forEach(child => {
        if (!child.classList.contains('section-title') && !child.classList.contains('note')) {
          console.log('[Debug][Citations] Removing child:', child.className);
          child.remove();
        }
      });

      // Group by type
      const journalPubs = publications.filter(p => p.type === 'article' || p.type === 'journal');
      const confPubs = publications.filter(p => p.type === 'inproceedings' || p.type === 'conference');
      const otherPubs = publications.filter(p => 
        !['article', 'journal', 'inproceedings', 'conference'].includes(p.type)
      );

      console.log('[Debug][Citations] Publication counts:', {
        journals: journalPubs.length,
        conferences: confPubs.length,
        others: otherPubs.length
      });

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

      // Log final state
      console.log('[Debug][Citations] Section after modification:', {
        children: section.children.length,
        html: section.innerHTML.substring(0, 100)
      });
      return true;
    }
  }
  
  if (!foundHeading) {
    console.warn('[Debug][Citations] Publications heading not found in any of these headings:', 
      Array.from(headings).map(h => ({tag: h.tagName, text: h.textContent.trim()})));
  }
  return false;
}

/**
 * Initialize citations and update the DOM
 * @returns {Promise<boolean>} Whether initialization was successful
 */
export async function initializeCitations() {
  console.log('[Debug][Citations] Starting initialization...');
  
  // Clear any pending initialization
  if (initializationTimer) {
    clearTimeout(initializationTimer);
  }

  // Debounce initialization to handle rapid editor changes
  return new Promise((resolve) => {
    initializationTimer = setTimeout(async () => {
      try {
        // Initialize BibTeX state
        const initialBibTeX = initializeBibTeXState();
        if (!initialBibTeX) {
          console.warn('[Debug][Citations] No initial BibTeX content available');
          resolve(false);
          return;
        }
        console.log('[Debug][Citations] Initialized with BibTeX content length:', initialBibTeX.length);
        
        // Set up publications update listener only once
        if (!isInitialized) {
          onPublicationsUpdated(async (publications) => {
            console.log('[Debug][Citations] Received publications update:', publications.length);
            return renderPublications(publications);
          });
          isInitialized = true;
        }
        
        // Initial render from stored BibTeX
        const bibtexContent = getBibTeX();
        if (!bibtexContent) {
          console.warn('[Debug][Citations] No BibTeX content available');
          resolve(false);
          return;
        }

        const publications = await processBibTeX(bibtexContent);
        console.log('[Debug][Citations] Publications after processing:', 
                    publications.map(p => ({type: p.type, title: p.citation.substring(0, 50)})));
        
        // Wait a bit for any DOM updates to settle
        setTimeout(async () => {
          const renderResult = await renderPublications(publications);
          console.log('[Debug][Citations] Render result:', renderResult, 
                      'Found section:', !!document.querySelector('.publications-section'));
          resolve(renderResult);
        }, 100);
      } catch (error) {
        console.error('[Debug][Citations] Failed to process BibTeX:', error);
        resolve(false);
      }
    }, 200); // Debounce time
  });
} 