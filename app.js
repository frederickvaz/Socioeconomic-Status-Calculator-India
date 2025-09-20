/* =========================
   BG PRASAD (your current logic kept intact)
   ========================= */
let thresholds = {};

/* ---------- BG PRASAD: unchanged calculation ---------- */
function calculateThresholds() {
  const cpi = Number(document.getElementById('cpi').value);
  const month = document.getElementById('month').value;
  const year = document.getElementById('year').value;
  const resultDiv = document.getElementById('result');

  if (!cpi) {
    alert('Please enter the CPI value.');
    return;
  }

  const FACTOR = 2.88 * 4.63 * 4.93;

  const classILower  = Math.round(100 * (cpi / 100) * FACTOR);
  const classIUpper  = Infinity;

  const classIILower = Math.round( 50 * (cpi / 100) * FACTOR);
  const classIIUpper = classILower - 1;

  const classIIILower = Math.round(30 * (cpi / 100) * FACTOR);
  const classIIIUpper = classIILower - 1;

  const classIVLower = Math.round(15 * (cpi / 100) * FACTOR);
  const classIVUpper = classIIILower - 1;

  const classVUpper  = classIVLower - 1;

  thresholds = {
    classILower,
    classIIUpper,
    classIILower,
    classIIIUpper,
    classIIILower,
    classIVUpper,
    classIVLower,
    classVUpper
  };

  resultDiv.innerHTML = `
    <h2>Updated BG Prasad Socio-economic Scale for ${month} ${year}</h2>
    <p>Class I: &ge; ${classILower}</p>
    <p>Class II: ${classIILower} - ${classIIUpper}</p>
    <p>Class III: ${classIIILower} - ${classIIIUpper}</p>
    <p>Class IV: ${classIVLower} - ${classIVUpper}</p>
    <p>Class V: &le; ${classVUpper}</p>
  `;
}

function determineClass() {
  const income = Number(document.getElementById('income').value);
  const classResultDiv = document.getElementById('classResult');
  const month = document.getElementById('month').value;
  const year = document.getElementById('year').value;

  if (!income) {
    alert('Please enter the Monthly Per Capita Income of the Family (auto-calculated above).');
    return;
  }

  let socioClass = 'Undefined';

  if (income >= thresholds.classILower) {
    socioClass = 'Class I';
  } else if (income >= thresholds.classIILower && income <= thresholds.classIIUpper) {
    socioClass = 'Class II';
  } else if (income >= thresholds.classIIILower && income <= thresholds.classIIIUpper) {
    socioClass = 'Class III';
  } else if (income >= thresholds.classIVLower && income <= thresholds.classIVUpper) {
    socioClass = 'Class IV';
  } else if (income <= thresholds.classVUpper) {
    socioClass = 'Class V';
  }

  classResultDiv.innerHTML = `
    <h2>BG Prasad Socio-economic Class for ${month} ${year}</h2>
    <p>The family falls under: <strong>${socioClass}</strong></p>
  `;
}

/* ---------- NEW: PCI auto-calc (Total Income ÷ Family Members) ---------- */
(function () {
  function toNum(v) {
    const x = parseFloat((v ?? '').toString().replace(/,/g, ''));
    return isNaN(x) ? null : x;
  }

  function updateBGPCI() {
    const total = toNum(document.getElementById('totalIncomeBG')?.value);
    const size  = parseInt(document.getElementById('familySizeBG')?.value || '', 10);
    const note  = document.getElementById('pciBGNote');
    const pciBox = document.getElementById('income'); // readonly display field

    if (!note) return;

    if (total === null || !size || size <= 0) {
      note.textContent = 'Per-Capita Income (auto-calculated): —';
      if (pciBox) pciBox.value = '';
      return;
    }

    const pci = Math.floor(total / size);
    note.textContent = 'Per-Capita Income (auto-calculated): ₹ ' + pci.toLocaleString('en-IN');

    // fill the existing (readonly) PCI input so your original logic works unchanged
    if (pciBox) pciBox.value = String(pci);
  }

  document.addEventListener('DOMContentLoaded', () => {
    // enforce readonly in case HTML is edited later
    const pciBox = document.getElementById('income');
    if (pciBox) pciBox.readOnly = true;

    // wire the two inputs for live PCI calculation
    document.getElementById('totalIncomeBG')?.addEventListener('input', updateBGPCI);
    document.getElementById('familySizeBG')?.addEventListener('input', updateBGPCI);
  });
})();

/* =========================
   KUPPUSWAMY (new)
   ========================= */

/* CPI base */
const KS_BASE_INDEX = 100; // 2016=100

/* Editable base income bands (₹, base 2016) with scores (highest to lowest).
   Update these to your official base values if you have them. */
const KS_INC_BASE = [
  { min: 52000, max: null, score: 12 },     // ≥ 52,000
  { min: 26000, max: 51999, score: 10 },    // 26,000 – 51,999
  { min: 20000, max: 25999, score: 6 },     // 20,000 – 25,999
  { min: 14000, max: 19999, score: 4 },     // 14,000 – 19,999
  { min: 8000,  max: 13999, score: 3 },     // 8,000 – 13,999
  { min: 3000,  max: 7999,  score: 2 },     // 3,000 – 7,999
  { min: 0,     max: 2999,  score: 1 },     // ≤ 2,999
];

/* Education (standard Kuppuswamy scoring) */
const KS_EDU = [
  { label: "Professional or Honours", score: 7 },
  { label: "Graduate or Postgraduate", score: 6 },
  { label: "Intermediate or Post High School Diploma", score: 5 },
  { label: "High School Certificate", score: 4 },
  { label: "Middle School Certificate", score: 3 },
  { label: "Primary School Certificate", score: 2 },
  { label: "Illiterate", score: 1 },
];

/* Occupation (standard Kuppuswamy scoring) */
const KS_OCC = [
  { label: "Profession", score: 10 },
  { label: "Semi-Profession", score: 6 },
  { label: "Clerical/Shop-owner/Farmer", score: 5 },
  { label: "Skilled Worker", score: 4 },
  { label: "Semi-skilled Worker", score: 3 },
  { label: "Unskilled Worker", score: 2 },
  { label: "Unemployed", score: 1 },
];

/* Total score → Class */
const KS_CLASS_MAP = [
  { min: 26, max: 29, class: "Upper (I)" },
  { min: 16, max: 25, class: "Upper Middle (II)" },
  { min: 11, max: 15, class: "Lower Middle (III)" },
  { min: 5,  max: 10, class: "Upper Lower (IV)" },
  { min: 3,  max: 4,  class: "Lower (V)" },
];

function inr(n){ return (typeof n === "number" && isFinite(n)) ? n.toLocaleString("en-IN") : "—"; }
function toNum(v){ const x = parseFloat((v ?? '').toString().replace(/,/g, '')); return isNaN(x) ? null : x; }

function ksScaleBands(cpi) {
  const ratio = cpi / KS_BASE_INDEX; // CPI / 100
  return KS_INC_BASE.map(b => ({
    baseMin: b.min,
    baseMax: b.max,
    curMin: Math.round(b.min * ratio),
    curMax: (b.max == null ? null : Math.round(b.max * ratio)),
    score: b.score
  }));
}

function ksRenderBandsTable(scaled, month, year) {
  const tbody = document.getElementById('ks-bands-body');
  if (!tbody) return;
  const rows = scaled.map(r => `
    <tr>
      <td>₹ ${inr(r.baseMin)}</td>
      <td>${r.baseMax != null ? ('₹ ' + inr(r.baseMax)) : '—'}</td>
      <td>₹ ${inr(r.curMin)}</td>
      <td>${r.curMax != null ? ('₹ ' + inr(r.curMax)) : '—'}</td>
      <td>${r.score}</td>
    </tr>
  `).join('');
  tbody.innerHTML = rows || `<tr><td colspan="5" class="helper-note">No bands.</td></tr>`;
}

function ksIncomeToScore(income, scaled) {
  if (!scaled || !scaled.length) return 0;
  for (const b of scaled) {
    const lo = (typeof b.curMin === "number") ? b.curMin : -Infinity;
    const hi = (typeof b.curMax === "number") ? b.curMax : Infinity;
    if (income >= lo && income <= hi) return b.score;
    if (b.curMax == null && income >= lo) return b.score; // open-ended top band
  }
  return 0;
}

function ksTotalToClass(total) {
  for (const r of KS_CLASS_MAP) {
    if (total >= r.min && total <= r.max) return r.class;
  }
  return "Undefined";
}

/* Wire up Kuppuswamy page */
document.addEventListener('DOMContentLoaded', () => {
  // Populate education & occupation dropdowns
  const eduSel = document.getElementById('ks-education');
  const occSel = document.getElementById('ks-occupation');
  if (eduSel) eduSel.innerHTML = KS_EDU.map(o => `<option value="${o.score}">${o.label} — ${o.score}</option>`).join('');
  if (occSel) occSel.innerHTML = KS_OCC.map(o => `<option value="${o.score}">${o.label} — ${o.score}</option>`).join('');

  const eduScoreP = document.getElementById('ks-edu-score');
  const occScoreP = document.getElementById('ks-occ-score');
  const updEdu = () => { const s = parseInt(eduSel?.value || "0", 10)||0; if (eduScoreP) eduScoreP.textContent = `Education score: ${s}`; };
  const updOcc = () => { const s = parseInt(occSel?.value || "0", 10)||0; if (occScoreP) occScoreP.textContent = `Occupation score: ${s}`; };
  eduSel?.addEventListener('change', updEdu); occSel?.addEventListener('change', updOcc); updEdu(); updOcc();

  // Update bands on button click
  document.getElementById('ks-update-bands')?.addEventListener('click', () => {
    const cpi = toNum(document.getElementById('ks-cpi')?.value);
    const month = document.getElementById('ks-month')?.value || '-';
    const year  = document.getElementById('ks-year')?.value || '-';
    if (!cpi || cpi <= 0) { alert('Please enter a valid CPI-IW (2016=100).'); return; }
    const scaled = ksScaleBands(cpi);
    ksRenderBandsTable(scaled, month, year);

    // recompute income score if an income is already typed
    const inc = toNum(document.getElementById('ks-income')?.value);
    const incP = document.getElementById('ks-inc-score');
    if (incP && inc != null) incP.textContent = `Income score (at CPI ${cpi}): ${ksIncomeToScore(inc, scaled)}`;
  });

  // Live income score while typing
  document.getElementById('ks-income')?.addEventListener('input', () => {
    const cpi = toNum(document.getElementById('ks-cpi')?.value);
    const inc = toNum(document.getElementById('ks-income')?.value);
    const incP = document.getElementById('ks-inc-score');
    if (!incP) return;
    if (!cpi || cpi <= 0 || inc == null || inc < 0) { incP.textContent = ''; return; }
    const scaled = ksScaleBands(cpi);
    incP.textContent = `Income score (at CPI ${cpi}): ${ksIncomeToScore(inc, scaled)}`;
  });

  // Calculate total score & class
  document.getElementById('ks-calc-total')?.addEventListener('click', () => {
    const out = document.getElementById('ks-output');
    if (!out) return;

    const cpi = toNum(document.getElementById('ks-cpi')?.value);
    if (!cpi || cpi <= 0) { alert('Enter CPI-IW and update income levels first.'); return; }
    const scaled = ksScaleBands(cpi);

    const eduScore = parseInt(document.getElementById('ks-education')?.value || "0", 10) || 0;
    const occScore = parseInt(document.getElementById('ks-occupation')?.value || "0", 10) || 0;
    const inc = toNum(document.getElementById('ks-income')?.value);
    if (inc == null || inc < 0) { alert('Enter a valid total monthly family income.'); return; }
    const incScore = ksIncomeToScore(inc, scaled);

    const total = eduScore + occScore + incScore;
    const klass = ksTotalToClass(total);

    out.innerHTML = `
      <h3>Kuppuswamy Result</h3>
      <p><strong>Education score:</strong> ${eduScore}</p>
      <p><strong>Occupation score:</strong> ${occScore}</p>
      <p><strong>Income score (at CPI ${cpi}):</strong> ${incScore}</p>
      <p><strong>Total score:</strong> ${total}</p>
      <p><strong>Socio-economic class:</strong> ${klass}</p>
    `;
  });
});









