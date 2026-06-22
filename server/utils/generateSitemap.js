/**
 * utils/generateSitemap.js
 * -----------------------------------------
 * Generates sitemap.xml dynamically from active products and categories.
 * Optimized using lean() and select() queries.
 * -----------------------------------------
 */

const Product = require("../models/Product");
const Category = require("../models/Category");

/**
 * generateSitemapXml — Constructs the XML sitemap string.
 * @param {string} baseUrl - Base URL of the client application
 * @returns {Promise<string>} XML Sitemap string
 */
const generateSitemapXml = async (baseUrl) => {
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  // Static URLs
  const staticUrls = [
    "",
    "/products",
    "/cart",
    "/checkout",
    "/profile",
    "/support",
    "/login",
    "/register",
  ];

  // Dynamic URLs
  // Wait, let's fetch active categories and products
  const categories = await Category.find({ isActive: { $ne: false } }).select("slug").lean();
  const products = await Product.find({ isActive: { $ne: false } }).select("slug updatedAt").lean();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // 1. Add Static Pages
  staticUrls.forEach((route) => {
    xml += `  <url>\n`;
    xml += `    <loc>${cleanBaseUrl}${route}</loc>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>${route === "" ? "1.0" : "0.8"}</priority>\n`;
    xml += `  </url>\n`;
  });

  // 2. Add Category Pages
  categories.forEach((cat) => {
    xml += `  <url>\n`;
    xml += `    <loc>${cleanBaseUrl}/products?category=${cat.slug}</loc>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.7</priority>\n`;
    xml += `  </url>\n`;
  });

  // 3. Add Product Pages
  products.forEach((prod) => {
    const lastMod = prod.updatedAt ? new Date(prod.updatedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
    xml += `  <url>\n`;
    xml += `    <loc>${cleanBaseUrl}/product/${prod.slug}</loc>\n`;
    xml += `    <lastmod>${lastMod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.6</priority>\n`;
    xml += `  </url>\n`;
  });

  xml += `</urlset>`;
  return xml;
};

module.exports = { generateSitemapXml };
