# 🏁 Production Readiness & Final Verification Checklist

This checklist details the tests, assertions, and verification steps necessary to ensure the security, stability, performance, and compliance of the MERN Local Store E-Commerce Platform.

---

## 🔒 1. Security Hardening Verification
- [ ] **Brute-Force Account Lockout**
  - **Verification**: Attempt to log in with an incorrect password 5 times sequentially on the same account.
  - **Expected Result**: On the 5th attempt, the API returns HTTP 403 with `Your account is temporarily locked...`. Verify that subsequent login attempts fail immediately for the next 30 minutes, even with the correct password.
- [ ] **IP-Change Notification Email**
  - **Verification**: Log in from a different IP address or spoof the header `X-Forwarded-For` with a different IP.
  - **Expected Result**: A security alert email is dispatched indicating a login from a new IP.
- [ ] **Token Rotation (RTR) & Reuse Block**
  - **Verification**: Send a refresh token to `/api/auth/refresh-token` twice.
  - **Expected Result**: The first request succeeds, returns a new access token, and sets a rotated cookie. The second request (token reuse) fails with HTTP 401, revokes the user's session in the database, and sends a compromised session email alert.
- [ ] **File Upload Magic Bytes Check**
  - **Verification**: Attempt to upload a text file renamed to `.png` to `/api/auth/update-profile`.
  - **Expected Result**: Multer memory buffer validation intercepts the upload (identifying missing PNG signature `89504e47`), returns HTTP 400, and blocks streaming to Cloudinary.
- [ ] **Content Security Policy (CSP)**
  - **Verification**: Use browser DevTools Audits or check headers using `curl -I http://localhost:5000/api/health`.
  - **Expected Result**: `Content-Security-Policy` header must contain `script-src 'self' https://checkout.razorpay.com` and `img-src 'self' data: https://res.cloudinary.com`.
- [ ] **HSTS and Referrer Headers**
  - **Verification**: Check response headers.
  - **Expected Result**: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` and `Referrer-Policy: strict-origin-when-cross-origin` are present.

---

## ⚡ 2. Performance Verification
- [ ] **Dynamic API Caching**
  - **Verification**: Fetch `/api/products/featured` or `/api/categories` multiple times.
  - **Expected Result**: First request logs `Cache MISS` and takes normal DB query time. Subsequent requests log `Cache HIT` and return in <10ms.
- [ ] **Cache Eviction on Mutation**
  - **Verification**: Mutate a category (e.g., PUT `/api/categories/:id`) or place an order.
  - **Expected Result**: Active product/category caches and admin stats caches are cleared (`Cache EVICT PATTERN` logs in console). Subsequent requests log `Cache MISS`.
- [ ] **Query Speedups (Lean & Select)**
  - **Verification**: Monitor logs for database execution times.
  - **Expected Result**: Read queries utilize `.lean()` and `.select()` projections, minimizing memory footprints and MongoDB connection time.
- [ ] **DOM Virtualization (react-window)**
  - **Verification**: Open the Product Listing Page in **List View** with 100+ items and scroll.
  - **Expected Result**: The browser DOM retains only the visible rows plus a small buffer, keeping rendering performance at 60 FPS.

---

## 📱 3. Progressive Web App (PWA) Verification
- [ ] **Offline Fallback**
  - **Verification**: Toggle offline mode in browser DevTools Network tab, then reload.
  - **Expected Result**: Service worker intercepts the request and displays the offline page (`offline.html`) warning the user about connection issues.
- [ ] **Auto-Update Service Worker**
  - **Verification**: Deploy a new frontend build.
  - **Expected Result**: The active service worker auto-updates and prompts the browser for hot reload.
- [ ] **Install Prompt Hook**
  - **Verification**: Check if the install icon or prompt banner displays on support browsers when conditions are met.

---

## 🔍 4. SEO & Indexing Verification
- [ ] **Robots.txt Configuration**
  - **Verification**: Access `http://localhost:5173/robots.txt`.
  - **Expected Result**: Returns the standard robots file, blocking indexing of `/checkout`, `/profile`, and `/admin`, and links to the `/sitemap.xml`.
- [ ] **Dynamic Sitemap**
  - **Verification**: Access `http://localhost:5000/sitemap.xml`.
  - **Expected Result**: Returns an XML map listing all static pages, active category URLs, and active product detail URLs.
- [ ] **Helmet Head Tags & JSON-LD**
  - **Verification**: View Source on a Product Detail Page.
  - **Expected Result**: Document title, meta tags, and open graph markup are updated dynamically. Verify the `<script type="application/ld+json">` contains the standard Schema.org `Product` block.

---

## 🛠️ 5. Deployment Checklist
- [ ] Ensure `.env.production` in client points to the live server.
- [ ] Confirm all environment variables are filled in on the hosting server dashboard.
- [ ] Build passes cleanly without warnings using `npm run build`.
