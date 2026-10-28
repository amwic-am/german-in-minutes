import PDFDocument from "pdfkit";

const CHAR = "#252525";
const GOLD = "#D4AF55";
const MUTED = "#6E6E6E";

type Doc = PDFKit.PDFDocument;

function collect(doc: Doc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function header(doc: Doc, title: string, subtitle: string, right: string) {
  const width = doc.page.width;
  doc.rect(0, 0, width, 110).fill(CHAR);
  doc.rect(0, 110, width, 4).fill(GOLD);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(22).text("GERMAN IN MINUTES", 40, 42);
  doc.font("Helvetica").fontSize(10).text(subtitle, 40, 76);
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(12).text(right, 40, 42, { width: width - 80, align: "right" });
  doc.fillColor("#FFFFFF").font("Helvetica").fontSize(10).text(title, 40, 76, { width: width - 80, align: "right" });
}

export type ReceiptInput = {
  reference: string;
  orderId: string;
  date: string;
  status: string;
  customer: string;
  email: string;
  course: string;
  level?: string | null;
  amount: number;
  currency: string;
  provider: string;
};

export function receiptPdf(input: ReceiptInput) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  header(doc, `Reference: ${input.reference}`, "Payment receipt", input.status.toUpperCase());
  const width = doc.page.width;
  let y = 160;
  const row = (label: string, value: string) => {
    doc.fillColor(MUTED).font("Helvetica").fontSize(10).text(label, 40, y);
    doc.fillColor(CHAR).fontSize(11).text(value, 200, y, { width: width - 240 });
    y += 24;
  };
  doc.fillColor(CHAR).font("Helvetica-Bold").fontSize(14).text("Billed to", 40, y - 20);
  doc.font("Helvetica");
  row("Name", input.customer);
  row("Email", input.email);
  row("Date", input.date);
  row("Order ID", input.orderId);
  y += 16;
  doc.rect(40, y, width - 80, 30).fill("#F8F5EC");
  doc.fillColor(CHAR).font("Helvetica-Bold").fontSize(10);
  doc.text("Course", 52, y + 10);
  doc.text("Amount", 52, y + 10, { width: width - 104, align: "right" });
  y += 52;
  doc.font("Helvetica").fontSize(11);
  doc.text(`${input.course}${input.level ? ` (${input.level})` : ""}`, 52, y, { width: width - 160 });
  doc.text(`${input.amount.toFixed(2)} ${input.currency}`, 52, y, { width: width - 104, align: "right" });
  y += 18;
  doc.moveTo(40, y).lineTo(width - 40, y).strokeColor("#E6E6E6").stroke();
  y += 26;
  doc.fillColor(CHAR).font("Helvetica-Bold").fontSize(13).text("Total paid", 52, y);
  doc.fillColor(GOLD).text(`${input.amount.toFixed(2)} ${input.currency}`, 52, y, { width: width - 104, align: "right" });
  y += 40;
  doc.fillColor(CHAR).font("Helvetica-Bold").fontSize(12).text("Payment information", 40, y);
  y += 24;
  doc.font("Helvetica");
  row("Payment method", input.provider.replace(/_test$/, " (test mode)"));
  row("Status", input.status);
  row("Reference number", input.reference);
  doc.fillColor(MUTED).fontSize(9).text("Thank you for learning with German In Minutes. Keep this receipt for your records.", 40, 800, {
    width: width - 80,
    align: "center",
  });
  return collect(doc);
}

export type CertificateInput = {
  name: string;
  course: string;
  level?: string | null;
  number: string;
  date: string;
};

export function certificatePdf(input: CertificateInput) {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
  const width = doc.page.width;
  const height = doc.page.height;
  doc.rect(0, 0, width, height).fill("#FDFBF5");
  doc.fillColor(CHAR);
  doc.moveTo(0, 0).lineTo(190, 0).lineTo(0, 190).fill(CHAR);
  doc.fillColor(GOLD).moveTo(width, height).lineTo(width - 190, height).lineTo(width, height - 190).fill(GOLD);
  doc.rect(22, 22, width - 44, height - 44).lineWidth(3).strokeColor(GOLD).stroke();
  doc.rect(34, 34, width - 68, height - 68).lineWidth(0.8).stroke();
  const cx = width / 2;
  doc.fillColor(CHAR).font("Helvetica-Bold").fontSize(12).text("G E R M A N   I N   M I N U T E S", 0, 78, { width, align: "center" });
  doc.font("Times-Bold").fontSize(46).text("CERTIFICATE", 0, 140, { width, align: "center" });
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(13).text("O F   C O M P L E T I O N", 0, 186, { width, align: "center" });
  doc.fillColor(MUTED).font("Helvetica").fontSize(12).text("This certifies that", 0, 232, { width, align: "center" });
  doc.fillColor(CHAR).font("Times-BoldItalic").fontSize(38).text(input.name, 0, 268, { width, align: "center" });
  const nameWidth = Math.min(doc.widthOfString(input.name), 380);
  doc.moveTo(cx - nameWidth / 2, 318).lineTo(cx + nameWidth / 2, 318).lineWidth(1.2).strokeColor(GOLD).stroke();
  doc.fillColor(MUTED).font("Helvetica").fontSize(12).text("has successfully completed all lessons and passed the final exam of", 0, 340, { width, align: "center" });
  doc.fillColor(CHAR).font("Helvetica-Bold").fontSize(20).text(input.course, 0, 368, { width, align: "center" });
  if (input.level) {
    doc.fillColor(GOLD).fontSize(11).text(`CEFR LEVEL ${input.level}`, 0, 396, { width, align: "center" });
  }
  doc.circle(cx, 452, 34).fill(GOLD);
  doc.circle(cx, 452, 27).lineWidth(1.5).strokeColor("#FFFFFF").stroke();
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(13).text("GIM", cx - 40, 446, { width: 80, align: "center" });
  doc.moveTo(110, 470).lineTo(300, 470).lineWidth(0.6).strokeColor(CHAR).stroke();
  doc.moveTo(width - 300, 470).lineTo(width - 110, 470).stroke();
  doc.fillColor(CHAR).font("Helvetica").fontSize(11);
  doc.text(input.date, 110, 462, { width: 190, align: "center" });
  doc.text(input.number, width - 300, 462, { width: 190, align: "center" });
  doc.fillColor(MUTED).fontSize(9);
  doc.text("Date issued", 110, 486, { width: 190, align: "center" });
  doc.text("Certificate number", width - 300, 486, { width: 190, align: "center" });
  return collect(doc);
}

const TIPS: Record<string, string[]> = {
  Grammar: [
    "Every German noun has a gender: der, die or das. Learn the article together with the noun from day one.",
    "In a main clause the verb stays in second position. Time, then verb, then subject: Heute lerne ich Deutsch.",
    "The four cases are nominative, accusative, dative and genitive. Ask: who is doing it, who is affected, to whom, whose.",
  ],
  Vocabulary: [
    "Learn words in short phrases rather than alone. Das Buch is easier to remember than Buch.",
    "Review new words after one day, three days, one week and one month. Spacing beats cramming.",
    "Say every new word out loud three times. Speaking builds the memory that reading alone does not.",
  ],
  "Exam prep": [
    "In the speaking exam, structure answers: opinion, reason, example. Three sentences are enough.",
    "Practise with a timer. Ten minutes of focused exam practice beats an hour of passive reading.",
    "Learn connectors such as deshalb, trotzdem and außerdem. They lift your writing score immediately.",
  ],
  "Everyday German": [
    "Start conversations with Guten Tag rather than Hallo in shops, offices and doctor's waiting rooms.",
    "Entschuldigung is your most useful word. It opens questions, gets attention and softens requests.",
    "Write your shopping list in German for a week. Daily life is the best vocabulary trainer.",
  ],
  German: [
    "Speak from lesson one. Accuracy grows through use, not through waiting until you feel ready.",
    "Fifteen focused minutes every day beats three hours on Sunday. Consistency is the method.",
    "Keep a small notebook of phrases you actually needed during the day, then learn those.",
  ],
};

export function bookletPdf(name: string, description: string, tag: string) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const width = doc.page.width;
  doc.rect(0, 0, width, 150).fill(CHAR);
  doc.fillColor(GOLD).rect(0, 150, width, 5).fill();
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(11).text("GERMAN IN MINUTES", 50, 46);
  doc.font("Times-Bold").fontSize(28).text(name, 50, 70, { width: width - 100 });
  doc.fillColor("#FFFFFF").font("Helvetica").fontSize(10).text(tag.toUpperCase(), 50, 118);
  let y = 190;
  doc.fillColor(CHAR).font("Helvetica").fontSize(12).text(description, 50, y, { width: width - 100, lineGap: 4 });
  y = doc.y + 24;
  doc.moveTo(50, y).lineTo(width - 50, y).strokeColor(GOLD).lineWidth(1.5).stroke();
  y += 28;
  doc.font("Helvetica-Bold").fontSize(16).text("How to use this guide", 50, y);
  y += 30;
  const tips = TIPS[tag] ?? TIPS.German!;
  doc.font("Helvetica").fontSize(12);
  for (let i = 0; i < tips.length; i++) {
    doc.fillColor(GOLD).font("Helvetica-Bold").text(`${i + 1}.`, 50, y);
    doc.fillColor(CHAR).font("Helvetica").text(tips[i]!, 72, y, { width: width - 122, lineGap: 3 });
    y = doc.y + 18;
  }
  y += 10;
  doc.rect(50, y, width - 100, 96).fill("#F8F5EC");
  doc.fillColor(CHAR).font("Helvetica-Bold").fontSize(13).text("Practice plan", 66, y + 16);
  doc.font("Helvetica").fontSize(11).text(
    "Monday: read the guide aloud. Tuesday: write five example sentences. Wednesday: record yourself. Thursday: review mistakes. Friday: teach one section to a friend.",
    66,
    y + 38,
    { width: width - 132, lineGap: 3 },
  );
  doc.addPage();
  doc.fillColor(CHAR).font("Helvetica-Bold").fontSize(20).text("Notes", 50, 50);
  for (let i = 0; i < 18; i++) {
    doc.moveTo(50, 110 + i * 38).lineTo(width - 50, 110 + i * 38).strokeColor("#E8E4DA").lineWidth(0.8).stroke();
  }
  doc.fillColor(MUTED).font("Helvetica").fontSize(9).text("© German In Minutes — for personal study use.", 50, 790, {
    width: width - 100,
    align: "center",
  });
  return collect(doc);
}
