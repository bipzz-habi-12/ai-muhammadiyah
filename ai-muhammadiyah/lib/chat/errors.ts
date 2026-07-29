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
