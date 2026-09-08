import "server-only";

import type { ModelProviderId } from "@/lib/ai/model-catalog";
import {
  decryptUserApiKey,
  encryptUserApiKey,
  isUserApiKeyEncryptionConfigured,
} from "@/lib/secrets/crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProviderCredentialStatus = {
  provider: ModelProviderId;
  keyHint: string;
  validatedAt: string | null;
  updatedAt: string;
};

type CredentialRow = {
  provider: ModelProviderId;
  api_key_encrypted: string;
  key_hint: string | null;
  validated_at: string | null;
  updated_at: string;
};

const providerValidationUrls: Record<ModelProviderId, string> = {
  openai: "https://api.openai.com/v1/models?limit=1",
  google: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",
  anthropic: "https://api.anthropic.com/v1/models?limit=1",
};

function validationHeaders(
  provider: ModelProviderId,
  apiKey: string,
): Record<string, string> {
  if (provider === "anthropic") {
    return {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };
  }

  if (provider === "openai") {
    return { Authorization: `Bearer ${apiKey}` };
  }

  return {};
}

export function isModelProviderId(value: unknown): value is ModelProviderId {
  return value === "openai" || value === "google" || value === "anthropic";
}

export function normalizeUserApiKey(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 512) : "";
}

export async function validateProviderApiKey(
  provider: ModelProviderId,
  apiKey: string,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const url =
      provider === "google"
        ? `${providerValidationUrls.google}&key=${encodeURIComponent(apiKey)}`
        : providerValidationUrls[provider];
    const response = await fetch(url, {
      method: "GET",
      headers: validationHeaders(provider, apiKey),
      cache: "no-store",
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function listUserProviderCredentials(
  userId: string,
): Promise<ProviderCredentialStatus[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_provider_credentials")
    .select("provider,key_hint,validated_at,updated_at")
    .eq("user_id", userId)
    .order("provider");

  if (error) {
    throw error;
  }

  return ((data ?? []) as Omit<CredentialRow, "api_key_encrypted">[]).map(
    (row) => ({
      provider: row.provider,
      keyHint: row.key_hint ?? "",
      validatedAt: row.validated_at,
      updatedAt: row.updated_at,
    }),
  );
}

export async function loadUserProviderApiKey(
  userId: string,
  provider: ModelProviderId,
) {
  if (!isUserApiKeyEncryptionConfigured()) {
    return null;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_provider_credentials")
    .select("provider,api_key_encrypted,key_hint,validated_at,updated_at")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return decryptUserApiKey((data as CredentialRow).api_key_encrypted);
}

export async function saveUserProviderApiKey(
  userId: string,
  provider: ModelProviderId,
  apiKey: string,
) {
  if (!isUserApiKeyEncryptionConfigured()) {
    throw new Error("Vault API key pengguna belum dikonfigurasi.");
  }

  const supabase = createSupabaseServerClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("user_provider_credentials").upsert(
    {
      user_id: userId,
      provider,
      api_key_encrypted: encryptUserApiKey(apiKey),
      key_hint: apiKey.slice(-4),
      validated_at: now,
      updated_at: now,
    },
    { onConflict: "user_id,provider" },
  );

  if (error) {
    throw error;
  }
}

export async function deleteUserProviderApiKey(
  userId: string,
  provider: ModelProviderId,
) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("user_provider_credentials")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);

  if (error) {
    throw error;
  }
}
