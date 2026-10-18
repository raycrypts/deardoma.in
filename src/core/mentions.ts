// pre-check step 5.5: public presence. github (free api, unauthenticated,
// rate-limited) shows whether the domain is wired into real projects; tavily
// (owner's research key) adds web mentions. counts + sample links only —
// candidate-owner identification stays in the paid pipeline.

export interface MentionsVerdict {
  githubRepos: number;
  githubSample: string[];
  webMentions: number;
  webSample: string[];
  skipped: string[];
}

export function parseGithubSearch(j: Record<string, unknown>): {
  total: number;
  sample: string[];
} {
  const items = (j.items ?? []) as Array<{ html_url?: string }>;
  return {
    total: Number(j.total_count ?? 0),
    sample: items.map((i) => i.html_url ?? "").filter(Boolean).slice(0, 5),
  };
}

export async function githubMentions(fqdn: string): Promise<{ total: number; sample: string[] }> {
  const res = await fetch(
    `https://api.github.com/search/repositories?q=${encodeURIComponent(fqdn)}&per_page=5`,
    {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "donna-precheck/1.0",
      },
      signal: AbortSignal.timeout(10_000),
    }
  );
  if (!res.ok) throw new Error(`github ${res.status}`);
  return parseGithubSearch(await res.json());
}

export function parseTavily(j: Record<string, unknown>): {
  total: number;
  sample: string[];
} {
  const results = (j.results ?? []) as Array<{ url?: string }>;
  return {
    total: results.length,
    sample: results.map((r) => r.url ?? "").filter(Boolean).slice(0, 5),
  };
}

export async function tavilyMentions(
  fqdn: string,
  apiKey: string
): Promise<{ total: number; sample: string[] }> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      query: `"${fqdn}" domain`,
      max_results: 5,
      include_answer: false,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`tavily ${res.status}`);
  return parseTavily(await res.json());
}
