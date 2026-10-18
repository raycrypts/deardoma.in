// reserved-mission endings: never registrable by the public, so donna never
// accepts them as precheck or campaign targets (spec: same rule as dom's
// suggestion engine — the two backends enforce it independently).
export const RESERVED_MISSION = new Map<string, string>([
  ["gov", "us government only (cisa/gsa)"],
  ["mil", "us military only"],
  ["edu", "us postsecondary institutions only (dept of education)"],
  ["int", "international treaty organizations only"],
  ["arpa", "iana infrastructure-only, never registered"],
]);

export function reservedReason(tld: string): string | null {
  const r = RESERVED_MISSION.get(tld.toLowerCase());
  return r ? `reserved-mission ending: ${r} — never registrable by the public` : null;
}
