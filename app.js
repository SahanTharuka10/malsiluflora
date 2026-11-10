const PHONE = "94758596506";
const CATS = [
  { id: "cascade", name: "Cascade Bridal Bouquets", short: "Cascade", blurb: "Graceful trailing blooms for your walk down the aisle." },
  { id: "round", name: "Round Hand-Tied Bouquets", short: "Round Hand-Tied", blurb: "Classic hand-tied bouquets in ivory, white and soft green." },
  { id: "colour", name: "Colour Bouquets", short: "Colour", blurb: "Rich reds, deep burgundy and warm peach tones to match your theme." },
  { id: "party", name: "Bridal Party Sets", short: "Party Sets", blurb: "Matching bouquets for the bride, bridesmaids and flower girls." },
  { id: "car", name: "Wedding Car & Table Flowers", short: "Car & Table", blurb: "Fresh flower arrangements for wedding cars and reception tables." },
];
const COVER = { cascade: "ML-01", round: "ML-43", colour: "ML-73", party: "ML-93", car: "ML-101" };
const PAGE = 12;

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
const orderMsg = (b) => `Hello Malsilu Flora, I'd like to enquire about ${b.code} – ${b.name} (${priceText(b.price)}).`;

const byCat = Object.fromEntries(CATS.map((c) => [c.id, BOUQUETS.filter((b) => b.cat === c.id)]));
$$("[data-count]").forEach((el) => (el.textContent = BOUQUETS.length));

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
$("#catCards").innerHTML = CATS.map((c, i) => {
  const b = BOUQUETS.find((x) => x.code === COVER[c.id]) || byCat[c.id][0];
  return `<button class="coll" data-cat="${c.id}" data-reveal style="transition-delay:${i * 80}ms">
    <span class="arch"><span class="arch-clip"><img src="${b.img}" alt="" loading="lazy" decoding="async" width="700" height="1000"></span></span>
    <span class="coll-name">${esc(c.name)}</span>
    <span class="coll-meta">${byCat[c.id].length} designs ${icon("arrow")}</span>
  </button>`;
}).join("");
reveal($$("#catCards [data-reveal]"));
$("#catCards").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-cat]");
  if (!btn) return;
  setCat(btn.dataset.cat);
  $("#collection").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
});

/* ---------- gallery ---------- */
const state = { cat: "all", q: "", sort: "featured", shown: PAGE };
let visible = [];

$("#tabs").innerHTML = [{ id: "all", short: "All", n: BOUQUETS.length }, ...CATS.map((c) => ({ ...c, n: byCat[c.id].length }))]
  .map((c) => `<button class="tab" role="tab" data-cat="${c.id}">${esc(c.short)} <small>${c.n}</small></button>`).join("");
$("#tabs").addEventListener("click", (e) => { const t = e.target.closest("[data-cat]"); if (t) setCat(t.dataset.cat); });

let searchTimer;
$("#search").addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { state.q = e.target.value.trim().toLowerCase(); state.shown = PAGE; render(); }, 120);
});
$("#sort").addEventListener("change", (e) => { state.sort = e.target.value; state.shown = PAGE; render(); });
$("#moreBtn").addEventListener("click", () => { state.shown += PAGE; render(true); });

function setCat(cat) {
  state.cat = cat; state.shown = PAGE;
  render();
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
  visible = sorted(BOUQUETS.filter((b) =>
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
}

$("#grid").addEventListener("click", (e) => {
  if (e.target.closest(".order")) return;
  const c = e.target.closest(".card");
  if (c) openModal(visible, +c.dataset.i);
});

/* ---------- price list ---------- */
const openFirst = matchMedia("(min-width: 761px)").matches; // on phones every list starts folded
$("#priceMenus").innerHTML = CATS.map((c, ci) => {
  const list = byCat[c.id];
  const vals = list.map((b) => priceParts(b.price).value).filter((v) => v !== null);
  const fmt = (v) => v.toLocaleString("en-US");
  const range = vals.length ? `LKR ${fmt(Math.min(...vals))} – ${fmt(Math.max(...vals))}` : "Price on request";
  return `<details class="menu" data-reveal ${ci === 0 && openFirst ? "open" : ""}>
    <summary><h3>${esc(c.name)}</h3><span class="m-meta">${list.length} designs<br>${range}</span><span class="chev" aria-hidden="true"></span></summary>
    <div class="menu-grid">${list.map((b, i) => {
      const p = priceParts(b.price);
      return `<button class="mrow" data-cat="${c.id}" data-i="${i}"><span class="mc">${b.code}</span><span class="mn">${esc(b.name)}</span><span class="dots"></span><span class="mp">${esc(p.value === null ? p.main : p.main.replace("LKR ", ""))}${p.note ? `<small>${esc(p.note)}</small>` : ""}</span></button>`;
    }).join("")}</div>
  </details>`;
}).join("");
reveal($$("#priceMenus [data-reveal]"));
$("#priceMenus").addEventListener("click", (e) => {
  const r = e.target.closest(".mrow");
  if (r) openModal(byCat[r.dataset.cat], +r.dataset.i);
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
}
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
render();
