// Hack fit score (spec 12.5.1) — donna's own view of whether a hack works
// as a name. Partial scaffold: dot count + file-extension clash are real;
// the rest are todo-marked integration points. It never replaces the
// existing tld risk radar and never judges an owner.
//
// the file-extension clash data is researched, not hand-picked: every
// flagged ending exists in research/file-ext-clash.json (freedesktop
// shared-mime-info + python mimetypes intersected with the iana root,
// severity tiers curated). the call site can pass the tld_meta row's
// clash info directly; without it we fall back to the generated seed so
// standalone calls still flag correctly.

import { TLD_META_SEED } from "./tld-meta-seed.generated.js";

const FILE_EXT = new Map(
  TLD_META_SEED.filter((m) => m.fileExtClash).map((m) => [
    m.tld,
    { severity: m.fileExtSeverity ?? null, note: m.fileExtNote ?? null },
  ])
);

export const FILE_EXTENSION_TLDS = [...FILE_EXT.keys()].sort();

export interface HackFit {
  dotCount: number;
  fileExtensionClash: boolean;
  fileExtensionSeverity: "high" | "medium" | null; // high: widely parsed (.py); medium: dev/technical
  fileExtensionNote: string | null; // what the ending reads as, e.g. ".py file (python source)"
  splitNaturalness: number | null; // TODO: natural-break scoring
  dotlessTwin: { fqdn: string; status: string; flagged: boolean } | null; // TODO: lookup
  autolinks: boolean | null; // TODO: linkify test
  reasons: string[];
}

export function hackFit(
  c: {
    fqdn: string;
    label: string;
    tld: string;
    dotCount: number;
  },
  fileExt?: { severity: "high" | "medium" | null; note: string | null }
): HackFit {
  const reasons: string[] = [];
  if (c.dotCount > 1) {
    reasons.push("extra dots: only the registrable part is owned long-term");
  }
  const ext = fileExt ?? FILE_EXT.get(c.tld) ?? null;
  const clash = ext != null;
  if (clash) {
    reasons.push(
      `tld reads as a file extension${ext?.note ? ` — ${ext.note}` : ""} — can trigger security warnings, filtering and clipboard mangling (spec 12.5.1 #6)`
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
    fileExtensionSeverity: ext?.severity ?? null,
    fileExtensionNote: ext?.note ?? null,
    splitNaturalness: null,
    dotlessTwin: null,
    autolinks: null,
    reasons,
  };
}
