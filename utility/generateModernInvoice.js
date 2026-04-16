import PDFDocument from 'pdfkit'
import fs from 'fs'


function generateModernInvoice(order, filePath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    const primary = "#1f5aa6";
    const gray = "#555";

    doc.fontSize(22).fillColor(primary).text("RAJMART", 50, 40);
    doc.fontSize(18).text("GST INVOICE", 400, 45);

    doc.fontSize(10).fillColor(gray)
      .text("Bangalore, India", 50, 70)
      .text("GSTIN: 29ABCDE1234F1Z5", 50, 85);

    doc.text(`Invoice No: ${order._id}`, 400, 70);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 400, 85);

    doc.moveTo(50, 110).lineTo(550, 110).lineWidth(3).strokeColor(primary).stroke();

    doc.fontSize(12).fillColor("black").text("Billing To:", 50, 130);

    doc.font("Helvetica-Bold")
      .text(order.users[0].usermail, 50, 150);

    doc.font("Helvetica")
      .text(`Phone: ${order.users[0].phone}`, 50, 165);

    const tableTop = 200;

    doc.rect(50, tableTop, 500, 25).fill(primary);

    doc.fillColor("white").font("Helvetica-Bold").fontSize(10)
      .text("Item", 55, tableTop + 8)
      .text("Qty", 250, tableTop + 8)
      .text("Price", 320, tableTop + 8)
      .text("Amount", 450, tableTop + 8);

    let y = tableTop + 30;

    let subtotal = 0;

    doc.fillColor("black").font("Helvetica");

    order.products.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;

      doc.text(item.name, 55, y);
      doc.text(item.quantity, 250, y);
      doc.text(`₹${item.price}`, 320, y);
      doc.text(`₹${itemTotal}`, 450, y);

      y += 25;
    });

    const cgst = subtotal * 0.09;
    const sgst = subtotal * 0.09;
    const grandTotal = subtotal + cgst + sgst;

    const summaryY = y + 40;

    doc.text("Subtotal:", 350, summaryY);
    doc.text(`₹${subtotal}`, 450, summaryY);

    doc.text("CGST 9%:", 350, summaryY + 20);
    doc.text(`₹${cgst}`, 450, summaryY + 20);

    doc.text("SGST 9%:", 350, summaryY + 40);
    doc.text(`₹${sgst}`, 450, summaryY + 40);

    doc.rect(350, summaryY + 70, 200, 30).fill(primary);

    doc.fillColor("white")
      .text("Grand Total:", 360, summaryY + 78)
      .text(`₹${grandTotal}`, 450, summaryY + 78);

    doc.end();

    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);
  });
}

module.exports = generateModernInvoice;