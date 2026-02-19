/**
 * Regex that tokenises a JSON string produced by JSON.stringify.
 *
 * It matches (in order of alternation):
 *   1. A quoted string optionally followed by whitespace + colon → key or string value
 *   2. JSON keywords: true | false | null
 *   3. JSON numbers (integer, decimal, exponential)
 *
 * This regex is intentionally applied to the raw JSON string (before HTML
 * escaping) so that match indices stay correct. HTML escaping is applied
 * individually to each matched and unmatched slice.
 */
const TOKEN_PATTERN =
  /"(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

/**
 * Escapes the three HTML special characters that can appear in raw JSON:
 * & < >
 * (Quotes inside a <pre> content context do not need escaping.)
 *
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Maps a matched JSON token to its CSS class name.
 *
 * Key detection: JSON.stringify always emits keys as `"keyName":` (with
 * optional whitespace before the colon), so we check whether the token's
 * trimmed tail ends with ':'.
 *
 * @param {string} token
 * @returns {string}
 */
function tokenClass(token) {
  if (token.startsWith('"')) {
    return token.trimEnd().endsWith(':') ? 'json-key' : 'json-string';
  }
  if (token === 'true' || token === 'false') return 'json-boolean';
  if (token === 'null')                      return 'json-null';
  return 'json-number';
}

/**
 * Converts a JSON-serialisable value to a syntax-highlighted HTML string
 * that is safe to assign to `element.innerHTML`.
 *
 * Strategy:
 *   - Serialise the value with JSON.stringify for consistent pretty-printing.
 *   - Walk the string with TOKEN_PATTERN, wrapping each token in a <span>.
 *   - HTML-escape every slice (matched and unmatched) to prevent XSS.
 *
 * @param {unknown} value - Any JSON-serialisable value
 * @returns {string} HTML string
 */
export function highlight(value) {
  const raw = JSON.stringify(value, null, 2);

  let output    = '';
  let lastIndex = 0;
  let match;

  // Reset the regex's stateful lastIndex before iterating
  TOKEN_PATTERN.lastIndex = 0;

  while ((match = TOKEN_PATTERN.exec(raw)) !== null) {
    // Structural characters between tokens (braces, brackets, commas, whitespace)
    output += escapeHtml(raw.slice(lastIndex, match.index));

    // The token itself, highlighted
    output += `<span class="${tokenClass(match[0])}">${escapeHtml(match[0])}</span>`;

    lastIndex = TOKEN_PATTERN.lastIndex;
  }

  // Any trailing structural characters after the last token
  output += escapeHtml(raw.slice(lastIndex));

  return output;
}
