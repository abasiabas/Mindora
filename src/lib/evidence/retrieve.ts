import { createClient } from "@/lib/supabase/server";

export interface EvidenceMatch {
  id: string;
  title: string;
  organization: string | null;
  source_url: string;
  evidence_level: string | null;
  summary: string;
}

const TOPIC_KEYWORDS: Record<string, string[]> = {
  stress: ["استرس", "فشار روانی", "stress"],
  depression: ["افسرده", "افسردگی", "depress"],
  anxiety: ["اضطراب", "نگرانی", "anxiety", "anxious"],
  cbt: ["رفتاردرمانی", "شناخت درمانی", "cbt", "cognitive behavioral"],
};

function matchTopics(query: string): string[] {
  const lower = query.toLowerCase();
  return Object.entries(TOPIC_KEYWORDS)
    .filter(([, keywords]) => keywords.some((k) => lower.includes(k.toLowerCase())))
    .map(([topic]) => topic);
}

export async function retrieveEvidence(userMessage: string): Promise<EvidenceMatch[]> {
  const topics = matchTopics(userMessage);
  if (topics.length === 0) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("evidence_items")
    .select("id, title, organization, source_url, evidence_level, summary")
    .in("topic", topics)
    .limit(3);

  if (error || !data) return [];
  return data.filter((d) => d.summary) as EvidenceMatch[];
}
