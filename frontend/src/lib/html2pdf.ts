'use client'

let html2pdfPromise: Promise<typeof import('html2pdf.js')> | null = null

export const loadHtml2Pdf = () => {
  if (!html2pdfPromise) {
    html2pdfPromise = import('html2pdf.js')
  }
  return html2pdfPromise
}


