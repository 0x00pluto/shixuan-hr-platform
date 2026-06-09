import { MockAiService } from "./mock/ai-service.mock";
import { MockFeishuService } from "./mock/feishu-service.mock";
import type { AiService } from "./contracts/ai";
import type { FeishuService } from "./contracts/feishu";

const useMock = process.env.MOCK_EXTERNAL_SERVICES !== "false";

export function getAiService(): AiService {
  if (useMock) return new MockAiService();
  throw new Error("Real AI service not configured. Set MOCK_EXTERNAL_SERVICES=true.");
}

export function getFeishuService(): FeishuService {
  if (useMock) return new MockFeishuService();
  throw new Error(
    "Real Feishu service not configured. Set MOCK_EXTERNAL_SERVICES=true."
  );
}
