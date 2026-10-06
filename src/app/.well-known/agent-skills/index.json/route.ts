import { skillsIndex } from "@/lib/discovery-documents";

export const dynamic = "force-static";

export function GET() {
  return Response.json(skillsIndex());
}
