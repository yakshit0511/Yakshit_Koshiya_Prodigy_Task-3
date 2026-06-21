/**
 * utils/generateInvoice.js
 * -----------------------------------------
 * Generates a professional PDF invoice using PDFKit.
 *
 * Includes:
 * - Store header with name and contact
 * - Invoice metadata (number, date, order number)
 * - Customer billing details
 * - Delivery address
 * - Itemised product table
 * - Subtotal / Discount / Shipping / Grand Total
 * - Footer with thank-you note and support info
 *
 * @param  {Order}  order  - Mongoose Order document
 * @param  {User}   user   - Populated user document
 * @returns {Promise<Buffer>} - PDF as a Buffer
 * -----------------------------------------
 */

const PDFDocument = require("pdfkit");

// ---- Brand colours ----
const COLOR_PRIMARY = "#2563eb";    // Blue
const COLOR_ACCENT  = "#7c3aed";    // Purple
const COLOR_DARK    = "#1f2937";    // Near-black
const COLOR_MUTED   = "#6b7280";    // Grey
const COLOR_LIGHT   = "#f1f5f9";    // Table header bg
const COLOR_BORDER  = "#e5e7eb";    // Light border

/**
 * generateInvoice — async wrapper that resolves with the PDF Buffer.
 */
const generateInvoice = (order, user) =>
  new Promise((resolve, reject) => {
    try {
      // ---- Create PDF document ----
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: `Invoice — ${order.orderNumber}`,
          Author: "Local Store",
          Subject: "Order Invoice",
        },
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // =============================================
      // HEADER — Store brand block
      // =============================================
      _drawHeader(doc, order);

      doc.moveDown(1.5);

      // =============================================
      // META — Invoice info + Customer info side by side
      // =============================================
      _drawMetaSection(doc, order, user);

      doc.moveDown(1.5);

      // =============================================
      // ITEMS TABLE
      // =============================================
      _drawItemsTable(doc, order);

      doc.moveDown(1);

      // =============================================
      // TOTALS BLOCK
      // =============================================
      _drawTotals(doc, order);

      doc.moveDown(2);

      // =============================================
      // FOOTER
      // =============================================
      _drawFooter(doc, order);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });

// =============================================
// PRIVATE HELPERS
// =============================================

function _drawHeader(doc, order) {
  const pageWidth = doc.page.width - 100; // accounting for margins

  // ---- Left side: Store info ----
  doc
    .fillColor(COLOR_PRIMARY)
    .fontSize(26)
    .font("Helvetica-Bold")
    .text("🛍️ Local Store", 50, 50);

  doc
    .fillColor(COLOR_MUTED)
    .fontSize(9)
    .font("Helvetica")
    .text("Your neighbourhood online store", 50, 82)
    .text("support@localstore.in  |  +91 9876543210", 50, 94);

  // ---- Right side: INVOICE label ----
  doc
    .fillColor(COLOR_ACCENT)
    .fontSize(28)
    .font("Helvetica-Bold")
    .text("INVOICE", 50, 50, { align: "right" });

  doc
    .fillColor(COLOR_MUTED)
    .fontSize(9)
    .font("Helvetica")
    .text(`Invoice #: INV-${order.orderNumber}`, 50, 85, { align: "right" })
    .text(`Date: ${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, 50, 97, { align: "right" });

  // ---- Horizontal divider ----
  const y = 118;
  doc
    .moveTo(50, y)
    .lineTo(545, y)
    .lineWidth(2)
    .strokeColor(COLOR_PRIMARY)
    .stroke();
}

function _drawMetaSection(doc, order, user) {
  const leftX = 50;
  const rightX = 300;
  const startY = doc.y;

  // ---- Left: Bill To ----
  doc
    .fillColor(COLOR_DARK)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("BILL TO", leftX, startY);

  doc
    .fillColor(COLOR_DARK)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(user?.name || order.shippingAddress?.name || "Customer", leftX, startY + 16);

  doc
    .fillColor(COLOR_MUTED)
    .fontSize(9)
    .font("Helvetica")
    .text(user?.email || "", leftX, startY + 30)
    .text(user?.phone || order.shippingAddress?.phone || "", leftX, startY + 42);

  // ---- Right: Ship To ----
  const addr = order.shippingAddress;
  doc
    .fillColor(COLOR_DARK)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("SHIP TO", rightX, startY);

  if (addr) {
    doc
      .fillColor(COLOR_MUTED)
      .fontSize(9)
      .font("Helvetica")
      .text(addr.name || "", rightX, startY + 16)
      .text(addr.street || "", rightX, startY + 28)
      .text(`${addr.city || ""}, ${addr.state || ""} — ${addr.pincode || ""}`, rightX, startY + 40)
      .text(`Phone: ${addr.phone || ""}`, rightX, startY + 52);
  }

  // ---- Order details row ----
  const detailY = startY + 80;
  const boxes = [
    { label: "ORDER NUMBER", value: order.orderNumber },
    { label: "PAYMENT METHOD", value: order.paymentMethod === "COD" ? "Cash on Delivery" : "Online" },
    { label: "PAYMENT STATUS", value: order.paymentStatus },
    { label: "ORDER STATUS", value: order.orderStatus },
  ];

  const boxW = 118;
  boxes.forEach((box, i) => {
    const x = 50 + i * (boxW + 5);
    // Box background
    doc
      .rect(x, detailY, boxW, 42)
      .fillColor(COLOR_LIGHT)
      .fill();
    // Label
    doc
      .fillColor(COLOR_MUTED)
      .fontSize(7)
      .font("Helvetica-Bold")
      .text(box.label, x + 8, detailY + 7, { width: boxW - 16 });
    // Value
    doc
      .fillColor(COLOR_DARK)
      .fontSize(9)
      .font("Helvetica-Bold")
      .text(box.value, x + 8, detailY + 20, { width: boxW - 16 });
  });

  doc.y = detailY + 55;
}

function _drawItemsTable(doc, order) {
  const startY = doc.y;
  const colX = { no: 50, name: 72, qty: 350, price: 400, total: 470 };
  const rowH = 22;

  // ---- Table header ----
  doc
    .rect(50, startY, 495, 24)
    .fillColor(COLOR_PRIMARY)
    .fill();

  doc
    .fillColor("#ffffff")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("#", colX.no, startY + 7, { width: 20, align: "center" })
    .text("PRODUCT", colX.name, startY + 7, { width: 270 })
    .text("QTY", colX.qty, startY + 7, { width: 45, align: "center" })
    .text("UNIT PRICE", colX.price, startY + 7, { width: 65, align: "right" })
    .text("TOTAL", colX.total, startY + 7, { width: 60, align: "right" });

  // ---- Table rows ----
  let currentY = startY + 24;

  order.items.forEach((item, index) => {
    const effectivePrice = item.discountPrice && item.discountPrice < item.price
      ? item.discountPrice
      : item.price;

    // Alternating row background
    if (index % 2 === 0) {
      doc
        .rect(50, currentY, 495, rowH)
        .fillColor("#f8fafc")
        .fill();
    }

    // Row border bottom
    doc
      .moveTo(50, currentY + rowH)
      .lineTo(545, currentY + rowH)
      .lineWidth(0.5)
      .strokeColor(COLOR_BORDER)
      .stroke();

    doc
      .fillColor(COLOR_DARK)
      .fontSize(9)
      .font("Helvetica")
      .text(String(index + 1), colX.no, currentY + 6, { width: 20, align: "center" })
      .text(item.productName, colX.name, currentY + 6, { width: 270 })
      .text(String(item.quantity), colX.qty, currentY + 6, { width: 45, align: "center" })
      .text(`₹${effectivePrice.toFixed(2)}`, colX.price, currentY + 6, { width: 65, align: "right" })
      .text(`₹${item.totalPrice.toFixed(2)}`, colX.total, currentY + 6, { width: 60, align: "right" });

    currentY += rowH;
  });

  doc.y = currentY + 8;
}

function _drawTotals(doc, order) {
  const rightX = 350;
  const valueX = 490;
  let y = doc.y;

  const rows = [
    { label: "Subtotal", value: `₹${order.subtotal.toFixed(2)}`, bold: false },
  ];

  if (order.discountAmount > 0) {
    rows.push({
      label: `Discount${order.couponApplied?.code ? ` (${order.couponApplied.code})` : ""}`,
      value: `- ₹${order.discountAmount.toFixed(2)}`,
      bold: false,
      color: "#16a34a",
    });
  }

  rows.push({
    label: `Shipping${order.shippingCharge === 0 ? " (FREE)" : ""}`,
    value: order.shippingCharge === 0 ? "₹0.00" : `₹${order.shippingCharge.toFixed(2)}`,
    bold: false,
  });

  rows.forEach((row) => {
    doc
      .fillColor(COLOR_MUTED)
      .fontSize(9)
      .font("Helvetica")
      .text(row.label, rightX, y, { width: 130 });
    doc
      .fillColor(row.color || COLOR_DARK)
      .fontSize(9)
      .font(row.bold ? "Helvetica-Bold" : "Helvetica")
      .text(row.value, rightX, y, { width: valueX - rightX + 40, align: "right" });
    y += 18;
  });

  // ---- Total divider ----
  doc
    .moveTo(rightX, y + 2)
    .lineTo(545, y + 2)
    .lineWidth(1.5)
    .strokeColor(COLOR_PRIMARY)
    .stroke();
  y += 10;

  // ---- Grand Total ----
  doc
    .fillColor(COLOR_DARK)
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("GRAND TOTAL", rightX, y);
  doc
    .fillColor(COLOR_PRIMARY)
    .fontSize(13)
    .font("Helvetica-Bold")
    .text(`₹${order.totalAmount.toFixed(2)}`, rightX, y, {
      width: valueX - rightX + 40,
      align: "right",
    });

  doc.y = y + 30;
}

function _drawFooter(doc, order) {
  // ---- Thank you note ----
  doc
    .fillColor(COLOR_PRIMARY)
    .fontSize(13)
    .font("Helvetica-Bold")
    .text("Thank you for shopping with us! 🙏", 50, doc.y, { align: "center" });

  doc.moveDown(0.5);

  doc
    .fillColor(COLOR_MUTED)
    .fontSize(9)
    .font("Helvetica")
    .text(
      "For any questions about this invoice, please contact us at support@localstore.in or create a support ticket in your account.",
      50, doc.y,
      { align: "center", width: 495 }
    );

  // ---- Bottom border ----
  const bottomY = doc.y + 20;
  doc
    .moveTo(50, bottomY)
    .lineTo(545, bottomY)
    .lineWidth(1)
    .strokeColor(COLOR_BORDER)
    .stroke();

  doc
    .fillColor(COLOR_MUTED)
    .fontSize(8)
    .font("Helvetica")
    .text(
      `© ${new Date().getFullYear()} Local Store  |  Generated on ${new Date().toLocaleString("en-IN")}  |  Order: ${order.orderNumber}`,
      50, bottomY + 8,
      { align: "center", width: 495 }
    );
}

module.exports = generateInvoice;
