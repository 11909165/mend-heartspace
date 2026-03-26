const GREETING_PATTERNS = [
  /^(hi|hello|hey|hiya|howdy)$/i,
  /^(hi|hello|hey|hiya|howdy)\s+there$/i,
  /^good\s+(morning|afternoon|evening)$/i,
];

export function isGreetingOnly(input: string): boolean {
  const normalized = input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;
  const words = normalized.split(" ");
  if (words.length > 3) return false;

  return GREETING_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function getGreetingReply(): string {
  return "Hi, I’m glad you’re here. How are you doing today?";
}
