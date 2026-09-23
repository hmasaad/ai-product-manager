function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function isFreeTierQuota(error: unknown) {
  const text = errorText(error);
  return /free_tier_requests|check your plan and billing|free-tier quota is used up/i.test(text);
}

export function friendlyModelError(error: unknown) {
  const text = errorText(error);
  if (isFreeTierQuota(error)) {
    return "Gemini free-tier quota is used up. The plan below is the grounded read of your brief. Wait for the quota to reset, or enable billing at https://aistudio.google.com/.";
  }
  if (/\b429\b|RESOURCE_EXHAUSTED|quota exceeded/i.test(text)) {
    const seconds = text.match(/retry in ([\d.]+)\s*s/i);
    const wait = seconds ? Math.ceil(Number(seconds[1])) : 60;
    return `Gemini is rate-limited. The plan below is the grounded read of your brief. Wait about ${wait}s to try the model again.`;
  }
  return text;
}

export function retryDelayMs(error: unknown) {
  const text = errorText(error);
  if (!/\b429\b|RESOURCE_EXHAUSTED|quota exceeded/i.test(text)) return null;
  if (isFreeTierQuota(error)) return null;
  const seconds = text.match(/retry in ([\d.]+)\s*s/i);
  if (seconds) return Math.min(90_000, Math.ceil(Number(seconds[1]) * 1000) + 750);
  return 20_000;
}
