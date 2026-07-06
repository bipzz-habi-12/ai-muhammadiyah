export const continuationMarker = "[[AI_MU_CONTINUE_SUGGESTED]]";

export function getFriendlyChatError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Maaf, chat AI sedang bermasalah. Silakan coba lagi.";
  }

  if (
    error.message === "Chat API request failed" ||
    error.message === "Chat stream is unavailable" ||
    error.message === "Chat stream returned an empty reply"
  ) {
    return "Maaf, chat AI sedang bermasalah. Silakan coba lagi.";
  }

  return error.message;
}

export function parseContinuationMarker(text: string) {
  const needsContinuation = text.includes(continuationMarker);
  const cleanText = text.replaceAll(continuationMarker, "").trimEnd();

  return {
    text: cleanText,
    needsContinuation:
      needsContinuation || looksLikeIncompleteAssistantReply(cleanText),
  };
}

export function looksLikeIncompleteAssistantReply(text: string) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return false;
  }

  const lines = trimmedText.split(/\r?\n/).filter(Boolean);
  const lastLine = lines.at(-1)?.trim() ?? "";
  const lowerText = trimmedText.toLowerCase();
  const lowerLastLine = lastLine.toLowerCase();

  if (/[.!?。؟)]$/.test(trimmedText)) {
    return false;
  }

  if (trimmedText.endsWith(":")) {
    return true;
  }

  if (/^([-*•]|\d+[.)])\s*$/.test(lastLine)) {
    return true;
  }

  if (/^([-*•]|\d+[.)])\s+\S{0,32}$/.test(lastLine) && !/[.!?)]$/.test(lastLine)) {
    return true;
  }

  const unfinishedPhrases = [
    "berikut",
    "yaitu",
    "antara lain",
    "sebagai berikut",
    "di antaranya",
    "mencakup",
    "meliputi",
    "contohnya",
    "adalah",
    "then",
    "such as",
    "including",
  ];

  return unfinishedPhrases.some(
    (phrase) =>
      lowerText.endsWith(phrase) ||
      lowerLastLine.endsWith(phrase) ||
      lowerLastLine.endsWith(`${phrase}:`),
  );
}
