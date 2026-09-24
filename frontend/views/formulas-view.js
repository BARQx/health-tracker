import { $, $$ } from '../dom.js';
import { state, setFormulaTab } from '../state.js';
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
  calculateTdee
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

  let html = '';
  if (activeTab === 'bmi') html = bmiCard;
  else if (activeTab === 'fat') html = fatCard;
  else if (activeTab === 'ibw') html = ibwCard;
  else if (activeTab === 'tdee') html = tdeeCard;
  else html = bmiCard + fatCard + ibwCard + tdeeCard;

  container.innerHTML = html;
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
