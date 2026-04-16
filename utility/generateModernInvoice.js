import PDFDocument from "pdfkit";

const generateModernInvoice = (order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40 });

      let buffers = [];

      // ✅ Collect PDF chunks
      doc.on("data", (chunk) => buffers.push(chunk));

      // ✅ When PDF is done
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // ✅ Catch PDF errors
      doc.on("error", (err) => {
        console.error("PDF Error:", err);
        reject(err);
      });

      // ===== DESIGN =====
      const primary = "#1f5aa6";
      const gray = "#555";

      doc.fontSize(22).fillColor(primary).text("RAJMART", 50, 40);
      doc.fontSize(18).text("GST INVOICE", 400, 45);

      doc.fontSize(10).fillColor(gray)
        .text("Bangalore, India", 50, 70)
        .text("GSTIN: 29ABCDE1234F1Z5", 50, 85);

      doc.text(`Invoice No: ${order._id}`, 400, 70);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 400, 85);

      doc.moveTo(50, 110)
        .lineTo(550, 110)
        .lineWidth(3)
        .strokeColor(primary)
        .stroke();

      doc.fontSize(12).fillColor("black").text("Billing To:", 50, 130);

      // ✅ Safe access (prevents crash if data missing)
      const user = order.users?.[0] || {};

      doc.font("Helvetica-Bold")
        .text(user.usermail || "N/A", 50, 150);

      doc.font("Helvetica")
        .text(`Phone: ${user.phone || "N/A"}`, 50, 165);

      const tableTop = 200;

      doc.rect(50, tableTop, 500, 25).fill(primary);

      doc.fillColor("white")
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("Item", 55, tableTop + 8)
        .text("Qty", 250, tableTop + 8)
        .text("Price", 320, tableTop + 8)
        .text("Amount", 450, tableTop + 8);

      let y = tableTop + 30;
      let subtotal = 0;

      doc.fillColor("black").font("Helvetica");

      // ✅ Safe product loop
      (order.products || []).forEach((item) => {
        const price = item.price || 0;
        const quantity = item.quantity || 0;
        const itemTotal = price * quantity;

        subtotal += itemTotal;

        doc.text(item.name || "Item", 55, y);
        doc.text(quantity, 250, y);
        doc.text(`₹${price}`, 320, y);
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

      // ✅ Finalize PDF
      doc.end();

    } catch (error) {
      console.error("Invoice Generation Error:", error);
      reject(error);
    }
  });
};

export default generateModernInvoice;