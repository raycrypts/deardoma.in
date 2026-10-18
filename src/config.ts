// Central env config. Research integrations (querit/firecrawl/tavily) are
// optional until wired — see SCOPE.md. The scaffold boots without them.
export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgres://domainhacks:domainhacks@localhost:5432/domainhacks",
  research: {
    querit: Boolean(process.env.QUERIT_API_KEY),
    firecrawl: Boolean(process.env.FIRECRAWL_API_KEY),
    tavily: Boolean(process.env.TAVILY_API_KEY),
  },
};
