import type { SubscriptionTier } from "@/lib/usage/limits";

export type StudyModeId =
  | "quick_explain"
  | "cambridge_tutor"
  | "osn_coach"
  | "islamic_teacher"
  | "coding_mentor"
  | "research_mode"
  | "step_by_step";

export type StudyModeAccess = "free" | "premium" | "tiered";

export type StudyModeDefinition = {
  id: StudyModeId;
  label: string;
  shortLabel: string;
  description: string;
  access: StudyModeAccess;
  premiumLabel?: string;
  freeLabel?: string;
};

export const defaultStudyMode: StudyModeId = "cambridge_tutor";

export const studyModeCatalog: Record<StudyModeId, StudyModeDefinition> = {
  quick_explain: {
    id: "quick_explain",
    label: "Quick Explain",
    shortLabel: "Quick",
    description: "Short, direct explanations with minimal formatting.",
    access: "free",
    freeLabel: "Free",
  },
  cambridge_tutor: {
    id: "cambridge_tutor",
    label: "Cambridge Tutor",
    shortLabel: "Cambridge",
    description: "Clear concepts, examples, and exam-style reasoning.",
    access: "tiered",
    freeLabel: "Basic",
    premiumLabel: "Advanced",
  },
  osn_coach: {
    id: "osn_coach",
    label: "OSN Coach",
    shortLabel: "OSN",
    description: "Olympiad reasoning for math, physics, and science.",
    access: "premium",
    premiumLabel: "Premium",
  },
  islamic_teacher: {
    id: "islamic_teacher",
    label: "Islamic Teacher",
    shortLabel: "Islamic",
    description: "Adab-aware Islamic learning with a modern study style.",
    access: "free",
    freeLabel: "Free",
  },
  coding_mentor: {
    id: "coding_mentor",
    label: "Coding Mentor",
    shortLabel: "Coding",
    description: "Step-by-step coding logic, debugging, and mentorship.",
    access: "free",
    freeLabel: "Free",
  },
  research_mode: {
    id: "research_mode",
    label: "Research Mode",
    shortLabel: "Research",
    description: "Formal, academic, structured deep explanations.",
    access: "premium",
    premiumLabel: "Premium",
  },
  step_by_step: {
    id: "step_by_step",
    label: "Step-by-Step",
    shortLabel: "Steps",
    description: "Guides incrementally before giving final answers.",
    access: "premium",
    premiumLabel: "Premium",
  },
};

export const studyModeOptions = Object.values(studyModeCatalog);

export function normalizeStudyMode(value?: string | null): StudyModeId {
  if (
    value === "quick_explain" ||
    value === "cambridge_tutor" ||
    value === "osn_coach" ||
    value === "islamic_teacher" ||
    value === "coding_mentor" ||
    value === "research_mode" ||
    value === "step_by_step"
  ) {
    return value;
  }

  if (
    value === "Kajian umum" ||
    value === "Persiapan ujian" ||
    value === "Ringkasan materi"
  ) {
    return "cambridge_tutor";
  }

  if (value === "Tanya jawab cepat") {
    return "quick_explain";
  }

  if (value === "Latihan soal") {
    return "step_by_step";
  }

  return defaultStudyMode;
}

export function isPremiumTier(tier?: SubscriptionTier | null) {
  return Boolean(tier && tier !== "free");
}

export function canUseStudyMode(
  mode: StudyModeId,
  tier?: SubscriptionTier | null,
) {
  const definition = studyModeCatalog[mode];

  return definition.access !== "premium" || isPremiumTier(tier);
}

export function resolveAllowedStudyMode(
  mode: string | null | undefined,
  tier?: SubscriptionTier | null,
) {
  const normalizedMode = normalizeStudyMode(mode);

  return canUseStudyMode(normalizedMode, tier)
    ? normalizedMode
    : defaultStudyMode;
}

export function getStudyModeBadge(mode: StudyModeId, tier?: SubscriptionTier | null) {
  const definition = studyModeCatalog[mode];

  if (definition.access === "tiered") {
    return isPremiumTier(tier)
      ? (definition.premiumLabel ?? "Premium")
      : (definition.freeLabel ?? "Basic");
  }

  return definition.access === "premium"
    ? (definition.premiumLabel ?? "Premium")
    : (definition.freeLabel ?? "Free");
}

export function createStudyModeSystemPrompt(
  mode: StudyModeId,
  tier?: SubscriptionTier | null,
) {
  const premium = isPremiumTier(tier);
  const modeName = studyModeCatalog[mode].label;
  const common = [
    "STUDY MODE:",
    `Active mode: ${modeName}.`,
    "Apply this mode as a lightweight teaching style while preserving the AI Muhammadiyah identity, user memory, and document priority rules.",
  ];

  if (mode === "quick_explain") {
    return [
      ...common,
      "- Answer briefly and directly.",
      "- Use minimal formatting.",
      "- Prefer the fastest useful explanation over broad background.",
    ].join("\n");
  }

  if (mode === "cambridge_tutor") {
    return [
      ...common,
      premium
        ? "- Use Advanced Cambridge depth: structured concepts, exam technique, common traps, and polished model-answer reasoning."
        : "- Use Cambridge Tutor Basic depth: clear concepts, moderate detail, and one useful example.",
      "- Explain like a careful Cambridge teacher.",
      "- Include exam-style reasoning when the question is academic or problem-based.",
      "- Keep the answer structured and understandable.",
    ].join("\n");
  }

  if (mode === "osn_coach") {
    return [
      ...common,
      "- Use olympiad-style reasoning for mathematics, physics, and science.",
      "- Focus on problem-solving strategy, invariants, derivations, proofs, and why each step works.",
      "- Encourage the learner to think before revealing the full path when appropriate.",
      "- Support advanced school and competition preparation.",
    ].join("\n");
  }

  if (mode === "islamic_teacher") {
    return [
      ...common,
      "- Use an Islamic, adab-aware tone that is respectful, calm, and educational.",
      "- Explain Islamic studies carefully without unsupported certainty on sensitive rulings.",
      "- Keep the style modern, practical, and suitable for learners.",
    ].join("\n");
  }

  if (mode === "coding_mentor") {
    return [
      ...common,
      "- Teach programming step by step from the learner's level.",
      "- Explain logic, tradeoffs, and debugging clues.",
      "- Prefer runnable examples and small checkpoints for coding tasks.",
      "- Support beginner through advanced learners without talking down to them.",
    ].join("\n");
  }

  if (mode === "research_mode") {
    return [
      ...common,
      "- Use formal academic style with clear sections.",
      "- Give deeper detail, definitions, assumptions, and careful distinctions.",
      "- Separate evidence, analysis, and limitations when relevant.",
      "- Avoid casual phrasing unless the user asks for it.",
    ].join("\n");
  }

  return [
    ...common,
    "- Guide incrementally and do not immediately jump to the final answer for school-style problems.",
    "- Start with understanding the problem, then hints, then worked steps.",
    "- Ask or present the next thinking step before finalizing when the learner appears to be practicing.",
    "- If the user explicitly asks for the final answer, still show the reasoning path clearly.",
  ].join("\n");
}
