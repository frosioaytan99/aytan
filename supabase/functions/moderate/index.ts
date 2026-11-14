import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "moderation_not_configured" }, 503);
  }

  // This endpoint is called only by the server-side Next.js API route.
  // Never expose the service-role key to the browser.
  if (request.headers.get("Authorization") !== `Bearer ${serviceRoleKey}`) {
    return json({ error: "unauthorized" }, 401);
  }

  let payload: { message_id?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const messageId = typeof payload.message_id === "string" ? payload.message_id : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(messageId)) {
    return json({ error: "invalid_message_id" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: message, error: lookupError } = await supabase
    .from("messages")
    .select("id,body")
    .eq("id", messageId)
    .maybeSingle();

  if (lookupError || !message) return json({ error: "message_not_found" }, 404);

  // Lightweight privacy screening only: it can catch some obvious email/phone
  // patterns, but it is not a substitute for human moderation or safety review.
  const body = String(message.body || "");
  const containsEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(body);
  const containsPhone = /(?:\+?\d[\d\s().-]{7,}\d)/.test(body);
  const flagged = containsEmail || containsPhone;

  if (flagged) {
    const reason = containsEmail && containsPhone
      ? "possible_email_and_phone_number"
      : containsEmail
        ? "possible_email_address"
        : "possible_phone_number";

    const { error: updateError } = await supabase
      .from("messages")
      .update({ is_flagged: true })
      .eq("id", messageId);

    if (updateError) return json({ error: "moderation_update_failed" }, 500);

    const { error: logError } = await supabase.from("moderation_logs").insert({
      message_id: messageId,
      moderator: "privacy-screen",
      action: "flagged",
      reason,
    });

    if (logError) return json({ error: "moderation_log_failed" }, 500);
  }

  return json({ flagged, reason: flagged ? "possible_contact_information" : null });
});
