export type SupabaseAuthError = {
  message: string;
  status?: number;
  code?: string;
  name?: string;
};

const isDevelopment = process.env.NODE_ENV === "development";

export function getFriendlyAuthError(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("invalid login credentials") ||
    normalizedMessage.includes("signup disabled") ||
    normalizedMessage.includes("user not found")
  ) {
    return "Email belum terdaftar. Silakan daftar terlebih dahulu.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "Email belum dikonfirmasi. Silakan verifikasi OTP dari email Anda.";
  }

  if (normalizedMessage.includes("already registered")) {
    return "Email ini sudah terdaftar. Silakan masuk lewat halaman login.";
  }

  if (normalizedMessage.includes("email")) {
    return "Format email belum benar. Mohon gunakan email aktif.";
  }

  return "Terjadi kendala. Silakan coba lagi sebentar.";
}

export function getAuthErrorMessage(error: SupabaseAuthError) {
  const friendlyMessage = getFriendlyAuthError(error.message);

  if (!isDevelopment) {
    return friendlyMessage;
  }

  return `${friendlyMessage} Detail Supabase: ${error.message}`;
}

export function logAuthError(context: string, error: SupabaseAuthError) {
  console.error(`[Supabase Auth] ${context}`, {
    status: error.status,
    message: error.message,
    code: error.code,
    name: error.name,
    error,
  });
}
