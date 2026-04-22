import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import dotenv from "dotenv";

dotenv.config();

const generateModernInvoice = async (order) => {
  try {
    if (!order?._id) {
      throw new Error("Order ID missing for QR generation");
    }

    const doc = new PDFDocument({ margin: 50 });
    let buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));

    const primary = "#2b4c9a";

    const formatCurrency = (amt) =>
      `₹${Number(amt || 0).toFixed(2)}`;

    // ================== ✅ QR CODE ==================
    const FRONTEND_URL =
      process.env.FRONTEND_URL || "http://localhost:5173";

    const qrURL = `${FRONTEND_URL}/useraccount?orderId=${order._id}`;

    const qrBase64 = await QRCode.toDataURL(qrURL);

    if (!qrBase64.includes(",")) {
      throw new Error("Invalid QR format");
    }

    const qrBuffer = Buffer.from(
      qrBase64.split(",")[1],
      "base64"
    );

    // ================== HEADER ==================
    doc
      .fontSize(22)
      .fillColor(primary)
      .text("RAJMART", 50, 40);

    doc
      .fontSize(16)
      .fillColor("black")
      .text("GST INVOICE", 400, 45);

    doc
      .fontSize(10)
      .text("Mangalore, India", 50, 70)
      .text("GSTIN: 29ABCDE1234F1Z5", 50, 85);

    doc
      .text(`Invoice No: ${order._id}`, 400, 70)
      .text(
        `Date: ${new Date().toLocaleDateString()}`,
        400,
        95
      );

    // ================== QR ==================
    doc.image(qrBuffer, 450, 120, { width: 90 });

    doc
      .fontSize(8)
      .fillColor("gray")
      .text("Scan to view order", 450, 215, {
        width: 90,
        align: "center",
      });

    doc.moveTo(50, 110).lineTo(550, 110).stroke(primary);

    // ================== USER ==================
    const user = order.users?.[0] || {};

    doc
      .fontSize(12)
      .fillColor("black")
      .text("Billing To:", 50, 130);

    doc
      .font("Helvetica-Bold")
      .text(user.usermail || "Customer", 50, 150);

    doc
      .font("Helvetica")
      .text(`Phone: ${user.phone || "N/A"}`, 50, 165);

    // ================== TABLE ==================
    const tableTop = 200;

    doc.rect(50, tableTop, 500, 25).fill(primary);

    doc
      .fillColor("white")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Item", 60, tableTop + 8)
      .text("Qty", 260, tableTop + 8, {
        width: 50,
        align: "center",
      })
      .text("Price", 330, tableTop + 8, {
        width: 80,
        align: "right",
      })
      .text("Amount", 450, tableTop + 8, {
        width: 80,
        align: "right",
      });

    let y = tableTop + 35;
    let subtotal = 0;

    doc.fillColor("black").font("Helvetica");

    (order.products || []).forEach((item) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      const price = Number(item.price || 0);
      const qty = Number(item.quantity || 1);
      const total = price * qty;

      subtotal += total;

      doc
        .text(item.name || "Item", 60, y)
        .text(qty, 260, y, {
          width: 50,
          align: "center",
        })
        .text(formatCurrency(price), 330, y, {
          width: 80,
          align: "right",
        })
        .text(formatCurrency(total), 450, y, {
          width: 80,
          align: "right",
        });

      y += 25;
    });

    // ================== GST ==================
    const GST_RATE = 0.18;
    const gst = +(subtotal * GST_RATE).toFixed(2);
    const cgst = gst / 2;
    const sgst = gst / 2;
    const grandTotal = +(subtotal + gst).toFixed(2);

    const summaryY = y + 30;

    doc
      .font("Helvetica")
      .text("Subtotal:", 350, summaryY)
      .text(formatCurrency(subtotal), 450, summaryY, {
        align: "right",
      });

    doc
      .text("CGST (9%):", 350, summaryY + 20)
      .text(formatCurrency(cgst), 450, summaryY + 20, {
        align: "right",
      });

    doc
      .text("SGST (9%):", 350, summaryY + 40)
      .text(formatCurrency(sgst), 450, summaryY + 40, {
        align: "right",
      });

    // ================== TOTAL ==================
    doc.rect(350, summaryY + 70, 230, 30).fill(primary);

    doc
      .fillColor("white")
      .font("Helvetica-Bold")
      .text("Grand Total", 360, summaryY + 78)
      .text(formatCurrency(grandTotal), 350, summaryY + 78, {
        align: "right",
      });

    // ================== FOOTER ==================
    doc
      .fillColor("gray")
      .fontSize(10)
      .text(
        "Thank you for shopping with Rajmart!",
        50,
        doc.page.height - 50,
        {
          align: "center",
          width: 500,
        }
      );

    doc.end();

    return await new Promise((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);
    });
  } catch (err) {
    throw err;
  }
};

export default generateModernInvoice;