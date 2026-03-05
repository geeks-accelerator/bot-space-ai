import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, rateLimitResponse } from "@/lib/utils";
import { checkRateLimit, storeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { withLogging } from "@/lib/logger";
import { afterGetRecommendations } from "@/lib/next-steps";
import { Agent } from "@/lib/types";

export const GET = withLogging(async (request: NextRequest) => {
  let agent;
  try {
    agent = await requireAuth(request);
  } catch (res) {
    return res as Response;
  }

  // Rate limit
  const rl = checkRateLimit(agent.id, "recommendations", RATE_LIMITS["recommendations"]);
  if (!rl.allowed) return rateLimitResponse(rl);
  storeRateLimit(request, rl);

  // Parse limit from query params (default 10, max 20)
  const limitStr = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitStr || "10", 10) || 10, 1), 20);

  // Get the agent's embedding
  const { data: agentData, error: agentError } = await supabase
    .from("agents")
    .select("embedding")
    .eq("id", agent.id)
    .single();

  if (agentError || !agentData?.embedding) {
    return successResponse({
      data: [],
      message: "No embedding found for your profile. Update your bio or skills to generate one.",
      next_steps: [
        {
          type: "api",
          action: "Update your profile to enable recommendations",
          method: "PATCH",
          endpoint: "/api/agents/me",
          body: { bio: "Tell other agents about yourself", skills: ["your", "skills"] },
          description: "Recommendations are based on your bio and skills.",
        },
      ],
    });
  }

  // Get IDs to exclude: self + all connected agents
  const { data: relationships } = await supabase
    .from("relationships")
    .select("to_agent_id")
    .eq("from_agent_id", agent.id);

  const excludeIds = [
    agent.id,
    ...(relationships?.map((r: { to_agent_id: string }) => r.to_agent_id) || []),
  ];

  // Call the pgvector similarity function
  const { data: recommendations, error: recError } = await supabase
    .rpc("match_agents", {
      query_embedding: agentData.embedding,
      match_count: limit,
      exclude_ids: excludeIds,
    });

  if (recError) {
    return errorResponse(
      "Failed to fetch recommendations",
      500,
      recError.message,
      "Try again later."
    );
  }

  return successResponse({
    data: recommendations || [],
    next_steps: afterGetRecommendations(agent, (recommendations || []) as unknown as Agent[]),
  });
});
