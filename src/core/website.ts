// pre-check step 5.3: fetch the target's website and classify it.
// the classes are the product's core "is this buyable" evidence:
// parked (long-term parked = the single best buyable signal),
// for_sale (owner already wants out — easiest deal), default_page /
// placeholder (neglect), live (in use, harder), no_site (nothing there).
// emails + contact forms harvested here feed step 5.6 and reachability.

export type WebsiteClass =
  | "parked"
  | "for_sale"
  | "default_page"
  | "placeholder"
  | "live"
  | "no_site";

export interface WebsiteVerdict {
  classification: WebsiteClass;
  emails: string[];
  contactForm: boolean;
  textLength: number;
  title: string | null;
}

const PARKED_RE =
  /sedoparking|parkingcrew|bodis|cashparking|hugedomains|related (searches|links)|domain (parking|is parked)|parkingcrew|above\.com|parklogic|buy this domain|this domain may be for sale|domain for sale/i;
const FOR_SALE_RE =
  /make (me )?an offer|asking price|dan\.com|afternic|sedo\.com|flippa|this domain is for sale|purchase this domain|buy now price|escrow\.com/i;
const DEFAULT_RE =
  /welcome to nginx|apache2 (default|ubuntu) page|iis windows server|future home of|default web site page|index of \/|welcome to your (new|first) (website|hosting)/i;
const PLACEHOLDER_RE =
  /under construction|coming soon|nothing here yet|watch this space|site (being|is being) (built|redesigned)|new website on the way/i;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

export function classifyWebsite(html: string | null): WebsiteVerdict {
  if (!html || html.trim().length === 0) {
    return { classification: "no_site", emails: [], contactForm: false, textLength: 0, title: null };
  }
  const lower = html.toLowerCase();
  const text = lower.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, " ").replace(/\s+/g, " ");
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const emails = [...new Set(html.match(EMAIL_RE) ?? [])].filter(
    (e) => !/\.(png|jpe?g|gif|svg|webp)$/i.test(e)
  );
  const contactForm = /<form[\s\S]{0,400}(email|message|name=)/i.test(html);

  const v: WebsiteVerdict = {
    classification: "live",
    emails,
    contactForm,
    textLength: text.length,
    title: titleMatch ? titleMatch[1].trim() : null,
  };

  // order matters: parking/for-sale infra beats neglect beats thinness
  if (PARKED_RE.test(lower)) v.classification = "parked";
  else if (FOR_SALE_RE.test(lower)) v.classification = "for_sale";
  else if (DEFAULT_RE.test(lower)) v.classification = "default_page";
  else if (PLACEHOLDER_RE.test(lower)) v.classification = "placeholder";
  else if (text.length < 400 && emails.length === 0 && !contactForm) {
    v.classification = "placeholder";
  }
  return v;
}

// fetch with a plain user agent; firecrawl fallback when the site blocks bots
// (firecrawl is the owner's research key, used sparingly for paid pre-checks)
export async function fetchWebsite(
  fqdn: string,
  firecrawlKey?: string
): Promise<string | null> {
  try {
    const res = await fetch(`https://${fqdn}/`, {
      headers: { "user-agent": "donna-precheck/1.0 (+domain broker pre-check)" },
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
    });
    if (res.ok) return await res.text();
  } catch {
    // fall through to firecrawl
  }
  if (firecrawlKey) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          authorization: `Bearer ${firecrawlKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ url: `https://${fqdn}`, formats: ["markdown"] }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) return null;
      const j = (await res.json()) as { data?: { markdown?: string } };
      return j.data?.markdown ?? null;
    } catch {
      return null;
    }
  }
  return null;
}
