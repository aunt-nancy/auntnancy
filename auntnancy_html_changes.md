# AuntNancy.org — 3 Targeted HTML Changes

Apply these exact find-and-replace operations in your index.html file.

---

## CHANGE 1 of 3 — Left-align field labels + values (CSS)

### FIND (exact text):
```
.cp-field{display:flex;align-items:center;justify-content:space-between;padding:3px 0;border-bottom:1px solid #f0ebe0;font-size:14.0px;gap:10px}
.cp-field:last-child{border-bottom:none}
.cp-fl{color:#7a7163;font-weight:700;font-size:13.5px;text-transform:uppercase;letter-spacing:.08em;min-width:100px;flex-shrink:0}
.cp-fv{color:var(--ink);flex:1;text-align:right;font-size:15.5px}
.cp-fv input,.cp-fv select{padding:5px 8px;border:1px solid var(--border);border-radius:4px;font-family:'DM Sans',sans-serif;font-size:14.5px;width:100%;max-width:200px;text-align:right;background:white}
```

### REPLACE WITH:
```
.cp-field{display:flex;align-items:flex-start;justify-content:flex-start;padding:4px 0;border-bottom:1px solid #f0ebe0;font-size:13.5px;gap:10px}
.cp-field:last-child{border-bottom:none}
.cp-fl{color:#7a7163;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.08em;min-width:110px;flex-shrink:0;padding-top:2px}
.cp-fv{color:var(--ink);flex:1;text-align:left;font-size:13px}
.cp-fv input,.cp-fv select{padding:5px 8px;border:1px solid var(--border);border-radius:4px;font-family:'DM Sans',sans-serif;font-size:13px;width:100%;max-width:220px;text-align:left;background:white}
```

---

## CHANGE 2 of 3 — Move alerts ABOVE the Save button

### FIND this entire block (the alerts rendered between tabs and panes):
```
    <!-- ACTION ALERTS — below tabs -->
    ${(()=>{const alerts=getCaseAlerts(p);if(!alerts.length) return p.name?`<div style="background:#eaf3ee;border-left:3px solid var(--sage);padding:7px 12px;font-size:11px;color:#1a4d36">✓ Everything looks on track for ${p.name}.</div>`:'';return `<div style="display:flex;flex-direction:column;gap:3px;padding:7px 10px;background:#fafafa;border-bottom:1px solid var(--border)">${alerts.map(a=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:10.5px;padding:4px 7px;border-radius:3px;background:${a.level==='red'?'#fdf3f2':'#fffbec'}">${a.level==='red'?'🔴':'🟡'} ${a.msg}${a.action?`<button onclick="${a.action}" style="background:${a.level==='red'?'#c0392b':'var(--gold)'};color:white;border:none;padding:2px 8px;border-radius:3px;font-family:'DM Sans',sans-serif;font-size:9.5px;font-weight:700;cursor:pointer;flex-shrink:0">${a.label}</button>`:''}</div>`).join('')}</div>`;})()}
```

### REPLACE WITH: (empty string — delete it entirely)
```
```
(Delete that whole block.)

### THEN FIND the Letters & Actions bar opening:
```
    <!-- LETTERS & ACTIONS BAR — bottom of panel, above save -->
    ${p.name?`<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--cream);border-top:2px solid var(--border);flex-wrap:wrap">
```

### REPLACE WITH:
```
    <!-- LETTERS & ACTIONS BAR — bottom of panel, above save -->
    ${p.name?`<div style="background:var(--cream);border-top:2px solid var(--border)">
      ${(()=>{const alerts=getCaseAlerts(p);if(!alerts.length)return `<div style="background:#eaf3ee;border-left:3px solid var(--sage);padding:7px 12px;font-size:11px;color:#1a4d36">✓ Everything looks on track for ${p.name}.</div>`;return `<div style="display:flex;flex-direction:column;gap:3px;padding:7px 10px;background:#fafafa;border-bottom:1px solid var(--border)">${alerts.map(a=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:10.5px;padding:4px 7px;border-radius:3px;background:${a.level==='red'?'#fdf3f2':'#fffbec'}">${a.level==='red'?'🔴':'🟡'} ${a.msg}${a.action?`<button onclick="${a.action}" style="background:${a.level==='red'?'#c0392b':'var(--gold)'};color:white;border:none;padding:2px 8px;border-radius:3px;font-family:'DM Sans',sans-serif;font-size:9.5px;font-weight:700;cursor:pointer;flex-shrink:0">${a.label}</button>`:''}</div>`).join('')}</div>`;})()}
      <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;flex-wrap:wrap">
```

### AND FIND the closing of that div (at very end of the letters bar):
```
    </div>`:''}`;
```

### REPLACE WITH (one extra closing div for the new wrapper):
```
      </div>
    </div>`:''}`;
```

---

## CHANGE 3 of 3 — Stronger duplicate prevention

### FIND:
```
  if(!editingPlacementId){
    const exists = list.find(p => p.id === compositeKey);
    if(exists){
      // If auto-saving, silently switch to edit mode instead of alerting
      if(!closeAfter){ editingPlacementId=compositeKey; }
      else { alert(`A placement for ${name} (DOB: ${dob}) already exists. Edit the existing record instead.`); return; }
    }
  }
```

### REPLACE WITH:
```
  if(!editingPlacementId){
    const f = fname.toLowerCase().trim();
    const l = lname.toLowerCase().trim();
    const exists = list.find(p =>
      p.id === compositeKey ||
      (p.fname && p.lname && p.dob &&
       p.fname.toLowerCase().trim() === f &&
       p.lname.toLowerCase().trim() === l &&
       p.dob === dob)
    );
    if(exists){
      // If auto-saving, silently switch to edit mode instead of creating duplicate
      if(!closeAfter){ editingPlacementId = exists.id; }
      else { alert(`A placement for ${name} (DOB: ${dob}) already exists.\n\nEdit the existing record to avoid duplicates.`); return; }
    }
  }
```

---

## BONUS — Merge the existing Lyla duplicate (run once in browser console)

Open DevTools (F12) → Console tab → paste and run:

```javascript
// Run after logging in as yourself
const list = getPlacements();
console.log('Current placements:', list.map(p => ({id:p.id, name:p.name, dob:p.dob})));

// If you see two Lyla records, run this to merge them:
const seen = new Map();
const toRemove = [];
list.forEach(p => {
  const key = `${(p.fname||'').toLowerCase().trim()}|${(p.lname||'').toLowerCase().trim()}|${p.dob||''}`;
  if (!key || key === '||') return;
  if (seen.has(key)) {
    const existing = seen.get(key);
    Object.keys(p).forEach(k => {
      if (k === 'id' || k === 'createdAt') return;
      if (!existing[k] && p[k]) existing[k] = p[k];
      if (k === 'docs') existing.docs = [...new Set([...(existing.docs||[]), ...(p.docs||[])])];
    });
    toRemove.push(p.id);
  } else { seen.set(key, p); }
});
const merged = list.filter(p => !toRemove.includes(p.id));
savePlacements(merged);
console.log('Merged. Duplicates removed:', toRemove);
location.reload();
```
