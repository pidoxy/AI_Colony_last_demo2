const blocked = ["fuck", "bitch", "nigger", "faggot"];

export function cleanText(value: string, max: number) {
  const text = value.replace(/\s+/g, " ").trim().slice(0, max);
  const lower = text.toLowerCase();
  if (blocked.some((word) => lower.includes(word))) return "[answer removed]";
  return text;
}
