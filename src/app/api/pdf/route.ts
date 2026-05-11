import { NextRequest } from "next/server";
import { requireAuth, getUserPlan } from "@/lib/auth";
import { FEATURES } from "@/types/database";

export async function POST(req: NextRequest) {
  await requireAuth();
  const plan = await getUserPlan();

  if (!FEATURES[plan].downloadPdf) {
    return new Response(JSON.stringify({ error: "Upgrade to Pro for PDF download" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { content, title } = await req.json() as { content: string; title: string };

  if (!content) {
    return new Response(JSON.stringify({ error: "Content required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Georgia, serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; }
    h1 { font-size: 2em; margin-bottom: 0.5em; padding-bottom: 0.3em; border-bottom: 2px solid #eaecef; }
    h2 { font-size: 1.5em; margin-top: 1.5em; margin-bottom: 0.5em; padding-bottom: 0.3em; border-bottom: 1px solid #eaecef; }
    h3 { font-size: 1.25em; margin-top: 1.25em; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
    pre { background: #f4f4f4; padding: 16px; border-radius: 6px; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f4f4f4; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding: 0 1em; color: #666; }
    hr { border: none; border-top: 1px solid #eaecef; margin: 2em 0; }
  </style>
</head>
<body>
  ${markdownToHtml(content)}
</body>
</html>`;

  return new Response(htmlContent, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(title)}.html"`,
    },
  });
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function markdownToHtml(md: string): string {
  let html = md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^---$/gm, "<hr>")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");

  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
  html = html.replace(/\n\n/g, "</p><p>");
  html = "<p>" + html + "</p>";
  html = html.replace(/<\/p><p><h/g, "<h");
  html = html.replace(/<\/h(\d)><p>/g, "</h$1>");
  html = html.replace(/<p><ul>/g, "<ul>");
  html = html.replace(/<\/ul><\/p>/g, "</ul>");
  html = html.replace(/<p><hr><\/p>/g, "<hr>");
  html = html.replace(/<p><blockquote>/g, "<blockquote>");
  html = html.replace(/<\/blockquote><\/p>/g, "</blockquote>");

  return html;
}