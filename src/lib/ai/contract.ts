export interface AiResponseContract {
  response: string;
  intent: string;
  evidence_required: boolean;
  evidence_used: string[];
  safety_status: "ok" | "flagged" | "escalated" | "blocked";
  medication_detected: boolean;
  confidence: number;
  escalation_required: boolean;
}

export function isValidContract(c: Partial<AiResponseContract>): c is AiResponseContract {
  return (
    typeof c.response === "string" &&
    c.response.trim().length > 0 &&
    typeof c.intent === "string" &&
    typeof c.evidence_required === "boolean" &&
    Array.isArray(c.evidence_used) &&
    typeof c.safety_status === "string" &&
    typeof c.medication_detected === "boolean" &&
    typeof c.confidence === "number" &&
    typeof c.escalation_required === "boolean"
  );
}
