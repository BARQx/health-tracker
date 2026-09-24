import test from 'node:test';
import assert from 'node:assert/strict';
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
  calculateTrendWeights,
  calculatePaceAndProgress,
  enrichRecordsWithDeltas
} from '../frontend/formulas.js';

test('calculateAge calculates exact completed years correctly', () => {
  const birthDate = '1995-06-15';
  const targetDate = new Date('2025-06-14'); // One day before 30th birthday
  assert.equal(calculateAge(birthDate, targetDate), 29);

  const exactBirthday = new Date('2025-06-15');
  assert.equal(calculateAge(birthDate, exactBirthday), 30);

  const dayAfter = new Date('2025-06-16');
  assert.equal(calculateAge(birthDate, dayAfter), 30);
});

test('standardBmi calculates WHO Quetelet index correctly', () => {
  // 70 kg at 175 cm (1.75 m): 70 / (1.75^2) = 22.857... -> 22.86
  const bmi = standardBmi(70, 175);
  assert.equal(bmi, 22.86);

  // Edge cases
  assert.equal(standardBmi(0, 175), 0);
  assert.equal(standardBmi(70, 0), 0);
});

test('oxfordBmi calculates Oxford New BMI correctly', () => {
  // 1.3 * 70 / (1.75^2.5) = 22.46188... -> 22.46
  const newBmi = oxfordBmi(70, 175);
  assert.equal(newBmi, 22.46);
});

test('bmiPrime calculates ratio to upper normal boundary', () => {
  assert.equal(bmiPrime(25.0), 1.0);
  assert.equal(bmiPrime(20.0), 0.8);
  assert.equal(bmiPrime(30.0), 1.2);
});

test('getBmiCategory returns correct clinical classification', () => {
  assert.equal(getBmiCategory(17.5).category, 'Underweight');
  assert.equal(getBmiCategory(22.0).category, 'Normal weight');
  assert.equal(getBmiCategory(27.5).category, 'Overweight');
  assert.equal(getBmiCategory(32.0).category, 'Obesity Class I');
  assert.equal(getBmiCategory(37.0).category, 'Obesity Class II');
  assert.equal(getBmiCategory(42.0).category, 'Obesity Class III');
});

test('deurenbergBodyFat calculates body fat percentage for adults', () => {
  // Age 30, BMI 22.86
  // Male: 1.20 * 22.86 + 0.23 * 30 - 10.8 * 1 - 5.4 = 27.432 + 6.9 - 10.8 - 5.4 = 18.132 -> 18.1%
  const maleBf = deurenbergBodyFat(22.86, 30, 'male');
  assert.equal(maleBf, 18.1);

  // Female: 1.20 * 22.86 + 0.23 * 30 - 10.8 * 0 - 5.4 = 27.432 + 6.9 - 5.4 = 28.932 -> 28.9%
  const femaleBf = deurenbergBodyFat(22.86, 30, 'female');
  assert.equal(femaleBf, 28.9);
});

test('gallagherBodyFat calculates body fat percentage', () => {
  // Male: 1.46 * 22.86 + 0.14 * 30 - 11.6 * 1 - 10 = 33.3756 + 4.2 - 11.6 - 10 = 15.9756 -> 16.0%
  const maleBf = gallagherBodyFat(22.86, 30, 'male');
  assert.equal(maleBf, 16.0);

  // Female: 1.46 * 22.86 + 0.14 * 30 - 11.6 * 0 - 10 = 27.5756 -> 27.6%
  const femaleBf = gallagherBodyFat(22.86, 30, 'female');
  assert.equal(femaleBf, 27.6);
});

test('cunBaeBodyFat computes non-linear adiposity estimate', () => {
  const maleBf = cunBaeBodyFat(22.86, 30, 'male');
  assert.ok(maleBf > 10 && maleBf < 25, `Expected realistic body fat, got ${maleBf}`);

  const femaleBf = cunBaeBodyFat(22.86, 30, 'female');
  assert.ok(femaleBf > maleBf, 'Female body fat percentage must be higher than male at same BMI and age');
});

test('calculateBodyComposition splits total weight into fat and lean mass', () => {
  const comp = calculateBodyComposition(70, 20); // 70 kg at 20% body fat
  assert.equal(comp.fatMassKg, 14.0);
  assert.equal(comp.leanMassKg, 56.0);
  assert.equal(Number((comp.fatMassKg + comp.leanMassKg).toFixed(1)), 70);
});

test('calculateIdealBodyWeight computes Devine, Robinson, Miller, Hamwi standards', () => {
  // 175 cm is ~68.898 inches -> 8.898 inches above 60 inches
  const ibwMale = calculateIdealBodyWeight(175, 'male');
  assert.ok(ibwMale.devine > 65 && ibwMale.devine < 75);
  assert.ok(ibwMale.robinson > 65 && ibwMale.robinson < 75);
  assert.ok(ibwMale.miller > 65 && ibwMale.miller < 75);
  assert.ok(ibwMale.hamwi > 65 && ibwMale.hamwi < 75);
  assert.ok(ibwMale.healthyRange[0] < ibwMale.healthyRange[1]);

  const ibwFemale = calculateIdealBodyWeight(175, 'female');
  assert.ok(ibwFemale.average < ibwMale.average, 'Female IBW should be lower than male IBW at same height');
});

test('mifflinStJeorBmr and revisedHarrisBenedictBmr estimate metabolic rate', () => {
  const maleMifflin = mifflinStJeorBmr(70, 175, 30, 'male');
  // 10*70 + 6.25*175 - 5*30 + 5 = 700 + 1093.75 - 150 + 5 = 1648.75 -> 1649
  assert.equal(maleMifflin, 1649);

  const femaleMifflin = mifflinStJeorBmr(70, 175, 30, 'female');
  // 10*70 + 6.25*175 - 5*30 - 161 = 1483
  assert.equal(femaleMifflin, 1483);

  const maleHarris = revisedHarrisBenedictBmr(70, 175, 30, 'male');
  assert.ok(maleHarris > 1500 && maleHarris < 1800);
});

test('calculateTdee generates active multipliers', () => {
  const tdee = calculateTdee(1600);
  assert.equal(tdee.sedentary, 1920); // 1600 * 1.2
  assert.equal(tdee.light, 2200);     // 1600 * 1.375
  assert.equal(tdee.moderate, 2480);  // 1600 * 1.55
  assert.equal(tdee.active, 2760);    // 1600 * 1.725
});

test('calculateTrendWeights smooths erratic daily weight spikes', () => {
  const rawRecords = [
    { date: '2026-03-01', weight: 70.0 },
    { date: '2026-03-02', weight: 71.5 }, // sudden water weight spike +1.5kg
    { date: '2026-03-03', weight: 69.8 }, // drop back down
    { date: '2026-03-04', weight: 69.5 }
  ];

  const smoothed = calculateTrendWeights(rawRecords, 0.1);
  assert.equal(smoothed.length, 4);
  assert.equal(smoothed[0].trendWeight, 70.0);
  // Day 2 trend: 71.5 * 0.1 + 70.0 * 0.9 = 7.15 + 63 = 70.15 (not the noisy 71.5!)
  assert.equal(smoothed[1].trendWeight, 70.15);
  assert.ok(smoothed[1].trendWeight < 70.5, 'Spike was properly dampened by smoothing');
});

test('calculateTrendWeights snaps when there is a multi-month gap', () => {
  const recordsWithGap = [
    { date: '2026-01-01', weight: 70.0 },
    { date: '2026-06-01', weight: 64.0 } // 5 months gap!
  ];
  const smoothed = calculateTrendWeights(recordsWithGap, 0.1);
  // Because 5 months elapsed, the old weight decays and the trend snaps to the new weight (within 0.1kg)
  assert.ok(smoothed[1].trendWeight <= 64.1, `Expected trend to snap near 64.0 after 5 months, got ${smoothed[1].trendWeight}`);
});

test('calculatePaceAndProgress calculates weekly rate and net change accurately', () => {
  const checkins = [
    { date: '2026-08-20', weight: 66.85 },
    { date: '2026-09-24', weight: 64.85 } // -2.00 kg in 35 days (5 weeks) -> -0.40 kg/week!
  ];
  const pace = calculatePaceAndProgress(checkins);
  assert.equal(pace.latestWeight, 64.85);
  assert.equal(pace.diff, -2.00);
  assert.equal(pace.daysElapsed, 35);
  assert.equal(pace.weeklyRate, -0.40);
  assert.equal(pace.totalChange, -2.00);
  assert.equal(pace.timeframeChange, -2.00);
  assert.equal(pace.timeframeLabel, 'All-Time');

  // Test multi-year scenario where user has old 2021 logs and active 2026 logs
  const multiYearRecords = [
    { date: '2021-07-03', weight: 68.10 },
    { date: '2026-01-01', weight: 71.90 },
    { date: '2026-08-20', weight: 66.85 },
    { date: '2026-09-24', weight: 64.85 }
  ];
  const now = new Date('2026-09-24T12:00:00Z');

  // 1Y view: Compares within 365 days (71.90 -> 64.85 = -7.05 kg)
  const pace1Y = calculatePaceAndProgress(multiYearRecords, '1y', now);
  assert.equal(pace1Y.timeframeLabel, '1Y Change');
  assert.equal(pace1Y.timeframeChange, -7.05);

  // 30D view: Compares to prior check-in (66.85 -> 64.85 = -2.00 kg)
  const pace30D = calculatePaceAndProgress(multiYearRecords, '30d', now);
  assert.equal(pace30D.timeframeLabel, '30D Change');
  assert.equal(pace30D.timeframeChange, -2.00);

  // All-time view: Compares against 2021 (68.10 -> 64.85 = -3.25 kg)
  const paceAll = calculatePaceAndProgress(multiYearRecords, 'all', now);
  assert.equal(paceAll.timeframeLabel, 'All-Time');
  assert.equal(paceAll.timeframeChange, -3.25);
});

test('enrichRecordsWithDeltas computes exact point-to-point deltas for weight, BMI, and body fat', () => {
  const records = [
    { date: '2026-08-20', weight: 67.34 },
    { date: '2026-09-24', weight: 64.85 }
  ];
  const enriched = enrichRecordsWithDeltas(records, 175, 30, 'male');
  assert.equal(enriched.length, 2);

  // First record has null deltas
  assert.equal(enriched[0].deltaWeight, null);
  assert.equal(enriched[0].deltaBmi, null);
  assert.equal(enriched[0].deltaBodyFat, null);
  assert.equal(enriched[0].daysSincePrev, null);

  // Second record has exact deltas
  assert.equal(enriched[1].deltaWeight, -2.49);
  assert.equal(enriched[1].daysSincePrev, 35);
  assert.ok(enriched[1].deltaBmi < 0, 'BMI decreased');
  assert.ok(enriched[1].deltaBodyFat < 0, 'Body fat decreased');
  assert.equal(enriched[1].deltaBmi, -0.81);
});

