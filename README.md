# Malsilu Flora · Bouquets & Flower Décor

Website for Malsilu Flora, Kiribathgoda, Sri Lanka: bouquets for every occasion, bridal bouquets, wedding car decorations, table and stage flowers, and floral arches. Live at https://malsiluflora.vercel.app

- Browse all bouquets by category, or search them; more load as you scroll
- Price list in LKR
- Order straight from a bouquet on WhatsApp: 075 859 6506
- View-only: there is no sign-in on the site

## Data
Bouquets are read from the free Supabase project described in [supabase/README.md](supabase/README.md).
`data.js` and the `images` folder hold the same list and are the backup the site uses if Supabase can't be reached.

## Links to share
- One bouquet: `b/ml-01.html` — WhatsApp shows its photo, name and price, and the link opens that bouquet.
- One category: `c/rose.html` (cascade, round, colour, party, rose, mixed, pastel, mini, car, table, stage, arch, stands) — opens the gallery on that category, with a photo preview.
- Every "Order on WhatsApp" message includes the bouquet's link automatically.

After changing `data.js` or `categories.js`, rebuild the share pages with `python tools/build_share_pages.py`.
