# Malsilu Flora · The Wedding Bouquet Collection

Website for Malsilu Flora, Kiribathgoda, Sri Lanka: cascade bridal bouquets, round hand-tied bouquets, colour bouquets, bridal party sets, and wedding car & table flowers.

- Browse all 100 bouquets by category, or search them
- Price list in LKR
- Order straight from a bouquet on WhatsApp: 075 859 6506

## Managing bouquets
Bouquets and photos live in a free Supabase database and are managed at **admin.html**.
Set-up steps: [supabase/README.md](supabase/README.md).

## WhatsApp orders
Each "Order on WhatsApp" message includes the bouquet's link (`b/ml-01.html`). WhatsApp shows that page's photo, name and price as a preview, and tapping it opens the website with that bouquet already showing.
After changing `data.js`, rebuild these pages with `python tools/build_share_pages.py`. Bouquets added only in the admin page link to `/?b=CODE`, which opens them too, but without a photo preview.

`data.js` and the `images` folder are the backup the site uses if Supabase isn't connected or can't be reached.
