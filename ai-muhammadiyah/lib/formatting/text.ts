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
