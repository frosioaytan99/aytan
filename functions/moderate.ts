// functions/moderate.ts
// Supabase Edge Function (Deno + TypeScript) — modération automatique basique.
import { serve } from "std/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const PROFANITY = ["insulte1", "insulte2", "mot_interdit"]; // remplacez par votre liste ou API

serve(async (req) => {
  try {
    const { message_id } = await req.json();
    if (!message_id) return new Response("missing message_id", { status: 400 });

    // get message
    const { data: msgRes, error } = await supabase
      .from("messages")
      .select("id, body, sender, recipient")
      .eq("id", message_id)
      .single();

    if (error || !msgRes) return new Response("message not found", { status: 404 });

    const body: string = msgRes.body || "";
    const lower = body.toLowerCase();
    const flag = PROFANITY.some(p => lower.includes(p));

    if (flag) {
      await supabase.from("messages").update({ is_flagged: true }).eq("id", message_id);
      await supabase.from("moderation_logs").insert({
        message_id,
        moderator: "auto-moderator",
        action: "flagged",
        reason: "profanity detected"
      });
    }

    return new Response(JSON.stringify({ flagged: flag }), { status: 200 });
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
});
