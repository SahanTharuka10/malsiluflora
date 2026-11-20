# Putting the bouquets in Supabase (free)

Once this is set up, all bouquets and photos live in your free Supabase database.
You manage them at **admin.html** on your website: add, edit, hide, reorder and delete, with no code.

Until you finish these steps, the website keeps working exactly as before from `data.js` and the `images` folder.

## 1. Create the free project
1. Go to **supabase.com** and sign up (the Free plan is enough: 500 MB database, 1 GB photo storage).
2. Click **New project**, name it `malsilu-flora`, choose a strong database password, pick the region **Singapore**, and create it.

## 2. Create the table and photo storage
1. In the project, open **SQL Editor** and click **New query**.
2. Paste everything from [`setup.sql`](setup.sql).
3. At the very bottom, change `your-email@example.com` to the email you'll use to sign in.
4. Click **Run**. You should see "Success. No rows returned".

## 3. Create your admin login
1. Open **Authentication → Users → Add user → Create new user**.
2. Enter the **same email** as in step 2, choose a password, and tick **Auto Confirm User**.
3. Open **Authentication → Sign In / Providers** and turn **off** "Allow new users to sign up", so nobody else can make an account.

## 4. Connect the website
1. Open **Project Settings → API Keys** (or click **Connect** at the top).
2. Copy the **Project URL** and the **publishable key** (older projects call it the **anon public** key).
3. Paste them into [`config.js`](../config.js):
   ```js
   supabaseUrl: "https://xxxxxxxx.supabase.co",
   supabaseKey: "sb_publishable_...",
   ```
   Never use the **secret** / **service_role** key here.
4. Commit and push, or ask Claude to do it.

## 5. Import your 100 bouquets
1. Open `https://<your-site>/admin.html` and sign in.
2. Click **Import bouquets**. This uploads every photo and bouquet from the website into Supabase (about a minute).
3. Done. From now on the website loads bouquets from Supabase.

## Day-to-day
- **Change a price or text:** click the bouquet, edit, **Save**.
- **Take a bouquet off the site but keep it:** turn off its switch.
- **New bouquet:** **Add bouquet**. The next code (ML-111…) is filled in for you, and big photos are resized automatically.
- **Order on the website:** use the ↑ ↓ arrows (clear the search first).
- Changes show on the website the next time a visitor opens it.

## Notes
- Free Supabase projects **pause after 7 days with no visits**. If that happens the website automatically falls back to the built-in list. Click **Restore** in the Supabase dashboard to wake it up.
- `data.js` and the `images` folder stay in the project as a backup.
