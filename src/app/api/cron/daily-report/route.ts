import { NextResponse } from "next/server";
import { generateDailyReport } from "@/actions/daily-reports";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reportId = await generateDailyReport();
    return NextResponse.json({
      ok: true,
      reportId,
      message: "日报生成成功",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
