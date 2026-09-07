import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canSendMessage } from "@/lib/entitlements";
import { scanUserMessage, recordSafetyEvents } from "@/lib/safety";
import { formatCrisisMessage } from "@/lib/safety/resources";
import { runManagerAgent } from "@/lib/ai/manager";

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

  const { allowed, remaining } = await canSendMessage(user.id);
  if (!allowed) {
    return NextResponse.json({ error: "daily_limit_reached", remaining: 0 }, { status: 429 });
  }

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

  const safetyResult = scanUserMessage(text);
  await recordSafetyEvents(user.id, conversationId ?? null, safetyResult);

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: text,
    safety_status: safetyResult.status,
    medication_detected: safetyResult.events.some((e) => e.type === "medication_request"),
  });

  if (safetyResult.status === "escalated") {
    const crisisText = formatCrisisMessage();
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: crisisText,
      safety_status: "escalated",
    });
    return NextResponse.json({ conversationId, status: "escalated", message: crisisText, remaining });
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

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      {
        conversationId,
        status: "ai_not_configured",
        message: "لایه‌ی هوش مصنوعی هنوز پیکربندی نشده (GEMINI_API_KEY تنظیم نشده).",
        remaining,
      },
      { status: 503 }
    );
  }

  try {
    const contract = await runManagerAgent(text);

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: contract.response,
      intent: contract.intent,
      evidence_used: contract.evidence_used,
      safety_status: contract.safety_status,
      medication_detected: contract.medication_detected,
      confidence: contract.confidence,
    });

    return NextResponse.json({
      conversationId,
      status: "ok",
      message: contract.response,
      evidenceRequired: contract.evidence_required,
      remaining: remaining - 1,
    });
  } catch (err) {
    console.error("Manager Agent error:", err);
    return NextResponse.json(
      { conversationId, status: "ai_error", message: "خطایی در تولید پاسخ رخ داد. لطفاً دوباره تلاش کنید.", remaining },
      { status: 500 }
    );
  }
}
