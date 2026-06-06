/**
 * AuntNancy.org — 3-Fix Patch
 * Run this in browser DevTools console on auntnancy.org
 * OR apply the CSS overrides via a <style> tag in your HTML
 *
 * FIX 1: Left-align fields (CSS override)
 * FIX 2: Move alerts above Save button (JS function replacement)
 * FIX 3: Stronger duplicate prevention (JS function replacement)
 */

// ─────────────────────────────────────────────
// FIX 1 — Left-align all case panel fields
// ─────────────────────────────────────────────
(function applyLeftAlignCSS() {
  const style = document.createElement('style');
  style.id = 'auntnancy-patch-css';
  style.textContent = `
    /* FIX 1: Left-align field labels and values */
    .cp-field {
      display: flex !important;
      align-items: flex-start !important;
      justify-content: flex-start !important;
      padding: 4px 0 !important;
      border-bottom: 1px solid #f0ebe0 !important;
      font-size: 13.5px !important;
      gap: 10px !important;
    }
    .cp-fl {
      color: #7a7163 !important;
      font-weight: 700 !important;
      font-size: 11px !important;
      text-transform: uppercase !important;
      letter-spacing: .08em !important;
      min-width: 110px !important;
      flex-shrink: 0 !important;
      text-align: left !important;
      padding-top: 2px !important;
    }
    .cp-fv {
      color: var(--ink) !important;
      flex: 1 !important;
      text-align: left !important;
      font-size: 13px !important;
    }
    .cp-fv input, .cp-fv select {
      text-align: left !important;
    }
    /* Also left-align the static grid fields inside case panel */
    #casePanelParent .cp-field,
    #casePanelKinship .cp-field {
      justify-content: flex-start !important;
    }
  `;
  // Remove old patch if re-running
  document.getElementById('auntnancy-patch-css')?.remove();
  document.head.appendChild(style);
  console.log('✅ FIX 1 applied: field labels left-aligned');
})();


// ─────────────────────────────────────────────
// FIX 2 — Move alerts ABOVE the Save button
// Patch renderCasePanel to reorder sections
// ─────────────────────────────────────────────
(function patchRenderCasePanel() {
  const orig = window.renderCasePanel;
  if (!orig) { console.warn('renderCasePanel not found'); return; }

  window.renderCasePanel = function(containerId) {
    // Call original
    orig(containerId);

    const el = document.getElementById(containerId);
    if (!el) return;

    // Find the alerts block and the actions bar
    // The alerts div has background:#fafafa and contains red/yellow dots
    // The actions bar has the Letters dropdown and AI Summary button
    // We need to move alerts to be the FIRST child of the actions bar wrapper

    // Re-render with correct order by patching the DOM
    const actionsBar = el.querySelector('[id^="lettersDrop"]')?.closest('div[style*="border-top:2px solid"]');
    if (!actionsBar) return;

    // Find the alerts container (sits just above the tabs in original output)
    // It's the div with background:#fafafa OR #eaf3ee right before cp-tabs
    const cpTabs = el.querySelector('.cp-tabs');
    if (!cpTabs) return;

    // The alerts block is the sibling just before cp-tabs
    let alertsBlock = cpTabs.previousElementSibling;
    if (!alertsBlock) return;

    // Check it looks like the alerts block
    const isAlertsBlock = alertsBlock.innerHTML.includes('🔴') || 
                          alertsBlock.innerHTML.includes('🟡') || 
                          alertsBlock.innerHTML.includes('Everything looks on track') ||
                          alertsBlock.style.background === '#fafafa' ||
                          alertsBlock.style.background === 'rgb(250, 250, 250)';

    if (!isAlertsBlock) return;

    // Move alerts to be the FIRST child inside actionsBar
    actionsBar.insertBefore(alertsBlock.cloneNode(true), actionsBar.firstChild);
    alertsBlock.remove();

    console.log('✅ FIX 2 applied: alerts moved above Save button');
  };

  console.log('✅ FIX 2 patched: renderCasePanel wrapped');
})();


// ─────────────────────────────────────────────
// FIX 3 — Block duplicates by first+last+dob
// (ignores middle name differences)
// ─────────────────────────────────────────────
(function patchDuplicateCheck() {
  const orig = window.doSavePlacement;
  if (!orig) { console.warn('doSavePlacement not found'); return; }

  window.doSavePlacement = function(fname, mname, lname, dob, name, closeAfter) {
    if (!window.editingPlacementId) {
      const list = getPlacements();
      const f = (fname || '').toLowerCase().trim();
      const l = (lname || '').toLowerCase().trim();

      // Check for existing record with same first + last + dob (middle name ignored)
      const duplicate = list.find(p =>
        p.fname && p.lname && p.dob &&
        p.fname.toLowerCase().trim() === f &&
        p.lname.toLowerCase().trim() === l &&
        p.dob === dob
      );

      if (duplicate) {
        if (!closeAfter) {
          // Auto-save mode: silently switch to editing existing record
          window.editingPlacementId = duplicate.id;
        } else {
          alert(
            `A placement record for ${name} (DOB: ${dob}) already exists.\n\n` +
            `To avoid duplicate records, please edit the existing entry.\n\n` +
            `Record ID: ${duplicate.id}`
          );
          return;
        }
      }
    }
    // Call original with same args
    orig.call(this, fname, mname, lname, dob, name, closeAfter);
  };

  console.log('✅ FIX 3 applied: duplicate prevention by first+last+dob');
})();


// ─────────────────────────────────────────────
// MERGE EXISTING DUPLICATES (run once)
// Finds Lyla duplicate and merges into one record
// ─────────────────────────────────────────────
window.mergeExistingDuplicates = function() {
  if (!currentUser) { console.warn('Not logged in'); return; }
  const list = getPlacements();
  const seen = new Map(); // "fname|lname|dob" => first record
  const toRemove = [];

  list.forEach(p => {
    const key = `${(p.fname||'').toLowerCase().trim()}|${(p.lname||'').toLowerCase().trim()}|${p.dob||''}`;
    if (!key || key === '||') return;
    if (seen.has(key)) {
      const existing = seen.get(key);
      // Merge: copy any non-empty fields from duplicate into existing
      Object.keys(p).forEach(k => {
        if (k === 'id' || k === 'createdAt') return;
        if (!existing[k] && p[k]) existing[k] = p[k];
        // Merge docs arrays
        if (k === 'docs') {
          existing.docs = [...new Set([...(existing.docs||[]), ...(p.docs||[])])];
        }
        // Merge case notes
        if (k === 'caseNotes' && p.caseNotes?.length) {
          existing.caseNotes = [...(existing.caseNotes||[]), ...p.caseNotes];
        }
      });
      toRemove.push(p.id);
      console.log(`Merging duplicate: "${p.name}" (${p.id}) into ${existing.id}`);
    } else {
      seen.set(key, p);
    }
  });

  if (!toRemove.length) {
    console.log('No duplicates found.');
    return;
  }

  const merged = list.filter(p => !toRemove.includes(p.id));
  savePlacements(merged);
  console.log(`✅ Merged ${toRemove.length} duplicate(s). Refreshing...`);
  renderPlacements();
  ['casePanelParent','casePanelKinship'].forEach(id => {
    const el = document.getElementById(id);
    if (el) renderCasePanel(id);
  });
};

console.log('\n🎉 All patches loaded!');
console.log('Run mergeExistingDuplicates() to clean up the existing Lyla duplicate.');
