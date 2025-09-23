// Utility functions for handling HTML content in the application

/**
 * Strips HTML tags and converts HTML entities for preview display
 * @param html - HTML string to process
 * @returns Clean text content
 */
export const stripHtmlForPreview = (html?: string): string => {
  if (!html) return ''
  
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  
  // Get text content and clean it up
  let text = tempDiv.textContent || tempDiv.innerText || ''
  
  // Convert common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
  
  // Clean up extra whitespace
  text = text.replace(/\s+/g, ' ').trim()
  
  return text
}

/**
 * Strips HTML tags while preserving line breaks for editing in textareas
 * @param html - HTML string to process
 * @returns Plain text with basic formatting preserved
 */
export const stripHtmlForEditing = (html?: string): string => {
  if (!html) return ''

  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html

  const text = tempDiv.innerText || tempDiv.textContent || ''

  return text
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Detects if content contains HTML tags
 * @param content - String to check
 * @returns True if content contains HTML tags
 */
export const isHtmlContent = (content: string): boolean => {
  return /<[^>]*>/g.test(content)
}

/**
 * Converts plain text to HTML for rich text editor
 * @param text - Plain text to convert
 * @returns HTML string
 */
export const convertTextToHtml = (text: string): string => {
  if (!text) return ''
  if (isHtmlContent(text)) return text
  
  // Convert plain text to HTML, preserving line breaks and basic formatting
  return text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*)$/gm, '<ul><li>$1</li></ul>')
    .replace(/<\/ul><ul>/g, '')
}

/**
 * Truncates text to specified length
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text with ellipsis
 */
export const truncate = (text?: string, maxLength = 160): string => {
  if (!text) return ''
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text
}
