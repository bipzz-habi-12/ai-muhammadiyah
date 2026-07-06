import type { Skill } from "@/lib/skills";

// Legacy compat: conversations/messages.study_mode and user_memory.default_study_mode
// still store the old study-mode text values (no skill_id column exists yet on those
// tables). Map those legacy values to a platform skill name so historical data and
// existing localStorage/profile defaults still resolve to a real skill.
const legacyStudyModeSkillNames: Record<string, string> = {
  quick_explain: "Quick Explain",
  cambridge_tutor: "Cambridge Tutor",
  osn_coach: "OSN Coach",
  islamic_teacher: "Islamic Teacher",
  coding_mentor: "Coding Mentor",
  research_mode: "Research Mode",
  step_by_step: "Step-by-Step",
  "Kajian umum": "Cambridge Tutor",
  "Persiapan ujian": "Cambridge Tutor",
  "Ringkasan materi": "Cambridge Tutor",
  "Tanya jawab cepat": "Quick Explain",
  "Latihan soal": "Step-by-Step",
};

export const skillNameToLegacyStudyMode: Record<string, string> = {
  "Quick Explain": "quick_explain",
  "Cambridge Tutor": "cambridge_tutor",
  "OSN Coach": "osn_coach",
  "Islamic Teacher": "islamic_teacher",
  "Coding Mentor": "coding_mentor",
  "Research Mode": "research_mode",
  "Step-by-Step": "step_by_step",
};

export function resolveSkillIdFromLegacyValue(
  value: string | null | undefined,
  skills: Skill[],
): string | null {
  if (!value) {
    return null;
  }

  const byId = skills.find((skill) => skill.id === value);

  if (byId) {
    return byId.id;
  }

  const legacyName = legacyStudyModeSkillNames[value];
  const byName = legacyName
    ? skills.find(
        (skill) => skill.ownerId === null && skill.name === legacyName,
      )
    : undefined;

  return byName?.id ?? null;
}

export function skillToLegacyStudyMode(skill: Skill | null): string {
  if (skill && skillNameToLegacyStudyMode[skill.name]) {
    return skillNameToLegacyStudyMode[skill.name];
  }

  return "cambridge_tutor";
}
