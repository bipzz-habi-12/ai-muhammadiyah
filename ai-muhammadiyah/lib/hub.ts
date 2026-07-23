import type { SupabaseClient } from "@supabase/supabase-js";

// Muhammadiyah Hub data layer. Backs the /hub directory with a real,
// admin-curated table (public.hub_resources) instead of a hardcoded list.
// Shape mirrors lib/knowledge.ts: row type + camelCase mapper + RLS-scoped
// reads used by server components / API routes, plus a browser fetch helper.

export type HubResource = {
  id: string;
  title: string;
  meta: string | null;
  description: string | null;
  url: string;
  tag: string | null;
  category: string;
  icon: string | null;
  tint: string | null;
  bg: string | null;
  isFeatured: boolean;
  featuredVariant: "green" | "cream" | null;
  featuredCta: string | null;
  keywords: string[];
  status: "active" | "draft" | "archived";
  isPublic: boolean;
  sortOrder: number;
  createdAt: string | null;
};

type HubResourceRow = {
  id: string;
  title: string;
  meta: string | null;
  description: string | null;
  url: string;
  tag: string | null;
  category: string;
  icon: string | null;
  tint: string | null;
  bg: string | null;
  is_featured: boolean | null;
  featured_variant: "green" | "cream" | null;
  featured_cta: string | null;
  keywords: string[] | null;
  status: "active" | "draft" | "archived";
  is_public: boolean | null;
  sort_order: number | null;
  created_at: string | null;
};

// Fixed set of columns selected everywhere, so the mapper always gets the same
// shape whether the row comes from the RLS client or the service-role client.
export const HUB_RESOURCE_COLUMNS =
  "id,title,meta,description,url,tag,category,icon,tint,bg,is_featured,featured_variant,featured_cta,keywords,status,is_public,sort_order,created_at";

// Category tabs shown on /hub. Keys must match hub_resources.category. Any
// category present in the data but missing here still filters correctly; it
// just won't get a dedicated tab (see the union logic in HubDirectory).
export const HUB_CATEGORY_LABELS: Record<string, string> = {
  tarjih: "Tarjih",
  ibadah: "Ibadah",
  muamalah: "Muamalah",
  pendidikan: "Pendidikan",
  media: "Media",
  organisasi: "Organisasi",
};

export function hubCategoryLabel(category: string) {
  return (
    HUB_CATEGORY_LABELS[category] ??
    category.charAt(0).toUpperCase() + category.slice(1)
  );
}

// Relevance scoring shared by the directory search (client) and the "Tanya Hub"
// retrieval (server): every query token must appear in some field; the score
// sums the best-matching field weight per token, so more relevant rows rank
// higher. Case-insensitive substring over title/tag/keywords/meta/category/
// description — this is what makes "sholat" surface every shalat entry at once.
export function scoreHubResource(
  resource: HubResource,
  tokens: string[],
): number {
  const fields: Array<[string, number]> = [
    [resource.title, 5],
    [resource.tag ?? "", 4],
    [resource.keywords.join(" "), 3],
    [resource.meta ?? "", 2],
    [resource.category, 2],
    [resource.description ?? "", 1],
  ];
  const lowered = fields.map(
    ([text, weight]) => [text.toLowerCase(), weight] as const,
  );
  let total = 0;
  for (const token of tokens) {
    let best = 0;
    for (const [text, weight] of lowered) {
      if (text.includes(token)) {
        best = Math.max(best, weight);
      }
    }
    if (best === 0) {
      return 0;
    }
    total += best;
  }
  return total;
}

// Top-N most relevant resources for a free-text query (used by Tanya Hub to pick
// which curated sources to ground the answer on).
export function rankHubResources(
  query: string,
  resources: HubResource[],
  limit: number,
): HubResource[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return [];
  }
  return resources
    .map((resource) => ({ resource, score: scoreHubResource(resource, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) => b.score - a.score || a.resource.sortOrder - b.resource.sortOrder,
    )
    .slice(0, limit)
    .map((entry) => entry.resource);
}

function mapHubResource(row: HubResourceRow): HubResource {
  return {
    id: row.id,
    title: row.title,
    meta: row.meta,
    description: row.description,
    url: row.url,
    tag: row.tag,
    category: row.category,
    icon: row.icon,
    tint: row.tint,
    bg: row.bg,
    isFeatured: row.is_featured ?? false,
    featuredVariant: row.featured_variant,
    featuredCta: row.featured_cta,
    keywords: row.keywords ?? [],
    status: row.status,
    isPublic: row.is_public ?? true,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  };
}

// Trusted curated fallback — byte-identical to the migration seed. Used when the
// hub_resources table is missing (migration not applied yet) or empty, so the
// page never breaks and never shows fake data: these are the same official
// Muhammadiyah portals the app already links to. Negative ids keep React keys
// stable and can never collide with real uuids.
export const HUB_FALLBACK_RESOURCES: HubResource[] = [
  {
    id: "fallback-tarjih",
    title: "Majelis Tarjih & Tajdid",
    meta: "tarjih.or.id · Putusan & fatwa resmi",
    description:
      "Putusan, fatwa, dan tuntunan resmi Majelis Tarjih — rujukan utama untuk pertanyaan hukum & ibadah.",
    url: "https://tarjih.or.id",
    tag: "Tarjih",
    category: "tarjih",
    icon: "۩",
    tint: "#0F5A3D",
    bg: "rgba(15,90,61,0.1)",
    isFeatured: true,
    featuredVariant: "green",
    featuredCta: "Buka portal Tarjih →",
    keywords: ["tarjih", "tajdid", "fatwa", "putusan", "hukum", "ibadah"],
    status: "active",
    isPublic: true,
    sortOrder: 1,
    createdAt: null,
  },
  {
    id: "fallback-portal",
    title: "Portal Resmi Muhammadiyah",
    meta: "muhammadiyah.or.id · Persyarikatan",
    description:
      "Berita, kebijakan, dan informasi resmi Persyarikatan Muhammadiyah.",
    url: "https://muhammadiyah.or.id",
    tag: "Organisasi",
    category: "organisasi",
    icon: "◈",
    tint: "#3A453E",
    bg: "rgba(20,40,30,0.08)",
    isFeatured: true,
    featuredVariant: "cream",
    featuredCta: "Buka muhammadiyah.or.id →",
    keywords: ["muhammadiyah", "persyarikatan", "berita", "organisasi"],
    status: "active",
    isPublic: true,
    sortOrder: 2,
    createdAt: null,
  },
  {
    id: "fallback-diktilitbang",
    title: "Majelis Diktilitbang",
    meta: "diktilitbang.muhammadiyah.or.id · Pendidikan tinggi & penelitian",
    description:
      "Majelis Pendidikan Tinggi, Penelitian, dan Pengembangan Muhammadiyah.",
    url: "https://diktilitbang.muhammadiyah.or.id",
    tag: "Pendidikan",
    category: "pendidikan",
    icon: "✎",
    tint: "#B08833",
    bg: "rgba(176,136,51,0.14)",
    isFeatured: false,
    featuredVariant: null,
    featuredCta: null,
    keywords: ["pendidikan", "penelitian", "diktilitbang", "kampus", "universitas"],
    status: "active",
    isPublic: true,
    sortOrder: 3,
    createdAt: null,
  },
  {
    id: "fallback-suara",
    title: "Suara Muhammadiyah",
    meta: "suaramuhammadiyah.id · Media & literasi",
    description: "Kanal media dan literasi Persyarikatan Muhammadiyah.",
    url: "https://suaramuhammadiyah.id",
    tag: "Media",
    category: "media",
    icon: "◑",
    tint: "#2E6E8E",
    bg: "rgba(46,110,142,0.13)",
    isFeatured: false,
    featuredVariant: null,
    featuredCta: null,
    keywords: ["media", "berita", "literasi", "suara muhammadiyah"],
    status: "active",
    isPublic: true,
    sortOrder: 4,
    createdAt: null,
  },
];

// Sentinel error thrown when the table itself does not exist yet (migration not
// applied). Callers use this to distinguish "not migrated" from a real failure.
export const HUB_TABLE_MISSING = "hub_resources_table_missing";

function isMissingTableError(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  // 42P01 = undefined_table; PGRST205 = PostgREST schema-cache miss.
  return code === "42P01" || code === "PGRST205";
}

// RLS-scoped list of publicly visible Hub resources, curated order first.
// Throws HUB_TABLE_MISSING when the table is absent so the page can fall back.
export async function listHubResources(
  supabase: SupabaseClient,
): Promise<HubResource[]> {
  const { data, error } = await supabase
    .from("hub_resources")
    .select(HUB_RESOURCE_COLUMNS)
    .eq("status", "active")
    .eq("is_public", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) {
      throw new Error(HUB_TABLE_MISSING);
    }
    throw error;
  }

  return ((data ?? []) as HubResourceRow[]).map(mapHubResource);
}

// Admin listing (service-role client): includes draft/archived so a future admin
// UI can manage the full set. Same column shape as the public list.
export async function listAllHubResources(
  supabase: SupabaseClient,
): Promise<HubResource[]> {
  const { data, error } = await supabase
    .from("hub_resources")
    .select(HUB_RESOURCE_COLUMNS)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) {
      throw new Error(HUB_TABLE_MISSING);
    }
    throw error;
  }

  return ((data ?? []) as HubResourceRow[]).map(mapHubResource);
}

// --- Admin write validation -------------------------------------------------

type HubWriteRow = {
  title: string;
  meta: string | null;
  description: string | null;
  url: string;
  tag: string | null;
  category: string;
  icon: string | null;
  tint: string | null;
  bg: string | null;
  is_featured: boolean;
  featured_variant: "green" | "cream" | null;
  featured_cta: string | null;
  keywords: string[];
  status: "active" | "draft" | "archived";
  is_public: boolean;
  sort_order: number;
};

type CoerceResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, maxLength);
}

// Accepts either an array of strings or a comma-separated string; normalizes to
// a deduped, trimmed, lowercased list (search terms are matched case-insensitively).
function cleanKeywords(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (typeof entry !== "string") {
      continue;
    }
    const term = entry.trim().toLowerCase().slice(0, 40);
    if (term) {
      seen.add(term);
    }
    if (seen.size >= 40) {
      break;
    }
  }
  return [...seen];
}

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const HUB_STATUSES = new Set(["active", "draft", "archived"]);

// Validate + normalize an admin create payload into a DB insert row.
export function coerceHubResourceCreate(
  body: unknown,
): CoerceResult<HubWriteRow> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Data sumber Hub tidak valid." };
  }

  const input = body as Record<string, unknown>;

  const title = cleanString(input.title, 240);
  if (!title) {
    return { ok: false, error: "Judul sumber wajib diisi." };
  }

  const url = typeof input.url === "string" ? input.url.trim() : "";
  if (!url) {
    return { ok: false, error: "URL sumber wajib diisi." };
  }
  if (!isValidHttpUrl(url)) {
    return { ok: false, error: "URL harus diawali http:// atau https://" };
  }

  const status =
    typeof input.status === "string" && HUB_STATUSES.has(input.status)
      ? (input.status as HubWriteRow["status"])
      : "active";

  const featuredVariant =
    input.featuredVariant === "green" || input.featuredVariant === "cream"
      ? input.featuredVariant
      : null;

  const sortOrderRaw = Number(input.sortOrder);
  const sortOrder = Number.isFinite(sortOrderRaw)
    ? Math.trunc(sortOrderRaw)
    : 0;

  return {
    ok: true,
    value: {
      title,
      meta: cleanString(input.meta, 240),
      description: cleanString(input.description, 600),
      url: url.slice(0, 2048),
      tag: cleanString(input.tag, 60),
      category: cleanString(input.category, 60) ?? "organisasi",
      icon: cleanString(input.icon, 8),
      tint: cleanString(input.tint, 32),
      bg: cleanString(input.bg, 64),
      is_featured: input.isFeatured === true,
      featured_variant: featuredVariant,
      featured_cta: cleanString(input.featuredCta, 80),
      keywords: cleanKeywords(input.keywords),
      status,
      is_public: input.isPublic !== false,
      sort_order: sortOrder,
    },
  };
}

// Validate + normalize an admin update payload into a partial DB patch. Only
// keys actually present in the body are included, so unspecified columns keep
// their current value.
export function coerceHubResourceUpdate(
  body: unknown,
): CoerceResult<Partial<HubWriteRow>> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Data sumber Hub tidak valid." };
  }

  const input = body as Record<string, unknown>;
  const patch: Partial<HubWriteRow> = {};

  if ("title" in input) {
    const title = cleanString(input.title, 240);
    if (!title) {
      return { ok: false, error: "Judul sumber tidak boleh kosong." };
    }
    patch.title = title;
  }

  if ("url" in input) {
    const url = typeof input.url === "string" ? input.url.trim() : "";
    if (!url || !isValidHttpUrl(url)) {
      return { ok: false, error: "URL harus diawali http:// atau https://" };
    }
    patch.url = url.slice(0, 2048);
  }

  if ("meta" in input) patch.meta = cleanString(input.meta, 240);
  if ("description" in input)
    patch.description = cleanString(input.description, 600);
  if ("tag" in input) patch.tag = cleanString(input.tag, 60);
  if ("category" in input)
    patch.category = cleanString(input.category, 60) ?? "organisasi";
  if ("icon" in input) patch.icon = cleanString(input.icon, 8);
  if ("tint" in input) patch.tint = cleanString(input.tint, 32);
  if ("bg" in input) patch.bg = cleanString(input.bg, 64);
  if ("isFeatured" in input) patch.is_featured = input.isFeatured === true;
  if ("featuredVariant" in input) {
    patch.featured_variant =
      input.featuredVariant === "green" || input.featuredVariant === "cream"
        ? input.featuredVariant
        : null;
  }
  if ("featuredCta" in input)
    patch.featured_cta = cleanString(input.featuredCta, 80);
  if ("keywords" in input) patch.keywords = cleanKeywords(input.keywords);
  if ("status" in input) {
    if (typeof input.status !== "string" || !HUB_STATUSES.has(input.status)) {
      return { ok: false, error: "Status tidak valid." };
    }
    patch.status = input.status as HubWriteRow["status"];
  }
  if ("isPublic" in input) patch.is_public = input.isPublic !== false;
  if ("sortOrder" in input) {
    const sortOrderRaw = Number(input.sortOrder);
    patch.sort_order = Number.isFinite(sortOrderRaw)
      ? Math.trunc(sortOrderRaw)
      : 0;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "Tidak ada perubahan untuk disimpan." };
  }

  return { ok: true, value: patch };
}

// --- Browser helper ---------------------------------------------------------

export async function fetchHubResources() {
  const response = await fetch("/api/hub", {
    method: "GET",
    cache: "no-store",
  });
  const data = (await response.json()) as {
    error?: string;
    isAdmin?: boolean;
    resources?: HubResource[];
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Muhammadiyah Hub belum bisa dimuat.");
  }

  return {
    isAdmin: Boolean(data.isAdmin),
    resources: data.resources ?? [],
  };
}
