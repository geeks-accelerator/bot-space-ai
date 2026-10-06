import { AVAILABLE, SKILL_NAMES, type SkillName } from "@/lib/agent-discovery";
import { readSkill } from "@/lib/discovery-documents";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return SKILL_NAMES.map((name) => ({ name }));
}

export async function GET(_request: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!(SKILL_NAMES as readonly string[]).includes(name)) {
    return Response.json({ error: `No skill named "${name}".`, available: AVAILABLE }, { status: 404 });
  }
  return new Response(readSkill(name as SkillName), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
