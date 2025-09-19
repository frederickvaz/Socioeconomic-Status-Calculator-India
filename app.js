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







