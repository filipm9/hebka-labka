/**
 * Converts various value formats to an array of tags.
 * Handles PostgreSQL array format: {tag1,tag2} or comma-separated strings.
 * @param {any} value - The value to convert
 * @returns {string[]} - Array of tags
 */
export function toTags(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  // Handle PostgreSQL array format: {tag1,tag2} or comma-separated string
  const str = String(value).trim();
  if (str.startsWith('{') && str.endsWith('}')) {
    return str
      .slice(1, -1)
      .split(',')
      .map((v) => v.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1'))
      .filter(Boolean);
  }
  return str
    .split(',')
    .map((v) => v.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1'))
    .filter(Boolean);
}

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Allows safe HTML tags (formatting) while removing potentially dangerous content.
 * @param {string} html - The HTML string to sanitize
 * @returns {string} - Sanitized HTML string
 */
export function sanitizeHtml(html) {
  if (!html) return '';
  
  // Create a temporary element to parse the HTML
  const doc = new DOMParser().parseFromString(html, 'text/html');
  
  // List of allowed tags for rich text formatting
  const allowedTags = new Set([
    'p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 
    'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
  ]);
  
  // List of allowed attributes
  const allowedAttributes = new Set(['style']);
  
  // Recursively clean nodes
  function cleanNode(node) {
    // Process child nodes in reverse to safely remove them
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const tagName = child.tagName.toLowerCase();
        
        // Remove script, style, and other dangerous tags entirely
        if (!allowedTags.has(tagName)) {
          // Keep text content but remove the tag
          while (child.firstChild) {
            node.insertBefore(child.firstChild, child);
          }
          node.removeChild(child);
        } else {
          // Remove all attributes except allowed ones
          const attrs = Array.from(child.attributes);
          for (const attr of attrs) {
            if (!allowedAttributes.has(attr.name.toLowerCase())) {
              child.removeAttribute(attr.name);
            } else if (attr.name.toLowerCase() === 'style') {
              // Sanitize style attribute - remove javascript: and expression()
              const sanitizedStyle = attr.value
                .replace(/javascript:/gi, '')
                .replace(/expression\s*\(/gi, '');
              child.setAttribute('style', sanitizedStyle);
            }
          }
          // Recursively clean children
          cleanNode(child);
        }
      }
    }
  }
  
  cleanNode(doc.body);
  return doc.body.innerHTML;
}
