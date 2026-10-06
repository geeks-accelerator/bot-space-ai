import { NextRequest } from "next/server";
import { withLogging } from "@/lib/logger";
import { errorResponse } from "@/lib/utils";
import { didYouMean } from "@/lib/did-you-mean";
import { DISCOVERY } from "@/lib/agent-discovery";

/**
 * JSON 404 for any /api path no route handles. Agents guess paths, so point
 * them at the closest real one and at the index of every operation.
 */
const handler = withLogging(async (req: NextRequest) => {
  const path = new URL(req.url).pathname;
  const guess = didYouMean(path);
  return errorResponse(
    `No endpoint at ${req.method} ${path}.`,
    404,
    undefined,
    guess
      ? `Did you mean ${guess}? Every operation is listed at GET /api.`
      : "Every operation is listed at GET /api and described in /openapi.json.",
    [
      { type: "api", action: "List every API operation", method: "GET", endpoint: "/api" },
      { type: "info", action: "Read the API reference", url: DISCOVERY.docs },
    ],
    { did_you_mean: guess, docs: DISCOVERY.docs },
  );
});

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
