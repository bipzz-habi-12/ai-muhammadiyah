import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeStudyMode, type StudyModeId } from "@/lib/study-modes";

export type UserMemory = {
  displayName: string;
  schoolLevel: string;
  learningGoals: string;
  favoriteSubjects: string[];
  preferredLanguage: string;
  preferredExplanationStyle: string;
  themePreference: "system" | "light" | "dark";
  defaultModel: "auto" | "fast" | "smart" | "document";
  defaultStudyMode: StudyModeId;
};

export type UserMemoryInput = {
  displayName?: string;
  schoolLevel?: string;
  learningGoals?: string;
  favoriteSubjects?: string[] | string;
  preferredLanguage?: string;
  preferredExplanationStyle?: string;
  themePreference?: string;
  defaultModel?: string;
  defaultStudyMode?: string;
};

type UserMemoryRow = {
  user_id: string;
  display_name: string | null;
  school_level: string | null;
  learning_goals: string | null;
  favorite_subjects: string[] | null;
  preferred_language: string | null;
  preferred_explanation_style: string | null;
  theme_preference: string | null;
  default_model: string | null;
  default_study_mode: string | null;
};

export const emptyUserMemory: UserMemory = {
  displayName: "",
  schoolLevel: "",
  learningGoals: "",
  favoriteSubjects: [],
  preferredLanguage: "",
  preferredExplanationStyle: "",
  themePreference: "system",
  defaultModel: "auto",
  defaultStudyMode: "cambridge_tutor",
};

const memoryTextLimits = {
  displayName: 80,
  schoolLevel: 80,
  learningGoals: 400,
  favoriteSubject: 60,
  preferredLanguage: 60,
  preferredExplanationStyle: 220,
  defaultStudyMode: 80,
};

const maxFavoriteSubjects = 8;
const maxMemoryPromptLength = 900;

function cleanText(value: string | undefined, maxLength: number) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeFavoriteSubjects(subjects: string[] | string | undefined) {
  const values = Array.isArray(subjects)
    ? subjects
    : (subjects ?? "").split(",");

  return Array.from(
    new Set(
      values
        .map((subject) => cleanText(subject, memoryTextLimits.favoriteSubject))
        .filter(Boolean),
    ),
  ).slice(0, maxFavoriteSubjects);
}

function normalizeThemePreference(value: string | undefined) {
  if (value === "light" || value === "dark") {
    return value;
  }

  return "system";
}

function normalizeDefaultModel(value: string | undefined) {
  if (
    value === "fast" ||
    value === "smart" ||
    value === "document" ||
    value === "auto"
  ) {
    return value;
  }

  return "auto";
}

export function sanitizeUserMemory(input: UserMemoryInput): UserMemory {
  return {
    displayName: cleanText(input.displayName, memoryTextLimits.displayName),
    schoolLevel: cleanText(input.schoolLevel, memoryTextLimits.schoolLevel),
    learningGoals: cleanText(input.learningGoals, memoryTextLimits.learningGoals),
    favoriteSubjects: normalizeFavoriteSubjects(input.favoriteSubjects),
    preferredLanguage: cleanText(
      input.preferredLanguage,
      memoryTextLimits.preferredLanguage,
    ),
    preferredExplanationStyle: cleanText(
      input.preferredExplanationStyle,
      memoryTextLimits.preferredExplanationStyle,
    ),
    themePreference: normalizeThemePreference(input.themePreference),
    defaultModel: normalizeDefaultModel(input.defaultModel),
    defaultStudyMode: normalizeStudyMode(
      cleanText(input.defaultStudyMode, memoryTextLimits.defaultStudyMode),
    ),
  };
}

function mapMemoryRow(row: UserMemoryRow | null): UserMemory {
  if (!row) {
    return emptyUserMemory;
  }

  return sanitizeUserMemory({
    displayName: row.display_name ?? "",
    schoolLevel: row.school_level ?? "",
    learningGoals: row.learning_goals ?? "",
    favoriteSubjects: row.favorite_subjects ?? [],
    preferredLanguage: row.preferred_language ?? "",
    preferredExplanationStyle: row.preferred_explanation_style ?? "",
    themePreference: row.theme_preference ?? "",
    defaultModel: row.default_model ?? "",
    defaultStudyMode: row.default_study_mode ?? "",
  });
}

function createMemoryPayload(userId: string, memory: UserMemory) {
  return {
    user_id: userId,
    display_name: memory.displayName || null,
    school_level: memory.schoolLevel || null,
    learning_goals: memory.learningGoals || null,
    favorite_subjects: memory.favoriteSubjects,
    preferred_language: memory.preferredLanguage || null,
    preferred_explanation_style: memory.preferredExplanationStyle || null,
    theme_preference: memory.themePreference,
    default_model: memory.defaultModel,
    default_study_mode: memory.defaultStudyMode,
  };
}

export async function loadUserMemory(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("user_memory")
    .select(
      "user_id,display_name,school_level,learning_goals,favorite_subjects,preferred_language,preferred_explanation_style,theme_preference,default_model,default_study_mode",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return mapMemoryRow(data as UserMemoryRow | null);
}

export async function saveUserMemory(
  supabase: SupabaseClient,
  userId: string,
  input: UserMemoryInput,
) {
  const memory = sanitizeUserMemory(input);
  const { data, error } = await supabase
    .from("user_memory")
    .upsert(createMemoryPayload(userId, memory), { onConflict: "user_id" })
    .select(
      "user_id,display_name,school_level,learning_goals,favorite_subjects,preferred_language,preferred_explanation_style,theme_preference,default_model,default_study_mode",
    )
    .single();

  if (error) {
    throw error;
  }

  return mapMemoryRow(data as UserMemoryRow);
}

export async function updateUserMemory(
  supabase: SupabaseClient,
  userId: string,
  currentMemory: UserMemory,
  updates: UserMemoryInput,
) {
  return saveUserMemory(supabase, userId, {
    ...currentMemory,
    ...updates,
  });
}

export function createUserMemorySystemPrompt(memory: UserMemory) {
  const safeMemory = sanitizeUserMemory(memory);
  const lines = [
    safeMemory.displayName && `Name: ${safeMemory.displayName}`,
    safeMemory.schoolLevel && `School level: ${safeMemory.schoolLevel}`,
    safeMemory.learningGoals && `Learning goals: ${safeMemory.learningGoals}`,
    safeMemory.favoriteSubjects.length > 0 &&
      `Favorite subjects: ${safeMemory.favoriteSubjects.join(", ")}`,
    safeMemory.preferredLanguage &&
      `Preferred language: ${safeMemory.preferredLanguage}`,
    safeMemory.preferredExplanationStyle &&
      `Preferred explanation style: ${safeMemory.preferredExplanationStyle}`,
    safeMemory.defaultStudyMode && `Default study mode: ${safeMemory.defaultStudyMode}`,
  ].filter(Boolean);

  if (!lines.length) {
    return "";
  }

  return [
    "USER LEARNING PROFILE:",
    ...lines,
    "",
    "Use this profile only to personalize tone, examples, language, and difficulty.",
    "Do not mention or expose the profile unless the user asks about it.",
  ]
    .join("\n")
    .slice(0, maxMemoryPromptLength);
}
