const PHONE = "94758599506";
const CATS = [
  { id: "cascade", name: "Cascade Bridal Bouquets", short: "Cascade", blurb: "Graceful trailing blooms for your walk down the aisle." },
  { id: "round", name: "Round Hand-Tied Bouquets", short: "Round Hand-Tied", blurb: "Classic hand-tied bouquets in ivory, white and soft green." },
  { id: "colour", name: "Colour Bouquets", short: "Colour", blurb: "Rich reds, deep burgundy and warm peach tones to match your theme." },
  { id: "party", name: "Bridal Party Sets", short: "Party Sets", blurb: "Matching bouquets for the bride, bridesmaids and flower girls." },
  { id: "car", name: "Wedding Car & Table Flowers", short: "Car & Table", blurb: "Fresh flower arrangements for wedding cars and reception tables." },
];
const COVER = { cascade: "ML-01", round: "ML-43", colour: "ML-73", party: "ML-93", car: "ML-101" };

const $ = (s) => document.querySelector(s);
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmtPrice = (p) => (/^\d/.test(p) ? "LKR " + p : p);
const catOf = (id) => CATS.find((c) => c.id === id);

let state = { cat: "all", q: "" };
let visible = [];
let current = -1;

// category cards
$("#catCards").innerHTML = CATS.map((c) => {
  const b = BOUQUETS.find((x) => x.code === COVER[c.id]) || BOUQUETS.find((x) => x.cat === c.id);
  const n = BOUQUETS.filter((x) => x.cat === c.id).length;
  return `<button class="cat-card" data-cat="${c.id}"><img src="${b.img}" alt="" loading="lazy"><span>${esc(c.name)}<small>${n} designs</small></span></button>`;
}).join("");
$("#catCards").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-cat]");
  if (!btn) return;
  setCat(btn.dataset.cat);
  $("#collection").scrollIntoView();
});

// tabs
$("#tabs").innerHTML = [{ id: "all", short: "All" }, ...CATS]
  .map((c) => `<button class="tab" role="tab" data-cat="${c.id}">${esc(c.short)}</button>`).join("");
$("#tabs").addEventListener("click", (e) => {
  const t = e.target.closest("[data-cat]");
  if (t) setCat(t.dataset.cat);
});
$("#search").addEventListener("input", (e) => { state.q = e.target.value.trim().toLowerCase(); render(); });

function setCat(cat) { state.cat = cat; render(); }

function render() {
  document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", t.dataset.cat === state.cat));
  $("#catBlurb").textContent = state.cat === "all" ? "Every bouquet at a glance." : catOf(state.cat).blurb;
  visible = BOUQUETS.filter((b) =>
    (state.cat === "all" || b.cat === state.cat) &&
    (!state.q || [b.code, b.name, b.desc, b.tags].join(" ").toLowerCase().includes(state.q)));
  $("#count").textContent = `${visible.length} bouquet${visible.length === 1 ? "" : "s"}`;
  $("#grid").innerHTML = visible.length ? visible.map((b, i) => `
    <article class="card" data-i="${i}" tabindex="0">
      <div class="ph"><img src="${b.img}" alt="${esc(b.name)}" loading="lazy"></div>
      <div class="info">
        <span class="code">${b.code}</span>
        <h3>${esc(b.name)}</h3>
        <span class="tags">${esc(b.tags)}</span>
        <span class="price">${esc(fmtPrice(b.price))}</span>
      </div>
    </article>`).join("") : `<p class="empty">No bouquets match your search.</p>`;
}
$("#grid").addEventListener("click", (e) => { const c = e.target.closest(".card"); if (c) openModal(+c.dataset.i); });
$("#grid").addEventListener("keydown", (e) => { const c = e.target.closest(".card"); if (c && e.key === "Enter") openModal(+c.dataset.i); });

// price table
$("#priceRows").innerHTML = CATS.map((c) =>
  `<tr class="grp"><td colspan="4">${esc(c.name)}</td></tr>` +
  BOUQUETS.filter((b) => b.cat === c.id).map((b) =>
    `<tr data-code="${b.code}"><td>${b.code}</td><td>${esc(b.name)}</td><td>${esc(c.short)}</td><td class="r">${esc(b.price)}</td></tr>`).join("")
).join("");
$("#priceRows").addEventListener("click", (e) => {
  const tr = e.target.closest("tr[data-code]");
  if (!tr) return;
  state.cat = "all"; state.q = ""; $("#search").value = ""; render();
  openModal(visible.findIndex((b) => b.code === tr.dataset.code));
});

// modal
const modal = $("#modal");
function openModal(i) {
  if (i < 0) return;
  current = i;
  const b = visible[i];
  $("#mImg").src = b.img; $("#mImg").alt = b.name;
  $("#mCode").textContent = `${b.code} · ${catOf(b.cat).name}`;
  $("#mName").textContent = b.name;
  $("#mDesc").textContent = b.desc;
  $("#mTags").textContent = b.tags;
  $("#mPrice").textContent = fmtPrice(b.price);
  const msg = `Hello Malsilu Flora, I'd like to enquire about ${b.code} – ${b.name} (${fmtPrice(b.price)}).`;
  $("#mOrder").href = `https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`;
  if (!modal.open) modal.showModal();
}
const step = (d) => openModal((current + d + visible.length) % visible.length);
$("#mPrev").onclick = () => step(-1);
$("#mNext").onclick = () => step(1);
modal.addEventListener("click", (e) => { if (e.target === modal || e.target.hasAttribute("data-close")) modal.close(); });
modal.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") step(-1); if (e.key === "ArrowRight") step(1); });

$("#yr").textContent = new Date().getFullYear();
render();
