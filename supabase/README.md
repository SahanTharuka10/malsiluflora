# Supabase (database)

The website reads its bouquets from the Supabase project **malsilu-flora**
(Asia-Pacific). It is view-only: the site has no sign-in, and the database
rules let the public read bouquets but never change them.

- Table: `bouquets` (code, name, description, tags, price, category,
  image_path, sort_order, active)
- Photos: served from the website's `images/` folder; `image_path` holds
  that path, e.g. `images/ml-01.jpg`
- Connection: `config.js` (project URL and publishable key, safe for the browser)
- Setup script: [`setup.sql`](setup.sql) (already run)

If Supabase is paused or unreachable, the site falls back to `data.js` and
the `images/` folder automatically.

## Updating bouquets
1. Update `data.js` and `images/` (for example from a new Word menu).
2. Rebuild the share pages: `python tools/build_share_pages.py`
3. In Supabase, open **SQL Editor** and run an insert for the new rows
   (Claude can generate it from `data.js`). To hide an item without
   deleting it, run: `update public.bouquets set active = false where code = 'ML-01';`

## Notes
- Free Supabase projects pause after 7 days with no visits. The site keeps
  working from `data.js`; click **Restore** in the dashboard to wake it.
