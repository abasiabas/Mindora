// ============================================================================
// POST /api/chat/send — the single entry point a client uses to send a
// message. This wires together, in order (bind 58 System Architecture):
//   Auth → Entitlement (daily limit) → Safety (input) → [AI pipeline] → ...
//
// HONEST STATUS: the AI generation step (Multi-Agent / Evidence Engine,
// Phase 8-9) is NOT implemented yet — OPENAI_API_KEY is not configured and
// no Evidence Engine exists. Rather than fake a response (forbidden by
// bind 76), this route does real work up through Safety, persists the
// user's message, and returns a clear "not yet available" status so the
// frontend can show an honest state instead of a mocked AI reply.
// ============================================================================
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canSendMessage } from "@/lib/entitlements";
import { scanUserMessage, recordSafetyEvents } from "@/lib/safety";
import { formatCrisisMessage } from "@/lib/safety/resources";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const text: string | undefined = body?.text;
  let conversationId: string | undefined = body?.conversationId;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "empty_message" }, { status: 400 });
  }

  // 1) Entitlement — backend-enforced daily message limit (bind 35, 59).
  const { allowed, remaining } = await canSendMessage(user.id);
  if (!allowed) {
    return NextResponse.json(
      { error: "daily_limit_reached", remaining: 0 },
      { status: 429 }
    );
  }

  // Ensure a conversation row exists before we can attach messages to it.
  if (!conversationId) {
    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .insert({ user_id: user.id })
      .select("id")
      .single();
    if (convError || !conv) {
      return NextResponse.json({ error: "conversation_create_failed" }, { status: 500 });
    }
    conversationId = conv.id;
  }

  // 2) Input Safety (bind 4 layer 1, bind 10). Runs BEFORE anything is
  // sent to an AI model — a blocked/escalated result short-circuits the
  // pipeline entirely; no specialist agent ever sees this message.
  const safetyResult = scanUserMessage(text);
  await recordSafetyEvents(user.id, conversationId, safetyResult);

  // Persist the user's message regardless of safety status — it's still
  // part of their own conversation history (RLS-protected, owner-only).
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: text,
    safety_status: safetyResult.status,
    medication_detected: safetyResult.events.some((e) => e.type === "medication_request"),
  });

  if (safetyResult.status === "escalated") {
    // Crisis path — never reaches an AI model (bind 10).
    const crisisText = formatCrisisMessage();
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: crisisText,
      safety_status: "escalated",
    });
    return NextResponse.json({
      conversationId,
      status: "escalated",
      message: crisisText,
      remaining,
    });
  }

  if (safetyResult.status === "blocked") {
    const reason = safetyResult.events.some((e) => e.type === "medication_request")
      ? "مایندورا نمی‌تونه درباره‌ی نوع یا دوز دارو نظر بده — این موضوع فقط با پزشک یا روان‌پزشک شما قابل بررسیه. اگه بخواید می‌تونم درباره‌ی راهکارهای غیردارویی مبتنی بر شواهد صحبت کنیم."
      : "مایندورا فقط می‌تونه درباره‌ی موضوعات روانشناسی و روان‌درمانی صحبت کنه.";
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: reason,
      safety_status: "blocked",
    });
    return NextResponse.json({ conversationId, status: "blocked", message: reason, remaining });
  }

  // 3) AI generation — NOT YET IMPLEMENTED. See header comment.
  return NextResponse.json(
    {
      conversationId,
      status: "pending_ai_pipeline",
      message:
        "پیام شما با موفقیت ثبت و از فیلتر ایمنی عبور کرد. لایه‌ی هوش مصنوعی (Multi-Agent + Evidence Engine) هنوز پیاده‌سازی نشده — این بخش فاز بعدیه.",
      remaining: remaining - 1,
    },
    { status: 501 }
  );
}
