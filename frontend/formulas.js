/**
 * Scientific Health & Body Composition Formulas
 * Pure mathematical functions for BMI, Body Fat %, Ideal Weight, BMR, and Trend Smoothing.
 */

/**
 * Calculates exact age in completed years from birthDate to a target date (defaults to now).
 * @param {string|Date} birthDate
 * @param {string|Date} [targetDate=new Date()]
 * @returns {number}
 */
export function calculateAge(birthDate, targetDate = new Date()) {
  const birth = new Date(birthDate);
  const target = new Date(targetDate);
  if (isNaN(birth.getTime()) || isNaN(target.getTime())) return 0;
  
  let age = target.getFullYear() - birth.getFullYear();
  const m = target.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && target.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * Standard WHO / Quetelet BMI (kg / m^2)
 * @param {number} weightKg
 * @param {number} heightCm
 * @returns {number}
 */
export function standardBmi(weightKg, heightCm) {
  if (!weightKg || !heightCm || heightCm <= 0) return 0;
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(2));
}

/**
 * Oxford "New" BMI by Prof. Nick Trefethen (1.3 * weight / height^2.5)
 * Better accounts for tall and short individuals.
 * @param {number} weightKg
 * @param {number} heightCm
 * @returns {number}
 */
export function oxfordBmi(weightKg, heightCm) {
  if (!weightKg || !heightCm || heightCm <= 0) return 0;
  const heightM = heightCm / 100;
  return Number((1.3 * weightKg / Math.pow(heightM, 2.5)).toFixed(2));
}

/**
 * BMI Prime: Ratio of BMI to the upper limit of normal BMI (25.0)
 * < 0.74: Underweight, 0.74 - 1.0: Normal, 1.0 - 1.2: Overweight, > 1.2: Obese
 * @param {number} bmi
 * @returns {number}
 */
export function bmiPrime(bmi) {
  if (!bmi || bmi <= 0) return 0;
  return Number((bmi / 25.0).toFixed(2));
}

/**
 * Returns WHO BMI classification category and color variant
 * @param {number} bmi
 * @returns {{ category: string, color: string, badgeClass: string }}
 */
export function getBmiCategory(bmi) {
  if (bmi <= 0) return { category: 'Unknown', color: '#94a3b8', badgeClass: 'badge-unknown' };
  if (bmi < 18.5) return { category: 'Underweight', color: '#38bdf8', badgeClass: 'badge-underweight' };
  if (bmi < 25.0) return { category: 'Normal weight', color: '#22c55e', badgeClass: 'badge-normal' };
  if (bmi < 30.0) return { category: 'Overweight', color: '#f59e0b', badgeClass: 'badge-overweight' };
  if (bmi < 35.0) return { category: 'Obesity Class I', color: '#f97316', badgeClass: 'badge-obese1' };
  if (bmi < 40.0) return { category: 'Obesity Class II', color: '#ef4444', badgeClass: 'badge-obese2' };
  return { category: 'Obesity Class III', color: '#b91c1c', badgeClass: 'badge-obese3' };
}

/**
 * Normalizes sex parameter to standard boolean or integer indicators.
 * @param {string} sex - 'male' | 'female'
 * @returns {{ isMale: boolean, deurenbergSex: number, cunBaeSex: number }}
 */
function normalizeSex(sex) {
  const isMale = String(sex).toLowerCase() === 'male';
  return {
    isMale,
    deurenbergSex: isMale ? 1 : 0, // 1 for male, 0 for female
    cunBaeSex: isMale ? 0 : 1       // 0 for male, 1 for female in Gomez-Ambrosi
  };
}

/**
 * Deurenberg Formula (1991) for Body Fat Percentage (%BF)
 * BF% = (1.20 * BMI) + (0.23 * Age) - (10.8 * Sex) - 5.4
 * @param {number} bmi
 * @param {number} age
 * @param {'male'|'female'} sex
 * @returns {number}
 */
export function deurenbergBodyFat(bmi, age, sex) {
  if (!bmi || !age) return 0;
  const { deurenbergSex } = normalizeSex(sex);
  const bf = (1.20 * bmi) + (0.23 * age) - (10.8 * deurenbergSex) - 5.4;
  return Number(Math.max(3, Math.min(65, bf)).toFixed(1));
}

/**
 * Gallagher Formula (1996) for Body Fat Percentage (%BF)
 * BF% = (1.46 * BMI) + (0.14 * Age) - (11.6 * Sex) - 10
 * @param {number} bmi
 * @param {number} age
 * @param {'male'|'female'} sex
 * @returns {number}
 */
export function gallagherBodyFat(bmi, age, sex) {
  if (!bmi || !age) return 0;
  const { deurenbergSex } = normalizeSex(sex); // Male=1, Female=0
  const bf = (1.46 * bmi) + (0.14 * age) - (11.6 * deurenbergSex) - 10;
  return Number(Math.max(3, Math.min(65, bf)).toFixed(1));
}

/**
 * CUN-BAE Formula (Clínica Universidad de Navarra - Body Adiposity Estimator, 2012)
 * High clinical correlation non-linear model.
 * @param {number} bmi
 * @param {number} age
 * @param {'male'|'female'} sex
 * @returns {number}
 */
export function cunBaeBodyFat(bmi, age, sex) {
  if (!bmi || !age) return 0;
  const { cunBaeSex } = normalizeSex(sex); // Men=0, Women=1
  const bf = -44.988 +
    (0.503 * age) +
    (10.689 * cunBaeSex) +
    (3.172 * bmi) -
    (0.026 * Math.pow(bmi, 2)) +
    (0.181 * bmi * cunBaeSex) -
    (0.02 * bmi * age) -
    (0.005 * Math.pow(bmi, 2) * cunBaeSex) +
    (0.00021 * Math.pow(bmi, 2) * age);
  return Number(Math.max(3, Math.min(65, bf)).toFixed(1));
}

/**
 * Calculates Fat Mass and Lean Body Mass in kg based on Body Fat %
 * @param {number} weightKg
 * @param {number} bfPercent
 * @returns {{ fatMassKg: number, leanMassKg: number }}
 */
export function calculateBodyComposition(weightKg, bfPercent) {
  if (!weightKg || !bfPercent) return { fatMassKg: 0, leanMassKg: 0 };
  const fatMass = weightKg * (bfPercent / 100);
  const leanMass = weightKg - fatMass;
  return {
    fatMassKg: Number(fatMass.toFixed(2)),
    leanMassKg: Number(leanMass.toFixed(2))
  };
}

/**
 * Ideal Body Weight (IBW) Formulas in kg
 * Evaluates target weight based on 4 classic clinical models.
 * Base height is 5 feet (60 inches).
 * @param {number} heightCm
 * @param {'male'|'female'} sex
 * @returns {{ devine: number, robinson: number, miller: number, hamwi: number, average: number, healthyRange: [number, number] }}
 */
export function calculateIdealBodyWeight(heightCm, sex) {
  if (!heightCm || heightCm <= 0) {
    return { devine: 0, robinson: 0, miller: 0, hamwi: 0, average: 0, healthyRange: [0, 0] };
  }
  const isMale = String(sex).toLowerCase() === 'male';
  const totalInches = heightCm / 2.54;
  const inchesOver60 = Math.max(0, totalInches - 60);

  // Devine (1974)
  const devine = isMale ? (50.0 + 2.3 * inchesOver60) : (45.5 + 2.3 * inchesOver60);
  // Robinson (1983)
  const robinson = isMale ? (52.0 + 1.9 * inchesOver60) : (49.0 + 1.7 * inchesOver60);
  // Miller (1983)
  const miller = isMale ? (56.2 + 1.41 * inchesOver60) : (53.1 + 1.36 * inchesOver60);
  // Hamwi (1964)
  const hamwi = isMale ? (48.0 + 2.7 * inchesOver60) : (45.5 + 2.2 * inchesOver60);

  const average = (devine + robinson + miller + hamwi) / 4;

  // WHO BMI 18.5 - 24.9 Healthy Weight Range
  const heightM = heightCm / 100;
  const minHealthy = 18.5 * heightM * heightM;
  const maxHealthy = 24.9 * heightM * heightM;

  return {
    devine: Number(devine.toFixed(1)),
    robinson: Number(robinson.toFixed(1)),
    miller: Number(miller.toFixed(1)),
    hamwi: Number(hamwi.toFixed(1)),
    average: Number(average.toFixed(1)),
    healthyRange: [Number(minHealthy.toFixed(1)), Number(maxHealthy.toFixed(1))]
  };
}

/**
 * Basal Metabolic Rate (BMR) via Mifflin-St Jeor (considered gold standard)
 * @param {number} weightKg
 * @param {number} heightCm
 * @param {number} age
 * @param {'male'|'female'} sex
 * @returns {number}
 */
export function mifflinStJeorBmr(weightKg, heightCm, age, sex) {
  if (!weightKg || !heightCm || !age) return 0;
  const isMale = String(sex).toLowerCase() === 'male';
  const bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + (isMale ? 5 : -161);
  return Math.round(bmr);
}

/**
 * Basal Metabolic Rate (BMR) via Revised Harris-Benedict (1984)
 * @param {number} weightKg
 * @param {number} heightCm
 * @param {number} age
 * @param {'male'|'female'} sex
 * @returns {number}
 */
export function revisedHarrisBenedictBmr(weightKg, heightCm, age, sex) {
  if (!weightKg || !heightCm || !age) return 0;
  const isMale = String(sex).toLowerCase() === 'male';
  let bmr;
  if (isMale) {
    bmr = 88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * age);
  } else {
    bmr = 447.593 + (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * age);
  }
  return Math.round(bmr);
}

/**
 * Total Daily Energy Expenditure (TDEE) estimates based on activity multipliers
 * @param {number} bmr
 * @returns {{ sedentary: number, light: number, moderate: number, active: number }}
 */
export function calculateTdee(bmr) {
  if (!bmr || bmr <= 0) return { sedentary: 0, light: 0, moderate: 0, active: 0 };
  return {
    sedentary: Math.round(bmr * 1.2),      // Little or no exercise
    light: Math.round(bmr * 1.375),        // 1-3 days/week exercise
    moderate: Math.round(bmr * 1.55),      // 3-5 days/week exercise
    active: Math.round(bmr * 1.725)        // 6-7 days/week hard exercise
  };
}

/**
 * Calculates normalized weekly pace and total progress across check-ins.
 * Tailored for weekly, bi-weekly, or monthly weigh-ins.
 * @param {Array<{ date: string, weight: number }>} records - Sorted chronologically ascending
 * @returns {{
 *   latestWeight: number,
 *   previousWeight: number|null,
 *   daysElapsed: number,
 *   diff: number,
 *   weeklyRate: number,
 *   totalChange: number,
 *   startWeight: number
 * }}
 */
export function calculatePaceAndProgress(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return { latestWeight: 0, previousWeight: null, daysElapsed: 0, diff: 0, weeklyRate: 0, totalChange: 0, startWeight: 0 };
  }

  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const first = sorted[0];
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;

  const totalChange = Number((latest.weight - first.weight).toFixed(2));

  if (!previous) {
    return {
      latestWeight: latest.weight,
      previousWeight: null,
      daysElapsed: 0,
      diff: 0,
      weeklyRate: 0,
      totalChange,
      startWeight: first.weight
    };
  }

  const d1 = new Date(previous.date);
  const d2 = new Date(latest.date);
  const daysDiff = Math.max(1, Math.round((d2 - d1) / 86400000));
  const diff = Number((latest.weight - previous.weight).toFixed(2));
  const weeklyRate = Number(((diff / daysDiff) * 7).toFixed(2));

  return {
    latestWeight: latest.weight,
    previousWeight: previous.weight,
    daysElapsed: daysDiff,
    diff,
    weeklyRate,
    totalChange,
    startWeight: first.weight
  };
}

/**
 * Enriches historical records with deltas (weight, BMI, body fat) and elapsed time from previous weigh-in.
 * Retains historical deltas even when the list is subsequently timeframe-filtered.
 * @param {Array<{ date: string, weight: number }>} records
 * @param {number} [heightCm=170]
 * @param {number} [age=30]
 * @param {'male'|'female'} [sex='male']
 * @returns {Array<object>}
 */
export function enrichRecordsWithDeltas(records, heightCm = 170, age = 30, sex = 'male') {
  if (!Array.isArray(records) || records.length === 0) return [];

  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

  return sorted.map((entry, idx) => {
    const prev = idx > 0 ? sorted[idx - 1] : null;
    const bmi = standardBmi(entry.weight, heightCm);
    const bodyFat = deurenbergBodyFat(bmi, age, sex);

    let deltaWeight = null;
    let deltaBmi = null;
    let deltaBodyFat = null;
    let daysSincePrev = null;

    if (prev) {
      deltaWeight = Number((entry.weight - prev.weight).toFixed(2));
      const prevBmi = standardBmi(prev.weight, heightCm);
      const prevBodyFat = deurenbergBodyFat(prevBmi, age, sex);
      deltaBmi = Number((bmi - prevBmi).toFixed(2));
      deltaBodyFat = Number((bodyFat - prevBodyFat).toFixed(1));

      const d1 = new Date(prev.date);
      const d2 = new Date(entry.date);
      daysSincePrev = Math.max(1, Math.round((d2 - d1) / 86400000));
    }

    return {
      ...entry,
      bmi,
      bodyFat,
      deltaWeight,
      deltaBmi,
      deltaBodyFat,
      daysSincePrev
    };
  });
}

/**
 * Time-Aware Weight Trend Smoothing.
 * Accounts for real elapsed days between check-ins.
 * @param {Array<{ date: string, weight: number }>} records
 * @param {number} [dailyAlpha=0.1]
 * @returns {Array<{ date: string, weight: number, trendWeight: number }>}
 */
export function calculateTrendWeights(records, dailyAlpha = 0.1) {
  if (!Array.isArray(records) || records.length === 0) return [];
  
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  let currentTrend = sorted[0].weight;
  
  return sorted.map((entry, index) => {
    if (index === 0) {
      currentTrend = entry.weight;
    } else {
      const prevDate = new Date(sorted[index - 1].date);
      const currDate = new Date(entry.date);
      const days = Math.max(1, Math.round((currDate - prevDate) / 86400000));
      const effectiveAlpha = Math.min(1, 1 - Math.pow(1 - dailyAlpha, days));
      currentTrend = (entry.weight * effectiveAlpha) + (currentTrend * (1 - effectiveAlpha));
    }
    return {
      ...entry,
      trendWeight: Number(currentTrend.toFixed(2))
    };
  });
}
