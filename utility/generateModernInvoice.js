import PDFDocument from "pdfkit";

const generateModernInvoice = (order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      let buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      const primary = "#2b4c9a";

      
      const formatCurrency = (amt) => `₹${amt.toFixed(2)}`;

      
      doc
        .fontSize(22)
        .fillColor(primary)
        .text("RAJMART", 50, 40);

      doc
        .fontSize(16)
        .text("GST INVOICE", 400, 45);

      doc
        .fontSize(10)
        .fillColor("black")
        .text("Mangalore, India", 50, 70)
        .text("GSTIN: 29ABCDE1234F1Z5", 50, 85);

      doc
        .text(`Invoice No: ${order._id}`, 400, 70)
        .text(`Date: ${new Date().toLocaleDateString()}`, 400, 95);

      doc.moveTo(50, 110).lineTo(550, 110).stroke(primary);

      
      const user = order.users?.[0] || {};

      doc
        .fontSize(12)
        .text("Billing To:", 50, 130);

      doc
        .font("Helvetica-Bold")
        .text(user.usermail || "N/A", 50, 150);

      doc
        .font("Helvetica")
        .text(`Phone: ${user.phone || "N/A"}`, 50, 165);

      // ===== TABLE HEADER =====
      const tableTop = 200;

      doc
        .rect(50, tableTop, 500, 25)
        .fill(primary);

      doc
        .fillColor("white")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Item", 60, tableTop + 8)
        .text("Qty", 260, tableTop + 8, { width: 50, align: "center" })
        .text("Price", 330, tableTop + 8, { width: 80, align: "right" })
        .text("Amount", 450, tableTop + 8, { width: 80, align: "right" });

      // ===== TABLE BODY =====
      let y = tableTop + 35;
      let subtotal = 0;

      doc.fillColor("black").font("Helvetica");

      (order.products || []).forEach((item) => {
        const price = item.price || 0;
        const qty = item.quantity || 1;
        const total = price * qty;

        subtotal += total;

        doc
          .text(item.name, 60, y)
          .text(qty, 260, y, { width: 50, align: "center" })
          .text(formatCurrency(price), 330, y, { width: 80, align: "right" })
          .text(formatCurrency(total), 450, y, { width: 80, align: "right" });

        y += 25;
      });

      // ===== GST CALCULATION =====
      const cgst = +(subtotal * 0.09).toFixed(2);
      const sgst = +(subtotal * 0.09).toFixed(2);
      const grandTotal = +(subtotal + cgst + sgst).toFixed(2);

      const summaryY = y + 30;

      doc
        .font("Helvetica")
        .text("Subtotal:", 350, summaryY)
        .text(formatCurrency(subtotal), 450, summaryY, { align: "right" });

      doc
        .text("CGST (9%):", 350, summaryY + 20)
        .text(formatCurrency(cgst), 450, summaryY + 20, { align: "right" });

      doc
        .text("SGST (9%):", 350, summaryY + 40)
        .text(formatCurrency(sgst), 450, summaryY + 40, { align: "right" });

      // ===== GRAND TOTAL BOX =====
      doc
        .rect(360, summaryY + 70, 250, 30)
        .fill(primary);

      doc
        .fillColor("white")
        .font("Helvetica-Bold")
        .text("Grand Total", 360, summaryY + 78)
        .text(formatCurrency(grandTotal), 400, summaryY + 78, { align: "right" });

      // ===== FOOTER =====
      doc
        .fillColor("gray")
        .fontSize(10)
        .text("Thank you for shopping with Rajmart!", 50, 650, {
          align: "center",
          width: 500,
        });

      doc.end();

    } catch (err) {
      reject(err);
    }
  });
};

export default generateModernInvoice;