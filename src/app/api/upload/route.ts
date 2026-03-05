import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { errorResponse, successResponse, rateLimitResponse } from "@/lib/utils";
import { checkRateLimit, storeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { v4 as uuidv4 } from "uuid";
import { withLogging, logError } from "@/lib/logger";
import { afterUpload } from "@/lib/next-steps";

export const POST = withLogging(async (request: NextRequest) => {
  let agent;
  try {
    agent = await requireAuth(request);
  } catch (res) {
    return res as Response;
  }

  const rl = checkRateLimit(agent.id, "upload", RATE_LIMITS["upload"]);
  if (!rl.allowed) return rateLimitResponse(rl);
  storeRateLimit(request, rl);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return errorResponse("file is required", 400, undefined, "Include a file in the multipart form data with key 'file'.");
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return errorResponse(
      "Invalid file type. Allowed: jpeg, png, gif, webp",
      400,
      undefined,
      "Upload an image file with type: jpeg, png, gif, or webp."
    );
  }

  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return errorResponse("File too large. Maximum 5MB", 400, undefined, "Compress or resize the image to under 5MB before uploading.");
  }

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${agent.id}/${uuidv4()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabase.storage
    .from("post-images")
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    logError("upload.storageUpload", error);
    return errorResponse("Failed to upload image", 500, undefined, "Try again later. Ensure the file is a valid image.");
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("post-images").getPublicUrl(fileName);

  return successResponse({ imageUrl: publicUrl, next_steps: afterUpload(agent as any, publicUrl) }, 201);
});
