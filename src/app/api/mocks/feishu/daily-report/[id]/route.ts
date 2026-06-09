import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { dailyReportItems, dailyReports } from "@/db/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [report] = await db
    .select()
    .from(dailyReports)
    .where(eq(dailyReports.id, id))
    .limit(1);

  if (!report) {
    return new NextResponse("<h1>日报不存在</h1>", {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const items = await db
    .select()
    .from(dailyReportItems)
    .where(eq(dailyReportItems.reportId, id));

  const summary = JSON.parse(report.summaryJson);
  const itemsHtml = items
    .map(
      (item) =>
        `<li><strong>${item.title}</strong> <span style="color:#666">(${item.itemType})</span></li>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>师选经营日报 ${report.reportDate}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
    h1 { font-size: 1.5rem; border-bottom: 2px solid #10b981; padding-bottom: 0.5rem; }
    .meta { color: #666; font-size: 0.875rem; margin-bottom: 1.5rem; }
    .badge { display: inline-block; background: #ecfdf5; color: #047857; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; }
    pre { background: #f8fafc; padding: 1rem; border-radius: 8px; overflow: auto; font-size: 0.8rem; }
    ul { line-height: 1.8; }
  </style>
</head>
<body>
  <h1>师选经营日报</h1>
  <p class="meta">
    日期：${report.reportDate} · 生成于 ${report.generatedAt.slice(0, 16).replace("T", " ")}
    <span class="badge">飞书 Mock 预览</span>
  </p>
  <h2>经营摘要</h2>
  <pre>${JSON.stringify(summary, null, 2)}</pre>
  <h2>明细条目</h2>
  <ul>${itemsHtml || "<li>暂无明细</li>"}</ul>
  <p style="margin-top:2rem;color:#999;font-size:0.75rem">此页面为开发环境 Mock，非真实飞书文档。</p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
