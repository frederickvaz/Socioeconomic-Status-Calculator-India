/*******************************
 * BG PRASAD — your original logic (unchanged)
 *******************************/
let thresholds = {};

function calculateThresholds() {
  const cpi = document.getElementById('cpi').value;
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
      <h3>BG Prasad — ${month} ${year}</h3>
      <p>Class I: ≥ ${classILower}</p>
      <p>Class II: ${classIILower} – ${classIIUpper}</p>
      <p>Class III: ${classIIILower} – ${classIIIUpper}</p>
      <p>Class IV: ${classIVLower} – ${classIVUpper}</p>
      <p>Class V: ≤ ${classVUpper}</p>
  `;
}

function determineClass() {
  const income = document.getElementById('income').value;
  const classResultDiv = document.getElementById('classResult');
  const month = document.getElementById('month').value;
  const year = document.getElementById('year').value;

  if (!income) {
    alert('Please enter the Monthly Per Capita Income of the Family.');
    return;
  }

  let socioClass = '';

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
  } else {
    socioClass = 'Undefined';
  }

  classResultDiv.innerHTML = `
      <h3>BG Prasad Class — ${month} ${year}</h3>
      <p><strong>${socioClass}</strong></p>
  `;
}

/*******************************
 * SESSION SYNC + PCI STEP (BG)
 * - Sync CPI and Family Income across BG/KS while app is open
 * - Compute PCI from Total Income & Family Size and prefill #income
 *******************************/
const SYNC_KEYS = {
  CPI: "sync_cpi",
  FAMILY_INCOME: "sync_family_income",
};

function syncSet(key, val) {
  if (val === undefined || val === null || val === "") {
    sessionStorage.removeItem(key);
  } else {
    sessionStorage.setItem(key, String(val));
  }
}
function syncGet(key) {
  const v = sessionStorage.getItem(key);
  return v === null ? null : v;
}

function updateBGPCI() {
  const total = parseFloat(document.getElementById("totalIncomeBG")?.value || "");
  const size  = parseInt(document.getElementById("familySizeBG")?.value || "", 10);
  const note  = document.getElementById("pciBGNote");
  const pciBox = document.getElementById("income"); // existing BG PCI input

  if (!isNaN(total)) syncSet(SYNC_KEYS.FAMILY_INCOME, total);

  if (!note) return;
  if (isNaN(total) || isNaN(size) || size <= 0) {
    note.textContent = "Per-Capita Income (auto): —";
    return;
  }
  const pci = Math.floor(total / size);
  note.textContent = `Per-Capita Income (auto): ₹ ${pci.toLocaleString('en-IN')}`;
  if (pciBox) pciBox.value = String(pci); // prefill for BG classification
}

function wireCPISync() {
  const cpiBG = document.getElementById("cpi");     // BG CPI
  const cpiKS = document.getElementById("ks-cpi");  // KS CPI

  function propagate(from, to) {
    const v = from?.value;
    if (to && v !== undefined && v !== null && v !== "") to.value = v;
    const n = parseFloat(v);
    if (!isNaN(n)) syncSet(SYNC_KEYS.CPI, n);
  }

  cpiBG?.addEventListener("input", () => propagate(cpiBG, cpiKS));
  cpiKS?.addEventListener("input", () => propagate(cpiKS, cpiBG));

  // Prefill from session
  const saved = syncGet(SYNC_KEYS.CPI);
  if (saved !== null) {
    if (cpiBG) cpiBG.value = saved;
    if (cpiKS) cpiKS.value = saved;
  }
}

function wireIncomeSync() {
  const totalBG = document.getElementById("totalIncomeBG"); // family income (BG)
  const incKS   = document.getElementById("ks-income");     // family income (KS)

  function propagate(from, to) {
    const v = from?.value;
    if (to && v !== undefined && v !== null && v !== "") to.value = v;
    const n = parseFloat(v);
    if (!isNaN(n)) syncSet(SYNC_KEYS.FAMILY_INCOME, n);
  }

  totalBG?.addEventListener("input", () => {
    propagate(totalBG, incKS);
    updateBGPCI();
  });
  incKS?.addEventListener("input", () => propagate(incKS, totalBG));

  // Prefill from session
  const savedInc = syncGet(SYNC_KEYS.FAMILY_INCOME);
  if (savedInc !== null) {
    if (totalBG) totalBG.value = savedInc;
    if (incKS)   incKS.value   = savedInc;
    updateBGPCI();
  }
}

/*******************************
 * KUPPUSWAMY — Excel/JSON-driven
 * Uses /data/education.json, /data/occupation.json,
 * /data/income_bands.json, /data/total_score.json
 *******************************/
const KS_BASE_INDEX = 100; // 2016 base = 100

let KS_EDU = [];                 // [{label, score}]
let KS_OCC = [];                 // [{label, score}]
let KS_INC_BANDS_BASE = [];      // [{min, max|null, score}] base bands
let KS_TOTAL_SCORE_MAP = [];     // [{min, max|null, class}]

const INR = (n) => (typeof n === "number" && isFinite(n)) ? n.toLocaleString("en-IN") : "";
const N = (v) => {
  const x = parseFloat(String(v).replace(/,/g, ""));
  return isNaN(x) ? null : x;
};

async function ksLoadTables() {
  // adjust paths if you placed JSONs elsewhere
  const [edu, occ, inc, tot] = await Promise.all([
    fetch('data/education.json').then(r => r.json()),
    fetch('data/occupation.json').then(r => r.json()),
    fetch('data/income_bands.json').then(r => r.json()),
    fetch('data/total_score.json').then(r => r.json()),
  ]);
  KS_EDU = edu || [];
  KS_OCC = occ || [];
  KS_INC_BANDS_BASE = (inc || []).map(b => ({
    min: (typeof b.min === "number") ? b.min : null,
    max: (typeof b.max === "number") ? b.max : null,
    score: b.score
  })).sort((a,b)=> (b.min??0) - (a.min??0));
  KS_TOTAL_SCORE_MAP = tot || [];

  // Populate dropdowns
  const eduSel = document.getElementById('ks-education');
  const occSel = document.getElementById('ks-occupation');
  if (eduSel) eduSel.innerHTML = KS_EDU.map(o => `<option value="${o.score}">${o.label} — ${o.score}</option>`).join('');
  if (occSel) occSel.innerHTML = KS_OCC.map(o => `<option value="${o.score}">${o.label} — ${o.score}</option>`).join('');

  // Show selected scores inline
  const eduScoreDiv = document.getElementById('ks-edu-score');
  const occScoreDiv = document.getElementById('ks-occ-score');
  function updateEduScore() {
    const s = parseInt(eduSel?.value || "0", 10) || 0;
    if (eduScoreDiv) eduScoreDiv.textContent = `Education score: ${s}`;
  }
  function updateOccScore() {
    const s = parseInt(occSel?.value || "0", 10) || 0;
    if (occScoreDiv) occScoreDiv.textContent = `Occupation score: ${s}`;
  }
  eduSel?.addEventListener('change', updateEduScore);
  occSel?.addEventListener('change', updateOccScore);
  updateEduScore(); updateOccScore();

  // Render base rows initially
  ksRenderBandsTable(KS_INC_BANDS_BASE, null);
}

function ksScaleBands(currentIndex) {
  if (!currentIndex || currentIndex <= 0) return null;
  const ratio = currentIndex / KS_BASE_INDEX; // CPI / 100
  return KS_INC_BANDS_BASE.map(b => ({
    baseMin: b.min,
    baseMax: b.max,
    curMin: (typeof b.min === "number") ? Math.round(b.min * ratio) : null,
    curMax: (typeof b.max === "number") ? Math.round(b.max * ratio) : null,
    score: b.score
  })).sort((a,b)=> (b.curMin??0) - (a.curMin??0));
}

function ksRenderBandsTable(baseBands, scaledBands) {
  const tbody = document.getElementById('ks-bands-body');
  if (!tbody) return;
  const rows = (scaledBands || baseBands).map(row => {
    const baseMin = "baseMin" in row ? row.baseMin : row.min;
    const baseMax = "baseMax" in row ? row.baseMax : row.max;
    const curMin  = "curMin"  in row ? row.curMin  : null;
    const curMax  = "curMax"  in row ? row.curMax  : null;
    const score   = row.score;

    return `
      <tr>
        <td>₹ ${INR(baseMin)}</td>
        <td>${baseMax != null ? ("₹ " + INR(baseMax)) : "—"}</td>
        <td>${curMin  != null ? ("₹ " + INR(curMin )) : "—"}</td>
        <td>${curMax  != null ? ("₹ " + INR(curMax )) : "—"}</td>
        <td>${score}</td>
      </tr>
    `;
  }).join('');
  tbody.innerHTML = rows || `<tr><td colspan="5" class="note">No bands available.</td></tr>`;
}

function ksIncomeToScore(income, scaledBands) {
  if (!scaledBands || !scaledBands.length) return 0;
  for (const b of scaledBands) {
    const lo = (typeof b.curMin === "number") ? b.curMin : -Infinity;
    const hi = (typeof b.curMax === "number") ? b.curMax : Infinity;
    if (income >= lo && income <= hi) return b.score;
    if (b.curMax == null && income >= lo) return b.score; // open-ended top band
  }
  return 0;
}

function ksTotalToClass(totalScore) {
  for (const row of KS_TOTAL_SCORE_MAP) {
    const lo = (typeof row.min === "number") ? row.min : -Infinity;
    const hi = (typeof row.max === "number") ? row.max : Infinity;
    if (totalScore >= lo && totalScore <= hi) return row["class"];
  }
  return "Undefined";
}

/******** Kuppuswamy UI handlers ********/
function ksHandleRecalc() {
  const cpi = N(document.getElementById('ks-cpi')?.value);
  if (!cpi || cpi <= 0) { alert("Please enter a valid CPI-IW (2016=100)."); return; }
  const scaled = ksScaleBands(cpi);
  ksRenderBandsTable(KS_INC_BANDS_BASE, scaled);

  // sync CPI into BG
  const cpiBG = document.getElementById('cpi');
  if (cpiBG) cpiBG.value = String(cpi);
  syncSet(SYNC_KEYS.CPI, cpi);

  // Update income score preview if value present
  const inc = N(document.getElementById('ks-income')?.value);
  if (inc != null && inc >= 0) {
    const incScore = ksIncomeToScore(inc, scaled);
    const incDiv = document.getElementById('ks-inc-score');
    if (incDiv) incDiv.textContent = `Income score (at CPI ${cpi}): ${incScore}`;
  }
}

function ksLiveIncomeScore() {
  const cpi = N(document.getElementById('ks-cpi')?.value);
  const inc = N(document.getElementById('ks-income')?.value);
  const incDiv = document.getElementById('ks-inc-score');
  if (!incDiv) return;
  if (!cpi || cpi <= 0 || inc == null || inc < 0) { incDiv.textContent = ""; return; }
  const scaled = ksScaleBands(cpi);
  const s = ksIncomeToScore(inc, scaled);
  incDiv.textContent = `Income score (at CPI ${cpi}): ${s}`;
}

function ksCalcTotal() {
  const cpi = N(document.getElementById('ks-cpi')?.value);
  if (!cpi || cpi <= 0) { alert("Enter CPI-IW first."); return; }
  const scaled = ksScaleBands(cpi);

  const eduScore = parseInt(document.getElementById('ks-education')?.value || "0", 10) || 0;
  const occScore = parseInt(document.getElementById('ks-occupation')?.value || "0", 10) || 0;
  const inc = N(document.getElementById('ks-income')?.value);
  if (inc == null || inc < 0) { alert("Enter a valid total monthly family income."); return; }
  const incScore = ksIncomeToScore(inc, scaled);

  // sync family income into BG
  const totalBG = document.getElementById('totalIncomeBG');
  if (totalBG) totalBG.value = String(inc);
  syncSet(SYNC_KEYS.FAMILY_INCOME, inc);
  updateBGPCI();

  const total = eduScore + occScore + incScore;
  const klass = ksTotalToClass(total);

  const out = document.getElementById('ks-output');
  if (out) {
    out.innerHTML = `
      <h3>Kuppuswamy Result</h3>
      <p><strong>Education score:</strong> ${eduScore}</p>
      <p><strong>Occupation score:</strong> ${occScore}</p>
      <p><strong>Income score (at CPI ${cpi}):</strong> ${incScore}</p>
      <p><strong>Total score:</strong> ${total}</p>
      <p><strong>Socio-economic class:</strong> ${klass}</p>
    `;
  }
}

/*******************************
 * INIT — Wire up everything
 *******************************/
document.addEventListener('DOMContentLoaded', () => {
  // BG: PCI step inputs
  document.getElementById("totalIncomeBG")?.addEventListener("input", updateBGPCI);
  document.getElementById("familySizeBG")?.addEventListener("input", updateBGPCI);

  // Cross-page sync
  wireCPISync();
  wireIncomeSync();

  // Kuppuswamy tables & handlers
  ksLoadTables().catch(err => console.error("Failed to load Kuppuswamy tables:", err));
  document.getElementById('ks-update-bands')?.addEventListener('click', ksHandleRecalc);
  document.getElementById('ks-income')?.addEventListener('input', ksLiveIncomeScore);
  document.getElementById('ks-calc-total')?.addEventListener('click', ksCalcTotal);
});
