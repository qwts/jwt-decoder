import { decode, extractTimestampClaims } from './jwt-decoder.js';
import { highlight }                       from './json-formatter.js';

// ─── Raw-text store ───────────────────────────────────────────────────────────
// Keeps the plain JSON string for each output block so Copy knows what to
// put on the clipboard without having to strip HTML from innerHTML.
const rawTextStore = new Map();

// ─── DOM helpers ─────────────────────────────────────────────────────────────

/** @param {string} id @returns {HTMLElement} */
function el(id) { return document.getElementById(id); }

// ─── Rendering ───────────────────────────────────────────────────────────────

/**
 * Writes syntax-highlighted JSON into a <pre> element and caches the raw text.
 *
 * @param {HTMLPreElement} pre
 * @param {object}         data
 */
function renderJson(pre, data) {
  pre.innerHTML = highlight(data);
  rawTextStore.set(pre.id, JSON.stringify(data, null, 2));
}

/**
 * Writes the signature string (plain, no highlighting) into a <pre> element.
 *
 * @param {HTMLPreElement} pre
 * @param {string}         signature
 */
function renderSignature(pre, signature) {
  pre.textContent = signature;
  rawTextStore.set(pre.id, signature);
}

/**
 * Populates the claims panel with human-readable timestamp information for
 * the well-known JWT claims iat, exp, and nbf.
 * The panel is emptied (and hidden via CSS :empty) when there are no claims.
 *
 * @param {HTMLDivElement} panel
 * @param {object}         payload
 */
function renderClaimsPanel(panel, payload) {
  const claims = extractTimestampClaims(payload);

  if (claims.length === 0) {
    panel.innerHTML = '';
    return;
  }

  panel.innerHTML = claims
    .map(({ field, date, isExpired, isValid }) => {
      const badge = isExpired
        ? '<span class="claim-badge claim-badge--expired">Expired</span>'
        : isValid
        ? '<span class="claim-badge claim-badge--valid">Valid</span>'
        : '';

      return `<div class="claim-row">
        <span class="claim-field">${field}</span>
        <span class="claim-date">${date.toUTCString()}</span>
        ${badge}
      </div>`;
    })
    .join('');
}

// ─── Event handlers ───────────────────────────────────────────────────────────

/**
 * Reacts to changes in the JWT input field.
 * On success: renders decoded sections and hides the error.
 * On failure: shows the error message and hides decoded sections.
 *
 * @param {HTMLTextAreaElement} input
 * @param {Record<string, HTMLElement>} els
 */
function handleInput(input, els) {
  const token = input.value.trim();

  if (!token) {
    els.clearBtn.hidden    = true;
    els.outputPanel.hidden = true;
    els.errorMsg.hidden    = true;
    return;
  }

  els.clearBtn.hidden = false;

  try {
    const { header, payload, signature } = decode(token);

    renderJson(els.headerOutput, header);
    renderJson(els.payloadOutput, payload);
    renderSignature(els.signatureOutput, signature);
    renderClaimsPanel(els.claimsPanel, payload);

    els.errorMsg.hidden    = true;
    els.outputPanel.hidden = false;
  } catch (err) {
    els.errorMsg.textContent = err.message;
    els.errorMsg.hidden      = false;
    els.outputPanel.hidden   = true;
  }
}

/**
 * Copies the raw text for the target block to the clipboard.
 * Provides brief visual feedback on the button ("Copied!" / "Error").
 *
 * @param {HTMLButtonElement} btn
 */
async function handleCopy(btn) {
  const text = rawTextStore.get(btn.dataset.copyTarget) ?? '';

  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = 'Copied!';
    btn.classList.add('is-copied');
  } catch {
    btn.textContent = 'Error';
  } finally {
    setTimeout(() => {
      btn.textContent = 'Copy';
      btn.classList.remove('is-copied');
    }, 1500);
  }
}

// ─── Initialisation ───────────────────────────────────────────────────────────

/**
 * Wires up all event listeners. Call once after DOMContentLoaded.
 */
export function init() {
  const jwtInput       = el('jwt-input');
  const clearBtn       = el('clear-btn');
  const outputPanel    = el('output-panel');
  const errorMsg       = el('error-msg');
  const headerOutput   = el('header-output');
  const payloadOutput  = el('payload-output');
  const signatureOutput = el('signature-output');
  const claimsPanel    = el('claims-panel');

  const els = {
    clearBtn,
    outputPanel,
    errorMsg,
    headerOutput,
    payloadOutput,
    signatureOutput,
    claimsPanel,
  };

  // Decode on every keystroke / paste
  jwtInput.addEventListener('input', () => handleInput(jwtInput, els));

  // Clear button resets everything
  clearBtn.addEventListener('click', () => {
    jwtInput.value         = '';
    clearBtn.hidden        = true;
    outputPanel.hidden     = true;
    errorMsg.hidden        = true;
    jwtInput.focus();
  });

  // Copy buttons — handled via event delegation on the document
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('copy-btn')) {
      handleCopy(e.target);
    }
  });
}
