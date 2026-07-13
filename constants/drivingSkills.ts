// מיומנויות נהיגה למעקב התקדמות תלמיד.
// כל מיומנות מקבלת דירוג מ-0 (לא תורגל) עד 4 (מצוין).
// כשהתמלול+AI יתווספו, ה-AI יעדכן את הדירוגים אוטומטית מסיכום השיעור.

export type SkillLevel = 0 | 1 | 2 | 3 | 4;

export const SKILL_LEVELS: {
  value: SkillLevel;
  label: string;
  color: string;
  bg: string;
}[] = [
  { value: 0, label: 'לא תורגל', color: '#727782', bg: '#e7e8ef' },
  { value: 1, label: 'מתחיל', color: '#b71c1c', bg: '#ffdad6' },
  { value: 2, label: 'בסיסי', color: '#954501', bg: '#ffdbc8' },
  { value: 3, label: 'טוב', color: '#005da7', bg: '#d3e3ff' },
  { value: 4, label: 'מצוין', color: '#1b6d24', bg: '#a0f399' },
];

export function skillLevelMeta(level: SkillLevel) {
  return SKILL_LEVELS[level] ?? SKILL_LEVELS[0];
}

// מיומנויות הליבה למבחן נהיגה בישראל, מקובצות לפי תחום.
export type DrivingSkill = {
  key: string;
  label: string;
  group: string;
};

export const DRIVING_SKILLS: DrivingSkill[] = [
  // שליטה בסיסית ברכב
  { key: 'starting', label: 'התנעה ויציאה', group: 'שליטה ברכב' },
  { key: 'gears', label: 'הילוכים', group: 'שליטה ברכב' },
  { key: 'steering', label: 'היגוי ושליטה', group: 'שליטה ברכב' },
  { key: 'mirrors', label: 'שימוש במראות', group: 'שליטה ברכב' },

  // תמרונים
  { key: 'parking_parallel', label: 'חניה מקבילה', group: 'תמרונים' },
  { key: 'parking_reverse', label: 'חניה בנסיעה לאחור', group: 'תמרונים' },
  { key: 'three_point', label: 'פניית פרסה', group: 'תמרונים' },
  { key: 'hill_start', label: 'עליית מדרון', group: 'תמרונים' },

  // נהיגה בדרך
  { key: 'lanes', label: 'שמירת נתיב', group: 'נהיגה בדרך' },
  { key: 'roundabouts', label: 'כיכרות', group: 'נהיגה בדרך' },
  { key: 'junctions', label: 'צמתים ורמזורים', group: 'נהיגה בדרך' },
  { key: 'merging', label: 'השתלבות ועקיפה', group: 'נהיגה בדרך' },
  { key: 'highway', label: 'נהיגה בכביש מהיר', group: 'נהיגה בדרך' },

  // מודעות ובטיחות
  { key: 'awareness', label: 'מודעות לסביבה', group: 'בטיחות' },
  { key: 'pedestrians', label: 'הולכי רגל', group: 'בטיחות' },
  { key: 'speed', label: 'התאמת מהירות', group: 'בטיחות' },
  { key: 'distance', label: 'שמירת מרחק', group: 'בטיחות' },
];

// ספי מוכנות לטסט: אחוז מהמיומנויות ברמה 3+ ומספר מיומנויות ברמה 1.
export const TEST_READY_GOOD_RATIO = 0.8; // 80% מהמיומנויות ברמה "טוב" ומעלה
export const TEST_READY_MAX_WEAK = 2; // עד 2 מיומנויות חלשות (רמה 1)

export type ReadinessVerdict = 'ready' | 'almost' | 'not-ready' | 'no-data';

export function computeReadiness(levels: SkillLevel[]): {
  verdict: ReadinessVerdict;
  goodRatio: number;
  weakCount: number;
  practicedCount: number;
} {
  const practiced = levels.filter((l) => l > 0);
  const practicedCount = practiced.length;

  if (practicedCount === 0) {
    return {
      verdict: 'no-data',
      goodRatio: 0,
      weakCount: 0,
      practicedCount: 0,
    };
  }

  const goodCount = practiced.filter((l) => l >= 3).length;
  const weakCount = practiced.filter((l) => l === 1).length;
  // היחס מחושב מול כלל המיומנויות, לא רק אלו שתורגלו, כדי לדרוש כיסוי מלא.
  const goodRatio = goodCount / DRIVING_SKILLS.length;

  let verdict: ReadinessVerdict;
  if (goodRatio >= TEST_READY_GOOD_RATIO && weakCount <= TEST_READY_MAX_WEAK) {
    verdict = 'ready';
  } else if (goodRatio >= 0.55) {
    verdict = 'almost';
  } else {
    verdict = 'not-ready';
  }

  return { verdict, goodRatio, weakCount, practicedCount };
}
