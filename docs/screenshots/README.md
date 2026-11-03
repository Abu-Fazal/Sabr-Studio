# Sabr Studio — Visual Documentation & Screenshot Capture Guide

This guide specifies the exact screenshots required for the Sabr Studio documentation showcase, including target application routes, capture specifications, recommended aspect ratios, and file naming conventions.

---

## 1. Directory Setup

Place all captured screenshot image files directly in this directory:
`docs/screenshots/`

Recommended format: WebP or PNG (optimized via TinyPNG or Squoosh to stay below 500 KB per image).

---

## 2. Screenshot Inventory & Capture Specifications

| Filename | Route / Screen | Target Resolution | Description |
|---|---|---|---|
| `01-homepage-hero.png` | `/` (Hero Section) | 1920 × 1080 (16:9) | Clean view of the editorial hero section with headline, brand typography, and navigation bar. |
| `02-public-projects-listing.png` | `/projects` | 1920 × 1080 (16:9) | Grid layout of published interior and architectural projects with category filter tabs. |
| `03-project-detail-view.png` | `/projects/:slug` | 1920 × 1080 (16:9) | Rich project detail page showcasing dynamic detail blocks, material palette swatches, and high-res imagery. |
| `04-retail-catalogue.png` | `/retail` | 1920 × 1080 (16:9) | Furniture and decor catalog with price tags, availability indicators, and category tabs. |
| `05-product-detail-view.png` | `/retail/:slug` | 1920 × 1080 (16:9) | Individual product display showing dimensional specifications, materials, pricing, and "Add to Cart" button. |
| `06-cart-drawer.png` | `/` or `/retail` (with drawer active) | 1920 × 1080 (16:9) | Slide-over cart drawer displaying line items, quantities, subtotal calculation, and checkout trigger. |
| `07-checkout-flow.png` | `/checkout` | 1920 × 1080 (16:9) | Authenticated checkout screen displaying delivery address selector and Razorpay trigger button. |
| `08-customer-portal.png` | `/account` | 1920 × 1080 (16:9) | Customer dashboard displaying profile info, saved delivery addresses, and recent order history. |
| `09-admin-login.png` | `/admin/login` | 1920 × 1080 (16:9) | Minimalist administrative authentication screen with email and password fields. |
| `10-admin-dashboard-stats.png` | `/admin` | 1920 × 1080 (16:9) | Administrative overview dashboard displaying key metrics: total projects, catalog items, enquiries, orders, and revenue. |
| `11-admin-projects-manager.png` | `/admin/projects` | 1920 × 1080 (16:9) | Project management index table showing publish toggles, category badges, and edit/delete actions. |
| `12-dynamic-detail-blocks-editor.png` | `/admin/projects` (Editor Open) | 1920 × 1080 (16:9) | Dynamic detail block canvas (`DetailBlocksEditor`) showing block drag-and-drop, layout tokens, and swatch editors. |
| `13-admin-retail-manager.png` | `/admin/retail` | 1920 × 1080 (16:9) | Retail inventory manager displaying product stock counters, prices, availability toggles, and image previews. |
| `14-admin-orders-manager.png` | `/admin/orders` | 1920 × 1080 (16:9) | Order fulfillment dashboard showing order numbers, customer details, payment badges, status dropdowns, and tracking ID inputs. |
| `15-admin-enquiries-manager.png` | `/admin/enquiries` | 1920 × 1080 (16:9) | Inbound lead management interface showing enquiry text, contact info, source routes, and follow-up status tags. |

---

## 3. Best Practices for Capturing

1. **Browser State:** Use Google Chrome or Chromium in an incognito window with extensions disabled to prevent visual artifacts.
2. **Device Emulation:** Capture at standard 1080p desktop viewport (`1920 × 1080`) at 100% zoom level.
3. **Typography & Styling:** Ensure custom web fonts (`Abhaya Libre` and `Inter`) are fully loaded before capturing.
4. **Data Realism:** Use realistic sample project photography and dummy orders rather than placeholder text to preserve the premium aesthetic of Sabr Studio.
5. **Embedding in Markdown:** Once captured and saved into `docs/screenshots/`, the images will automatically render in the README's screenshot carousels and visual galleries.
