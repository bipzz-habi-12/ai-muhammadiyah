"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { resolveSkillIdFromLegacyValue } from "@/lib/mappers/legacy-study-mode";
import {
  emptyUserMemory,
  loadUserMemory,
  sanitizeUserMemory,
  updateUserMemory,
  type UserMemory,
} from "@/lib/memory/user-memory";
import { resolveAllowedSkill, type Skill } from "@/lib/skills";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { PlanModelId } from "@/lib/subscriptions/plans";
import type { SubscriptionTier } from "@/lib/usage/limits";

export function useUserMemory(
  userId: string,
  skills: Skill[],
  tier: SubscriptionTier | undefined,
  setSelectedModel: Dispatch<SetStateAction<PlanModelId>>,
  setSelectedSkillId: Dispatch<SetStateAction<string | null>>,
) {
  const [learningProfile, setLearningProfile] =
    useState<UserMemory>(emptyUserMemory);
  const [profileDraft, setProfileDraft] = useState<UserMemory>(emptyUserMemory);
  const [favoriteSubjectsDraft, setFavoriteSubjectsDraft] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSavedMessage, setProfileSavedMessage] = useState("");

  const loadLearningProfile = useCallback(
    async (
      currentUserId: string,
      currentSkills: Skill[],
      currentTier: SubscriptionTier | undefined,
    ) => {
      try {
        setProfileError("");
        const supabase = createSupabaseBrowserClient();
        const memory = await loadUserMemory(supabase, currentUserId);
        setLearningProfile(memory);
        setProfileDraft(memory);
        setFavoriteSubjectsDraft(memory.favoriteSubjects.join(", "));
        setSelectedModel(memory.defaultModel);
        setSelectedSkillId(
          resolveAllowedSkill(
            resolveSkillIdFromLegacyValue(
              window.localStorage.getItem("ai-mu-study-mode") ??
                memory.defaultStudyMode,
              currentSkills,
            ),
            currentTier,
            currentSkills,
          )?.id ?? null,
        );
      } catch (error) {
        console.error(error);
        setProfileError("Learning Profile belum bisa dimuat.");
      }
    },
    [setSelectedModel, setSelectedSkillId],
  );

  function updateProfileDraft<K extends keyof UserMemory>(
    key: K,
    value: UserMemory[K],
  ) {
    setProfileDraft((currentDraft) => ({
      ...currentDraft,
      [key]: value,
    }));
  }

  async function saveLearningProfile() {
    if (!userId || isSavingProfile) return;

    setIsSavingProfile(true);
    setProfileError("");
    setProfileSavedMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const savedMemory = await updateUserMemory(
        supabase,
        userId,
        learningProfile,
        sanitizeUserMemory({
          ...profileDraft,
          favoriteSubjects: favoriteSubjectsDraft,
        }),
      );

      setLearningProfile(savedMemory);
      setProfileDraft(savedMemory);
      setFavoriteSubjectsDraft(savedMemory.favoriteSubjects.join(", "));
      setSelectedModel(savedMemory.defaultModel);
      const resolvedSkillId =
        resolveAllowedSkill(
          resolveSkillIdFromLegacyValue(savedMemory.defaultStudyMode, skills),
          tier,
          skills,
        )?.id ?? null;
      if (resolvedSkillId) {
        window.localStorage.setItem("ai-mu-study-mode", resolvedSkillId);
      }
      setSelectedSkillId(resolvedSkillId);
      setProfileSavedMessage("Learning Profile tersimpan.");
    } catch (error) {
      console.error(error);
      setProfileError("Learning Profile belum bisa disimpan.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  const profileLabel = useMemo(
    () =>
      learningProfile.displayName ||
      learningProfile.schoolLevel ||
      "Lengkapi profil",
    [learningProfile.displayName, learningProfile.schoolLevel],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = learningProfile.themePreference;
  }, [learningProfile.themePreference]);

  return {
    learningProfile,
    setLearningProfile,
    profileDraft,
    setProfileDraft,
    favoriteSubjectsDraft,
    setFavoriteSubjectsDraft,
    isSavingProfile,
    profileError,
    setProfileError,
    profileSavedMessage,
    setProfileSavedMessage,
    profileLabel,
    loadLearningProfile,
    updateProfileDraft,
    saveLearningProfile,
  };
}
