// Supabase connection for the website and the admin page.
// Find both values in Supabase: Project Settings → API (or "Connect").
// The publishable / anon key is safe to put here: it can only do what the
// database rules in supabase/setup.sql allow. Never paste the secret or
// service_role key into this file.
// Leave them empty and the site simply uses data.js and the images folder.
window.MALSILU_CONFIG = {
  // the live website address, used for bouquet links in WhatsApp orders
  siteUrl: "https://malsiluflora.vercel.app",
  supabaseUrl: "https://wyzurefcvnubmhtsnxmm.supabase.co",
  supabaseKey: "sb_publishable_gDtMs_F2dsWnKMkOHfQ4vQ_b7QdY4n2",
  bucket: "bouquets",
};
