import { $, $$ } from '../dom.js';
import { state, setFormulaTab } from '../state.js';
import { openLogModal } from '../record-modal.js';
import {
  calculateAge,
  standardBmi,
  oxfordBmi,
  bmiPrime,
  getBmiCategory,
  deurenbergBodyFat,
  gallagherBodyFat,
  cunBaeBodyFat,
  calculateBodyComposition,
  calculateIdealBodyWeight,
  mifflinStJeorBmr,
  revisedHarrisBenedictBmr,
  calculateTdee,
  waistToHipRatio,
  waistToHeightRatio,
  navyBodyFat,
  getWhrCategory,
  getWhtrCategory
} from '../formulas.js';

export function renderFormulas() {
  const records = state.records;
  const p = state.profile;
  const container = $('#formula-cards-container');
  if (!container) return;

  if (!p || !p.heightCm || records.length === 0) {
    container.innerHTML = `
      <div class="formula-table-card" style="grid-column: 1/-1; text-align: center; color: var(--color-text-muted); padding: 2.5rem 1rem;">
        Add profile details (height, age, sex) and log weight to unlock multi-formula analysis.
      </div>
    `;
    return;
  }

  const latestWeight = records[records.length - 1].weight;
  const age = calculateAge(p.birthDate);
  const sex = p.sex;
  const heightCm = p.heightCm;

  // BMI calculations
  const stdBmi = standardBmi(latestWeight, heightCm);
  const nBmi = oxfordBmi(latestWeight, heightCm);
  const prime = bmiPrime(stdBmi);
  const category = getBmiCategory(stdBmi);

  // Body Fat calculations
  const bfDeurenberg = deurenbergBodyFat(stdBmi, age, sex);
  const bfGallagher = gallagherBodyFat(stdBmi, age, sex);
  const bfCunBae = cunBaeBodyFat(stdBmi, age, sex);
  const compDeurenberg = calculateBodyComposition(latestWeight, bfDeurenberg);

  // Ideal Body Weight calculations
  const ibw = calculateIdealBodyWeight(heightCm, sex);

  // BMR & TDEE
  const bmrMifflin = mifflinStJeorBmr(latestWeight, heightCm, age, sex);
  const bmrHarris = revisedHarrisBenedictBmr(latestWeight, heightCm, age, sex);
  const tdee = calculateTdee(bmrMifflin);

  const activeTab = state.formulaTab || 'all';

  const bmiCard = `
    <div class="formula-table-card">
      <div class="formula-table-card-header">
        <h3>⚖️ Body Mass Index (BMI)</h3>
        <span class="badge ${category.badgeClass}">${category.category}</span>
      </div>
      <table class="formula-table">
        <thead>
          <tr>
            <th>Formula / Metric</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <span class="formula-name">Standard WHO BMI</span>
              <span class="formula-note">Clinical standard: Weight (kg) / Height (m)²</span>
            </td>
            <td><span class="formula-val">${stdBmi.toFixed(2)}</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">Oxford "New" BMI</span>
              <span class="formula-note">Trefethen formula: Scales height to 2.5</span>
            </td>
            <td><span class="formula-val">${nBmi.toFixed(2)}</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">BMI Prime</span>
              <span class="formula-note">Ratio to 25.0 upper limit (${prime < 1 ? 'Under normal max' : 'Over normal max'})</span>
            </td>
            <td><span class="formula-val">${prime.toFixed(2)}</span></td>
          </tr>
        </tbody>
      </table>
      <div class="formula-table-footer">
        Standard WHO category: 18.5 – 24.9 is Normal weight.
      </div>
    </div>
  `;

  const fatCard = `
    <div class="formula-table-card">
      <div class="formula-table-card-header">
        <h3>🧬 Body Fat Percentage (%BF)</h3>
        <span class="badge badge-normal">~${bfDeurenberg.toFixed(1)}%</span>
      </div>
      <table class="formula-table">
        <thead>
          <tr>
            <th>Formula / Estimator</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <span class="formula-name">Deurenberg (1991)</span>
              <span class="formula-note">Adult regression model based on BMI & Age</span>
            </td>
            <td><span class="formula-val">${bfDeurenberg.toFixed(1)}%</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">Gallagher (1996)</span>
              <span class="formula-note">Clinical multi-ethnic regression study</span>
            </td>
            <td><span class="formula-val">${bfGallagher.toFixed(1)}%</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">CUN-BAE (Navarra 2012)</span>
              <span class="formula-note">Non-linear body adiposity estimator</span>
            </td>
            <td><span class="formula-val">${bfCunBae.toFixed(1)}%</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">Lean Body Mass</span>
              <span class="formula-note">Fat-free muscle, bone, and water mass</span>
            </td>
            <td><span class="formula-val" style="color: #38bdf8;">${compDeurenberg.leanMassKg.toFixed(1)} kg</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">Estimated Fat Mass</span>
              <span class="formula-note">Total adipose body weight</span>
            </td>
            <td><span class="formula-val" style="color: #f59e0b;">${compDeurenberg.fatMassKg.toFixed(1)} kg</span></td>
          </tr>
        </tbody>
      </table>
      <div class="formula-table-footer">
        Estimates biological adiposity without requiring skinfold calipers or DEXA scans.
      </div>
    </div>
  `;

  const ibwCard = `
    <div class="formula-table-card">
      <div class="formula-table-card-header">
        <h3>🎯 Ideal Weight Standards (IBW)</h3>
        <span class="badge badge-normal">${ibw.average.toFixed(1)} kg avg</span>
      </div>
      <table class="formula-table">
        <thead>
          <tr>
            <th>Clinical Standard</th>
            <th>Target</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <span class="formula-name">Devine Formula (1974)</span>
              <span class="formula-note">Pharmacology dosing baseline</span>
            </td>
            <td><span class="formula-val">${ibw.devine.toFixed(1)} kg</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">Robinson Formula (1983)</span>
              <span class="formula-note">Metabolic rate revision</span>
            </td>
            <td><span class="formula-val">${ibw.robinson.toFixed(1)} kg</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">Miller Formula (1983)</span>
              <span class="formula-note">Adjusted for lean muscle frame</span>
            </td>
            <td><span class="formula-val">${ibw.miller.toFixed(1)} kg</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">Hamwi Formula (1964)</span>
              <span class="formula-note">Clinical thumb-rule standard</span>
            </td>
            <td><span class="formula-val">${ibw.hamwi.toFixed(1)} kg</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">WHO Healthy Range</span>
              <span class="formula-note">Standard BMI 18.5 – 24.9 window</span>
            </td>
            <td><span class="formula-val">${ibw.healthyRange[0].toFixed(1)} – ${ibw.healthyRange[1].toFixed(1)} kg</span></td>
          </tr>
        </tbody>
      </table>
      <div class="formula-table-footer">
        Calculates reference target weights used in clinical pharmacology and sports science.
      </div>
    </div>
  `;

  const tdeeCard = `
    <div class="formula-table-card">
      <div class="formula-table-card-header">
        <h3>🔥 Metabolic Energy (BMR/TDEE)</h3>
        <span class="badge badge-normal">${bmrMifflin} kcal</span>
      </div>
      <table class="formula-table">
        <thead>
          <tr>
            <th>Energy Metric</th>
            <th>Daily Burn</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <span class="formula-name">Mifflin-St Jeor (BMR)</span>
              <span class="formula-note">Resting expenditure at complete rest</span>
            </td>
            <td><span class="formula-val">${bmrMifflin} kcal/day</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">Revised Harris-Benedict</span>
              <span class="formula-note">Resting energy expenditure (1984)</span>
            </td>
            <td><span class="formula-val">${bmrHarris} kcal/day</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">Sedentary Maintenance (TDEE)</span>
              <span class="formula-note">Desk work / Little or no exercise (1.2×)</span>
            </td>
            <td><span class="formula-val">${tdee.sedentary} kcal/day</span></td>
          </tr>
          <tr>
            <td>
              <span class="formula-name">Moderate Exercise (TDEE)</span>
              <span class="formula-note">Active training 3–5 days/week (1.55×)</span>
            </td>
            <td><span class="formula-val">${tdee.moderate} kcal/day</span></td>
          </tr>
        </tbody>
      </table>
      <div class="formula-table-footer">
        Resting burn (BMR) plus total daily maintenance calories with activity.
      </div>
    </div>
  `;

  const latestMeasurements = records[records.length - 1]?.measurements || {};
  const waist = latestMeasurements.waistCm;
  const hip = latestMeasurements.hipCm;
  const neck = latestMeasurements.neckCm;
  const chest = latestMeasurements.chestCm;
  const arm = latestMeasurements.armCm;
  const thigh = latestMeasurements.thighCm;
  const hasAnyMeasurement = waist || hip || neck || chest || arm || thigh;

  const whr = waist && hip ? waistToHipRatio(waist, hip) : 0;
  const whtr = waist ? waistToHeightRatio(waist, heightCm) : 0;
  const navyBf = waist && neck ? navyBodyFat(waist, neck, hip, heightCm, sex) : 0;
  const whrCat = getWhrCategory(whr, sex);
  const whtrCat = getWhtrCategory(whtr);

  const whtrPct = whtr > 0 ? Math.min(100, Math.max(0, Math.round(((whtr - 0.35) / (0.65 - 0.35)) * 100))) : null;

  const tapeCard = `
    <div class="formula-table-card tape-featured-card">
      <div class="formula-table-card-header">
        <h3>
          <span>📏</span>
          <span>Tape Measurements & Visceral Adiposity</span>
        </h3>
        ${hasAnyMeasurement ? `<span class="badge ${whtrCat.badgeClass}">${whtrCat.category} (WHtR ${whtr > 0 ? whtr.toFixed(3) : '--'})</span>` : '<span class="badge badge-normal">No data</span>'}
      </div>
      ${!hasAnyMeasurement ? `
        <div class="tape-empty-state">
          <div class="tape-empty-icon">📐</div>
          <div class="tape-empty-title">Circumference Ratios Unlocked on Next Log</div>
          <p class="tape-empty-text">
            Standard BMI cannot distinguish muscle from visceral fat. Track your waist, hip, and neck to unlock clinical Waist-to-Height Ratio (WHtR) and US Navy body fat analysis.
          </p>
          <button type="button" class="btn-secondary" id="btn-open-tape-log">
            ➕ Log Tape Measurements
          </button>
        </div>
      ` : `
        <div class="tape-hero-grid">
          <div class="tape-hero-tile">
            <span class="tape-hero-label">Waist-to-Height (WHtR)</span>
            <div class="tape-hero-value">
              ${whtr > 0 ? whtr.toFixed(3) : '--'}
            </div>
            <span class="tape-hero-sub">
              ${whtr > 0 ? (whtr < 0.5 ? '🟢 < 0.50 (Healthy Target)' : '⚠️ ≥ 0.50 (Elevated Risk)') : 'Requires waist & height'}
            </span>
          </div>
          <div class="tape-hero-tile">
            <span class="tape-hero-label">Waist-to-Hip (WHR)</span>
            <div class="tape-hero-value">
              ${whr > 0 ? whr.toFixed(3) : '--'}
            </div>
            <span class="tape-hero-sub">
              ${whr > 0 ? `WHO Threshold: ${sex === 'female' ? '0.85' : '0.90'} (${whrCat.category})` : 'Requires waist & hip'}
            </span>
          </div>
          <div class="tape-hero-tile">
            <span class="tape-hero-label">US Navy Body Fat</span>
            <div class="tape-hero-value" style="color: var(--color-primary);">
              ${navyBf > 0 ? navyBf.toFixed(1) + '%' : '--'}
            </div>
            <span class="tape-hero-sub">
              ${navyBf > 0 ? 'Circumference DoD formula' : 'Requires waist & neck' + (sex === 'female' ? ' & hip' : '')}
            </span>
          </div>
        </div>

        ${whtr > 0 ? `
          <div class="tape-meter-section">
            <div class="tape-meter-header">
              <span class="tape-meter-title">Waist-to-Height Risk Spectrum</span>
              <span class="badge ${whtrCat.badgeClass}">${whtr.toFixed(3)} · ${whtrCat.category}</span>
            </div>
            <div class="tape-meter-track">
              <div class="tape-meter-segment seg-underweight" title="Underweight (< 0.43)"></div>
              <div class="tape-meter-segment seg-healthy" title="Healthy (0.43 – 0.499)"></div>
              <div class="tape-meter-segment seg-overweight" title="Increased Risk (0.50 – 0.579)"></div>
              <div class="tape-meter-segment seg-obese" title="High Risk (≥ 0.58)"></div>
              <div class="tape-meter-pointer" style="left: ${whtrPct}%;">
                <div class="tape-pointer-arrow">▼</div>
              </div>
            </div>
            <div class="tape-meter-legend">
              <span>0.35</span>
              <span>0.43 (Under)</span>
              <span class="legend-target">0.50 (Target Max)</span>
              <span>0.58 (High)</span>
              <span>0.65+</span>
            </div>
          </div>
        ` : ''}

        <div class="tape-details-section">
          <div class="tape-details-heading">Recorded Body Circumferences</div>
          <div class="tape-measurements-chips">
            ${waist ? `<div class="tape-chip"><span class="chip-name">Waist (navel):</span><span class="chip-val">${Number(waist).toFixed(1)} cm</span></div>` : ''}
            ${hip ? `<div class="tape-chip"><span class="chip-name">Hip (glutes):</span><span class="chip-val">${Number(hip).toFixed(1)} cm</span></div>` : ''}
            ${neck ? `<div class="tape-chip"><span class="chip-name">Neck:</span><span class="chip-val">${Number(neck).toFixed(1)} cm</span></div>` : ''}
            ${chest ? `<div class="tape-chip"><span class="chip-name">Chest:</span><span class="chip-val">${Number(chest).toFixed(1)} cm</span></div>` : ''}
            ${arm ? `<div class="tape-chip"><span class="chip-name">Arm / Bicep:</span><span class="chip-val">${Number(arm).toFixed(1)} cm</span></div>` : ''}
            ${thigh ? `<div class="tape-chip"><span class="chip-name">Thigh:</span><span class="chip-val">${Number(thigh).toFixed(1)} cm</span></div>` : ''}
          </div>
        </div>
      `}
      <div class="formula-table-footer tape-footer-note">
        💡 <strong>Why this outperforms BMI:</strong> BMI is a height-weight ratio that cannot differentiate lean muscle frame from visceral adipose tissue. Waist-to-Height Ratio (WHtR &lt; 0.50) specifically isolates intra-abdominal visceral fat surrounding internal organs, providing superior clinical screening for metabolic syndrome and cardiovascular risk.
      </div>
    </div>
  `;

  let html = '';
  if (activeTab === 'tape') html = tapeCard;
  else if (activeTab === 'bmi') html = bmiCard;
  else if (activeTab === 'fat') html = fatCard;
  else if (activeTab === 'ibw') html = ibwCard;
  else if (activeTab === 'tdee') html = tdeeCard;
  else html = tapeCard + bmiCard + fatCard + ibwCard + tdeeCard;

  container.innerHTML = html;

  $('#btn-open-tape-log', container)?.addEventListener('click', () => openLogModal());
}

export function initFormulaTabs() {
  $$('.formula-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      $$('.formula-tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      setFormulaTab(e.target.dataset.tab);
    });
  });
}
