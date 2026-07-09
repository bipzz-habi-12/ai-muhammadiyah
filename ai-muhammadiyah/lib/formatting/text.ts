export function getEmailInitials(email: string) {
  const cleanEmail = email.trim();

  if (!cleanEmail) {
    return "AM";
  }

  const [namePart] = cleanEmail.split("@");
  const namePieces = namePart.split(/[._-]+/).filter(Boolean);

  if (namePieces.length >= 2) {
    return `${namePieces[0][0]}${namePieces[1][0]}`.toUpperCase();
  }

  return cleanEmail.slice(0, 2).toUpperCase();
}

// Relative "time ago" in Indonesian from an ISO timestamp (client-side render).
// Used for conversation subtitles in the workspace sidebar ("Baru saja",
// "2 jam lalu", "Kemarin", ...). Formats existing Conversation.updatedAt — not
// a new data source.
export function formatRelativeTime(iso: string) {
  const then = new Date(iso).getTime();

  if (Number.isNaN(then)) {
    return "";
  }

  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Kemarin";
  if (days < 7) return `${days} hari lalu`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} minggu lalu`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} bulan lalu`;

  return `${Math.floor(days / 365)} tahun lalu`;
}
