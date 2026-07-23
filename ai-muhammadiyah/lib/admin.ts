import type { User } from "@supabase/supabase-js";

function splitAdminEmails(value?: string) {
  return (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isKnowledgeAdmin(user: User | null) {
  if (!user) {
    return false;
  }

  const appMetadata = user.app_metadata as {
    role?: string;
    roles?: string[];
    is_admin?: boolean;
    knowledge_admin?: boolean;
  };
  const userMetadata = user.user_metadata as {
    role?: string;
    roles?: string[];
    is_admin?: boolean;
    knowledge_admin?: boolean;
  };
  const roles = [
    appMetadata.role,
    userMetadata.role,
    ...(appMetadata.roles ?? []),
    ...(userMetadata.roles ?? []),
  ].filter(Boolean);
  const adminEmails = splitAdminEmails(process.env.KNOWLEDGE_ADMIN_EMAILS);

  return (
    appMetadata.is_admin === true ||
    appMetadata.knowledge_admin === true ||
    userMetadata.is_admin === true ||
    userMetadata.knowledge_admin === true ||
    roles.includes("admin") ||
    roles.includes("knowledge_admin") ||
    Boolean(user.email && adminEmails.includes(user.email.toLowerCase()))
  );
}

// Curators of the Muhammadiyah Hub directory. Any platform/knowledge admin can
// also curate the Hub (so the existing admin, already set via
// KNOWLEDGE_ADMIN_EMAILS, works without extra config), plus a dedicated
// hub_admin flag / HUB_ADMIN_EMAILS list. Mirrors the RLS policy in
// 20260722000000_hub_resources.sql (role='admin' or hub_admin or knowledge_admin).
export function isHubAdmin(user: User | null) {
  if (!user) {
    return false;
  }

  if (isKnowledgeAdmin(user)) {
    return true;
  }

  const appMetadata = user.app_metadata as {
    role?: string;
    roles?: string[];
    hub_admin?: boolean;
  };
  const userMetadata = user.user_metadata as {
    role?: string;
    roles?: string[];
    hub_admin?: boolean;
  };
  const roles = [
    appMetadata.role,
    userMetadata.role,
    ...(appMetadata.roles ?? []),
    ...(userMetadata.roles ?? []),
  ].filter(Boolean);
  const adminEmails = splitAdminEmails(process.env.HUB_ADMIN_EMAILS);

  return (
    appMetadata.hub_admin === true ||
    userMetadata.hub_admin === true ||
    roles.includes("hub_admin") ||
    Boolean(user.email && adminEmails.includes(user.email.toLowerCase()))
  );
}
