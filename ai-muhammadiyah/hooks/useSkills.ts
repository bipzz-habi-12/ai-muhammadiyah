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
  // The user whose skills are loaded, captured so the CRUD handlers can refetch
  // after a mutation without threading userId through every call site.
  const userIdRef = useRef<string | null>(null);
  const [isMutatingSkill, setIsMutatingSkill] = useState(false);
  const [skillMutationError, setSkillMutationError] = useState("");

  const loadSkills = useCallback(
    async (currentUserId: string): Promise<Skill[]> => {
      setSkillsLoading(true);
      userIdRef.current = currentUserId;

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

  // Shared write path for POST /api/skills and PATCH/DELETE /api/skills/[id].
  // On success it refetches the full list (RLS-scoped) so the UI, slash picker,
  // and skill dropdown all reflect the change. Returns true on success.
  const runSkillMutation = useCallback(
    async (
      path: string,
      method: "POST" | "PATCH" | "DELETE",
      payload?: Record<string, unknown>,
    ): Promise<boolean> => {
      setIsMutatingSkill(true);
      setSkillMutationError("");

      try {
        const response = await fetch(path, {
          method,
          headers: payload ? { "Content-Type": "application/json" } : undefined,
          body: payload ? JSON.stringify(payload) : undefined,
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          setSkillMutationError(data?.error ?? "Skill belum bisa disimpan.");
          return false;
        }

        if (userIdRef.current) {
          await loadSkills(userIdRef.current);
        }
        return true;
      } catch (error) {
        console.error(error);
        setSkillMutationError("Koneksi bermasalah. Coba lagi.");
        return false;
      } finally {
        setIsMutatingSkill(false);
      }
    },
    [loadSkills],
  );

  const createCustomSkill = useCallback(
    (payload: Record<string, unknown>) =>
      runSkillMutation("/api/skills", "POST", payload),
    [runSkillMutation],
  );

  const updateCustomSkill = useCallback(
    (id: string, payload: Record<string, unknown>) =>
      runSkillMutation(`/api/skills/${id}`, "PATCH", payload),
    [runSkillMutation],
  );

  const deleteCustomSkill = useCallback(
    (id: string) => runSkillMutation(`/api/skills/${id}`, "DELETE"),
    [runSkillMutation],
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
    createCustomSkill,
    updateCustomSkill,
    deleteCustomSkill,
    isMutatingSkill,
    skillMutationError,
    setSkillMutationError,
  };
}
