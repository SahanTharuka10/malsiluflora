const PHONE = "94758596506";
const CATS = window.MALSILU_CATS || [];
const PAGE = 12;
const CFG = window.MALSILU_CONFIG || {};
const BACKUP = typeof BOUQUETS !== "undefined" ? BOUQUETS : [];
// the live site address, used for the bouquet link in WhatsApp orders
const SITE = (CFG.siteUrl || location.origin + location.pathname.replace(/[^/]*$/, "")).replace(/\/+$/, "");
const HAS_PAGE = new Set(BACKUP.map((b) => b.code)); // these have a share page in b/ with a photo preview

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const catOf = (id) => CATS.find((c) => c.id === id);
const wa = (text) => `https://wa.me/${PHONE}${text ? "?text=" + encodeURIComponent(text) : ""}`;
const icon = (id, cls = "ico") => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// "18,500 per set of 4" -> { main: "LKR 18,500", note: "per set of 4", value: 18500 }
function priceParts(p) {
  const m = /^([\d,]+)\s*(.*)$/.exec(p);
  if (!m) return { main: p === "On request" ? "Price on request" : p, note: "", value: null };
  return { main: "LKR " + m[1], note: m[2], value: +m[1].replace(/,/g, "") };
}
const priceText = (p) => { const x = priceParts(p); return x.note ? `${x.main} ${x.note}` : x.main; };
// link that opens this bouquet on the site; share pages give WhatsApp a photo preview
const bouquetLink = (b) => HAS_PAGE.has(b.code)
  ? `${SITE}/b/${b.code.toLowerCase()}.html`
  : `${SITE}/?b=${encodeURIComponent(b.code)}`;
const orderMsg = (b) => [
  "Hello Malsilu Flora, I'd like to order this:",
  `*${b.code} – ${b.name}*`,
  `${catOf(b.cat)?.name || ""} · ${priceText(b.price)}`,
  "",
  bouquetLink(b),
].join("\n");

/* ---------- data: Supabase first, data.js as the backup ---------- */
const LIVE = !!(CFG.supabaseUrl && CFG.supabaseKey);
const CACHE_KEY = "malsilu-bouquets-v1";
const apiBase = (CFG.supabaseUrl || "").replace(/\/+$/, "");
const photoURL = (path, v) => /^(https?:|images\/)/.test(path)
  ? path
  : `${apiBase}/storage/v1/object/public/${CFG.bucket || "bouquets"}/${path.split("/").map(encodeURIComponent).join("/")}${v ? "?v=" + v : ""}`;
const fromRow = (r) => ({
  code: r.code, name: r.name, desc: r.description || "", tags: r.tags || "", price: r.price || "On request",
  cat: r.category, img: r.image_path ? photoURL(r.image_path, Date.parse(r.updated_at) || "") : "images/logo.png",
});

async function fetchLive() {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(`${apiBase}/rest/v1/bouquets?select=code,name,description,tags,price,category,image_path,updated_at&active=is.true&order=sort_order.asc,code.asc`,
      { headers: { apikey: CFG.supabaseKey }, signal: ctl.signal });
    if (!res.ok) throw new Error(`Supabase ${res.status}`);
    const list = (await res.json()).map(fromRow).filter((b) => catOf(b.cat));
    if (!list.length) throw new Error("no bouquets in Supabase yet");
    return list;
  } finally { clearTimeout(timer); }
}

// Show the last saved list straight away, then refresh it from Supabase in the background.
async function loadBouquets() {
  if (!LIVE) return BACKUP;
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(CACHE_KEY)); } catch {}
  const fresh = fetchLive().then((list) => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(list)); } catch {}
    return list;
  });
  if (Array.isArray(cached) && cached.length) {
    fresh.then((list) => { if (JSON.stringify(list) !== JSON.stringify(cached)) build(list); })
      .catch((e) => console.warn("Using saved bouquets:", e.message));
    return cached;
  }
  try { return await fresh; } catch (e) { console.warn("Using built-in bouquets:", e.message); return BACKUP; }
}

let ALL = [], byCat = {};

/* ---------- reveal on scroll ---------- */
const io = "IntersectionObserver" in window && !reduceMotion
  ? new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in"); io.unobserve(e.target);
      // drop the stagger delay once revealed so hover effects respond instantly
      if (e.target.style.transitionDelay) setTimeout(() => (e.target.style.transitionDelay = ""), 1000);
    }), { rootMargin: "0px 0px -8% 0px" })
  : null;
const reveal = (els) => els.forEach((el) => (io ? io.observe(el) : el.classList.add("in")));
reveal($$("[data-reveal]"));

/* ---------- nav ---------- */
const nav = $("#nav"), menuBtn = $("#menuBtn"), links = $("#navLinks"), fab = $("#fab"), toolbar = $("#toolbar");
function setMenu(open) {
  links.classList.toggle("open", open);
  menuBtn.setAttribute("aria-expanded", open);
  menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  document.body.classList.toggle("menu-open", open);
}
menuBtn.addEventListener("click", () => setMenu(!links.classList.contains("open")));
links.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
addEventListener("keydown", (e) => { if (e.key === "Escape" && links.classList.contains("open")) setMenu(false); });
matchMedia("(min-width: 1021px)").addEventListener("change", (e) => e.matches && setMenu(false));

function onScroll() {
  const y = scrollY;
  nav.classList.toggle("scrolled", y > 40);
  fab.classList.toggle("show", y > 640);
  const t = toolbar.getBoundingClientRect().top;
  toolbar.classList.toggle("stuck", t <= nav.offsetHeight + 1 && t > -toolbar.offsetHeight);
}
addEventListener("scroll", onScroll, { passive: true });
onScroll();

// highlight the section in view
if ("IntersectionObserver" in window) {
  const navMap = new Map($$(".links a[href^='#']").map((a) => [a.getAttribute("href").slice(1), a]));
  const spy = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    navMap.forEach((a) => a.classList.remove("active"));
    navMap.get(e.target.id)?.classList.add("active");
  }), { rootMargin: "-45% 0px -50% 0px" });
  navMap.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
}

/* ---------- ribbon ---------- */
const ribbonItems = [...CATS.map((c) => c.name), "Handcrafted in Kiribathgoda", "Since 2007"];
const ribbonHalf = ribbonItems.map((t) => `<span>${esc(t)}</span>`).join("");
$("#ribbon").innerHTML = ribbonHalf + ribbonHalf;

/* ---------- collections ---------- */
function buildCollections() {
  $("#catCards").innerHTML = CATS.filter((c) => byCat[c.id].length).map((c, i) => {
  const b = ALL.find((x) => x.code === c.cover && x.cat === c.id) || byCat[c.id][0];
  return `<button class="coll" data-cat="${c.id}" data-reveal style="transition-delay:${i * 80}ms">
    <span class="arch"><span class="arch-clip"><img src="${b.img}" alt="" loading="lazy" decoding="async" width="700" height="1000"></span></span>
    <span class="coll-name">${esc(c.name)}</span>
    <span class="coll-meta">${byCat[c.id].length} designs ${icon("arrow")}</span>
  </button>`;
  }).join("");
  reveal($$("#catCards [data-reveal]"));
  collNav();
}
// arrows beside the collection row (desktop); hidden at either end
const collRow = $("#catCards");
function collNav() {
  const max = collRow.scrollWidth - collRow.clientWidth - 2;
  $$(".coll-nav").forEach((b) => (b.disabled = +b.dataset.scroll < 0 ? collRow.scrollLeft <= 2 : collRow.scrollLeft >= max));
}
$$(".coll-nav").forEach((b) => b.addEventListener("click", () =>
  collRow.scrollBy({ left: +b.dataset.scroll * collRow.clientWidth * 0.8, behavior: reduceMotion ? "auto" : "smooth" })));
collRow.addEventListener("scroll", collNav, { passive: true });
addEventListener("resize", collNav);
$("#catCards").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-cat]");
  if (!btn) return;
  setCat(btn.dataset.cat);
  $("#collection").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
});

/* ---------- gallery ---------- */
const state = { cat: "all", q: "", sort: "featured", shown: PAGE };
let visible = [];

const buildTabs = () => ($("#tabs").innerHTML = [{ id: "all", short: "All", n: ALL.length }, ...CATS.map((c) => ({ ...c, n: byCat[c.id].length }))]
  .filter((c) => c.id === "all" || c.n)
  .map((c) => `<button class="tab" role="tab" data-cat="${c.id}">${esc(c.short)} <small>${c.n}</small></button>`).join(""));
$("#tabs").addEventListener("click", (e) => { const t = e.target.closest("[data-cat]"); if (t) setCat(t.dataset.cat); });

let searchTimer;
$("#search").addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { state.q = e.target.value.trim().toLowerCase(); state.shown = PAGE; render(); }, 120);
});
$("#sort").addEventListener("change", (e) => { state.sort = e.target.value; state.shown = PAGE; render(); });
const loadMore = () => { if (state.shown < visible.length) { state.shown += PAGE; render(true); } };
$("#moreBtn").addEventListener("click", loadMore);
// load the next bouquets automatically as the visitor scrolls near the end of the gallery
const autoMore = "IntersectionObserver" in window;
if (autoMore) {
  document.body.classList.add("auto-more");
  new IntersectionObserver((entries) => { if (entries[0].isIntersecting) loadMore(); }, { rootMargin: "0px 0px 700px 0px" })
    .observe($(".more"));
}

function setCat(cat) {
  state.cat = cat; state.shown = PAGE;
  render();
  // keep ?c=rose in the address so the page link can be shared for this category
  const u = new URL(location.href);
  if (cat === "all") u.searchParams.delete("c"); else u.searchParams.set("c", cat);
  if (u.href !== location.href) history.replaceState(null, "", u);
  $(`.tab[data-cat="${cat}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
}

function sorted(list) {
  if (state.sort === "featured") return list;
  const dir = state.sort === "low" ? 1 : -1;
  return [...list].sort((a, b) => {
    const x = priceParts(a.price).value, y = priceParts(b.price).value;
    if (x === null || y === null) return (x === null) - (y === null); // "on request" always last
    return (x - y) * dir;
  });
}

function cardHTML(b, i) {
  const p = priceParts(b.price);
  return `<article class="card" data-i="${i}">
    <div class="ph">
      <img src="${b.img}" alt="${esc(b.name)} – ${esc(catOf(b.cat).short)} bouquet" loading="lazy" decoding="async" width="700" height="1000">
      <span class="badge">${b.code}</span>
      <span class="quick">View details</span>
    </div>
    <div class="info">
      <p class="cat">${esc(catOf(b.cat).short)}</p>
      <h3><button type="button" data-open="${i}">${esc(b.name)}</button></h3>
      <p class="tags">${esc(b.tags)}</p>
      <div class="foot">
        <span class="price">${esc(p.main)}${p.note ? `<small>${esc(p.note)}</small>` : ""}</span>
        <a class="order" href="${wa(orderMsg(b))}" target="_blank" rel="noopener" aria-label="Order ${esc(b.name)} on WhatsApp">${icon("wa")}Order</a>
      </div>
    </div>
  </article>`;
}

function render(append = false) {
  $$(".tab").forEach((t) => t.setAttribute("aria-selected", t.dataset.cat === state.cat));
  $("#catBlurb").textContent = state.cat === "all" ? "Every bouquet at a glance — tap any design for details and ordering." : catOf(state.cat).blurb;
  if (state.cat !== "all" && !byCat[state.cat]?.length) state.cat = "all";
  visible = sorted(ALL.filter((b) =>
    (state.cat === "all" || b.cat === state.cat) &&
    (!state.q || [b.code, b.name, b.desc, b.tags, catOf(b.cat).name].join(" ").toLowerCase().includes(state.q))));

  const grid = $("#grid");
  const shown = Math.min(state.shown, visible.length);
  if (!visible.length) {
    grid.innerHTML = `<div class="empty"><h3>No bouquets found</h3><p>Try another flower, colour or code — or ask us for something custom.</p>
      <button class="btn btn-outline" id="clearSearch">Clear search</button></div>`;
    $("#clearSearch").onclick = () => { $("#search").value = ""; state.q = ""; setCat("all"); };
  } else if (append) {
    const from = grid.querySelectorAll(".card").length;
    grid.insertAdjacentHTML("beforeend", visible.slice(from, shown).map((b, k) => cardHTML(b, from + k)).join(""));
  } else {
    grid.innerHTML = visible.slice(0, shown).map(cardHTML).join("");
  }
  const fresh = $$(".card:not(.in)", grid);
  fresh.forEach((c, k) => (c.style.transitionDelay = `${(k % 4) * 70}ms`));
  reveal(fresh);

  $("#count").innerHTML = visible.length
    ? `Showing <b>${shown}</b> of <b>${visible.length}</b> bouquet${visible.length === 1 ? "" : "s"}`
    : "";
  const more = $("#moreBtn"), left = visible.length - shown;
  more.hidden = left <= 0;
  more.textContent = `Show ${Math.min(left, PAGE)} more · ${left} remaining`;
  $(".more").classList.toggle("has-more", left > 0);
  // on tall screens the end of the gallery can still be in view after a batch: keep filling
  if (autoMore && left > 0) requestAnimationFrame(() => {
    if ($(".more").getBoundingClientRect().top < innerHeight + 700 && $("#grid").getBoundingClientRect().bottom > 0) loadMore();
  });
}

$("#grid").addEventListener("click", (e) => {
  if (e.target.closest(".order")) return;
  const c = e.target.closest(".card");
  if (c) openModal(visible, +c.dataset.i);
});

/* ---------- modal ---------- */
const modal = $("#modal"), mImg = $("#mImg");
let mList = [], current = -1;

function openModal(list, i) {
  if (!list.length || i < 0) return;
  mList = list; current = i;
  const b = list[i], p = priceParts(b.price);
  const show = () => { mImg.src = b.img; mImg.alt = b.name; };
  if (modal.open && !reduceMotion) { mImg.classList.add("swap"); setTimeout(() => { show(); mImg.classList.remove("swap"); }, 160); }
  else show();
  $("#mCode").textContent = b.code;
  $("#mCat").textContent = catOf(b.cat).name;
  $("#mName").textContent = b.name;
  $("#mDesc").textContent = b.desc;
  $("#mTags").textContent = b.tags.replace(/\s*\/\s*/g, " · ");
  $("#mPrice").textContent = p.main;
  $("#mPriceNote").textContent = p.note;
  $("#mOrder").href = wa(orderMsg(b));
  $("#mPos").textContent = `${String(i + 1).padStart(2, "0")} / ${String(list.length).padStart(2, "0")}`;
  const many = list.length > 1;
  $("#mPrev").hidden = $("#mNext").hidden = !many;
  // preload neighbours for instant next/prev
  if (many) [1, -1].forEach((d) => { new Image().src = list[(i + d + list.length) % list.length].img; });
  if (!modal.open) modal.showModal();
  setLinkCode(b.code);
}
// keep ?b=ML-01 in the address while a bouquet is open, so the page link opens it again
function setLinkCode(code) {
  const u = new URL(location.href);
  if (code) u.searchParams.set("b", code); else u.searchParams.delete("b");
  if (u.href !== location.href) history.replaceState(null, "", u);
}
modal.addEventListener("close", () => setLinkCode(null));
const step = (d) => openModal(mList, (current + d + mList.length) % mList.length);
$("#mPrev").onclick = () => step(-1);
$("#mNext").onclick = () => step(1);
modal.addEventListener("click", (e) => { if (e.target === modal || e.target.closest("[data-close]")) modal.close(); });
modal.addEventListener("keydown", (e) => {
  if (e.target.matches("input,textarea")) return;
  if (e.key === "ArrowLeft") step(-1);
  if (e.key === "ArrowRight") step(1);
});
// swipe between bouquets on touch screens
let touchX = null;
$("#mImgWrap").addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
$("#mImgWrap").addEventListener("touchend", (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 45) step(dx < 0 ? 1 : -1);
  touchX = null;
});

$("#yr").textContent = new Date().getFullYear();

/* ---------- build everything that depends on the bouquet list ---------- */
function build(list) {
  ALL = list;
  byCat = Object.fromEntries(CATS.map((c) => [c.id, ALL.filter((b) => b.cat === c.id)]));
  $$("[data-count]").forEach((el) => (el.textContent = ALL.length));
  $$("[data-cats]").forEach((el) => (el.textContent = CATS.filter((c) => byCat[c.id]?.length).length));
  startHeroFade();
  buildCollections();
  buildTabs();
  render();
  openLinked();
}

/* ---------- hero: arches fade through photos from the other collections ---------- */
const HERO_SETS = [["rose", "mini", "pastel"], ["mixed", "car", "stage"], ["colour", "table", "arch"]];
let heroStarted = false;
function startHeroFade() {
  if (heroStarted || reduceMotion) return;
  const arches = [$(".hero-art .side.left"), $(".hero-art .main"), $(".hero-art .side.right")];
  if (arches.some((a) => !a)) return;
  heroStarted = true;
  const pick = (id) => { const c = catOf(id); return (ALL.find((b) => b.code === c?.cover && b.cat === id) || byCat[id]?.[0])?.img; };
  const layers = arches.map((fig, k) => {
    const srcs = HERO_SETS[k].map(pick).filter(Boolean).concat(fig.querySelector("img").getAttribute("src"));
    return srcs.map((src) => {
      const img = new Image();
      img.className = "swap"; img.alt = ""; img.decoding = "async"; img.src = src;
      fig.appendChild(img);
      return img;
    });
  });
  const pos = [-1, -1, -1];
  let z = 1, turn = 0;
  const next = () => {
    if (document.hidden) return;
    const k = turn++ % 3, list = layers[k], prev = list[pos[k]];
    pos[k] = (pos[k] + 1) % list.length;
    const img = list[pos[k]];
    img.style.zIndex = ++z;
    img.classList.add("on");
    if (prev) setTimeout(() => prev.classList.remove("on"), 1700);
  };
  setTimeout(() => { next(); setInterval(next, 2600); }, 3500);
}

// a link like ?b=ML-01 (from a WhatsApp order) opens that bouquet straight away
let linkedDone = false;
function openLinked() {
  if (linkedDone) return;
  const params = new URLSearchParams(location.search);
  // a category link like ?c=rose opens the gallery on that category
  const cat = (params.get("c") || "").trim().toLowerCase();
  if (cat && byCat[cat]?.length && state.cat !== cat) {
    setCat(cat);
    requestAnimationFrame(() => $("#collection").scrollIntoView({ behavior: "auto" }));
  }
  const code = (params.get("b") || "").trim().toUpperCase();
  if (!code) { linkedDone = true; return; }
  const b = ALL.find((x) => x.code === code);
  if (!b) { if (!LIVE) { linkedDone = true; setLinkCode(null); } return; } // with Supabase, fresh data may still bring it
  linkedDone = true;
  $("#collection").scrollIntoView({ behavior: "auto" });
  const list = byCat[b.cat];
  openModal(list, list.indexOf(b));
}
loadBouquets().then(build);
