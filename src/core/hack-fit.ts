// Hack fit score (spec 12.5.1) — donna's own view of whether a hack works
// as a name. Partial scaffold: dot count + file-extension clash are real;
// the rest are todo-marked integration points. It never replaces the
// existing tld risk radar and never judges an owner.
export const FILE_EXTENSION_TLDS = [
  "zip", "mov", "sh", "py", "md", "rs", "exe", "dll", "app",
  "dmg", "iso", "pdf", "js", "ts", "gz",
];

export interface HackFit {
  dotCount: number;
  fileExtensionClash: boolean;
  splitNaturalness: number | null; // TODO: natural-break scoring
  dotlessTwin: { fqdn: string; status: string; flagged: boolean } | null; // TODO: lookup
  autolinks: boolean | null; // TODO: linkify test
  reasons: string[];
}

export function hackFit(c: {
  fqdn: string;
  label: string;
  tld: string;
  dotCount: number;
}): HackFit {
  const reasons: string[] = [];
  if (c.dotCount > 1) {
    reasons.push("extra dots: only the registrable part is owned long-term");
  }
  const clash = FILE_EXTENSION_TLDS.includes(c.tld);
  if (clash) {
    reasons.push(
      "tld reads like a file extension — can trigger security warnings and filtering (spec 12.5.1 #6)"
    );
  }
  // TODO (spec 12.5.1): split naturalness, dotless-twin lookup + flag check,
  // autolinking test in common linkify libraries, email fit, say-it-aloud
  // clarity, trademark joined-string match + homographs, short-label /
  // premium rules, registries that only sell under a second level,
  // 3-year renewal cost, web3 twin when the toggle is on.
  return {
    dotCount: c.dotCount,
    fileExtensionClash: clash,
    splitNaturalness: null,
    dotlessTwin: null,
    autolinks: null,
    reasons,
  };
}
