import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Use this everywhere dangerouslySetInnerHTML is used with user-generated content.
 */
export function sanitizeHtml(dirty) {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'i', 'u', 's', 'strong', 'em',
      'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'pre', 'code',
      'a', 'span', 'div',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'hr',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style', 'colspan', 'rowspan'],
    ADD_ATTR: ['target'],
    FORCE_BODY: false,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}

/**
 * Safe wrapper for dangerouslySetInnerHTML.
 * Usage: <div {...safeHtml(content)} />
 */
export function safeHtml(dirty) {
  return { dangerouslySetInnerHTML: { __html: sanitizeHtml(dirty) } };
}
