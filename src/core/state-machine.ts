// Campaign lifecycle state machine (spec section 4). Pure functions.
export type CampaignState =
  | "created"
  | "prechecked"
  | "deployed"
  | "contacting"
  | "awaiting_reply"
  | "followed_up"
  | "no_response"
  | "replied"
  | "negotiating"
  | "agreed"
  | "declined"
  | "handoff_to_buyer"
  | "payment_pending"
  | "transfer_pending"
  | "completed"
  | "opted_out"
  | "closed";

const TRANSITIONS: Record<CampaignState, CampaignState[]> = {
  created: ["prechecked"],
  prechecked: ["deployed"],
  deployed: ["contacting"],
  contacting: ["awaiting_reply"],
  awaiting_reply: ["followed_up", "replied"],
  followed_up: ["no_response", "replied"],
  no_response: ["closed"],
  replied: ["negotiating", "declined", "handoff_to_buyer"],
  negotiating: ["agreed", "declined", "handoff_to_buyer"],
  agreed: ["payment_pending"],
  payment_pending: ["transfer_pending", "handoff_to_buyer", "closed"],
  transfer_pending: ["completed", "handoff_to_buyer", "closed"],
  declined: ["closed"],
  handoff_to_buyer: ["negotiating", "agreed", "declined", "closed"],
  completed: [],
  opted_out: [],
  closed: [],
};

// Configurable timeouts in days (spec 4): follow-up, no-response, staleness alerts.
export const TIMEOUTS = {
  followUpAfterDays: 4,
  noResponseAfterDays: 7,
  staleAfterDays: 7,
};

export function canTransition(from: CampaignState, to: CampaignState): boolean {
  if (to === "opted_out") return from !== "opted_out"; // any state -> opted_out
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(
  from: CampaignState,
  to: CampaignState
): void {
  if (!canTransition(from, to)) {
    throw new Error(`illegal transition: ${from} -> ${to}`);
  }
}

export const TERMINAL_STATES: CampaignState[] = [
  "completed",
  "opted_out",
  "closed",
];
