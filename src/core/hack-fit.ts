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


// say-it-aloud test (spec 12.5.1): what happens at the label/tld boundary
// when a person speaks the domain out loud. deterministic, letter-level
// phonology rules for english; the intent is ranking + explanation, never
// exclusion.
//
// boundary classes, best to worst:
//   natural          read.it, delicio.us — clean syllable boundary
//   digraph_split    lig.ht, tric.ky — the dot cuts a single phoneme that
//                    STRADDLES the boundary (gh, ck); tlds that only START with
//                    a digraph (.sh in wi.sh, .ch in wat.ch) read naturally
//   doubled_consonant runn.ing — double letters across the dot; sounds natural
//                    (double consonants are one sound in english), reads odd
//   vowel_seam       rad.io — vowel against vowel; a glottal stop joins them,
//                    usually fine aloud, occasionally "ca.me.ra" awkward
//   blend_required   runni.ng, pi.ng — the tld starts with a cluster english
//                    cannot start a syllable with (ng/gn/ps/pn/rh); the listener
//                    must blend the parts to reconstruct the word — the weakest
//                    say-aloud class (and the class most often misheard)

const DIGRAPHS = new Set(["th", "sh", "ch", "ph", "wh", "ck", "gh", "ng", "qu"]);
// clusters that cannot begin an english syllable — the listener must blend
const UNSPEAKABLE_STARTS = new Set(["ng", "nk", "gn", "ps", "pn", "rh", "tm"]);

export interface SayItAloud {
  category: "natural" | "digraph_split" | "doubled_consonant" | "vowel_seam" | "blend_required";
  penalty: number; // rank penalty; 0 for natural
  note: string; // human-readable explanation
}

export function sayItAloud(label: string, tld: string): SayItAloud {
  const a = label.slice(-1).toLowerCase();
  const b = tld.slice(0, 1).toLowerCase();
  const pair = a + b;
  const isVowel = (ch: string) => "aeiouy".includes(ch);
  if (UNSPEAKABLE_STARTS.has(tld.slice(0, 2).toLowerCase())) {
    return {
      category: "blend_required",
      penalty: 150,
      note: `\`.${tld}\` can't start an english syllable — the listener must blend the parts to hear the word`,
    };
  }
  if (DIGRAPHS.has(pair) && tld.length >= 2) {
    return {
      category: "digraph_split",
      penalty: 50,
      note: `dot splits the \`${pair}\` sound (${label} dot ${tld}) — sounds right blended, broken on paper`,
    };
  }
  if (a === b && !isVowel(a)) {
    return {
      category: "doubled_consonant",
      penalty: 25,
      note: `double \`${a}\` across the dot — one sound aloud, doubled on paper`,
    };
  }
  if (isVowel(a) && isVowel(b)) {
    return {
      category: "vowel_seam",
      penalty: 25,
      note: "vowel meets vowel — a glottal stop joins them; usually fine aloud",
    };
  }
  return { category: "natural", penalty: 0, note: "clean syllable boundary" };
}

export interface HackFit {
  dotCount: number;
  fileExtensionClash: boolean;
  fileExtensionSeverity: "high" | "medium" | null; // high: widely parsed (.py); medium: dev/technical
  fileExtensionNote: string | null; // what the ending reads as, e.g. ".py file (python source)"
  sayItAloud: SayItAloud;
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
  const say = sayItAloud(c.label, c.tld);
  if (say.penalty >= 150) {
    reasons.push(say.note);
  } else if (say.penalty > 0) {
    reasons.push(`say-it-aloud: ${say.note}`);
  }
  // TODO (spec 12.5.1): dotless-twin lookup + flag check,
  // autolinking test in common linkify libraries, email fit, say-it-aloud
  // clarity, trademark joined-string match + homographs, short-label /
  // premium rules, registries that only sell under a second level,
  // 3-year renewal cost, web3 twin when the toggle is on.
  return {
    dotCount: c.dotCount,
    fileExtensionClash: clash,
    fileExtensionSeverity: ext?.severity ?? null,
    fileExtensionNote: ext?.note ?? null,
    sayItAloud: say,
    dotlessTwin: null,
    autolinks: null,
    reasons,
  };
}
