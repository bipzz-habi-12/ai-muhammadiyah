import { NextResponse } from "next/server";
import { isEngineConfigured } from "@/lib/ai/model-env";
import {
  modelCatalog,
  modelOptions,
} from "@/lib/ai/model-catalog";
import { listUserProviderCredentials } from "@/lib/ai/user-credentials";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { normalizeUsageSnapshot } from "@/lib/usage/limits";

export async function GET() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const [{ data: usageData }, credentials] = await Promise.all([
    supabase.rpc("get_usage_snapshot"),
    listUserProviderCredentials(user.id).catch((error) => {
      console.error("Provider credential status for model catalog failed:", {
        userId: user.id,
        error,
      });
      return [];
    }),
  ]);
  const usage = normalizeUsageSnapshot(usageData);
  const byokProviders = new Set(credentials.map((item) => item.provider));

  return NextResponse.json(
    {
      models: modelOptions.map((id) => {
        const definition = modelCatalog[id];
        return {
          id,
          ...definition,
          platformAllowed: Boolean(usage?.allowedModels.includes(id)),
          platformAvailable: isEngineConfigured(definition.provider, id),
          byokAvailable: byokProviders.has(definition.provider),
        };
      }),
      defaultModelId: "openai:gpt-5.6-luna",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
