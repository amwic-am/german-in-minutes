import { jsPDF } from "jspdf";

const GOLD: [number, number, number] = [212, 175, 85];
const CHAR: [number, number, number] = [37, 37, 37];
const MUTED: [number, number, number] = [110, 110, 110];

export type ReceiptData = {
  reference: string; orderId: string; date: string; status: string;
  customer: string; email: string; course: string; level?: string | null | undefined;
  amount: number; currency: string; provider: string;
};

export function receiptPdf(r: ReceiptData) {
  const d = new jsPDF({ unit: "pt", format: "a4" });
  const W = d.internal.pageSize.getWidth();
  d.setFillColor(...CHAR); d.rect(0, 0, W, 110, "F");
  d.setFillColor(...GOLD); d.rect(0, 110, W, 4, "F");
  d.setTextColor(255, 255, 255); d.setFont("helvetica", "bold"); d.setFontSize(22);
  d.text("GERMAN IN MINUTES", 40, 55);
  d.setFont("helvetica", "normal"); d.setFontSize(10); d.text("Payment receipt", 40, 78);
  d.setTextColor(...GOLD); d.setFont("helvetica", "bold"); d.setFontSize(12);
  d.text(r.status.toUpperCase(), W - 40, 55, { align: "right" });
  d.setTextColor(255, 255, 255); d.setFont("helvetica", "normal"); d.setFontSize(10);
  d.text(`Reference: ${r.reference}`, W - 40, 78, { align: "right" });

  let y = 160;
  const row = (k: string, v: string) => {
    d.setTextColor(...MUTED); d.setFontSize(10); d.text(k, 40, y);
    d.setTextColor(...CHAR); d.setFontSize(11); d.text(v, 200, y); y += 24;
  };
  d.setTextColor(...CHAR); d.setFont("helvetica", "bold"); d.setFontSize(14); d.text("Billed to", 40, y - 20);
  d.setFont("helvetica", "normal");
  row("Name", r.customer); row("Email", r.email); row("Date", r.date); row("Order ID", r.orderId);
  y += 16;
  d.setFillColor(248, 245, 236); d.rect(40, y, W - 80, 30, "F");
  d.setFont("helvetica", "bold"); d.setFontSize(10); d.setTextColor(...CHAR);
  d.text("Course", 52, y + 19); d.text("Amount", W - 52, y + 19, { align: "right" });
  y += 52; d.setFont("helvetica", "normal"); d.setFontSize(11);
  d.text(`${r.course}${r.level ? ` (${r.level})` : ""}`, 52, y);
  d.text(`${r.amount.toFixed(2)} ${r.currency}`, W - 52, y, { align: "right" });
  y += 18; d.setDrawColor(230, 230, 230); d.line(40, y, W - 40, y); y += 26;
  d.setFont("helvetica", "bold"); d.setFontSize(13);
  d.text("Total paid", 52, y); d.setTextColor(...GOLD); d.text(`${r.amount.toFixed(2)} ${r.currency}`, W - 52, y, { align: "right" });
  y += 40; d.setTextColor(...CHAR); d.setFont("helvetica", "bold"); d.setFontSize(12); d.text("Payment information", 40, y);
  y += 24; d.setFont("helvetica", "normal");
  row("Payment method", r.provider.replace(/_test$/, " (test mode)")); row("Status", r.status); row("Reference number", r.reference);
  d.setTextColor(...MUTED); d.setFontSize(9);
  d.text("Thank you for learning with German In Minutes. Keep this receipt for your records.", 40, 800);
  d.save(`GIM-receipt-${r.reference}.pdf`);
}

export type CertData = { name: string; course: string; level?: string | null | undefined; number: string; date: string };

export function certificatePdf(c: CertData) {
  const d = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  d.setFillColor(253, 251, 245); d.rect(0, 0, W, H, "F");
  d.setFillColor(...CHAR); d.triangle(0, 0, 190, 0, 0, 190, "F");
  d.setFillColor(...GOLD); d.triangle(W, H, W - 190, H, W, H - 190, "F");
  d.setDrawColor(...GOLD); d.setLineWidth(3); d.rect(22, 22, W - 44, H - 44);
  d.setLineWidth(0.8); d.rect(34, 34, W - 68, H - 68);
  const cx = W / 2;
  d.setTextColor(...CHAR); d.setFont("helvetica", "bold"); d.setFontSize(12);
  d.text("G E R M A N   I N   M I N U T E S", cx, 90, { align: "center" });
  d.setFont("times", "bold"); d.setFontSize(46); d.text("CERTIFICATE", cx, 160, { align: "center" });
  d.setTextColor(...GOLD); d.setFont("helvetica", "bold"); d.setFontSize(13);
  d.text("O F   C O M P L E T I O N", cx, 186, { align: "center" });
  d.setTextColor(...MUTED); d.setFont("helvetica", "normal"); d.setFontSize(12);
  d.text("This certifies that", cx, 232, { align: "center" });
  d.setTextColor(...CHAR); d.setFont("times", "bolditalic"); d.setFontSize(38);
  d.text(c.name, cx, 280, { align: "center" });
  d.setDrawColor(...GOLD); d.setLineWidth(1.2); d.line(cx - 190, 294, cx + 190, 294);
  d.setTextColor(...MUTED); d.setFont("helvetica", "normal"); d.setFontSize(12);
  d.text("has successfully completed all lessons and passed the final exam of", cx, 326, { align: "center" });
  d.setTextColor(...CHAR); d.setFont("helvetica", "bold"); d.setFontSize(20);
  d.text(c.course, cx, 356, { align: "center" });
  if (c.level) { d.setFontSize(11); d.setTextColor(...GOLD); d.text(`CEFR LEVEL ${c.level}`, cx, 378, { align: "center" }); }
  d.setFillColor(...GOLD); d.circle(cx, 448, 34, "F");
  d.setDrawColor(255, 255, 255); d.setLineWidth(1.5); d.circle(cx, 448, 27);
  d.setTextColor(255, 255, 255); d.setFont("helvetica", "bold"); d.setFontSize(13); d.text("GIM", cx, 453, { align: "center" });
  d.setDrawColor(...CHAR); d.setLineWidth(0.6);
  d.line(110, 470, 300, 470); d.line(W - 300, 470, W - 110, 470);
  d.setTextColor(...CHAR); d.setFontSize(11); d.text(c.date, 205, 462, { align: "center" }); d.text(c.number, W - 205, 462, { align: "center" });
  d.setTextColor(...MUTED); d.setFont("helvetica", "normal"); d.setFontSize(9);
  d.text("Date issued", 205, 486, { align: "center" }); d.text("Certificate number", W - 205, 486, { align: "center" });
  d.save(`GIM-certificate-${c.number}.pdf`);
}
