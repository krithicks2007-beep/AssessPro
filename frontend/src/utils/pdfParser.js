import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

/**
 * Extracts plain text from a PDF ArrayBuffer
 * @param {ArrayBuffer} arrayBuffer 
 * @returns {Promise<string>}
 */
export async function extractTextFromPDF(arrayBuffer) {
  try {
    const data = new Uint8Array(arrayBuffer);
    const loadingTask = pdfjsLib.getDocument({
      data,
      useSystemFonts: true,
      isEvalSupported: false,
    });
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageLines = [];
      let currentLine = '';
      let lastY = null;

      for (const item of textContent.items) {
        if ('str' in item) {
          // If Y coordinate changes noticeably, treat as new line
          const currentY = item.transform ? item.transform[5] : null;
          if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 5) {
            if (currentLine.trim()) pageLines.push(currentLine.trim());
            currentLine = item.str;
          } else {
            currentLine += (currentLine ? ' ' : '') + item.str;
          }
          lastY = currentY;
        }
      }
      if (currentLine.trim()) pageLines.push(currentLine.trim());

      fullText += pageLines.join('\n') + '\n\n';
    }

    return fullText;
  } catch (err) {
    console.error('Failed to extract text from PDF:', err);
    throw new Error('Unable to extract text from this PDF file. ' + (err.message || ''));
  }
}
