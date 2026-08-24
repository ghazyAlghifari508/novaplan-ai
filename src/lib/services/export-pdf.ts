import { PDF_STYLES } from "@/lib/constants";

// V1: generate simple text-based PDF buffer — pakai jsPDF, dynamic import
export async function generatePdfBuffer({
  content,
  projectName,
}: {
  content: string;
  projectName: string;
}): Promise<Buffer> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  doc.setFontSize(PDF_STYLES.headerSize);
  doc.text(projectName, 10, 10);
  doc.setFontSize(PDF_STYLES.bodySize);
  const lines = doc.splitTextToSize(content.slice(0, 8000), 180);
  doc.text(lines, 10, 20);
  const out = doc.output("arraybuffer");
  return Buffer.from(out);
}
