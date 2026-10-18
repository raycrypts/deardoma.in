// Reply classification intents (spec 8.3).
export type ReplyIntent =
  | "accept"
  | "counter"
  | "question"
  | "not_owner"
  | "decline"
  | "opt_out"
  | "hostile"
  | "auto_reply"
  | "bounce"
  | "unclear";

// Placeholder keyword heuristic until the LLM classifier is wired
// (classifier_negotiator, structured json outputs — spec 15).
// DO NOT treat this as production classification; it exists so the
// reply_ingest flow can be exercised end-to-end in the scaffold.
export function classifyReplyPlaceholder(body: string): ReplyIntent {
  const b = body.trim().toLowerCase();
  if (/^(no|no thanks|not interested|stop|unsubscribe|remove me)\b/.test(b)) {
    return "opt_out";
  }
  if (/(i'?m not the owner|not the owner|i don'?t own|isn'?t mine)/.test(b)) {
    return "not_owner";
  }
  if (/^(yes|sure|deal|ok|okay|accepted|i'?ll sell|i will sell|sounds good)/.test(b)) {
    return "accept";
  }
  if (/(out of office|auto-reply|autoreply|automated|vacation)/.test(b)) {
    return "auto_reply";
  }
  if (/\$\s?\d+|\b\d{2,4}\b\s*(dollars|usd)/.test(b)) {
    return "counter";
  }
  if (/(how does|what is|who is|when would|why)/.test(b)) {
    return "question";
  }
  return "unclear";
}
