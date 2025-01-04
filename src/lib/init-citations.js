import { processBibTeX } from './citations';

// Initialize citations and update CV data
export async function initializeCitations(cvData) {
  console.log('[Debug][Init-Citations] Starting initialization...');
  
  // Get BibTeX content from injected global
  if (typeof window !== 'undefined' && window.__BIBTEX_CONTENT__) {
    console.log('[Debug][Init-Citations] Found injected BibTeX content, length:', window.__BIBTEX_CONTENT__.length);
    
    try {
      const publications = await processBibTeX(window.__BIBTEX_CONTENT__);
      console.log('[Debug][Init-Citations] Processed publications:', publications.length);
      
      // Update CV data
      cvData.publications = publications;
      console.log('[Debug][Init-Citations] Updated CV data with publications');
      
      return true;
    } catch (error) {
      console.error('[Debug][Init-Citations] Failed to process BibTeX:', error);
    }
  } else {
    console.warn('[Debug][Init-Citations] No BibTeX content found');
  }
  
  return false;
} 