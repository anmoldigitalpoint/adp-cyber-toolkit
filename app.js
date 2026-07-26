/* ADP Digital Suite - core app logic */

const ICON_COLORS = { "ic-red":"#ef4444","ic-green":"#22c55e","ic-purple":"#8b5cf6","ic-blue":"#3b82f6","ic-orange":"#f97316","ic-teal":"#14b8a6","ic-pink":"#ec4899" };

let activeFilter = "all";
let searchTerm = "";

/* ---------------- Toast ---------------- */
function showToast(msg, ms = 2600){
  const mount = document.getElementById("toastMount");
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  mount.appendChild(t);
  setTimeout(()=> t.remove(), ms);
}

/* ---------------- Theme ---------------- */
function initTheme(){
  const saved = localStorage.getItem("adp_theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  document.getElementById("themeToggle").textContent = saved === "dark" ? "🌙" : "☀️";
  document.getElementById("themeToggle").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("adp_theme", next);
    document.getElementById("themeToggle").textContent = next === "dark" ? "🌙" : "☀️";
  });
}

/* ---------------- Sidebar (mobile) ---------------- */
function initSidebar(){
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  document.getElementById("menuToggle").addEventListener("click", () => {
    sidebar.classList.add("open");
    backdrop.classList.remove("hidden");
  });
  backdrop.addEventListener("click", () => {
    sidebar.classList.remove("open");
    backdrop.classList.add("hidden");
  });
}

/* ---------------- Render: categories ---------------- */
function renderCategories(){
  const sideCats = document.getElementById("sidebarCats");
  const catGrid = document.getElementById("catGrid");
  sideCats.innerHTML = "";
  catGrid.innerHTML = "";

  CATEGORIES.forEach(c => {
    const b = document.createElement("button");
    b.className = "side-cat";
    b.innerHTML = `<span class="dot" style="background:${ICON_COLORS[c.color]}"></span> ${c.icon} ${c.name}`;
    b.addEventListener("click", () => { setFilter(c.id); document.getElementById("sidebar").classList.remove("open"); document.getElementById("sidebarBackdrop").classList.add("hidden"); });
    sideCats.appendChild(b);

    const card = document.createElement("div");
    card.className = "cat-card";
    card.style.cursor = "pointer";
    const count = TOOLS.filter(t => t.cat === c.id).length;
    card.innerHTML = `<div class="cat-icon ${c.color}">${c.icon}</div><div class="cat-name">${c.name}</div><div class="cat-count">${count} Tools</div>`;
    card.addEventListener("click", () => setFilter(c.id));
    catGrid.appendChild(card);
  });
}

/* ---------------- Render: filter chips ---------------- */
function renderFilters(){
  const row = document.getElementById("filterRow");
  row.innerHTML = "";
  const all = { id:"all", name:"All" };
  [all, ...CATEGORIES].forEach(c => {
    const chip = document.createElement("button");
    chip.className = "chip" + (activeFilter === c.id ? " active" : "");
    chip.textContent = c.name;
    chip.addEventListener("click", () => setFilter(c.id));
    row.appendChild(chip);
  });
}

function setFilter(id){
  activeFilter = id;
  renderFilters();
  renderToolGrid();
  document.getElementById("allTools").scrollIntoView({ behavior:"smooth", block:"start" });
}

/* ---------------- Render: tool grid ---------------- */
function toolCardHTML(t){
  const soon = t.ready ? "" : `<span class="badge-soon">Coming Soon</span>`;
  return `
    <div class="tool-card" data-id="${t.id}">
      ${soon}
      <div class="tool-icon ${t.color}">${t.icon}</div>
      <h4>${t.name}</h4>
      <p>${t.desc}</p>
      <button class="tool-open" data-id="${t.id}">${t.ready ? "Open Tool →" : "Notify me →"}</button>
    </div>`;
}

function renderToolGrid(){
  const grid = document.getElementById("toolGrid");
  let list = TOOLS;
  if (activeFilter !== "all") list = list.filter(t => t.cat === activeFilter);
  if (searchTerm.trim()) {
    const s = searchTerm.toLowerCase();
    list = list.filter(t => t.name.toLowerCase().includes(s) || t.desc.toLowerCase().includes(s));
  }
  grid.innerHTML = list.length ? list.map(toolCardHTML).join("") : `<p style="color:var(--text-faint)">No tools match your search.</p>`;

  grid.querySelectorAll(".tool-open, .tool-card").forEach(el => {
    el.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-id") || e.currentTarget.querySelector(".tool-open")?.getAttribute("data-id");
      if (id) openTool(id);
    });
  });
}

/* ---------------- Search ---------------- */
function initSearch(){
  const input = document.getElementById("searchInput");
  input.addEventListener("input", (e) => { searchTerm = e.target.value; renderToolGrid(); });
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); input.focus(); }
  });
}

/* ---------------- Quick Access / Popular ---------------- */
const QUICK_ACCESS_IDS = ["smart-id-print","multi-scanner","passport-photo","resume-builder","bg-remover"];
const POPULAR_IDS = ["smart-id-print","merge-pdf","passport-photo","image-compress","resume-builder"];

function railItemHTML(t){
  return `<a href="#" class="rail-item" data-id="${t.id}"><span class="rail-ic ${t.color}">${t.icon}</span><div class="ri-text"><div class="ri-name">${t.name}</div></div></a>`;
}
function renderRails(){
  const qa = document.getElementById("quickAccess");
  const pop = document.getElementById("popularTools");
  qa.innerHTML = QUICK_ACCESS_IDS.map(id => getToolById(id)).filter(Boolean).map(railItemHTML).join("");
  pop.innerHTML = POPULAR_IDS.map(id => getToolById(id)).filter(Boolean).map(railItemHTML).join("");
  [qa, pop].forEach(el => el.querySelectorAll(".rail-item").forEach(a => a.addEventListener("click", (e) => { e.preventDefault(); openTool(e.currentTarget.getAttribute("data-id")); })));
}

/* ---------------- Recently used ---------------- */
function pushRecentlyUsed(id){
  let list = JSON.parse(localStorage.getItem("adp_recent") || "[]");
  list = list.filter(x => x.id !== id);
  list.unshift({ id, t: Date.now() });
  list = list.slice(0, 6);
  localStorage.setItem("adp_recent", JSON.stringify(list));
  renderRecentlyUsed();
}
function timeAgo(ts){
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff/60) + " mins ago";
  if (diff < 86400) return Math.floor(diff/3600) + " hours ago";
  return Math.floor(diff/86400) + " days ago";
}
function renderRecentlyUsed(){
  const el = document.getElementById("recentlyUsed");
  const list = JSON.parse(localStorage.getItem("adp_recent") || "[]");
  if (!list.length){ el.innerHTML = `<div class="rail-empty">Tools you open will show up here.</div>`; return; }
  el.innerHTML = list.map(r => {
    const t = getToolById(r.id);
    if (!t) return "";
    return `<a href="#" class="rail-item" data-id="${t.id}"><span class="rail-ic ${t.color}">${t.icon}</span><div class="ri-text"><div class="ri-name">${t.name}</div><div class="ri-time">${timeAgo(r.t)}</div></div></a>`;
  }).join("");
  el.querySelectorAll(".rail-item").forEach(a => a.addEventListener("click", (e) => { e.preventDefault(); openTool(e.currentTarget.getAttribute("data-id")); }));
}

/* ---------------- Modal ---------------- */
function openModal(title, bodyHTML){
  const mount = document.getElementById("modalMount");
  mount.innerHTML = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal">
        <div class="modal-head">
          <h3>${title}</h3>
          <button class="modal-close" id="modalClose">✕</button>
        </div>
        <div class="modal-body" id="modalBody">${bodyHTML}</div>
      </div>
    </div>`;
  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("modalOverlay").addEventListener("click", (e) => { if (e.target.id === "modalOverlay") closeModal(); });
}
function closeModal(){ document.getElementById("modalMount").innerHTML = ""; }

function openTool(id){
  const t = getToolById(id);
  if (!t) return;
  if (!t.ready){
    openModal(t.name, `
      <div class="soon-panel">
        <div class="icon">${t.icon}</div>
        <h4 style="margin:0 0 8px;">Coming soon</h4>
        <p>${t.note || "This tool is on our build list and will be enabled in an upcoming update."}</p>
      </div>`);
    return;
  }
  pushRecentlyUsed(id);
  // Each tool module exposes a function named exactly like the tool id, camelCased with "open" prefix.
  const fnName = "open_" + id.replace(/-/g, "_");
  if (typeof window[fnName] === "function") {
    window[fnName]();
  } else {
    openModal(t.name, `<p>This tool isn't wired up yet (missing ${fnName}).</p>`);
  }
}

/* ---------------- WhatsApp join popup (once every 7 days) ---------------- */
function initWhatsAppPopup(){
  const KEY = "adp_wa_popup_last";
  const last = parseInt(localStorage.getItem(KEY) || "0", 10);
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - last < sevenDays) return;

  setTimeout(() => {
    const mount = document.getElementById("modalMount");
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="wa-popup-overlay" id="waOverlay">
        <div class="wa-popup">
          <button class="wa-close" id="waClose">✕</button>
          <div class="wa-icon">💬</div>
          <h3>Welcome to ANMOL DIGITAL POINT</h3>
          <p>Join our WhatsApp Channel to receive updates, new tools, digital service information, and useful tips.</p>
          <div class="wa-actions">
            <a class="btn btn-primary btn-block" href="https://whatsapp.com/channel/0029Va5tM43KwqSYrnKWs532" target="_blank" rel="noopener" id="waJoin">Join WhatsApp Channel</a>
            <button class="btn btn-outline btn-block" id="waNotNow">Not Now</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    const dismiss = () => { localStorage.setItem(KEY, Date.now().toString()); wrap.remove(); };
    document.getElementById("waClose").addEventListener("click", dismiss);
    document.getElementById("waNotNow").addEventListener("click", dismiss);
    document.getElementById("waJoin").addEventListener("click", dismiss);
    document.getElementById("waOverlay").addEventListener("click", (e) => { if (e.target.id === "waOverlay") dismiss(); });
  }, 4000); // shows once, 4s after page load
}

/* ---------------- PWA install ---------------- */
let deferredInstallPrompt = null;
function initPWA(){
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    document.getElementById("installBtn").classList.remove("hidden");
    showInstallBanner();
  });
  document.getElementById("installBtn").addEventListener("click", triggerInstall);
  window.addEventListener("appinstalled", () => {
    document.getElementById("installBtn").classList.add("hidden");
    showToast("App installed! You can now open it from your home screen.");
  });
}
function triggerInstall(){
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.finally(() => { deferredInstallPrompt = null; });
  const banner = document.getElementById("installBannerEl");
  if (banner) banner.remove();
}
function showInstallBanner(){
  if (localStorage.getItem("adp_install_dismissed") === "1") return;
  if (document.getElementById("installBannerEl")) return;
  const el = document.createElement("div");
  el.className = "install-banner";
  el.id = "installBannerEl";
  el.innerHTML = `
    <div style="font-size:26px;">📲</div>
    <div class="ib-text"><b>Install ADP Digital Suite</b><span>Add it to your home screen for one-tap access.</span></div>
    <button class="btn btn-primary btn-sm" id="ibInstall">Install</button>
    <button class="icon-btn" id="ibClose" style="width:32px;height:32px;">✕</button>`;
  document.body.appendChild(el);
  document.getElementById("ibInstall").addEventListener("click", triggerInstall);
  document.getElementById("ibClose").addEventListener("click", () => { localStorage.setItem("adp_install_dismissed","1"); el.remove(); });
}

/* ---------------- Boot ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initSidebar();
  renderCategories();
  renderFilters();
  renderToolGrid();
  renderRails();
  renderRecentlyUsed();
  initSearch();
  initWhatsAppPopup();
  initPWA();
});
