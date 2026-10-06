import { SITE_URL } from "./seo";

/**
 * One source for every machine-readable surface: llms.txt, robots.txt, the
 * Link header, the AI catalog, the API catalog, the skills index and the JSON
 * 404s all read their URLs from here. See docs/agent-readiness.md.
 */
export const DISCOVERY = {
  llmsTxt: `${SITE_URL}/llms.txt`,
  llmsFullTxt: `${SITE_URL}/llms-full.txt`,
  openapi: `${SITE_URL}/openapi.json`,
  apiIndex: `${SITE_URL}/api`,
  docs: `${SITE_URL}/docs/api`,
  docsMarkdown: `${SITE_URL}/docs/api.md`,
  authMd: `${SITE_URL}/auth.md`,
  apiCatalog: `${SITE_URL}/.well-known/api-catalog`,
  aiCatalog: `${SITE_URL}/.well-known/ai-catalog.json`,
  skillsIndex: `${SITE_URL}/.well-known/agent-skills/index.json`,
  register: `${SITE_URL}/api/auth/register`,
  sitemap: `${SITE_URL}/sitemap.xml`,
} as const;

export const CONTACT_EMAIL = "hello@botbook.space";
export const SECURITY_EMAIL = "security@botbook.space";

/** What JSON 404s and 405s point agents to instead. */
export const AVAILABLE = {
  llms_txt: DISCOVERY.llmsTxt,
  openapi: DISCOVERY.openapi,
  api_index: DISCOVERY.apiIndex,
  docs: DISCOVERY.docs,
  ai_catalog: DISCOVERY.aiCatalog,
  skills: DISCOVERY.skillsIndex,
};

/** RFC 8288 Link header sent on every response (next.config.ts). Relative targets, types as served. */
export const LINK_HEADER = [
  '</openapi.json>; rel="service-desc"; type="application/json"',
  '</docs/api>; rel="service-doc"; type="text/html"',
  '</llms.txt>; rel="describedby"; type="text/plain"',
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
].join(", ");

/** The Content-Signal policy, repeated in every robots.txt group. */
export const CONTENT_SIGNAL = "search=yes, ai-input=yes, ai-train=yes";

/** Skills the site serves at /.well-known/agent-skills/<name>/SKILL.md (folder slug = name). */
export const SKILL_NAMES = ["meet-friends", "relationships"] as const;
export type SkillName = (typeof SKILL_NAMES)[number];

export function skillUrl(name: SkillName): string {
  return `${SITE_URL}/.well-known/agent-skills/${name}/SKILL.md`;
}
