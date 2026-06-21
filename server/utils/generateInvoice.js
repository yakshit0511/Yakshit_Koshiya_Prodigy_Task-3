/**
 * utils/generateInvoice.js
 * -----------------------------------------
 * PDF invoice generator using PDFKit.
 * Creates a professional invoice PDF for
 * a given order and returns it as a Buffer
 * (which can be attached to email or sent
 * as a downloadable file).
 * -----------------------------------------
 */

const PDFDocument = require("pdfkit");

/**
 * generateInvoice — Creates a PDF invoice for the given order.
 *
 * @param {object} order - Populated Order document
 * @param {object} user  - Populated User document (order owner)
 * @returns {Promise<Buffer>} PDF as a Buffer
 */
const generateInvoice = (order, user) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: `Invoice — ${order.orderNumber}`,
          Author: "Local Store",
        },
      });

      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      const primaryColor = "#2563eb";
      const darkColor = "#1f2937";
      const grayColor = "#6b7280";
      const lightGray = "#f8fafc";

      // ---- HEADER ----
      doc.rect(0, 0, doc.page.width, 120).fill(primaryColor);
      doc
        .fillColor("#ffffff")
        .fontSize(28)
        .font("Helvetica-Bold")
        .text("LOCAL STORE", 50, 35);
      doc
        .fillColor("rgba(255,255,255,0.8)")
        .fontSize(11)
        .font("Helvetica")
        .text("Your neighbourhood online store", 50, 68);
      doc
        .fillColor("#ffffff")
        .fontSize(22)
        .font("Helvetica-Bold")
        .text("INVOICE", doc.page.width - 150, 45, { align: "right" });

      // ---- INVOICE META ----
      doc.moveDown(3);
      const metaY = 150;
      doc
        .fillColor(darkColor)
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Invoice Details", 50, metaY);

      doc.font("Helvetica").fontSize(10).fillColor(grayColor);
      const metaItems = [
        ["Invoice #", order.orderNumber],
        ["Date", new Date(order.createdAt).toLocaleDateString("en-IN")],
        ["Payment Method", order.paymentMethod === "COD" ? "Cash on Delivery" : "Online Payment"],
        ["Payment Status", order.paymentStatus],
        ["Order Status", order.orderStatus],
      ];

      metaItems.forEach(([label, value], i) => {
        doc
          .fillColor(grayColor)
          .text(`${label}:`, 50, metaY + 20 + i * 18)
          .fillColor(darkColor)
          .text(value, 180, metaY + 20 + i * 18);
      });

      // ---- BILLING TO ----
      doc
        .fillColor(darkColor)
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Billed To", 350, metaY);

      doc.font("Helvetica").fontSize(10).fillColor(grayColor);
      const addr = order.shippingAddress;
      const billingLines = [
        user.name || addr.name,
        addr.street,
        `${addr.city}, ${addr.state} - ${addr.pincode}`,
        `📞 ${addr.phone || user.phone}`,
        `📧 ${user.email}`,
      ];

      billingLines.forEach((line, i) => {
        doc.fillColor(darkColor).text(line, 350, metaY + 20 + i * 18);
      });

      // ---- ITEMS TABLE ----
      const tableTop = metaY + 160;
      doc.rect(50, tableTop, doc.page.width - 100, 28).fill(primaryColor);

      const colX = { item: 55, qty: 340, unitPrice: 400, total: 490 };
      doc
        .fillColor("#ffffff")
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("Item", colX.item, tableTop + 8)
        .text("Qty", colX.qty, tableTop + 8)
        .text("Unit Price", colX.unitPrice, tableTop + 8)
        .text("Total", colX.total, tableTop + 8);

      let rowY = tableTop + 36;
      order.items.forEach((item, idx) => {
        // Alternating row background
        if (idx % 2 === 0) {
          doc
            .rect(50, rowY - 5, doc.page.width - 100, 24)
            .fill(lightGray);
        }

        const unitPrice = item.discountPrice || item.price;
        doc
          .fillColor(darkColor)
          .fontSize(10)
          .font("Helvetica")
          .text(item.productName, colX.item, rowY, { width: 270 })
          .text(String(item.quantity), colX.qty, rowY)
          .text(`₹${unitPrice.toFixed(2)}`, colX.unitPrice, rowY)
          .text(`₹${item.totalPrice.toFixed(2)}`, colX.total, rowY);

        rowY += 26;
      });

      // ---- TOTALS ----
      const totalsY = rowY + 20;
      doc.moveTo(50, totalsY).lineTo(doc.page.width - 50, totalsY).stroke("#e5e7eb");

      const totals = [
        ["Subtotal", `₹${order.subtotal.toFixed(2)}`],
      ];

      if (order.discountAmount > 0) {
        totals.push(["Coupon Discount", `-₹${order.discountAmount.toFixed(2)}`]);
      }
      if (order.shippingCharge > 0) {
        totals.push(["Shipping Charge", `₹${order.shippingCharge.toFixed(2)}`]);
      }

      totals.forEach(([label, value], i) => {
        doc
          .fillColor(grayColor)
          .fontSize(10)
          .font("Helvetica")
          .text(label, 380, totalsY + 12 + i * 20)
          .fillColor(darkColor)
          .text(value, 490, totalsY + 12 + i * 20);
      });

      const grandTotalY = totalsY + 12 + totals.length * 20 + 10;
      doc.rect(370, grandTotalY - 5, doc.page.width - 420, 28).fill(primaryColor);
      doc
        .fillColor("#ffffff")
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Grand Total", 380, grandTotalY + 5)
        .text(`₹${order.totalAmount.toFixed(2)}`, 490, grandTotalY + 5);

      // ---- FOOTER NOTE ----
      const footerY = grandTotalY + 80;
      doc.moveTo(50, footerY).lineTo(doc.page.width - 50, footerY).stroke("#e5e7eb");
      doc
        .fillColor(grayColor)
        .fontSize(9)
        .font("Helvetica")
        .text(
          "Thank you for shopping with Local Store! For queries, contact us at " +
            process.env.EMAIL_USER,
          50,
          footerY + 15,
          { align: "center", width: doc.page.width - 100 }
        );
      doc
        .text(
          "This is a computer-generated invoice and does not require a signature.",
          50,
          footerY + 30,
          { align: "center", width: doc.page.width - 100 }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = generateInvoice;
