/** Extract the outcome label from a Kalshi market question when present. */
export function outcomeNameFromQuestion(question: string): string {
  const parts = question.split(" — ");
  if (parts.length > 1) {
    return parts[parts.length - 1].trim() || question;
  }
  return question.trim();
}
