// Central env config. Research integrations (querit/firecrawl/tavily) are
// optional until wired — see SCOPE.md. The scaffold boots without them.
export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgres://donna:donna@localhost:5432/donna",
  research: {
    querit: Boolean(process.env.QUERIT_API_KEY),
    firecrawl: Boolean(process.env.FIRECRAWL_API_KEY),
    tavily: Boolean(process.env.TAVILY_API_KEY),
  },
  history: {
    // paid pre-check providers (research/history-providers.md)
    whoisfreaks: Boolean(process.env.WHOISFREAKS_API_KEY),
    whoisxml: Boolean(process.env.WHOISXML_API_KEY),
    securitytrails: Boolean(process.env.SECURITYTRAILS_API_KEY),
  },
};
