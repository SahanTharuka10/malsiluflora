/* Malsilu Flora · Bouquet Manager (Supabase) */
const CFG = window.MALSILU_CONFIG || {};
const BUCKET = CFG.bucket || "bouquets";
const CATS = [
  { id: "cascade", name: "Cascade Bridal Bouquets" },
  { id: "round", name: "Round Hand-Tied Bouquets" },
  { id: "colour", name: "Colour Bouquets" },
  { id: "party", name: "Bridal Party Sets" },
  { id: "car", name: "Wedding Car & Table Flowers" },
];
const SOURCE = typeof BOUQUETS !== "undefined" ? BOUQUETS : []; // data.js, used for the one-time import
const MAX_PX = 1400;      // photos are resized to fit within this before upload
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const catName = (id) => CATS.find((c) => c.id === id)?.name || id;
const codeNum = (code) => +String(code).replace(/\D/g, "") || 0;
const fmtAmount = (v) => { const d = String(v).replace(/\D/g, ""); return d ? (+d).toLocaleString("en-US") : ""; };

const views = ["setupView", "loginView", "deniedView", "appView"];
const show = (id) => views.forEach((v) => ($("#" + v).hidden = v !== id));

let toastTimer;
function toast(msg, bad = false) {
  const t = $("#toast");
  t.textContent = msg; t.classList.toggle("bad", bad); t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), bad ? 6000 : 2800);
}
const niceError = (e) => {
  const m = e?.message || String(e);
  if (/row-level security|permission|not authorized|Unauthorized/i.test(m)) return "Not allowed. Is your email in the admins table?";
  if (/duplicate key/i.test(m)) return "That code is already used by another bouquet.";
  if (/Failed to fetch|NetworkError/i.test(m)) return "Can't reach Supabase. Check your internet connection.";
  return m;
};

/* ---------- start ---------- */
const READY = !!(CFG.supabaseUrl && CFG.supabaseKey && window.supabase);
const sb = READY ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey) : null;
if (!READY) show("setupView");
const photoURL = (path, v) => {
  if (!path) return "images/logo.png";
  const url = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return v ? `${url}?v=${Date.parse(v) || ""}` : url;
};

let rows = [], userEmail = "";
let started = false;

sb?.auth.onAuthStateChange((_event, session) => { setTimeout(() => route(session), 0); });

async function route(session) {
  if (!session) { started = false; show("loginView"); return; }
  if (started) return;
  started = true;
  userEmail = session.user.email || "";
  const { data, error } = await sb.from("admins").select("email").limit(1);
  if (error || !data?.length) { $("#deniedEmail").textContent = userEmail; show("deniedView"); started = false; return; }
  show("appView");
  await loadRows();
}

/* ---------- sign in / out ---------- */
$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#loginBtn"); btn.disabled = true; btn.textContent = "Signing in…";
  $("#loginError").textContent = "";
  const { error } = await sb.auth.signInWithPassword({ email: $("#loginEmail").value.trim(), password: $("#loginPass").value });
  btn.disabled = false; btn.textContent = "Sign in";
  if (error) $("#loginError").textContent = /invalid/i.test(error.message) ? "Wrong email or password." : niceError(error);
});
document.addEventListener("click", async (e) => {
  if (!e.target.closest("[data-signout]")) return;
  await sb.auth.signOut();
  $("#loginPass").value = "";
});

/* ---------- list ---------- */
$("#fCat").insertAdjacentHTML("beforeend", CATS.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join(""));
$("#edCat").innerHTML = CATS.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("");

async function loadRows() {
  const { data, error } = await sb.from("bouquets").select("*").order("sort_order").order("code");
  if (error) { $("#rows").innerHTML = `<p class="a-loading">${esc(niceError(error))}</p>`; return; }
  rows = data;
  renderAll();
}

function renderAll() {
  const shown = rows.filter((r) => r.active).length;
  $("#stats").innerHTML = [
    [rows.length, "Bouquets"], [shown, "Shown on site"], [rows.length - shown, "Hidden"],
    [rows.filter((r) => !r.image_path).length, "Missing photo"],
  ].map(([n, l]) => `<li><b>${n}</b><span>${l}</span></li>`).join("");

  const empty = !rows.length;
  $("#importBox").hidden = !empty || !SOURCE.length;
  $("#importCount").textContent = SOURCE.length;
  $("#tools").hidden = empty;
  renderRows();
}

const filters = { q: "", cat: "all", show: "all" };
$("#q").addEventListener("input", (e) => { filters.q = e.target.value.trim().toLowerCase(); renderRows(); });
$("#fCat").addEventListener("change", (e) => { filters.cat = e.target.value; renderRows(); });
$("#fShow").addEventListener("change", (e) => { filters.show = e.target.value; renderRows(); });

function filtered() {
  return rows.filter((r) =>
    (filters.cat === "all" || r.category === filters.cat) &&
    (filters.show === "all" || (filters.show === "shown") === r.active) &&
    (!filters.q || [r.code, r.name, r.description, r.tags].join(" ").toLowerCase().includes(filters.q)));
}

function renderRows() {
  const list = filtered();
  const canMove = !filters.q && filters.show === "all";
  $("#aCount").textContent = rows.length ? `${list.length} of ${rows.length} bouquets${canMove ? " · use the arrows to change the order on the website" : ""}` : "";
  if (!rows.length) { $("#rows").innerHTML = `<p class="a-loading">No bouquets yet. Import your current ones or add a new one.</p>`; return; }
  if (!list.length) { $("#rows").innerHTML = `<p class="a-loading">No bouquets match.</p>`; return; }
  $("#rows").innerHTML = list.map((r, i) => `
    <article class="arow${r.active ? "" : " off"}" data-code="${esc(r.code)}">
      <button class="a-thumb" type="button" data-edit aria-label="Edit ${esc(r.name)}">
        ${r.image_path ? `<img src="${esc(photoURL(r.image_path, r.updated_at))}" alt="" loading="lazy">` : `<svg class="ico"><use href="#i-photo"/></svg>`}
      </button>
      <div class="a-info">
        <p class="a-meta"><span class="a-code">${esc(r.code)}</span>${esc(catName(r.category))}</p>
        <h3><button type="button" data-edit>${esc(r.name)}</button></h3>
        <p class="a-price">${esc(/^\d/.test(r.price) ? "LKR " + r.price : "Price on request")}</p>
      </div>
      <label class="switch sm" title="${r.active ? "Shown on the website" : "Hidden from the website"}">
        <input type="checkbox" data-toggle ${r.active ? "checked" : ""}><span class="track"></span><span class="sr">Show on website</span>
      </label>
      <div class="a-acts">
        ${canMove ? `<button class="icon-btn round" type="button" data-move="-1" aria-label="Move up" ${i === 0 ? "disabled" : ""}><svg class="ico"><use href="#i-up"/></svg></button>
        <button class="icon-btn round" type="button" data-move="1" aria-label="Move down" ${i === list.length - 1 ? "disabled" : ""}><svg class="ico"><use href="#i-down"/></svg></button>` : ""}
        <button class="icon-btn round" type="button" data-edit aria-label="Edit"><svg class="ico"><use href="#i-edit"/></svg></button>
      </div>
    </article>`).join("");
}

$("#rows").addEventListener("click", async (e) => {
  const row = e.target.closest(".arow"); if (!row) return;
  const r = rows.find((x) => x.code === row.dataset.code); if (!r) return;
  if (e.target.closest("[data-edit]")) openEditor(r);
  const mv = e.target.closest("[data-move]");
  if (mv) await move(r, +mv.dataset.move);
});
$("#rows").addEventListener("change", async (e) => {
  const t = e.target.closest("[data-toggle]"); if (!t) return;
  const r = rows.find((x) => x.code === t.closest(".arow").dataset.code);
  t.disabled = true;
  const { data, error } = await sb.from("bouquets").update({ active: t.checked }).eq("code", r.code).select().single();
  t.disabled = false;
  if (error) { t.checked = !t.checked; toast(niceError(error), true); return; }
  Object.assign(r, data); renderAll();
  toast(`${r.code} is now ${r.active ? "shown on" : "hidden from"} the website`);
});

// swap places with the neighbour in the current (category-filtered) list
async function move(r, dir) {
  const list = filtered(), i = list.indexOf(r), other = list[i + dir];
  if (!other) return;
  let a = r.sort_order, b = other.sort_order;
  if (a === b) { a = (i) * 10; b = (i + dir) * 10; } // repair equal orders
  $$("#rows [data-move]").forEach((x) => (x.disabled = true));
  const [x, y] = await Promise.all([
    sb.from("bouquets").update({ sort_order: b }).eq("code", r.code),
    sb.from("bouquets").update({ sort_order: a }).eq("code", other.code),
  ]);
  if (x.error || y.error) { toast(niceError(x.error || y.error), true); return loadRows(); }
  r.sort_order = b; other.sort_order = a;
  rows.sort((p, q) => p.sort_order - q.sort_order || p.code.localeCompare(q.code, undefined, { numeric: true }));
  renderRows();
}

/* ---------- editor ---------- */
const ed = $("#editor");
let editing = null, newPhoto = null;

function setPreview(src) {
  $("#edImg").src = src || "";
  $("#drop").classList.toggle("has", !!src);
}
function setPriceType(t) {
  $(`input[name=ptype][value=${t}]`).checked = true;
  $("#priceFields").hidden = t === "request";
}
$$("input[name=ptype]").forEach((r) => r.addEventListener("change", () => setPriceType(r.value)));
$("#edAmount").addEventListener("blur", (e) => (e.target.value = fmtAmount(e.target.value)));

function nextCode() {
  const n = Math.max(0, ...rows.map((r) => codeNum(r.code))) + 1;
  return "ML-" + String(n).padStart(2, "0");
}

function openEditor(r) {
  editing = r || null; newPhoto = null;
  $("#edForm").reset();
  $("#edError").textContent = "";
  $("#edKicker").textContent = r ? "Edit bouquet" : "New bouquet";
  $("#edTitle").textContent = r ? r.name : "Add a bouquet";
  $("#edCode").value = r ? r.code : nextCode();
  $("#edCode").readOnly = !!r;
  $("#edCat").value = r ? r.category : (filters.cat !== "all" ? filters.cat : "cascade");
  $("#edName").value = r?.name || "";
  $("#edDesc").value = r?.description || "";
  $("#edTags").value = r?.tags || "";
  const m = /^([\d,]+)\s*(.*)$/.exec(r?.price || "");
  setPriceType(r && !m ? "request" : "fixed");
  $("#edAmount").value = m ? m[1] : "";
  $("#edNote").value = m ? m[2] : "";
  $("#edActive").checked = r ? r.active : true;
  $("#edDelete").hidden = !r;
  setPreview(r?.image_path ? photoURL(r.image_path, r.updated_at) : "");
  ed.showModal();
  $("#edName").focus();
}
$("#addBtn").addEventListener("click", () => openEditor(null));
ed.addEventListener("click", (e) => { if (e.target === ed || e.target.closest("[data-close]")) ed.close(); });

$("#edFile").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    newPhoto = await shrink(f);
    setPreview(URL.createObjectURL(newPhoto));
  } catch { $("#edError").textContent = "That file couldn't be read as a photo."; }
});

// resize big photos in the browser so uploads are quick and storage stays small
async function shrink(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, MAX_PX / Math.max(bmp.width, bmp.height));
  if (k === 1 && file.type === "image/jpeg" && file.size < 600_000) return file;
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((ok, bad) => c.toBlob((b) => (b ? ok(b) : bad()), "image/jpeg", 0.86));
}

$("#edForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = (m) => { $("#edError").textContent = m; };
  const code = $("#edCode").value.trim().toUpperCase();
  const name = $("#edName").value.trim();
  const fixed = $("input[name=ptype]:checked").value === "fixed";
  const amount = fmtAmount($("#edAmount").value);
  if (!/^ML-\d+$/.test(code)) return err("Code should look like ML-111.");
  if (!editing && rows.some((r) => r.code === code)) return err(`${code} is already used.`);
  if (!name) return err("Please give the bouquet a name.");
  if (fixed && !amount) return err("Please enter a price, or choose “On request”.");
  if (!editing && !newPhoto) return err("Please add a photo.");

  const btn = $("#edSave"); btn.disabled = true; btn.textContent = "Saving…";
  try {
    const rec = {
      code, name,
      category: $("#edCat").value,
      description: $("#edDesc").value.trim(),
      tags: $("#edTags").value.trim(),
      price: fixed ? [amount, $("#edNote").value.trim()].filter(Boolean).join(" ") : "On request",
      active: $("#edActive").checked,
    };
    const oldPath = editing?.image_path;
    if (newPhoto) {
      const path = `${code.toLowerCase()}-${Date.now().toString(36)}.jpg`;
      const up = await sb.storage.from(BUCKET).upload(path, newPhoto, { contentType: newPhoto.type || "image/jpeg", cacheControl: "31536000" });
      if (up.error) throw up.error;
      rec.image_path = path;
    }
    let res;
    if (editing) res = await sb.from("bouquets").update(rec).eq("code", code).select().single();
    else {
      // goes after the last bouquet of its category (or at the very end)
      const same = rows.filter((r) => r.category === rec.category).map((r) => r.sort_order);
      rec.sort_order = same.length ? Math.max(...same) + 5 : Math.max(0, ...rows.map((r) => r.sort_order)) + 10;
      res = await sb.from("bouquets").insert(rec).select().single();
    }
    if (res.error) {
      if (rec.image_path) await sb.storage.from(BUCKET).remove([rec.image_path]);
      throw res.error;
    }
    if (newPhoto && oldPath && oldPath !== rec.image_path) await sb.storage.from(BUCKET).remove([oldPath]);
    if (editing) Object.assign(editing, res.data); else rows.push(res.data);
    rows.sort((p, q) => p.sort_order - q.sort_order || p.code.localeCompare(q.code, undefined, { numeric: true }));
    renderAll();
    ed.close();
    toast(editing ? `${code} saved` : `${code} added`);
  } catch (ex) {
    err(niceError(ex));
  } finally {
    btn.disabled = false; btn.textContent = "Save";
  }
});

$("#edDelete").addEventListener("click", async () => {
  const r = editing; if (!r) return;
  if (!confirm(`Delete ${r.code} – ${r.name}?\n\nThis removes the bouquet and its photo for good. To keep it but take it off the website, turn off “Show on the website” instead.`)) return;
  const { error } = await sb.from("bouquets").delete().eq("code", r.code);
  if (error) return toast(niceError(error), true);
  if (r.image_path) await sb.storage.from(BUCKET).remove([r.image_path]);
  rows = rows.filter((x) => x !== r);
  renderAll(); ed.close();
  toast(`${r.code} deleted`);
});

/* ---------- one-time import from data.js + images/ ---------- */
$("#importBtn").addEventListener("click", async () => {
  const src = SOURCE;
  if (!src.length) return;
  const btn = $("#importBtn"); btn.disabled = true; btn.textContent = "Importing…";
  $("#importProgress").hidden = false;
  const status = (m) => ($("#importStatus").textContent = m);
  const bar = (n) => ($("#importBar").style.width = `${(n / src.length) * 100}%`);
  const out = new Array(src.length), failed = [];
  let done = 0, next = 0;

  async function worker() {
    while (next < src.length) {
      const i = next++, b = src[i];
      const path = b.img.split("/").pop();
      try {
        const res = await fetch(b.img);
        if (!res.ok) throw new Error(res.status);
        const blob = await res.blob();
        const up = await sb.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: true, cacheControl: "31536000" });
        if (up.error) throw up.error;
        out[i] = { code: b.code, name: b.name, description: b.desc, tags: b.tags, price: b.price, category: b.cat, image_path: path, sort_order: (i + 1) * 10, active: true };
      } catch (e) {
        failed.push(b.code);
        out[i] = { code: b.code, name: b.name, description: b.desc, tags: b.tags, price: b.price, category: b.cat, image_path: null, sort_order: (i + 1) * 10, active: true };
        if (/row-level|Unauthorized|403/i.test(e?.message || "")) { next = src.length; status(niceError(e)); }
      }
      bar(++done); status(`Uploading photos… ${done} of ${src.length}`);
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);

  status("Saving bouquet details…");
  const { error } = await sb.from("bouquets").upsert(out.filter(Boolean), { onConflict: "code" });
  btn.disabled = false; btn.textContent = "Import bouquets";
  if (error) { status(niceError(error)); toast(niceError(error), true); return; }
  status(failed.length ? `Done, but these photos didn't upload: ${failed.join(", ")}. Add them by editing each bouquet.` : "All done.");
  toast(`Imported ${out.filter(Boolean).length} bouquets`);
  await loadRows();
});
