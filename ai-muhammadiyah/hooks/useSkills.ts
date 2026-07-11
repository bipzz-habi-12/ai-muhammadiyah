"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  canAccessTier,
  fetchSkills,
  getSkillBadge,
  resolveAllowedSkill,
  type Skill,
} from "@/lib/skills";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { SubscriptionTier } from "@/lib/usage/limits";

export function useSkills(
  tier: SubscriptionTier | undefined,
  setIsStudyModeMenuOpen: Dispatch<SetStateAction<boolean>>,
) {
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  // One-shot per-message skill override chosen via the "/" slash picker. Applies
  // only to the next sent message, then resets — deliberately NOT persisted to
  // localStorage (unlike selectedSkillId), per Master Plan v2's per-message model.
  const [messageSkillOverrideId, setMessageSkillOverrideId] = useState<
    string | null
  >(null);
  const skillsRef = useRef<Skill[]>([]);

  const loadSkills = useCallback(
    async (currentUserId: string): Promise<Skill[]> => {
      setSkillsLoading(true);

      try {
        const supabase = createSupabaseBrowserClient();
        const data = await fetchSkills(supabase, currentUserId);
        setSkills(data);
        return data;
      } catch (error) {
        console.error(error);
        return [];
      } finally {
        setSkillsLoading(false);
      }
    },
    [],
  );

  function selectSkill(skillId: string) {
    const skill = skills.find((item) => item.id === skillId);

    if (!skill || !canAccessTier(tier, skill.minTier)) {
      setIsStudyModeMenuOpen(false);
      router.push("/plans");
      return;
    }

    window.localStorage.setItem("ai-mu-study-mode", skillId);
    setSelectedSkillId(skillId);
    setIsStudyModeMenuOpen(false);
  }

  useEffect(() => {
    skillsRef.current = skills;
  }, [skills]);

  useEffect(() => {
    if (skillsLoading || selectedSkillId || !skills.length) {
      return;
    }

    const fallback = resolveAllowedSkill(null, tier, skills);

    if (fallback) {
      window.queueMicrotask(() => setSelectedSkillId(fallback.id));
    }
  }, [skillsLoading, skills, selectedSkillId, tier]);

  const selectedSkill = useMemo(
    () => skills.find((skill) => skill.id === selectedSkillId) ?? null,
    [skills, selectedSkillId],
  );
  const selectedSkillBadge = selectedSkill
    ? getSkillBadge(selectedSkill, tier)
    : "";

  return {
    skills,
    skillsLoading,
    selectedSkillId,
    setSelectedSkillId,
    skillsRef,
    loadSkills,
    selectSkill,
    selectedSkill,
    selectedSkillBadge,
    messageSkillOverrideId,
    setMessageSkillOverrideId,
  };
}
