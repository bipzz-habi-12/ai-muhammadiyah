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
