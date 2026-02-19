/**
 * Converts a base64url-encoded segment to a parsed JSON object.
 *
 * Base64url differs from standard base64 in two ways:
 *   - Uses '-' instead of '+'
 *   - Uses '_' instead of '/'
 *   - Omits padding ('=')
 *
 * The TextDecoder path handles JWT payloads that contain non-ASCII
 * characters (e.g. UTF-8 encoded names or claims).
 *
 * @param {string} base64url
 * @returns {object}
 * @throws {Error}
 */
function decodeSegment(base64url) {
  const base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(base64url.length / 4) * 4, '=');

  try {
    const binaryString = atob(base64);
    const bytes = Uint8Array.from(binaryString, (c) => c.charCodeAt(0));
    const text = new TextDecoder('utf-8').decode(bytes);
    return JSON.parse(text);
  } catch {
    throw new Error('Could not decode segment — it may not be valid base64url JSON.');
  }
}

/**
 * Decodes a JWT string into its three constituent parts.
 *
 * @param {string} token - Raw JWT string (may include surrounding whitespace)
 * @returns {{ header: object, payload: object, signature: string }}
 * @throws {Error} When the token format is invalid or a segment cannot be decoded
 */
export function decode(token) {
  const parts = token.trim().split('.');

  if (parts.length !== 3) {
    throw new Error(
      `Invalid JWT: expected 3 dot-separated segments, got ${parts.length}.`
    );
  }

  const [headerB64, payloadB64, signature] = parts;

  return {
    header:    decodeSegment(headerB64),
    payload:   decodeSegment(payloadB64),
    signature,
  };
}

/**
 * Extracts well-known numeric timestamp claims from a JWT payload and
 * returns them in a display-ready form.
 *
 * Recognised claims: iat (Issued At), exp (Expires), nbf (Not Before).
 *
 * @param {object} payload
 * @returns {Array<{ field: string, label: string, date: Date, isExpired: boolean, isValid: boolean }>}
 */
export function extractTimestampClaims(payload) {
  const KNOWN = {
    iat: 'Issued At',
    exp: 'Expires',
    nbf: 'Not Before',
  };

  const now = Date.now();

  return Object.entries(KNOWN)
    .filter(([field]) => typeof payload[field] === 'number')
    .map(([field, label]) => {
      const date = new Date(payload[field] * 1000);
      const isExpired = field === 'exp' && date.getTime() < now;
      const isValid   = field === 'exp' && date.getTime() >= now;
      return { field, label, date, isExpired, isValid };
    });
}
