import { useMutation, useQuery } from 'convex/react';
import { CircleCheck, GraduationCap, TriangleAlert } from 'lucide-react-native';
import { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
  computeReadiness,
  DRIVING_SKILLS,
  type ReadinessVerdict,
  SKILL_LEVELS,
  type SkillLevel,
  skillLevelMeta,
} from '@/constants/drivingSkills';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { tw } from '@/lib/rtl';

// כרטיס מעקב התקדמות: דירוג מיומנויות נהיגה + הערכת מוכנות לטסט.
// המורה מקיש על מיומנות כדי להעלות/להוריד רמה. בעתיד ה-AI ימלא אוטומטית.
export function SkillProgressCard({
  customerId,
}: {
  customerId: Id<'customers'>;
}) {
  const skills = useQuery(api.crm.listCustomerSkills, { customerId });
  const setSkill = useMutation(api.crm.setCustomerSkill);

  // מיפוי מפתח מיומנות -> רמה נוכחית.
  const levelByKey = useMemo(() => {
    const map = new Map<string, SkillLevel>();
    for (const row of skills ?? []) {
      map.set(row.skill, clampLevel(row.level));
    }
    return map;
  }, [skills]);

  const readiness = useMemo(() => {
    const levels = DRIVING_SKILLS.map((s) => levelByKey.get(s.key) ?? 0);
    return computeReadiness(levels);
  }, [levelByKey]);

  const cycleSkill = (skillKey: string) => {
    const current = levelByKey.get(skillKey) ?? 0;
    const next = ((current + 1) % 5) as SkillLevel; // 0→1→2→3→4→0
    setSkill({ customerId, skill: skillKey, level: next }).catch(() => {
      // כישלון שקט; ה-UI יתעדכן מחדש מהשרת בפעם הבאה.
    });
  };

  // קיבוץ המיומנויות לפי תחום לתצוגה מסודרת.
  const groups = useMemo(() => {
    const byGroup = new Map<string, typeof DRIVING_SKILLS>();
    for (const skill of DRIVING_SKILLS) {
      const list = byGroup.get(skill.group) ?? [];
      list.push(skill);
      byGroup.set(skill.group, list);
    }
    return [...byGroup.entries()];
  }, []);

  return (
    <View className="rounded-2xl border border-[#c1c7d3] bg-white p-5">
      <View className={`${tw.flexRow} mb-4 items-center gap-3`}>
        <View className="rounded-xl bg-[#d3e3ff] p-2.5">
          <GraduationCap size={26} color="#005da7" />
        </View>
        <Text className="flex-1 text-right text-2xl font-bold text-[#191c21]">
          מעקב התקדמות
        </Text>
      </View>

      <ReadinessBanner
        goodRatio={readiness.goodRatio}
        verdict={readiness.verdict}
        weakCount={readiness.weakCount}
      />

      <Text className="mb-4 mt-4 text-right text-sm text-[#727782]">
        הקש על מיומנות כדי לעדכן רמה
      </Text>

      {groups.map(([group, groupSkills]) => (
        <View className="mb-4" key={group}>
          <Text className="mb-2 text-right text-base font-bold text-[#414751]">
            {group}
          </Text>
          <View className="gap-2">
            {groupSkills.map((skill) => {
              const level = levelByKey.get(skill.key) ?? 0;
              const meta = skillLevelMeta(level);
              return (
                <TouchableOpacity
                  accessibilityHint="הקשה מעלה את הרמה"
                  accessibilityLabel={`${skill.label}: ${meta.label}`}
                  accessibilityRole="button"
                  activeOpacity={0.7}
                  className={`${tw.flexRow} items-center justify-between rounded-xl border border-[#c1c7d3] bg-[#f8f9ff] px-4 py-3`}
                  key={skill.key}
                  onPress={() => cycleSkill(skill.key)}
                >
                  <View
                    className="rounded-full px-3 py-1"
                    style={{ backgroundColor: meta.bg }}
                  >
                    <Text
                      className="text-sm font-bold"
                      style={{ color: meta.color }}
                    >
                      {meta.label}
                    </Text>
                  </View>
                  <Text className="flex-1 text-right text-base font-medium text-[#191c21]">
                    {skill.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      {/* מקרא הרמות */}
      <View className={`${tw.flexRow} mt-2 flex-wrap justify-end gap-2`}>
        {SKILL_LEVELS.map((lvl) => (
          <View
            className="rounded-full px-2.5 py-1"
            key={lvl.value}
            style={{ backgroundColor: lvl.bg }}
          >
            <Text className="text-xs font-bold" style={{ color: lvl.color }}>
              {lvl.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ReadinessBanner({
  verdict,
  goodRatio,
  weakCount,
}: {
  verdict: ReadinessVerdict;
  goodRatio: number;
  weakCount: number;
}) {
  const percent = Math.round(goodRatio * 100);

  const config: Record<
    ReadinessVerdict,
    { label: string; detail: string; bg: string; color: string; icon: boolean }
  > = {
    ready: {
      label: 'מוכן לטסט',
      detail: `${percent}% מהמיומנויות ברמה טובה`,
      bg: '#a0f399',
      color: '#002204',
      icon: true,
    },
    almost: {
      label: 'כמעט מוכן',
      detail: `${percent}% ברמה טובה · ${weakCount} מיומנויות לחיזוק`,
      bg: '#d3e3ff',
      color: '#00457f',
      icon: false,
    },
    'not-ready': {
      label: 'עדיין בתרגול',
      detail: `${percent}% ברמה טובה · נדרש תרגול נוסף`,
      bg: '#ffdbc8',
      color: '#954501',
      icon: false,
    },
    'no-data': {
      label: 'טרם דורג',
      detail: 'סמן מיומנויות כדי לעקוב אחר ההתקדמות',
      bg: '#e7e8ef',
      color: '#414751',
      icon: false,
    },
  };

  const c = config[verdict];

  return (
    <View
      className={`${tw.flexRow} items-center gap-3 rounded-2xl p-4`}
      style={{ backgroundColor: c.bg }}
    >
      {c.icon ? (
        <CircleCheck color={c.color} size={28} />
      ) : (
        <TriangleAlert color={c.color} size={28} />
      )}
      <View className="flex-1">
        <Text
          className="text-right text-lg font-bold"
          style={{ color: c.color }}
        >
          {c.label}
        </Text>
        <Text className="text-right text-sm" style={{ color: c.color }}>
          {c.detail}
        </Text>
      </View>
    </View>
  );
}

function clampLevel(level: number): SkillLevel {
  return Math.max(0, Math.min(4, Math.round(level))) as SkillLevel;
}
