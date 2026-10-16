/* =====================================================================
   FebzTzy — script.js
   Bagian 1: Core, Config, Coin System, Topbar Events
   ===================================================================== */

/* ===== CONFIG ===== */
const BASE = "https://api.nexray.eu.cc";
const AMPREM_API = "https://anita-studio.netlify.app/.netlify/functions/amprem";
const OWNER_NAME = "FebzTzy";
const OWNER_WA = "6289679137206";
const WA_MSG_BUG = "Halo owner, saya mau lapor BUG di FebzTzy:";
const WA_MSG_BUY = "Halo owner, saya mau BELI COIN FebzTzy.";

const AMPREM_OWNER_CODE = "ALIGHT-VIP-5509";
const AMPREM_WA_NUMBER = OWNER_WA;
const AMPREM_WA_MSG = "Halo kak, saya ingin beli kode Unlimited Access untuk Alight Motion Premium (FebzTzy by " + OWNER_NAME + ").";
const AMPREM_TRIAL_LIMIT = 3;
const AMPREM_STORAGE_KEY = "am_trial_state_v1";

const COST_TOOLS = 1;
const COST_CRACKER = 3;
const COST_WEBTOOL = 1;

/* ===== COIN SYSTEM ===== */
const API_COIN = "/api/coins";
const USER_KEY = "febztzy_userid_v1";

function getUserId() {
  let id = localStorage.getItem(USER_KEY);
  if (!id) {
    id = "u_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem(USER_KEY, id);
  }
  return id;
}
const USER_ID = getUserId();

let coinCache = 0;
let checkinReadyCache = false;
let lastCheckinCache = 0;

async function coinAPI(action, extra) {
  const res = await fetch(API_COIN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.assign({ userId: USER_ID, action }, extra || {}))
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
  return data;
}

async function refreshCoins() {
  try {
    const d = await coinAPI("get");
    coinCache = d.coins | 0;
    checkinReadyCache = !!d.checkinReady;
    lastCheckinCache = d.lastCheckin | 0;
    renderCoins();
    renderCheckin();
  } catch (e) {
    console.warn("coin refresh gagal:", e.message);
  }
}
function getCoins() { return coinCache; }
function renderCoins() {
  const el = document.getElementById("coinVal");
  if (el) el.textContent = coinCache;
}

/* ===== CHECK-IN ===== */
const CHECKIN_INTERVAL = 3 * 60 * 60 * 1000;

function fmtLeft() {
  const left = CHECKIN_INTERVAL - (Date.now() - lastCheckinCache);
  if (left <= 0) return "";
  const total = Math.ceil(left / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return (h > 0 ? h + "j " : "") + m + "m " + s + "d";
}
function renderCheckin() {
  const btn = document.getElementById("checkinBtn");
  const txt = document.getElementById("checkinTxt");
  if (!btn || !txt) return;
  if (checkinReadyCache) {
    btn.disabled = false; btn.classList.add("ready");
    txt.textContent = "CHECK IN";
  } else {
    btn.disabled = true; btn.classList.remove("ready");
    txt.textContent = fmtLeft() || "3 JAM";
  }
}
setInterval(() => { if (!checkinReadyCache) renderCheckin(); }, 1000);

function openCheckin() {
  const ov = document.getElementById("checkinOverlay");
  const big = document.getElementById("ciBig");
  const msg = document.getElementById("ciMsg");
  const btn = document.getElementById("ciClaim");
  if (!ov) return;
  if (checkinReadyCache) {
    big.textContent = "🎁";
    msg.textContent = "Reward siap diklaim: 5 coin!";
    btn.disabled = false; btn.textContent = "Klaim 5 Coin"; btn.onclick = doClaimCheckin;
  } else {
    big.textContent = "⏳";
    msg.textContent = "Sudah check-in. Coba lagi dalam " + (fmtLeft() || "sebentar") + ".";
    btn.disabled = true; btn.textContent = "Belum waktunya";
  }
  ov.classList.add("open");
}
function closeCheckin() {
  document.getElementById("checkinOverlay").classList.remove("open");
}
async function doClaimCheckin() {
  if (!checkinReadyCache) return;
  const big = document.getElementById("ciBig");
  const msg = document.getElementById("ciMsg");
  const btn = document.getElementById("ciClaim");
  btn.disabled = true; btn.textContent = "Mengklaim...";
  try {
    const d = await coinAPI("checkin");
    coinCache = d.coins | 0;
    checkinReadyCache = false;
    lastCheckinCache = Date.now();
    renderCoins(); renderCheckin();
    big.textContent = "✅";
    msg.textContent = "+" + (d.reward || 5) + " coin masuk! Saldo: " + coinCache;
    btn.textContent = "Berhasil";
  } catch (e) {
    big.textContent = "❌"; msg.textContent = e.message; btn.textContent = "Gagal";
  }
}

/* ===== REDEEM ===== */
function openRedeem() {
  document.getElementById("redeemOverlay").classList.add("open");
  const input = document.getElementById("redeemInput");
  const res = document.getElementById("redeemResult");
  if (input) input.value = "";
  if (res) { res.className = "result"; res.innerHTML = ""; }
}
function closeRedeem() {
  document.getElementById("redeemOverlay").classList.remove("open");
}
async function submitRedeem() {
  const input = document.getElementById("redeemInput");
  const res = document.getElementById("redeemResult");
  const code = (input.value || "").trim().toUpperCase();
  if (!code) {
    res.className = "result show err"; res.innerHTML = "<pre>Masukkan kode dulu.</pre>"; return;
  }
  res.className = "result show"; res.innerHTML = "<pre>Memproses...</pre>";
  try {
    const d = await coinAPI("redeem", { code });
    coinCache = d.coins | 0; renderCoins();
    res.className = "result show ok";
    res.innerHTML = "<pre>🎉 Berhasil! +" + (d.reward || 0) + " coin masuk.\nSaldo: " + coinCache + "</pre>";
  } catch (e) {
    res.className = "result show err";
    res.innerHTML = "<pre>❌ " + escapeHTML(e.message) + "</pre>";
  }
}

/* ===== TOOLS DATA ===== */
let activeTool = null;
let lastResult = null;
let ampremState = null;

const TOOLS = [
  { id: "fake_tools", title: "Fake Tools", desc: "Kumpulan fitur fake: FF, Dana, Jago, ML, Story, GC, Dev.",
    ico: "🎭", acc: "acc-purple", special: "faketools" },
  { id: "iqc_v1", title: "IQC v1", desc: "Generate IQC versi 1 — masukkan teks.",
    ico: "🧪", acc: "acc-green", category: "maker",
    fields: [{ key: "text", label: "Teks", type: "textarea", placeholder: "tulis teks di sini" }],
    buildURL: p => BASE + "/maker/iqc?text=" + encodeURIComponent(p.text || ""),
    filename: () => "iqc_v1_" + Date.now() + ".png" },
  { id: "iqc_v2", title: "IQC v2", desc: "IQC v2 — teks, provider, jam, baterai.",
    ico: "🧬", acc: "acc-green", category: "maker",
    fields: [
      { key: "text", label: "Teks", type: "textarea", placeholder: "tulis teks di sini" },
      { key: "provider", label: "Provider", type: "select", options: ["Telkomsel","Indosat","XL","Tri","Smartfren","Axis"] },
      { key: "jam", label: "Jam", type: "text", placeholder: "14:30" },
      { key: "baterai", label: "Baterai (%)", type: "number", placeholder: "85" }
    ],
    buildURL: p => BASE + "/maker/v1/iqc?text=" + encodeURIComponent(p.text || "") + "&provider=" + encodeURIComponent(p.provider || "") + "&jam=" + encodeURIComponent(p.jam || "") + "&baterai=" + encodeURIComponent(p.baterai || ""),
    filename: () => "iqc_v2_" + Date.now() + ".png" },
  { id: "wink_hdr", title: "Wink HDR", desc: "Enhance foto / video via Wink HDR.",
    ico: "🪄", acc: "acc-red",
    fields: [
      { key: "url", label: "URL Foto / Video", type: "text", placeholder: "https://..." },
      { key: "type", label: "Tipe", type: "select", options: ["image","video"] }
    ],
    buildURL: p => BASE + "/tools/wink?url=" + encodeURIComponent(p.url || "") + "&type=" + encodeURIComponent(p.type || "image"),
    filename: p => "winkhdr_" + (p.type || "image") + "_" + Date.now() + (p.type === "video" ? ".mp4" : ".png") },
  { id: "hdvideo", title: "HD Video V1", desc: "Upgrade resolusi video — hd / full-hd / 2k / 4k.",
    ico: "🎬", acc: "acc-red",
    fields: [
      { key: "url", label: "URL Video", type: "text", placeholder: "https://..." },
      { key: "resolusi", label: "Resolusi", type: "select", options: ["hd","full-hd","2k","4k"] }
    ],
    buildURL: p => BASE + "/tools/v1/hdvideo?url=" + encodeURIComponent(p.url || "") + "&resolusi=" + encodeURIComponent(p.resolusi || "hd"),
    filename: p => "hdvideo_" + (p.resolusi || "hd") + "_" + Date.now() + ".mp4" },
  { id: "remini", title: "Remini", desc: "Perjelas & pertegas foto via Remini.",
    ico: "🖼️", acc: "acc-red",
    fields: [{ key: "url", label: "URL Foto", type: "text", placeholder: "https://..." }],
    buildURL: p => BASE + "/tools/remini?url=" + encodeURIComponent(p.url || ""),
    filename: () => "remini_" + Date.now() + ".png" },
  { id: "unblur", title: "Unblur Image", desc: "Pertajam / hilangkan blur foto.",
    ico: "🔍", acc: "acc-red",
    fields: [{ key: "url", label: "URL Foto", type: "text", placeholder: "https://..." }],
    buildURL: p => BASE + "/tools/unblur?url=" + encodeURIComponent(p.url || ""),
    filename: () => "unblur_" + Date.now() + ".png" },
  { id: "nikparse", title: "NIK Parse", desc: "Parse NIK 16 digit — wilayah, tanggal lahir, gender.",
    ico: "🪪", acc: "acc-warn", category: "cracker",
    fields: [{ key: "nik", label: "NIK (16 digit)", type: "text", placeholder: "contoh: 3201xxxxxxxxxxxx" }],
    buildURL: p => BASE + "/tools/nikparse?nik=" + encodeURIComponent(p.nik || ""),
    filename: () => "nikparse_" + Date.now() + ".txt" },
  { id: "trackip", title: "Track IP", desc: "Lacak IP dari domain / URL.",
    ico: "🌐", acc: "acc-warn", category: "cracker",
    fields: [{ key: "target", label: "Target (domain / URL)", type: "text", placeholder: "google.com" }],
    buildURL: p => BASE + "/tools/trackip?target=" + encodeURIComponent(p.target || ""),
    filename: () => "trackip_" + Date.now() + ".txt" },
  { id: "spamngl", title: "Spam NGL", desc: "Kirim pesan ke link NGL.",
    ico: "💬", acc: "acc-warn", category: "cracker",
    fields: [
      { key: "url", label: "URL NGL", type: "text", placeholder: "https://ngl.link/febztzy" },
      { key: "pesan", label: "Pesan", type: "textarea", placeholder: "tulis pesan di sini" },
      { key: "jumlah", label: "Jumlah", type: "number", placeholder: "6" }
    ],
    buildURL: p => BASE + "/tools/spamngl?url=" + encodeURIComponent(p.url || "") + "&pesan=" + encodeURIComponent(p.pesan || "") + "&jumlah=" + encodeURIComponent(p.jumlah || "1"),
    filename: () => "spamngl_" + Date.now() + ".txt" },
  { id: "webtozip", title: "Web to Zip", desc: "Download seluruh halaman web jadi arsip zip.",
    ico: "📦", acc: "acc-green", category: "webtool",
    fields: [{ key: "url", label: "URL Website", type: "text", placeholder: "https://febztzy.com" }],
    buildURL: p => BASE + "/tools/webtozip?url=" + encodeURIComponent(p.url || ""),
    filename: () => "webtozip_" + Date.now() + ".zip" },
  { id: "amprem", title: "Create Alight Motion Premium",
    desc: "Aktivasi Alight Motion Premium — kirim magic link, verifikasi, apply.",
    ico: "✨", acc: "acc-red", special: "amprem", category: "amprem" }
];

function costOf(tool) {
  if (!tool) return 0;
  if (tool.category === "cracker") return COST_CRACKER;
  if (tool.category === "webtool") return COST_WEBTOOL;
  return COST_TOOLS;
}
/* ===== RENDER MENU ===== */
const toolsToggle = document.getElementById("toolsToggle");
const toolsMenu = document.getElementById("toolsMenu");
const toolsMenuInner = document.getElementById("toolsMenuInner");
const crackerToggle = document.getElementById("crackerToggle");
const crackerMenu = document.getElementById("crackerMenu");
const crackerMenuInner = document.getElementById("crackerMenuInner");
const webtoolToggle = document.getElementById("webtoolToggle");
const webtoolMenu = document.getElementById("webtoolMenu");
const webtoolMenuInner = document.getElementById("webtoolMenuInner");
const makerToggle = document.getElementById("makerToggle");
const makerMenu = document.getElementById("makerMenu");
const makerMenuInner = document.getElementById("makerMenuInner");
const ampremToggle = document.getElementById("ampremToggle");
const ampremMenu = document.getElementById("ampremMenu");
const ampremMenuInner = document.getElementById("ampremMenuInner");

function buildItem(t, menuEl, toggleEl) {
  const item = document.createElement("div");
  item.className = "tool-item " + (t.acc || "");
  const cost = costOf(t);
  item.innerHTML = '<div class="ti-ico">' + t.ico + '</div>' +
    '<div class="ti-info"><div class="ti-title">' + t.title + '</div>' +
    '<div class="ti-sub">🪙 ' + cost + ' coin · by ' + OWNER_NAME + '</div></div>' +
    '<div class="ti-arrow">›</div>';
  item.onclick = () => {
    menuEl.classList.remove("open"); toggleEl.classList.remove("open");
    openModal(t.id);
  };
  return item;
}

function closeAllMenus(except) {
  if (except !== "tools" && toolsMenu && toolsToggle) { toolsMenu.classList.remove("open"); toolsToggle.classList.remove("open"); }
  if (except !== "cracker" && crackerMenu && crackerToggle) { crackerMenu.classList.remove("open"); crackerToggle.classList.remove("open"); }
  if (except !== "webtool" && webtoolMenu && webtoolToggle) { webtoolMenu.classList.remove("open"); webtoolToggle.classList.remove("open"); }
  if (except !== "maker" && makerMenu && makerToggle) { makerMenu.classList.remove("open"); makerToggle.classList.remove("open"); }
  if (except !== "amprem" && ampremMenu && ampremToggle) { ampremMenu.classList.remove("open"); ampremToggle.classList.remove("open"); }
}

if (toolsMenuInner && toolsMenu && toolsToggle) {
  TOOLS.filter(t => t.category !== "cracker" && t.category !== "webtool" && t.category !== "maker" && t.category !== "amprem").forEach(t => {
    toolsMenuInner.appendChild(buildItem(t, toolsMenu, toolsToggle));
  });
  toolsToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = toolsMenu.classList.toggle("open");
    toolsToggle.classList.toggle("open", open);
    if (open) closeAllMenus("tools");
  });
}
if (crackerMenuInner && crackerMenu && crackerToggle) {
  TOOLS.filter(t => t.category === "cracker").forEach(t => {
    crackerMenuInner.appendChild(buildItem(t, crackerMenu, crackerToggle));
  });
  crackerToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = crackerMenu.classList.toggle("open");
    crackerToggle.classList.toggle("open", open);
    if (open) closeAllMenus("cracker");
  });
}
if (webtoolMenuInner && webtoolMenu && webtoolToggle) {
  TOOLS.filter(t => t.category === "webtool").forEach(t => {
    webtoolMenuInner.appendChild(buildItem(t, webtoolMenu, webtoolToggle));
  });
  webtoolToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = webtoolMenu.classList.toggle("open");
    webtoolToggle.classList.toggle("open", open);
    if (open) closeAllMenus("webtool");
  });
}
if (makerMenuInner && makerMenu && makerToggle) {
  TOOLS.filter(t => t.category === "maker").forEach(t => {
    makerMenuInner.appendChild(buildItem(t, makerMenu, makerToggle));
  });
  makerToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = makerMenu.classList.toggle("open");
    makerToggle.classList.toggle("open", open);
    if (open) closeAllMenus("maker");
  });
}
if (ampremMenuInner && ampremMenu && ampremToggle) {
  TOOLS.filter(t => t.category === "amprem").forEach(t => {
    ampremMenuInner.appendChild(buildItem(t, ampremMenu, ampremToggle));
  });
  ampremToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = ampremMenu.classList.toggle("open");
    ampremToggle.classList.toggle("open", open);
    if (open) closeAllMenus("amprem");
  });
}
document.addEventListener("click", (e) => {
  const insideTools = toolsMenu && toolsToggle && (toolsMenu.contains(e.target) || toolsToggle.contains(e.target));
  const insideCracker = crackerMenu && crackerToggle && (crackerMenu.contains(e.target) || crackerToggle.contains(e.target));
  const insideWeb = webtoolMenu && webtoolToggle && (webtoolMenu.contains(e.target) || webtoolToggle.contains(e.target));
  const insideMaker = makerMenu && makerToggle && (makerMenu.contains(e.target) || makerToggle.contains(e.target));
  const insideAmp = ampremMenu && ampremToggle && (ampremMenu.contains(e.target) || ampremToggle.contains(e.target));
  if (!insideTools && !insideCracker && !insideWeb && !insideMaker && !insideAmp) closeAllMenus();
});

/* ===== MODAL ===== */
function openModal(id) {
  activeTool = TOOLS.find(t => t.id === id);
  if (!activeTool) return;
  lastResult = null;
  document.getElementById("mTitle").textContent = activeTool.title;
  document.getElementById("mSub").textContent = activeTool.desc;
  document.getElementById("mResult").className = "result";
  document.getElementById("mResult").innerHTML = "";
  document.getElementById("mLoader").className = "loader";
  document.getElementById("mExec").disabled = false;
  document.getElementById("mDl").style.display = "none";
  document.getElementById("mExtra").style.display = "none";
  document.getElementById("mExtra").innerHTML = "";
  document.getElementById("mExec").style.display = "block";
  const cost = costOf(activeTool);
  const costEl = document.getElementById("mCost");
  if (costEl) costEl.textContent = "🪙 " + cost + " coin / pakai";

  if (activeTool.special === "amprem") renderAmpRem();
  else if (activeTool.special === "faketools") renderFakeTools();
  else renderGeneric();

  document.getElementById("overlay").classList.add("open");
}
function closeModal() {
  document.getElementById("overlay").classList.remove("open");
  activeTool = null; lastResult = null; ampremState = null;
}
function renderGeneric() {
  const wrap = document.getElementById("mFields");
  wrap.innerHTML = "";
  activeTool.fields.forEach(f => {
    const div = document.createElement("div");
    div.className = "field";
    if (f.type === "select") {
      div.innerHTML = '<label>' + f.label + '</label><select data-key="' + f.key + '">' + f.options.map(o => '<option>' + o + '</option>').join("") + '</select>';
    } else if (f.type === "textarea") {
      div.innerHTML = '<label>' + f.label + '</label><textarea data-key="' + f.key + '" placeholder="' + (f.placeholder || "") + '"></textarea>';
    } else {
      div.innerHTML = '<label>' + f.label + '</label><input type="' + f.type + '" data-key="' + f.key + '" placeholder="' + (f.placeholder || "") + '">';
    }
    wrap.appendChild(div);
  });
}
function collectParams() {
  const params = {};
  document.querySelectorAll("#mFields [data-key]").forEach(el => {
    params[el.dataset.key] = el.value;
  });
  return params;
}
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ===== EXECUTE — dengan potong coin ===== */
async function executeTool() {
  if (!activeTool || activeTool.special) return;
  const params = collectParams();
  const loader = document.getElementById("mLoader");
  const execBtn = document.getElementById("mExec");
  const resEl = document.getElementById("mResult");

  const cost = costOf(activeTool);
  if (getCoins() < cost) {
    resEl.className = "result show err";
    resEl.innerHTML = "<pre>🪙 Coin tidak cukup.\nButuh " + cost + " coin, saldo: " + getCoins() + ".\nCheck-in / redeem / beli coin ke owner.</pre>";
    return;
  }
  loader.classList.add("show"); execBtn.disabled = true;
  resEl.className = "result"; resEl.innerHTML = "";

  try {
    const d = await coinAPI("spend", { amount: cost });
    coinCache = d.coins | 0;
    renderCoins();
  } catch (e) {
    resEl.className = "result show err";
    resEl.innerHTML = "<pre>Gagal potong coin: " + escapeHTML(e.message) + "</pre>";
    loader.classList.remove("show"); execBtn.disabled = false;
    return;
  }

  let success = false;
  try {
    const url = activeTool.buildURL(params);
    const res = await fetch(url);

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      lastResult = { type: "text", data: "HTTP " + res.status + "\n" + (txt || "(no body)"), filename: "error.txt" };
      resEl.className = "result show err";
      resEl.innerHTML = "<pre>" + escapeHTML(lastResult.data) + "</pre>";
    } else {
      const ct = res.headers.get("content-type") || "";
      if (ct.startsWith("image/")) {
        const blob = await res.blob();
        const objURL = URL.createObjectURL(blob);
        lastResult = { type: "image", data: objURL, filename: activeTool.filename(params) };
        resEl.className = "result show ok";
        resEl.innerHTML = '<img src="' + objURL + '" alt="result">';
        success = true;
      } else if (ct.startsWith("video/")) {
        const blob = await res.blob();
        const objURL = URL.createObjectURL(blob);
        lastResult = { type: "image", data: objURL, filename: activeTool.filename(params) };
        resEl.className = "result show ok";
        resEl.innerHTML = '<video src="' + objURL + '" controls playsinline></video>';
        success = true;
      } else {
        const raw = await res.text();
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch (e) { }
        const imgURL = parsed && (parsed.result || parsed.url || parsed.data || parsed.image || parsed.link);
        if (imgURL && typeof imgURL === "string" && /^https?:\/\//.test(imgURL)) {
          const isVid = /\.(mp4|webm|mov)$/i.test(imgURL);
          lastResult = { type: "image", data: imgURL, filename: activeTool.filename(params) };
          resEl.className = "result show ok";
          resEl.innerHTML = isVid ? '<video src="' + imgURL + '" controls playsinline></video>' : '<img src="' + imgURL + '" alt="result">';
          success = true;
        } else {
          const pretty = parsed ? JSON.stringify(parsed, null, 2) : raw;
          const isError = /gagal|error|invalid|not found/i.test(pretty) && !parsed?.result && !parsed?.url;
          lastResult = { type: "text", data: pretty, filename: activeTool.filename(params).replace(/\.(png|mp4|zip)$/, ".txt") };
          resEl.className = "result show " + (isError ? "err" : "ok");
          resEl.innerHTML = "<pre>" + escapeHTML(pretty) + "</pre>";
          success = !isError;
        }
      }
    }
  } catch (err) {
    lastResult = { type: "text", data: "Gagal:\n" + err.message, filename: "error.txt" };
    resEl.className = "result show err";
    resEl.innerHTML = "<pre>" + escapeHTML(lastResult.data) + "</pre>";
  } finally {
    loader.classList.remove("show"); execBtn.disabled = false;
    if (!success) {
      try {
        const d = await coinAPI("refund", { amount: cost });
        coinCache = d.coins | 0; renderCoins();
      } catch (e) { console.warn("refund gagal", e); }
      const note = document.createElement("div");
      note.style.marginTop = "10px";
      note.style.color = "#fbbf24";
      note.style.fontSize = ".78rem";
      note.textContent = "🪙 Coin dikembalikan karena gagal.";
      resEl.appendChild(note);
    }
    showDownload();
  }
}
function showDownload() {
  const dl = document.getElementById("mDl");
  if (lastResult) dl.style.display = "block";
}
async function downloadResult() {
  if (!lastResult) return;
  const a = document.createElement("a");
  a.download = lastResult.filename || "result";
  a.rel = "noopener";
  const isVideo = /\.(mp4|webm|mov)$/i.test(lastResult.filename || "");
  const isZip = /\.zip$/i.test(lastResult.filename || "");
  if (lastResult.data.startsWith("blob:")) {
    a.href = lastResult.data;
    document.body.appendChild(a); a.click(); a.remove();
    return;
  }
  try {
    const r = await fetch(lastResult.data);
    const b = await r.blob();
    const fallbackType = isVideo ? "video/mp4" : (isZip ? "application/zip" : "image/png");
    const blob = b.type ? b : new Blob([b], { type: fallbackType });
    const u = URL.createObjectURL(blob);
    a.href = u; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 5000);
  } catch (e) { window.open(lastResult.data, "_blank"); }
}

/* ===== AMPREM ===== */
function loadAmpRemState() {
  try {
    const raw = localStorage.getItem(AMPREM_STORAGE_KEY);
    if (!raw) return { count: 0, unlocked: false };
    const s = JSON.parse(raw);
    return { count: Math.max(0, parseInt(s.count) || 0), unlocked: !!s.unlocked };
  } catch { return { count: 0, unlocked: false }; }
}
function saveAmpRemState(s) { try { localStorage.setItem(AMPREM_STORAGE_KEY, JSON.stringify(s)); } catch { } }
function ampremConsumeTrial() {
  const s = loadAmpRemState(); if (s.unlocked) return;
  s.count++; saveAmpRemState(s);
}
function renderAmpRem() {
  const wrap = document.getElementById("mFields");
  const extra = document.getElementById("mExtra");
  const execBtn = document.getElementById("mExec");
  const costEl = document.getElementById("mCost");
  const state = loadAmpRemState();
  ampremState = { email: "", step: 1 };
  const left = Math.max(0, AMPREM_TRIAL_LIMIT - state.count);
  const badge = state.unlocked
    ? '<div class="step-badge gold">👑 UNLIMITED — ' + OWNER_NAME + '</div>'
    : '<div class="step-badge">⚡ Trial tersisa: ' + left + ' / ' + AMPREM_TRIAL_LIMIT + ' — ' + OWNER_NAME + '</div>';
  if (costEl) costEl.textContent = "🪙 Free (trial)";
  wrap.innerHTML = badge
    + '<div id="amStep1"><div class="field"><label>Email</label><input type="email" data-key="email" placeholder="Masukkan email Anda"></div></div>'
    + '<div id="amStep2" class="step-hidden"><div class="field"><label>Raw Magic Link</label><input type="text" data-key="rawLink" placeholder="Tempelkan magic link dari email"></div></div>';
  execBtn.style.display = "none";
  extra.style.display = "flex";
  if (!state.unlocked && left <= 0) {
    wrap.innerHTML += '<div class="field" id="amCodeField"><label>Kode Akses Owner</label><input type="text" data-key="unlockCode" placeholder="Masukkan kode akses owner"></div>';
    extra.innerHTML = '<button class="btn btn-wa" id="amBtnBuy">🟢 Beli Kode via WhatsApp</button><button class="btn btn-gold" id="amBtnUnlock">🔓 Aktivasi Kode</button>';
    document.getElementById("amBtnBuy").onclick = () => {
      const mobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
      const url = mobile ? "https://wa.me/" + AMPREM_WA_NUMBER + "?text=" + encodeURIComponent(AMPREM_WA_MSG)
        : "https://web.whatsapp.com/send?phone=" + AMPREM_WA_NUMBER + "&text=" + encodeURIComponent(AMPREM_WA_MSG);
      window.open(url, "_blank");
    };
    document.getElementById("amBtnUnlock").onclick = () => {
      const code = (document.querySelector('[data-key="unlockCode"]')?.value || "").trim();
      const r = document.getElementById("mResult");
      r.className = "result show";
      if (code === AMPREM_OWNER_CODE) {
        const s = loadAmpRemState(); s.unlocked = true; saveAmpRemState(s);
        r.className = "result show ok";
        r.innerHTML = "<pre>🎉 Kode valid! Unlimited access terbuka.\nOwner: " + OWNER_NAME + "\nTutup modal, lalu buka lagi untuk mulai.</pre>";
      } else {
        r.className = "result show err";
        r.innerHTML = "<pre>❌ Kode salah. Hubungi owner " + OWNER_NAME + " via WhatsApp.</pre>";
      }
    };
    return;
  }
  extra.innerHTML = '<button class="btn btn-primary" id="amBtnSend">📧 Kirim Magic Link</button>';
  document.getElementById("amBtnSend").onclick = ampremSendMagicLink;
}
async function ampremRequest(action, data) {
  const res = await fetch(AMPREM_API, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.assign({ action }, data))
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return await res.json();
}
async function ampremSendMagicLink() {
  const email = (document.querySelector('[data-key="email"]')?.value || "").trim();
  const res = document.getElementById("mResult");
  const loader = document.getElementById("mLoader");
  const btn = document.getElementById("amBtnSend");
  if (!email) { res.className = "result show err"; res.innerHTML = "<pre>Masukkan email dulu.</pre>"; return; }
  btn.disabled = true; loader.classList.add("show");
  res.className = "result show"; res.innerHTML = "<pre>Mengirim magic link...</pre>";
  try {
    const data = await ampremRequest("send-magiclink", { email });
    if (data.success) {
      res.className = "result show ok";
      res.innerHTML = "<pre>✅ Magic link dikirim ke " + email + ".\nCek inbox/spam, lalu tempelkan raw magic link di kolom bawah.\n\n— " + OWNER_NAME + "</pre>";
      ampremState.email = email;
      document.getElementById("amStep2").classList.remove("step-hidden");
      ampremConsumeTrial();
      const extra = document.getElementById("mExtra");
      extra.innerHTML = '<button class="btn btn-primary" id="amBtnVerify">✅ Verifikasi & Aktivasi</button>';
      document.getElementById("amBtnVerify").onclick = ampremVerify;
    } else {
      res.className = "result show err";
      res.innerHTML = "<pre>❌ " + (data.message || "Gagal mengirim magic link.") + "\n— " + OWNER_NAME + "</pre>";
    }
  } catch (e) {
    res.className = "result show err";
    res.innerHTML = "<pre>Error: " + escapeHTML(e.message) + "\n— " + OWNER_NAME + "</pre>";
  } finally { btn.disabled = false; loader.classList.remove("show"); }
}
async function ampremVerify() {
  const rawLink = (document.querySelector('[data-key="rawLink"]')?.value || "").trim();
  const email = ampremState?.email || (document.querySelector('[data-key="email"]')?.value || "").trim();
  const res = document.getElementById("mResult");
  const loader = document.getElementById("mLoader");
  const btn = document.getElementById("amBtnVerify");
  if (!rawLink) { res.className = "result show err"; res.innerHTML = "<pre>Tempelkan magic link dulu.</pre>"; return; }
  btn.disabled = true; loader.classList.add("show");
  res.className = "result show"; res.innerHTML = "<pre>Memverifikasi akun...</pre>";
  try {
    const verify = await ampremRequest("verify-account", { email, rawLink });
    if (!verify.success) {
      res.className = "result show err";
      res.innerHTML = "<pre>❌ " + (verify.message || "Verifikasi gagal.") + "\n— " + OWNER_NAME + "</pre>";
      return;
    }
    const idToken = verify.idToken || (verify.profile && verify.profile.idToken);
    if (!idToken) {
      res.className = "result show err";
      res.innerHTML = "<pre>❌ idToken tidak ditemukan.\n— " + OWNER_NAME + "</pre>";
      return;
    }
    res.innerHTML = "<pre>✅ Verifikasi berhasil. Menerapkan premium...</pre>";
    const premium = await ampremRequest("apply-premium", { email, idToken });
    if (premium.success) {
      res.className = "result show ok";
     res.innerHTML = "<pre>🎉 ALIGHT MOTION PREMIUM ACTIVE\n\nEmail: " + escapeHTML(email) + "\nStatus: PREMIUM SUCCESSFULLY ACTIVATED\n\n— " + OWNER_NAME + "</pre>";
    } else {
      res.className = "result show err";
      res.innerHTML = "<pre>❌ " + (premium.message || "Gagal apply premium.") + "\n— " + OWNER_NAME + "</pre>";
    }
  } catch (e) {
    res.className = "result show err";
    res.innerHTML = "<pre>Error: " + escapeHTML(e.message) + "\n— " + OWNER_NAME + "</pre>";
  } finally { btn.disabled = false; loader.classList.remove("show"); }
}
/* ============================================================
   FAKE TOOLS — kumpulan semua fitur fake dalam satu modal
   ============================================================ */
const FAKETOOLS_MODES = [
  { value: "ff_cowo", label: "Fake Lobby FF — Cowo" },
  { value: "ff_cewe", label: "Fake Lobby FF — Cewe" },
  { value: "ff_duo",  label: "Fake Lobby FF — Duo" },
  { value: "dana",    label: "Fake Dana" },
  { value: "jago",    label: "Fake Bank Jago" },
  { value: "ovo",     label: "Fake OVO" },
  { value: "gopay",   label: "Fake GoPay" },
  { value: "tele",    label: "Fake Telegram" },
  { value: "call_ios",     label: "Fake Call — iOS" },
  { value: "call_android", label: "Fake Call — Android" },
  { value: "ml",      label: "Fake Mobile Legends" },
  { value: "story",   label: "Fake Story" },
  { value: "gc",      label: "Fake GC" },
  { value: "dev",     label: "Fake Dev" }
];

function renderFakeTools() {
  const wrap = document.getElementById("mFields");
  const extra = document.getElementById("mExtra");
  const execBtn = document.getElementById("mExec");
  const costEl = document.getElementById("mCost");
  if (costEl) costEl.textContent = "🪙 1 coin / pakai";

  execBtn.style.display = "none";
  extra.style.display = "flex";
  extra.innerHTML = '<button class="btn btn-primary" id="ftExec" type="button">✨ Buat</button>';

  let mode = "ff_cowo";

  wrap.innerHTML = `
    <div class="field">
      <label>Pilih Fitur</label>
      <select id="ftMode">
        ${FAKETOOLS_MODES.map(m => `<option value="${m.value}">${m.label}</option>`).join("")}
      </select>
    </div>
    <div id="ftFields"></div>
  `;

  const modeSel = document.getElementById("ftMode");
  const fieldsEl = document.getElementById("ftFields");
  const ftExec = document.getElementById("ftExec");

  const urlInput = (id, label) => `
    <div class="field">
      <label>${label || "URL Foto"}</label>
      <input type="text" id="${id}" placeholder="https://files.catbox.moe/xxx.jpg">
    </div>
  `;

  function renderFields() {
    if (mode === "ff_cowo") {
      fieldsEl.innerHTML = `<div class="field"><label>Nickname</label><input type="text" id="ftNick" placeholder="PlayerOne" maxlength="20"></div>`;
    } else if (mode === "ff_cewe") {
      fieldsEl.innerHTML = `<div class="field"><label>Username</label><input type="text" id="ftUsn" placeholder="FebzTzy" maxlength="20"></div>`;
    } else if (mode === "ff_duo") {
      fieldsEl.innerHTML = `
        <div class="field"><label>Nama 1</label><input type="text" id="ftName1" placeholder="FebzTzy" maxlength="15"></div>
        <div class="field"><label>Nama 2</label><input type="text" id="ftName2" placeholder="feb" maxlength="15"></div>`;
    } else if (mode === "dana") {
      fieldsEl.innerHTML = `<div class="field"><label>Nominal (Rp)</label><input type="number" id="ftNominal" placeholder="1000000"></div>`;
    } else if (mode === "jago") {
      fieldsEl.innerHTML = `
        <div class="field"><label>Nama Pemilik</label><input type="text" id="ftNama" placeholder="Budi Santoso" maxlength="30"></div>
        <div class="field"><label>Saldo (Rp)</label><input type="number" id="ftSaldo" placeholder="5000000"></div>`;
    } else if (mode === "ovo") {
      fieldsEl.innerHTML = `<div class="field"><label>Nominal OVO (Rp)</label><input type="number" id="ftOvoNominal" placeholder="5000" value="5000" min="1"></div>`;
    } else if (mode === "gopay") {
      fieldsEl.innerHTML = `
        <div class="field"><label>Saldo (Rp)</label><input type="number" id="ftGpSaldo" placeholder="400" value="400" min="0"></div>
        <div class="field"><label>Koin</label><input type="number" id="ftGpKoin" placeholder="120" value="120" min="0"></div>
        <div class="field"><label>Terpakai (Rp)</label><input type="number" id="ftGpTerpakai" placeholder="500" value="500" min="0"></div>
        <div class="field"><label>Bulan</label><input type="text" id="ftGpBulan" placeholder="Juli" value="Juli" maxlength="15"></div>`;
    } else if (mode === "ml") {
      fieldsEl.innerHTML = `${urlInput("ftAvatar", "URL Avatar")}<div class="field"><label>Nickname</label><input type="text" id="ftMlNick" placeholder="MLPlayer" maxlength="20"></div>`;
    } else if (mode === "story") {
      fieldsEl.innerHTML = `
        ${urlInput("ftAvatar", "URL Avatar")}
        <div class="field"><label>Username</label><input type="text" id="ftStoryUser" placeholder="username_ig" maxlength="20"></div>
        <div class="field"><label>Caption</label><textarea id="ftCaption" placeholder="tulis caption" maxlength="200"></textarea></div>`;
    } else if (mode === "gc") {
      fieldsEl.innerHTML = `
        ${urlInput("ftGcAvatar", "URL Foto Avatar Grup")}
        <div class="field"><label>Nama Grup</label><input type="text" id="ftGcNama" placeholder="Febz Family" maxlength="30"></div>
        <div class="field"><label>Jumlah Anggota</label><input type="number" id="ftGcAnggota" placeholder="20" value="20" min="1" max="9999"></div>`;
    } else if (mode === "dev") {
      fieldsEl.innerHTML = `
        ${urlInput("ftDevAvatar", "URL Foto")}
        <div class="field"><label>Teks Melengkung</label><input type="text" id="ftDevText" placeholder="DEVELOPER" maxlength="20" value="DEVELOPER"></div>
        <div class="field" style="display:flex;gap:6px;flex-wrap:wrap">
          <button type="button" class="hud-btn" data-ft-chip="DEVELOPER">DEVELOPER</button>
          <button type="button" class="hud-btn" data-ft-chip="OWNER">OWNER</button>
          <button type="button" class="hud-btn" data-ft-chip="ADMIN">ADMIN</button>
          <button type="button" class="hud-btn" data-ft-chip="FEBZTZY">FEBZTZY</button>
        </div>`;
      fieldsEl.querySelectorAll("[data-ft-chip]").forEach(b => {
        b.addEventListener("click", () => {
          const inp = document.getElementById("ftDevText");
          if (inp) inp.value = b.dataset.ftChip || "";
        });
      });
    } else if (mode === "tele") {
      fieldsEl.innerHTML = `
        ${urlInput("ftTeleAvatar", "URL Foto Avatar")}
        <div class="field"><label>Nama</label><input type="text" id="ftTeleNama" placeholder="FebzTzy" maxlength="30"></div>
        <div class="field"><label>Nomor Telepon</label><input type="text" id="ftTeleNomor" placeholder="0812345678" maxlength="20"></div>
        <div class="field"><label>Bio</label><input type="text" id="ftTeleBio" placeholder="By FebzTzy" maxlength="70"></div>
        <div class="field"><label>Username</label><input type="text" id="ftTeleUser" placeholder="police_55" maxlength="32"></div>`;
    } else if (mode === "call_ios" || mode === "call_android") {
      fieldsEl.innerHTML = `
        ${urlInput("ftCallAvatar", "URL Foto Avatar")}
        <div class="field"><label>Nama Penelepon</label><input type="text" id="ftCallNama" placeholder="FebzTzy" maxlength="30"></div>
        <div class="field"><label>Durasi</label><input type="text" id="ftCallDurasi" placeholder="01:00:11" value="01:00:11" maxlength="10"></div>`;
    }
  }

  modeSel.addEventListener("change", () => { mode = modeSel.value; renderFields(); });
  renderFields();

  ftExec.addEventListener("click", async () => {
    const resEl = document.getElementById("mResult");
    const loader = document.getElementById("mLoader");
    let url = "", fname = "";

    try {
      if (mode === "ff_cowo") {
        const nick = (document.getElementById("ftNick")?.value || "").trim();
        if (!nick) throw new Error("Isi Nickname dulu.");
        url = BASE + "/maker/fakelobyff?nickname=" + encodeURIComponent(nick);
        fname = "fakelobyff_" + nick.replace(/\s+/g, "_") + "_" + Date.now() + ".png";
      } else if (mode === "ff_cewe") {
        const usn = (document.getElementById("ftUsn")?.value || "").trim();
        if (!usn) throw new Error("Isi Username dulu.");
        url = "https://apiii-xrina.my.id/canvas/fakeff2?usn=" + encodeURIComponent(usn);
        fname = "fakeff_cewe_" + usn.replace(/\s+/g, "_") + "_" + Date.now() + ".png";
      } else if (mode === "ff_duo") {
        const n1 = (document.getElementById("ftName1")?.value || "").trim();
        const n2 = (document.getElementById("ftName2")?.value || "").trim();
        if (!n1 || !n2) throw new Error("Isi kedua nama dulu.");
        url = "https://apiii-xrina.my.id/canvas/fakeffduo?name1=" + encodeURIComponent(n1) + "&name2=" + encodeURIComponent(n2);
        fname = "fakeff_duo_" + n1.replace(/\s+/g, "_") + "_" + n2.replace(/\s+/g, "_") + "_" + Date.now() + ".png";
      } else if (mode === "dana") {
        const nom = (document.getElementById("ftNominal")?.value || "").trim();
        if (!nom) throw new Error("Isi Nominal dulu.");
        url = BASE + "/maker/fakedana?nominal=" + encodeURIComponent(nom);
        fname = "fakedana_" + nom + "_" + Date.now() + ".png";
      } else if (mode === "jago") {
        const nama = (document.getElementById("ftNama")?.value || "").trim();
        const saldo = (document.getElementById("ftSaldo")?.value || "").trim();
        if (!nama || !saldo) throw new Error("Isi Nama & Saldo dulu.");
        url = BASE + "/maker/fakebank-jago?nama=" + encodeURIComponent(nama) + "&saldo=" + encodeURIComponent(saldo);
        fname = "fakebankjago_" + nama.replace(/\s+/g, "_") + "_" + Date.now() + ".png";
      } else if (mode === "ovo") {
        const nominal = (document.getElementById("ftOvoNominal")?.value || "").trim();
        if (!nominal || isNaN(Number(nominal)) || Number(nominal) < 1) throw new Error("Isi Nominal yang valid.");
        url = "https://apiii-xrina.my.id/canvas/fakeovo?nominal=" + encodeURIComponent(nominal);
        fname = "fakeovo_" + nominal + "_" + Date.now() + ".png";
      } else if (mode === "gopay") {
        const saldo = (document.getElementById("ftGpSaldo")?.value || "").trim();
        const koin = (document.getElementById("ftGpKoin")?.value || "").trim();
        const terpakai = (document.getElementById("ftGpTerpakai")?.value || "").trim();
        const bulan = (document.getElementById("ftGpBulan")?.value || "").trim();
        if (!saldo || !koin || !terpakai || !bulan) throw new Error("Isi semua kolom GoPay dulu.");
        url = "https://apiii-xrina.my.id/canvas/fakegopay?saldo=" + encodeURIComponent(saldo) + "&koin=" + encodeURIComponent(koin) + "&terpakai=" + encodeURIComponent(terpakai) + "&bulan=" + encodeURIComponent(bulan);
        fname = "fakegopay_" + saldo + "_" + Date.now() + ".png";
      } else if (mode === "ml") {
        const av = (document.getElementById("ftAvatar")?.value || "").trim();
        const nick = (document.getElementById("ftMlNick")?.value || "").trim();
        if (!av || !nick) throw new Error("Isi URL Avatar & Nickname dulu.");
        url = BASE + "/maker/fakelobyml?avatar=" + encodeURIComponent(av) + "&nickname=" + encodeURIComponent(nick);
        fname = "fakelobyml_" + nick.replace(/\s+/g, "_") + "_" + Date.now() + ".png";
      } else if (mode === "story") {
        const av = (document.getElementById("ftAvatar")?.value || "").trim();
        const user = (document.getElementById("ftStoryUser")?.value || "").trim();
        const cap = (document.getElementById("ftCaption")?.value || "").trim();
        if (!av || !user || !cap) throw new Error("Isi semua kolom Story dulu.");
        url = BASE + "/maker/fakestory?avatar=" + encodeURIComponent(av) + "&username=" + encodeURIComponent(user) + "&caption=" + encodeURIComponent(cap);
        fname = "fakestory_" + user.replace(/[^a-z0-9]/gi, "_") + "_" + Date.now() + ".png";
      } else if (mode === "gc") {
        const av = (document.getElementById("ftGcAvatar")?.value || "").trim();
        const nama = (document.getElementById("ftGcNama")?.value || "").trim();
        const anggota = (document.getElementById("ftGcAnggota")?.value || "").trim();
        if (!av) throw new Error("Isi URL Foto Avatar Grup dulu.");
        if (!nama) throw new Error("Isi Nama Grup dulu.");
        if (!anggota || isNaN(Number(anggota)) || Number(anggota) < 1) throw new Error("Isi Jumlah Anggota yang valid.");
        url = "https://apiii-xrina.my.id/canvas/fakegc?pp=" + encodeURIComponent(av) + "&nama=" + encodeURIComponent(nama) + "&anggota=" + encodeURIComponent(anggota);
        fname = "fakegc_" + nama.replace(/\s+/g, "_") + "_" + Date.now() + ".png";
      } else if (mode === "dev") {
        const av = (document.getElementById("ftDevAvatar")?.value || "").trim();
        const text = (document.getElementById("ftDevText")?.value || "").trim().toUpperCase();
        if (!av) throw new Error("Isi URL Foto dulu.");
        if (!text) throw new Error("Isi teks melengkung dulu.");
        // Render lokal pakai canvas (background + badge + text melengkung)
        loader.classList.add("show");
        ftExec.disabled = true;
        resEl.className = "result show";
        resEl.innerHTML = "<pre>Menyiapkan asset...</pre>";
        const BG_URL = "https://raw.githubusercontent.com/kayzzaoshi-code/Uploader/main/file_1772797781960.jpeg";
        const BADGE_URL = "https://raw.githubusercontent.com/kayzzaoshi-code/Uploader/main/file_1772797710490.png";
        const loadImg = (src, cross) => new Promise((resolve, reject) => {
          const im = new Image();
          if (cross) im.crossOrigin = "anonymous";
          im.onload = () => resolve(im);
          im.onerror = () => reject(new Error("gagal load asset"));
          im.src = src;
        });
        const [bgImg, badgeImg] = await Promise.all([
          loadImg(BG_URL, true).catch(() => loadImg(BG_URL, false)),
          loadImg(BADGE_URL, true).catch(() => loadImg(BADGE_URL, false))
        ]);
        if (!bgImg) throw new Error("Background gagal dimuat.");
        const userImg = await loadImg(av, true).catch(() => loadImg(av, false));
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const W = 1080, H = 1080;
        canvas.width = W; canvas.height = H;
        ctx.drawImage(bgImg, 0, 0, W, H);
        const cx = W / 2, cy = H / 2, radius = 263;
        const side = radius * 2;
        const iw = userImg.naturalWidth || userImg.width;
        const ih = userImg.naturalHeight || userImg.height;
        const scale = Math.max(side / iw, side / ih);
        const dw = iw * scale, dh = ih * scale;
        const dx = cx - dw / 2, dy = cy - dh / 2;
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
        ctx.drawImage(userImg, dx, dy, dw, dh);
        ctx.restore();
        const fontSize = 72, strokeWidth = 3, arcSpan = Math.PI * 0.7;
        ctx.font = "bold " + fontSize + "px sans-serif";
        ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = "#000000";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const textRadius = radius + 75;
        const chars = text.split("");
        const n = chars.length;
        const inc = n > 1 ? arcSpan / (n - 1) : 0;
        const start = Math.PI / 2 + arcSpan / 2;
        for (let i = 0; i < n; i++) {
          const ch = chars[i];
          const angle = start - i * inc;
          const x = cx + Math.cos(angle) * textRadius;
          const y = cy + Math.sin(angle) * textRadius;
          ctx.save(); ctx.translate(x, y); ctx.rotate(angle - Math.PI / 2);
          ctx.lineWidth = strokeWidth; ctx.strokeText(ch, 0, 0); ctx.fillText(ch, 0, 0);
          ctx.restore();
        }
        if (badgeImg) {
          const endAngle = start - (n - 1) * inc;
          const badgeAngle = endAngle - inc;
          const badgeSize = Math.round(fontSize * 0.9);
          const bx = cx + Math.cos(badgeAngle) * textRadius;
          const by = cy + Math.sin(badgeAngle) * textRadius;
          try { ctx.drawImage(badgeImg, bx - badgeSize / 2, by - badgeSize / 2, badgeSize, badgeSize); } catch (e) { }
        }
        const dataURL = canvas.toDataURL("image/png");
        lastResult = { type: "image", data: dataURL, filename: "fakedev_" + text.replace(/\s+/g, "-").slice(0, 20) + "_" + Date.now() + ".png" };
        resEl.className = "result show ok";
        resEl.innerHTML = '<img src="' + dataURL + '" alt="fake dev">';
        loader.classList.remove("show");
        ftExec.disabled = false;
        showDownload();
        return;
      } else if (mode === "tele") {
        const av = (document.getElementById("ftTeleAvatar")?.value || "").trim();
        const nama = (document.getElementById("ftTeleNama")?.value || "").trim();
        const nomor = (document.getElementById("ftTeleNomor")?.value || "").trim();
        const bio = (document.getElementById("ftTeleBio")?.value || "").trim();
        const user = (document.getElementById("ftTeleUser")?.value || "").trim();
        if (!av) throw new Error("Isi URL Foto Avatar dulu.");
        if (!nama) throw new Error("Isi Nama dulu.");
        if (!nomor) throw new Error("Isi Nomor Telepon dulu.");
        if (!bio) throw new Error("Isi Bio dulu.");
        if (!user) throw new Error("Isi Username dulu.");
        url = "https://apiii-xrina.my.id/canvas/faketele?pp=" + encodeURIComponent(av) + "&nama=" + encodeURIComponent(nama) + "&nomor=" + encodeURIComponent(nomor) + "&bio=" + encodeURIComponent(bio) + "&username=" + encodeURIComponent(user);
        fname = "faketele_" + user.replace(/[^a-z0-9]/gi, "_") + "_" + Date.now() + ".png";
      } else if (mode === "call_ios" || mode === "call_android") {
        const av = (document.getElementById("ftCallAvatar")?.value || "").trim();
        const nama = (document.getElementById("ftCallNama")?.value || "").trim();
        const durasi = (document.getElementById("ftCallDurasi")?.value || "").trim();
        if (!av) throw new Error("Isi URL Foto Avatar dulu.");
        if (!nama) throw new Error("Isi Nama Penelepon dulu.");
        if (!durasi) throw new Error("Isi Durasi dulu (contoh: 01:00:11).");
        const endpoint = mode === "call_ios" ? "https://apiii-xrina.my.id/canvas/call-ios" : "https://apiii-xrina.my.id/canvas/call-andro";
        url = endpoint + "?pp=" + encodeURIComponent(av) + "&nama=" + encodeURIComponent(nama) + "&durasi=" + encodeURIComponent(durasi);
        const label = mode === "call_ios" ? "ios" : "andro";
        fname = "fakecall_" + label + "_" + nama.replace(/\s+/g, "_") + "_" + Date.now() + ".png";
      }

      const cost = 1;
      if (getCoins() < cost) throw new Error("Coin tidak cukup. Butuh 1 coin.");
      loader.classList.add("show"); ftExec.disabled = true;
      try {
        const d = await coinAPI("spend", { amount: cost });
        coinCache = d.coins | 0; renderCoins();
      } catch (e) { loader.classList.remove("show"); ftExec.disabled = false; throw e; }

      let ok = false;
      try {
        resEl.className = "result show"; resEl.innerHTML = "<pre>Memproses...</pre>";
        const res = await fetch(url);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const blob = await res.blob();
        const objURL = URL.createObjectURL(blob);
        lastResult = { type: "image", data: objURL, filename: fname };
        resEl.className = "result show ok";
        resEl.innerHTML = '<img src="' + objURL + '" alt="fake">';
        ok = true;
        showDownload();
      } catch (err) {
        resEl.className = "result show err";
        resEl.innerHTML = "<pre>❌ " + escapeHTML(err.message) + "</pre>";
      } finally {
        loader.classList.remove("show"); ftExec.disabled = false;
        if (!ok) {
          try {
            const d = await coinAPI("refund", { amount: cost });
            coinCache = d.coins | 0; renderCoins();
          } catch (e) { console.warn("refund gagal", e); }
          const note = document.createElement("div");
          note.style.marginTop = "10px";
          note.style.color = "#fbbf24";
          note.style.fontSize = ".78rem";
         note.textContent = "🪙 Coin dikembalikan karena gagal.";
          resEl.appendChild(note);
        }
      }
    } catch (err) {
      resEl.className = "result show err";
      resEl.innerHTML = "<pre>⚠️ " + escapeHTML(err.message) + "</pre>";
    }
  });
}
/* ===== TOPBAR EVENTS & INIT ===== */
function bindTopbar() {
  const ci = document.getElementById("checkinBtn");
  if (ci) ci.onclick = openCheckin;
  const rd = document.getElementById("redeemBtn");
  if (rd) rd.onclick = openRedeem;
  const wa = document.getElementById("waBtn");
  if (wa) wa.onclick = () => {
    const mobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
    const msg = WA_MSG_BUG + "\n\n" + WA_MSG_BUY;
    const url = mobile ? "https://wa.me/" + OWNER_WA + "?text=" + encodeURIComponent(msg)
      : "https://web.whatsapp.com/send?phone=" + OWNER_WA + "&text=" + encodeURIComponent(msg);
    window.open(url, "_blank");
  };
  const rs = document.getElementById("redeemSubmit");
  if (rs) rs.onclick = submitRedeem;
  const ri = document.getElementById("redeemInput");
  if (ri) ri.addEventListener("keydown", e => { if (e.key === "Enter") submitRedeem(); });
}

bindTopbar();
refreshCoins();
setInterval(refreshCoins, 30000);

/* ===== SPLASH ===== */
setTimeout(() => {
  const splash = document.getElementById("splash");
  if (splash) {
    splash.classList.add("fade-out");
    setTimeout(() => { splash.style.display = "none"; }, 600);
  }
  // Tampilkan hub
  const hub = document.getElementById("hub");
  if (hub) hub.style.display = "block";
  const nav = document.getElementById("bottomNav");
  if (nav) nav.style.display = "block";
  document.body.classList.add("has-nav");
}, 2400);

/* ===== CLOCK ===== */
function updateClock() {
  const el = document.getElementById("clockTime");
  if (!el) return;
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const HARI = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  el.textContent = pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
  const d = document.getElementById("clockDay");
  const dt = document.getElementById("clockDate");
  const y = document.getElementById("clockYear");
  if (d) d.textContent = HARI[now.getDay()];
  if (dt) dt.textContent = now.getDate() + " " + BULAN[now.getMonth()];
  if (y) y.textContent = now.getFullYear();
}
updateClock(); setInterval(updateClock, 1000);

/* ===== CLI (basic) ===== */
(function () {
  const fab = document.getElementById("cliFab");
  const app = document.getElementById("cliApp");
  const closeBtn = document.getElementById("cliCloseBtn");
  const out = document.getElementById("cliOut");
  const inp = document.getElementById("cliInput");
  if (!fab || !app) return;

  function line(t, cls) {
    const d = document.createElement("div");
    if (cls) d.className = cls;
    d.textContent = t;
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
  }
  function run(cmd) {
    line("febz:~$ " + cmd, "cli-cmd");
    const c = cmd.trim().toLowerCase();
    if (c === "help") line("Perintah: help, clear, about, date, exit");
    else if (c === "clear") out.innerHTML = "";
    else if (c === "about") line("FebzTzy — All Tools & Game");
    else if (c === "date") line(new Date().toString());
    else if (c === "exit") app.classList.remove("open");
    else if (c) line("Perintah tidak dikenal: " + c, "cli-err");
  }
  fab.addEventListener("click", () => {
    app.classList.add("open");
    if (!out.children.length) {
      line("FebzTzy CLI v1.0 — ketik help");
      line("");
    }
    inp.focus();
  });
  closeBtn.addEventListener("click", () => app.classList.remove("open"));
  inp.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      const v = inp.value; inp.value = "";
      run(v);
    }
  });
})();

/* ===== LATENCY (basic) ===== */
(function () {
  const fab = document.getElementById("latFab");
  const app = document.getElementById("latPage");
  const back = document.getElementById("latBack");
  const card = document.getElementById("latCard");
  if (!fab || !app) return;

  async function measure(url) {
    const t0 = performance.now();
    try {
      await fetch(url, { method: "HEAD", mode: "no-cors", cache: "no-store" });
      return Math.round(performance.now() - t0);
    } catch (e) { return null; }
  }
  async function refresh() {
    const ms = await measure("https://1.1.1.1/cdn-cgi/trace");
    card.innerHTML = "<b>Latency:</b> " + (ms != null ? ms + " ms" : "—");
  }
  fab.addEventListener("click", () => {
    app.classList.add("open");
    refresh();
  });
  back.addEventListener("click", () => app.classList.remove("open"));
})();

/* ============================================================
   AI FEBZTZY — chat + model picker + history + attach foto
   ============================================================ */
(function () {
  const AI_MODELS = [
    { id: "notegpt", name: "Note GPT", build: t => "https://kyzorohan.web.id/api/notegpt?q=" + t + "&key=kyzo_7fff35b984b06117" },
    { id: "gpt", name: "GPT", build: t => "https://apiii-xrina.vercel.app/ai/gpt?text=" + t },
    { id: "deepseek", name: "DeepSeek", build: t => "https://kyzorohan.web.id/api/deepseek2?ask=" + t + "&key=kyzo_7fff35b984b06117" },
    { id: "claude", name: "Claude", build: t => "https://api.nexadev.my.id/ai/claude?text=" + t },
    { id: "haiku", name: "Haiku", build: t => "https://apiii-xrina.vercel.app/ai/claudehaiku?text=" + t }
  ];
  const ROUTES = [u => u, u => "https://corsproxy.io/?url=" + encodeURIComponent(u)];
  let aiModelId = "notegpt";
  try { const sm = localStorage.getItem("febztzy-ai-model"); if (sm && AI_MODELS.some(m => m.id === sm)) aiModelId = sm; } catch (e) { }

  function currentModel() { return AI_MODELS.find(m => m.id === aiModelId) || AI_MODELS[0]; }
  function setAiModel(id) {
    if (!AI_MODELS.some(m => m.id === id)) return;
    aiModelId = id;
    try { localStorage.setItem("febztzy-ai-model", id); } catch (e) { }
    renderAiModels();
    const lab = document.getElementById("aiModelLabel");
    if (lab) lab.textContent = currentModel().name;
    try { navToast("AI: " + currentModel().name); } catch (e) { }
  }
  function renderAiModels() {
    const g = document.getElementById("aiModels"); if (!g) return;
    g.innerHTML = "";
    AI_MODELS.forEach(function (m) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "ai-model-btn" + (m.id === aiModelId ? " on" : "");
      b.textContent = m.name; b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", m.id === aiModelId ? "true" : "false");
      b.addEventListener("click", function () { if (busy) return; setAiModel(m.id); });
      g.appendChild(b);
    });
    const lab = document.getElementById("aiModelLabel");
    if (lab) lab.textContent = currentModel().name;
  }

  /* ===== Storage ===== */
  const KEY2 = "febztzy-ai-v2", KEY1 = "febztzy-ai-chat", MAXC = 30;
  function SYS() { return "Kamu adalah FebzTzy, asisten AI ramah di web FebzTzy — All Tools & Game. Jawab dalam bahasa Indonesia, santai, singkat, dan jelas. Panggil user dengan ramah."; }

  const CHIPS = [
    ["Siapa itu FebzTzy?", "✦"],
    ["Rekomendasi game seru", "▶"],
    ["Bikin caption keren", "✎"],
    ["Kasih aku lelucon", "☺"]
  ];

  const HOSTS = [
    async f => { const fd = new FormData(); fd.append("reqtype", "fileupload"); fd.append("time", "1h"); fd.append("fileToUpload", f, f.name); const r = await fetch("https://litterbox.catbox.moe/resources/internals/api.php", { method: "POST", body: fd }); const t = (await r.text()).trim(); if (!/^https?:\/\//i.test(t)) throw 0; return t; },
    async f => { const fd = new FormData(); fd.append("file", f, f.name); const r = await fetch("https://0x0.st", { method: "POST", body: fd }); const t = (await r.text()).trim(); if (!/^https?:\/\//i.test(t)) throw 0; return t; },
    async f => { const fd = new FormData(); fd.append("file", f, f.name); const r = await fetch("https://tmpfiles.org/api/v1/upload", { method: "POST", body: fd }); const j = await r.json(); const u = j && j.data && j.data.url; if (!u) throw 0; return u.replace("tmpfiles.org/", "tmpfiles.org/dl/"); }
  ];

  const $ = id => document.getElementById(id);
  const page = $("aiPage"), box = $("aiMsgs"), inp = $("aiIn"), sendBtn = $("aiSend");
  let db = { cur: null, list: [] }, busy = false, headUrl = "", via = 0, typer = null, attach = null, lastDay = "", isOpen = false, P = { name: "Kamu", pic: null };

  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function hhmm(ts) { const d = new Date(ts || Date.now()); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
  function nearEnd() { return box.scrollHeight - box.scrollTop - box.clientHeight < 140; }
  function toEnd(f) { if (f || nearEnd()) box.scrollTop = box.scrollHeight; }

  /* ===== Data obrolan ===== */
  function load() {
    try { const j = JSON.parse(localStorage.getItem(KEY2) || "null"); if (j && Array.isArray(j.list)) db = j; } catch (e) { }
    if (!db.list.length) {
      let old = []; try { old = JSON.parse(localStorage.getItem(KEY1) || "[]"); } catch (e) { }
      old = Array.isArray(old) ? old.filter(m => m && (m.r === "me" || m.r === "ai") && typeof m.t === "string") : [];
      if (old.length) { const f = old.find(m => m.r === "me"); db.list.push({ id: uid(), title: f ? f.t.slice(0, 32) : "Obrolan lama", ts: old[old.length - 1].ts || Date.now(), msgs: old }); }
    }
    if (!db.list.some(c => c.id === db.cur)) db.cur = db.list.length ? db.list[0].id : null;
  }
  function save() {
    db.list = db.list.filter(c => c.msgs.length || c.id === db.cur).slice(0, MAXC);
    const w = () => localStorage.setItem(KEY2, JSON.stringify(db));
    try { w(); } catch (e) {
      db.list.forEach((c, i) => { if (i > 0) c.msgs.forEach(m => { delete m.img; }); });
      try { w(); } catch (e2) {
        db.list.forEach(c => c.msgs.forEach(m => { delete m.img; }));
        try { w(); } catch (e3) { }
      }
    }
  }
  function cur() { return db.list.find(c => c.id === db.cur) || null; }
  function ensure() { let c = cur(); if (!c) { c = { id: uid(), title: "Obrolan baru", ts: Date.now(), msgs: [] }; db.list.unshift(c); db.cur = c.id; } return c; }
  function touch(c) { c.ts = Date.now(); db.list = [c].concat(db.list.filter(z => z !== c)); }
  function M() { const c = cur(); return c ? c.msgs : []; }

  /* ===== Format teks aman ===== */
  function inline(parent, str) {
    str.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).forEach(part => {
      if (!part) return;
      if (/^\*\*[^*]+\*\*$/.test(part)) parent.appendChild(el("strong", null, part.slice(2, -2)));
      else if (/^`[^`]+`$/.test(part)) parent.appendChild(el("code", null, part.slice(1, -1)));
      else parent.appendChild(document.createTextNode(part));
    });
  }
  function fmt(text) {
    const frag = document.createDocumentFragment();
    text.split(/```/).forEach((seg, i) => {
      if (i % 2 === 1) { const pre = el("pre"); pre.appendChild(el("code", null, seg.replace(/^[a-zA-Z0-9+#-]*\n/, "").replace(/\n$/, ""))); frag.appendChild(pre); return; }
      let list = null, lt = "";
      seg.split("\n").forEach(line => {
        const t = line.trim(); if (!t) { list = null; lt = ""; return; }
        let m;
        if ((m = t.match(/^[-*•]\s+(.*)$/))) { if (lt !== "ul") { list = el("ul"); lt = "ul"; frag.appendChild(list); } const li = el("li"); inline(li, m[1]); list.appendChild(li); return; }
        if ((m = t.match(/^\d+[.)]\s+(.*)$/))) { if (lt !== "ol") { list = el("ol"); lt = "ol"; frag.appendChild(list); } const li = el("li"); inline(li, m[1]); list.appendChild(li); return; }
        list = null; lt = "";
        if ((m = t.match(/^#{1,4}\s+(.*)$/))) { const h = el("h4"); inline(h, m[1]); frag.appendChild(h); return; }
        const p = el("p"); inline(p, t); frag.appendChild(p);
      });
    });
    return frag;
  }

  /* ===== Profil & tampilan ===== */
  function loadProfile() { let n = "", pic = null; try { n = (localStorage.getItem("febztzy-profile-name") || "").trim(); pic = localStorage.getItem("febztzy-profile-pic"); } catch (e) { } P = { name: n || "Kamu", pic: pic || null }; }
  function charShort() { return "FebzTzy"; }
  function setTalking(on) {
    try {
      page.classList.toggle("ai-char-talk", !!on);
      const img = $("aiCharImg");
      if (!img) return;
      img.classList.toggle("ai-talking", !!on);
      if (on && headUrl) img.src = headUrl;
    } catch (e) { }
  }
  function avatar(who) {
    if (who === "ai") { const a = el("span", "ai-pic ai-pic-ai"); a.setAttribute("aria-hidden", "true"); return a; }
    if (P.pic) { const a = el("img", "ai-pic ai-pic-me"); a.alt = ""; a.src = P.pic; return a; }
    return el("div", "ai-pic ai-pic-me ai-init", (P.name.charAt(0) || "K").toUpperCase());
  }
  function hero() {
    const h = el("div", "ai-hero");
    h.appendChild(el("h2", null, "Halo, " + P.name + "!"));
    h.appendChild(el("p", null, "Mau nanya apa sama " + charShort() + "? Aku AI FebzTzy di web FebzTzy — tanya game, tools, atau kirim foto."));
    const me = el("div", "ai-me"); me.appendChild(avatar("me")); me.appendChild(el("span", null, "Masuk sebagai " + P.name)); h.appendChild(me);
    const g = el("div", "ai-chips");
    CHIPS.forEach(c => { const b = el("button", "ai-chip"); b.type = "button"; b.appendChild(el("em", null, c[1])); b.appendChild(el("span", null, c[0])); b.addEventListener("click", () => send(c[0])); g.appendChild(b); });
    h.appendChild(g); return h;
  }
  function dayKey(ts) { const d = new Date(ts); return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); }
  function dayLabel(ts) {
    const t = new Date(), k = dayKey(ts); if (k === dayKey(t)) return "Hari ini";
    const y = new Date(t); y.setDate(t.getDate() - 1); if (k === dayKey(y)) return "Kemarin";
    return new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  }
  function addDay(ts) { ts = ts || Date.now(); const k = dayKey(ts); if (k === lastDay) return; lastDay = k; box.appendChild(el("div", "ai-day", dayLabel(ts))); }
  function row(m, o) {
    o = o || {}; const me = m.r === "me";
    const r = el("div", "ai-row " + (me ? "me" : "ai") + (o.err ? " err" : ""));
    r.appendChild(avatar(me ? "me" : "ai"));
    const col = el("div", "ai-col"), who = el("div", "ai-who");
    who.appendChild(el("b", null, me ? P.name : "AI FebzTzy")); who.appendChild(el("span", null, hhmm(m.ts))); col.appendChild(who);
    const b = el("div", "ai-bub"), tx = el("div", "ai-txt"); b.appendChild(tx);
    if (me) { if (m.img) { const im = el("img", "ai-shot"); im.alt = "Foto"; im.src = m.img; b.insertBefore(im, tx); } if (m.t) tx.appendChild(el("p", null, m.t)); }
    else if (!o.empty) tx.appendChild(fmt(m.t));
    if (!me) {
      const meta = el("div", "ai-meta");
      if (!o.err) {
        const cp = el("button", null, "Salin"); cp.type = "button";
        cp.addEventListener("click", () => {
          const done = () => { cp.textContent = "Tersalin"; setTimeout(() => cp.textContent = "Salin", 1400); };
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(m.t).then(done, () => { }); else { const ta = document.createElement("textarea"); ta.value = m.t; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); done(); } catch (e) { } ta.remove(); }
        });
        meta.appendChild(cp);
      }
      if (o.retry) { const rb = el("button", null, "Coba lagi"); rb.type = "button"; rb.addEventListener("click", () => { r.remove(); send(o.retry.q, true, o.retry.link); }); meta.appendChild(rb); }
      if (meta.childNodes.length) b.appendChild(meta);
    }
    col.appendChild(b); r.appendChild(col); return { row: r, txt: tx };
  }
  function renderAll() {
    box.textContent = ""; lastDay = ""; const ms = M();
    if (!ms.length) { box.appendChild(hero()); return; }
    ms.forEach(m => { addDay(m.ts); box.appendChild(row(m).row); }); toEnd(true);
  }
  function typing() {
    const r = el("div", "ai-row ai"); r.appendChild(avatar("ai"));
    const col = el("div", "ai-col"), who = el("div", "ai-who"); who.appendChild(el("b", null, "AI FebzTzy")); who.appendChild(el("span", null, "sedang mengetik...")); col.appendChild(who);
    const b = el("div", "ai-bub"), t = el("div", "ai-typing"); t.appendChild(el("i")); t.appendChild(el("i")); t.appendChild(el("i")); b.appendChild(t); col.appendChild(b); r.appendChild(col); return r;
  }

  /* ===== API ===== */
  function pick(j, d) {
    d = d || 0; if (d > 4 || j == null) return null;
    if (typeof j === "string") return j.trim() || null;
    if (Array.isArray(j)) { for (const x of j) { const r = pick(x, d + 1); if (r) return r; } return null; }
    if (typeof j === "object") { for (const k of ["result", "response", "answer", "message", "data", "text", "content", "reply", "output"]) { if (k in j) { const r = pick(j[k], d + 1); if (r) return r; } } }
    return null;
  }
  async function ask(text) {
    const enc = encodeURIComponent(text), notes = [];
    const primary = currentModel();
    const order = [primary].concat(AI_MODELS.filter(function (m) { return m.id !== primary.id; }));
    for (let a = 0; a < order.length; a++) {
      const mod = order[a];
      const url = mod.build(enc);
      for (let k = 0; k < ROUTES.length; k++) {
        const i = (via + k) % ROUTES.length, ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, 45000);
        try {
          const res = await fetch(ROUTES[i](url), { signal: ctl.signal }); clearTimeout(t);
          const raw = await res.text(); let j = null; try { j = JSON.parse(raw); } catch (e) { }
          if (!res.ok) { notes.push(mod.name + ": HTTP " + res.status); break; }
          const out = j != null ? pick(j) : (raw.trim() || null);
          let clean = "";
          if (out) { clean = String(out).replace(/<think>[\s\S]*?<\/think>/gi, "").trim(); }
          if (!clean) { notes.push(mod.name + ": balasan kosong"); break; }
          via = i;
          return clean;
        } catch (e) {
          clearTimeout(t);
          if (k === ROUTES.length - 1) notes.push(mod.name + ": " + ((e && e.name === "AbortError") ? "waktu habis" : "tidak terhubung"));
        }
      }
    }
    throw new Error(notes.join(" | ") || "Tidak bisa terhubung ke AI.");
  }
  function buildPrompt(q, link, c) {
    const hist = c.msgs.slice(0, -1).slice(-6).map(m => (m.r === "me" ? "User: " : "AI: ") + (m.t || "[foto]").slice(0, 220));
    const qq = (q || "Tolong jelaskan foto ini.") + (link ? "\n[Pengguna melampirkan foto: " + link + " . Kalau kamu tidak bisa melihat gambar dari link ini, katakan terus terang.]" : "");
    const mk = () => SYS() + "\n\n" + (hist.length ? "Riwayat:\n" + hist.join("\n") + "\n\n" : "") + "Pertanyaan: " + qq;
    while (hist.length && mk().length > 1500) hist.shift();
    return mk();
  }

  /* ===== Foto ===== */
  function shrink(file) {
    return new Promise((ok, no) => {
      const u = URL.createObjectURL(file), im = new Image();
      im.onload = () => {
        const k = Math.min(1, 800 / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.round(im.naturalWidth * k), h = Math.round(im.naturalHeight * k);
        const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); x.drawImage(im, 0, 0, w, h);
        URL.revokeObjectURL(u); c.toBlob(b => b ? ok({ blob: b, url: c.toDataURL("image/jpeg", 0.78) }) : no(new Error("gagal")), "image/jpeg", 0.78);
      };
      im.onerror = () => { URL.revokeObjectURL(u); no(new Error("Foto tidak terbaca")); }; im.src = u;
    });
  }
  async function upload(blob) { const f = new File([blob], "foto.jpg", { type: "image/jpeg" }); for (const h of HOSTS) { try { return await h(f); } catch (e) { } } return null; }
  function setAttach(a) { attach = a; $("aiPrev").classList.toggle("show", !!a); if (a) $("aiPrevImg").src = a.url; }

  /* ===== Kirim ===== */
  function setBusy(b) { busy = b; sendBtn.disabled = b; }
  function grow() { inp.style.height = "auto"; inp.style.height = Math.min(120, inp.scrollHeight) + "px"; }
  async function send(q, isRetry, link0) {
    q = (q || "").trim(); const img = isRetry ? null : attach;
    if ((!q && !img && !isRetry) || busy) return;
    setBusy(true);
    const c = ensure(); let link = link0 || null;
    if (!isRetry) {
      if (!c.msgs.length) { box.textContent = ""; lastDay = ""; }
      const m = { r: "me", t: q, ts: Date.now() }; if (img) m.img = img.url;
      c.msgs.push(m); if (c.title === "Obrolan baru") c.title = (q || "Foto").slice(0, 32); touch(c); save();
      addDay(m.ts); box.appendChild(row(m).row); setAttach(null);
    }
    inp.value = ""; grow();
    setTalking(true); const tp = typing(); box.appendChild(tp); toEnd(true);
    try {
      if (img) { link = await upload(img.blob); if (!link) { const n = el("div", "ai-day", "Foto gagal diunggah, pertanyaan dikirim tanpa foto"); box.insertBefore(n, tp); } }
      const out = await ask(buildPrompt(q, link, c));
      tp.remove();
      const m = { r: "ai", t: out, ts: Date.now() }; c.msgs.push(m); touch(c); save();
      addDay(m.ts); const R = row(m, { empty: true }); box.appendChild(R.row);
      if (out.length > 1200 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        R.txt.appendChild(fmt(out)); toEnd(true); setTalking(false); setBusy(false);
      } else {
        setTalking(true);
        let n = 0; clearInterval(typer);
        typer = setInterval(function () {
          n = Math.min(out.length, n + 3);
          R.txt.textContent = "";
          R.txt.appendChild(fmt(out.slice(0, n)));
          toEnd();
          if (n >= out.length) { clearInterval(typer); typer = null; setTalking(false); setBusy(false); }
        }, 22);
      }
    } catch (e) {
      tp.remove(); setTalking(false);
      const R = row({ r: "ai", t: "", ts: Date.now() }, { err: true, empty: true, retry: { q: q, link: link } });
      R.txt.appendChild(el("p", null, "Maaf, gagal mendapat jawaban. " + (e && e.message ? e.message : "")));
      addDay(Date.now()); box.appendChild(R.row); toEnd(true); setBusy(false);
    }
  }

  /* ===== Riwayat & obrolan baru ===== */
  function drawer(o) { $("aiDrawer").classList.toggle("open", o); $("aiScrim").classList.toggle("show", o); if (o) renderList(); }
  function renderList() {
    const L = $("aiList"); L.textContent = "";
    const items = db.list.filter(c => c.msgs.length);
    if (!items.length) { L.appendChild(el("div", "ai-empty", "Belum ada riwayat obrolan.")); return; }
    items.forEach(c => {
      const r = el("div", "ai-li" + (c.id === db.cur ? " on" : "")), t = el("div", "t");
      t.appendChild(el("b", null, c.title)); t.appendChild(el("small", null, dayLabel(c.ts) + " · " + hhmm(c.ts) + " · " + c.msgs.length + " pesan"));
      const x = el("button", null, "×"); x.type = "button"; x.setAttribute("aria-label", "Hapus obrolan");
      r.appendChild(t); r.appendChild(x);
      r.addEventListener("click", () => { if (busy) return; db.cur = c.id; save(); setAttach(null); renderAll(); drawer(false); });
      x.addEventListener("click", e => {
        e.stopPropagation(); if (busy || !confirm("Hapus obrolan ini?")) return;
        db.list = db.list.filter(z => z !== c); if (db.cur === c.id) { const nx = db.list.find(z => z.msgs.length); db.cur = nx ? nx.id : null; }
        save(); renderList(); renderAll();
      });
      L.appendChild(r);
    });
  }
  function newChat() {
    if (busy) return; const c = cur();
    if (!(c && !c.msgs.length)) { const n = { id: uid(), title: "Obrolan baru", ts: Date.now(), msgs: [] }; db.list.unshift(n); db.cur = n.id; save(); }
    setAttach(null); renderAll(); drawer(false);
  }

  /* ===== Buka / tutup ===== */
  function fit() { const v = window.visualViewport; if (!v || !isOpen) return; page.style.height = v.height + "px"; page.style.top = v.offsetTop + "px"; toEnd(); }
  function refreshAiHead() {
    try { headUrl = window.agyMascotHead ? window.agyMascotHead() : ""; } catch (e) { headUrl = ""; }
    try { const hi = $("aiHeadImg"); if (hi && headUrl) hi.src = headUrl; const ci = $("aiCharImg"); if (ci && headUrl) ci.src = headUrl; } catch (e) { }
    try { const tt = page.querySelector(".ai-tt b"); if (tt) tt.textContent = "AI FebzTzy"; } catch (e) { }
  }
  window.agyRefreshAiHead = function () { if (isOpen) refreshAiHead(); };
  function open() {
    refreshAiHead();
    loadProfile(); renderAll();
    try { renderAiModels(); } catch (e) { }
    isOpen = true; page.setAttribute("aria-hidden", "false"); page.classList.add("open"); fit();
    try {
      document.body.classList.remove("menu-tab-ok");
      const mf = document.getElementById("menuFab"); if (mf) mf.style.display = "none";
      const mp = document.getElementById("menuPanel"); if (mp) mp.classList.remove("open");
    } catch (e) { }
  }
  function close() {
    isOpen = false; inp.blur(); drawer(false);
    page.classList.remove("open"); page.setAttribute("aria-hidden", "true");
    page.style.height = ""; page.style.top = "";
  }
  load();
  try { renderAiModels(); } catch (e) { }
  window.agyOpenAI = open;
  $("aiBack").addEventListener("click", close);
  $("aiHist").addEventListener("click", () => drawer(true));
  $("aiDClose").addEventListener("click", () => drawer(false));
  $("aiScrim").addEventListener("click", () => drawer(false));
  $("aiNew").addEventListener("click", newChat);
  $("aiNew2").addEventListener("click", newChat);
  $("aiWipe").addEventListener("click", () => { if (busy || !db.list.length || !confirm("Hapus SEMUA riwayat obrolan?")) return; db = { cur: null, list: [] }; save(); setAttach(null); renderList(); renderAll(); });
  $("aiAtt").addEventListener("click", () => $("aiFile").click());
  $("aiPrevX").addEventListener("click", () => setAttach(null));
  $("aiFile").addEventListener("change", async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return;
    if (!/^image\//i.test(f.type)) { return; }
    try { setAttach(await shrink(f)); } catch (err) { box.appendChild(el("div", "ai-day", err.message || "Foto tidak terbaca")); }
  });
  box.addEventListener("scroll", () => { $("aiDown").classList.toggle("show", !nearEnd()); });
  $("aiDown").addEventListener("click", () => { box.scrollTo({ top: box.scrollHeight, behavior: "smooth" }); });
  sendBtn.addEventListener("click", () => send(inp.value));
  inp.addEventListener("input", grow);
  inp.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(inp.value); } });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && isOpen) { if ($("aiDrawer").classList.contains("open")) drawer(false); else close(); } });
  if (window.visualViewport) { window.visualViewport.addEventListener("resize", fit); window.visualViewport.addEventListener("scroll", fit); }
})();
/* ============================================================
   SPOTIFY PANEL + MUSIK ISLAND + LIRIK + PLAYLIST
   ============================================================ */
(function () {
  /* ===== State ===== */
  const SP_PL_STORE = "febztzy-sp-playlists-v1";
  const SP_STORE = "febztzy-sp-songs";
  const MUSIC_STATE_KEY = "febztzy-music-state";
  const SIO_SKIN_KEY = "febztzy-sio-skin";

  let spPl = { playlists: [], activeId: null };
  let spSongs = [];
  let spKey = null, spMode = "audio", spTimer = null;
  let spNowMeta = { title: null, sub: null, cover: null };
  let spSig = "";
  let musicCurrentIdx = null, musicTimer = null, musicStep = 0, musicPlaying = false;
  const MUSIC_VOL = 0.05;
  let spAu = null, spKeepKey = false;
  const SP_LYR_CACHE = {};
  let spSearchBusy = false, spPickPending = null;

  /* ===== Lagu orisinal FebzTzy (instrumental) ===== */
  const N = {
    C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, B2: 123.47,
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00
  };
  const MUSIC_TRACKS = [
    { name: "Neon Drift", genre: "Synthwave", bpm: 132, wave: "sawtooth",
      melody: [N.E4, 0, N.G4, N.A4, 0, N.G4, N.E4, 0, N.D4, 0, N.F4, N.G4, 0, N.F4, N.D4, 0],
      bass: [N.A2, 0, N.A2, 0, N.E2, 0, N.E2, 0, N.F2, 0, N.F2, 0, N.C3, 0, N.C3, 0] },
    { name: "Pixel Dreams", genre: "Chiptune", bpm: 150, wave: "square",
      melody: [N.C5, N.E5, N.G5, N.E5, N.A4, N.C5, N.E5, N.C5, N.F4, N.A4, N.C5, N.A4, N.G4, N.B4, N.D5, N.B4],
      bass: [N.C3, 0, N.C3, 0, N.A2, 0, N.A2, 0, N.F2, 0, N.F2, 0, N.G2, 0, N.G2, 0] },
    { name: "Midnight Code", genre: "Lo-fi", bpm: 82, wave: "sine",
      melody: [N.E4, 0, 0, N.D4, 0, N.C4, 0, 0, N.A3, 0, 0, N.G3, 0, N.A3, 0, 0],
      bass: [N.A2, 0, 0, 0, N.F2, 0, 0, 0, N.C3, 0, 0, 0, N.G2, 0, 0, 0] },
    { name: "Cloud Nine", genre: "Ambient", bpm: 66, wave: "sine",
      melody: [N.C4, 0, 0, 0, N.E4, 0, 0, 0, N.G4, 0, 0, 0, N.E4, 0, 0, 0],
      bass: [N.C3, 0, 0, 0, 0, 0, 0, 0, N.A2, 0, 0, 0, 0, 0, 0, 0] },
    { name: "Boss Rush", genre: "Epic", bpm: 160, wave: "sawtooth",
      melody: [N.E4, N.E4, 0, N.D4, N.D4, 0, N.C4, N.B3, N.E4, N.E4, 0, N.G4, N.G4, 0, N.F4, N.E4],
      bass: [N.E2, N.E2, N.E2, N.E2, N.C2, N.C2, N.C2, N.C2, N.G2, N.G2, N.G2, N.G2, N.D2, N.D2, N.D2, N.D2] },
    { name: "Retro Sunset", genre: "Synthwave", bpm: 100, wave: "triangle",
      melody: [N.G4, 0, N.E4, 0, N.C4, 0, N.E4, 0, N.A4, 0, N.F4, 0, N.D4, 0, N.F4, 0],
      bass: [N.C3, 0, 0, 0, N.G2, 0, 0, 0, N.F2, 0, 0, 0, N.D3, 0, 0, 0] }
  ];

  /* ===== Util ===== */
  function spStr(x) {
    if (x == null || x === "") return "";
    if (typeof x === "string" || typeof x === "number") return String(x);
    if (typeof x === "object") {
      if (x.name) return spStr(x.name);
      if (x.title) return spStr(x.title);
      if (Array.isArray(x)) return x.map(spStr).filter(Boolean).join(", ");
    }
    return "";
  }
  function spUid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function spCloneSongs(arr) {
    return (Array.isArray(arr) ? arr : []).map(x => ({
      name: x.name || "Lagu", url: x.url || "", cover: x.cover || "",
      source: x.source || "", artist: x.artist || ""
    }));
  }
  function spFmtTime(s) {
    s = Math.max(0, Math.floor(s || 0));
    const m = Math.floor(s / 60), r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  /* ===== Init playlists ===== */
  (function () {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(SP_PL_STORE) || "null"); } catch (e) { saved = null; }
    if (saved && Array.isArray(saved.playlists) && saved.playlists.length) {
      spPl.playlists = saved.playlists.map(p => ({
        id: p.id || spUid(),
        name: String(p.name || "Playlist").slice(0, 40),
        songs: spCloneSongs(p.songs)
      }));
      spPl.activeId = saved.activeId && spPl.playlists.some(p => p.id === saved.activeId)
        ? saved.activeId : spPl.playlists[0].id;
    } else {
      const id = spUid();
      spPl.playlists = [{ id, name: "Playlist kamu", songs: [] }];
      spPl.activeId = id;
    }
  })();

  function spActivePl() {
    let p = spPl.playlists.find(x => x.id === spPl.activeId);
    if (!p) { p = spPl.playlists[0]; if (p) spPl.activeId = p.id; }
    return p || { id: "", name: "Playlist", songs: [] };
  }
  spSongs = spCloneSongs(spActivePl().songs);

  function spSave() {
    const cur = spActivePl();
    if (cur) cur.songs = spCloneSongs(spSongs);
    try { localStorage.setItem(SP_PL_STORE, JSON.stringify(spPl)); } catch (e) { }
    try { localStorage.setItem(SP_STORE, JSON.stringify(spSongs)); } catch (e) { }
  }
  spSave();

  /* ===== Notifikasi & island ===== */
  function musicSetIsland(title, sub) {
    try {
      const t = document.getElementById("islandTitle");
      const n = document.getElementById("islandName2");
      const g = document.getElementById("islandGenre");
      if (t) t.textContent = title || "Musik";
      if (n) n.textContent = title || "Musik";
      if (g) g.textContent = sub || "";
      const dot = document.getElementById("islandDot");
      if (dot) dot.classList.add("on");
      const isl = document.getElementById("musicIsland");
      if (isl) isl.style.display = "flex";
    } catch (e) { }
  }
  function musicUpdateIslandUI() {
    const t = musicCurrentIdx !== null ? MUSIC_TRACKS[musicCurrentIdx] : null;
    try {
      const el = document.getElementById("islandTitle");
      if (el) el.textContent = t ? t.name : "Pilih musik";
      const n = document.getElementById("islandName2");
      if (n) n.textContent = t ? t.name : "-";
      const g = document.getElementById("islandGenre");
      if (g) g.textContent = t ? (t.genre + " • " + t.bpm + " BPM") : "-";
      const dot = document.getElementById("islandDot");
      if (dot) dot.classList.toggle("on", musicPlaying);
      const pp = document.getElementById("islandPlayPause");
      if (pp) pp.innerHTML = musicPlaying ? "⏸" : "▶";
      const isl = document.getElementById("musicIsland");
      if (isl) isl.style.display = (t && navShouldShowSafe()) ? "flex" : "none";
    } catch (e) { }
  }
  function navShouldShowSafe() {
    try {
      const sp = document.getElementById("splash");
      if (sp && sp.style.display !== "none" && getComputedStyle(sp).display !== "none") return false;
      const reg = document.getElementById("registerScreen");
      if (reg && reg.style.display && reg.style.display !== "none") return false;
      if (document.body.classList.contains("game-open")) return false;
      return true;
    } catch (e) { return true; }
  }

  /* ===== Audio ===== */
  function ensureAudio() {
    try {
      if (!window.__febzAudioCtx) window.__febzAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (window.__febzAudioCtx.state === "suspended") window.__febzAudioCtx.resume();
      return window.__febzAudioCtx;
    } catch (e) { return null; }
  }
  function tone(f, d, type, vol, delay) {
    const c = ensureAudio(); if (!c) return;
    try {
      const t0 = c.currentTime + (delay || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || "square"; o.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(vol || 0.12, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + d);
      o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + d);
    } catch (e) { }
  }
  function musicStopTimer() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }
  function musicPlay(idx) {
    const t = MUSIC_TRACKS[idx]; if (!t) return;
    musicStopTimer();
    ensureAudio();
    musicCurrentIdx = idx; musicStep = 0; musicPlaying = true;
    try { spKey = "s" + idx; spMode = "synth"; } catch (e) { }
    const stepMs = (60 / t.bpm / 2) * 1000;
    musicTimer = setInterval(function () {
      const note = t.melody[musicStep % t.melody.length];
      const bass = t.bass[musicStep % t.bass.length];
      if (note) tone(note, stepMs / 1000 * 0.92, t.wave, MUSIC_VOL);
      if (bass) tone(bass, stepMs / 1000 * 1.8, "triangle", MUSIC_VOL * 0.85);
      musicStep++;
    }, stepMs);
    try { localStorage.setItem("febztzy-music-last", String(idx)); } catch (e) { }
    musicUpdateIslandUI();
  }
  function musicPause() { musicStopTimer(); musicPlaying = false; musicUpdateIslandUI(); }
  function musicToggle() {
    if (musicCurrentIdx === null) { musicOpen(); return; }
    if (musicPlaying) musicPause(); else musicPlay(musicCurrentIdx);
  }
  function musicNext() { if (musicCurrentIdx === null) return; musicPlay((musicCurrentIdx + 1) % MUSIC_TRACKS.length); }
  function musicPrev() { if (musicCurrentIdx === null) return; musicPlay((musicCurrentIdx - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length); }
  function musicStopAll() { musicStopTimer(); musicPlaying = false; musicCurrentIdx = null; musicHideEmbed(); musicUpdateIslandUI(); }
  function musicHideEmbed() {
    const w = document.getElementById("musicEmbedWrap"), f = document.getElementById("musicEmbed");
    const now = document.getElementById("musicNow"), au = document.getElementById("musicAudio");
    if (w) { w.classList.remove("show", "yt", "sp"); w.style.display = "none"; }
    if (f) f.src = "about:blank";
    if (now) now.classList.remove("show");
    if (au) { try { au.pause(); au.removeAttribute("src"); au.load(); } catch (e) { } }
  }

  /* ===== Link parser ===== */
  function musicParseLink(url) {
    url = (url || "").trim(); if (!url) return null;
    try {
      const u = new URL(url); const host = u.hostname.replace(/^www\./, "");
      if (host.includes("youtube.com") || host === "youtu.be" || host.includes("music.youtube.com")) {
        let id = null;
        if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
        else id = u.searchParams.get("v");
        if (!id && u.pathname.includes("/shorts/")) id = u.pathname.split("/shorts/")[1].split("/")[0];
        if (id) { id = id.split("?")[0]; return { platform: "yt", id, url, embed: "https://www.youtube.com/embed/" + id + "?autoplay=1&playsinline=1&rel=0&modestbranding=1", title: "YouTube" }; }
      }
      if (host.includes("spotify.com") || host.includes("spotify.link")) {
        const parts = u.pathname.split("/").filter(Boolean);
        let type = "track", id = null;
        for (let i = 0; i < parts.length; i++) { if (["track","album","playlist","episode","show"].includes(parts[i]) && parts[i+1]) { type = parts[i]; id = parts[i+1].split("?")[0]; break; } }
        if (id) return { platform: "sp", id, type, url, embed: "https://open.spotify.com/embed/" + type + "/" + id + "?utm_source=generator", title: "Spotify " + type };
      }
      if (host.includes("tiktok.com") || host.includes("vm.tiktok.com"))
        return { platform: "tt", id: url, url, embed: null, title: "TikTok" };
      return { platform: "web", id: url, url, embed: null, title: u.hostname };
    } catch (e) { return null; }
  }

  /* ===== Audio play (URL) ===== */
  function musicPlayAudioUrl(url, title, sub) {
    if (!url) { try { navToast("URL audio kosong"); } catch (e) { } return; }
    try { musicHideEmbed(); } catch (e) { }
    musicStopTimer(); musicPlaying = false; musicCurrentIdx = null;
    spMode = "audio";
    spAu = document.getElementById("musicAudio");
    if (!spAu) return;
    spNowMeta = { title: title || "Lagu", sub: sub || "Audio", cover: spNowMeta.cover };
    try {
      const nt = document.getElementById("musicNowTitle"); if (nt) nt.textContent = title;
      const ns = document.getElementById("musicNowSub"); if (ns) ns.textContent = sub || "";
      const now = document.getElementById("musicNow"); if (now) now.classList.add("show");
      const st = document.getElementById("spTitle"); if (st) st.textContent = title;
      const ss = document.getElementById("spSub"); if (ss) ss.textContent = sub || "";
    } catch (e) { }
    try { spAu.pause(); } catch (e) { }
    spAu.removeAttribute("crossorigin");
    spAu.loop = false;
    spAu.preload = "auto";
    spAu.src = String(url);
    const tryPlay = function () {
      const p = spAu.play();
      if (p && p.then) p.then(function () {
        musicPlaying = true;
        musicSetIsland(title, sub);
      }).catch(function () {
        try { navToast("Gagal autoplay — ketuk ▶"); } catch (e) { }
      });
    };
    spAu.addEventListener("canplay", tryPlay, { once: true });
    spAu.addEventListener("loadeddata", tryPlay, { once: true });
    spAu.addEventListener("error", function () {
      try { navToast("Audio error — coba lagu lain"); } catch (e) { }
    }, { once: true });
    try { spAu.load(); } catch (e) { }
    setTimeout(tryPlay, 300);
    try { navToast("▶ " + (title || "Lagu")); } catch (e) { }
  }

  /* ===== Musik island bind ===== */
  function bindIsland() {
    const card = document.getElementById("islandCard");
    const pill = document.getElementById("islandPill");
    if (pill && card) pill.addEventListener("click", () => card.classList.toggle("open"));
    const pp = document.getElementById("islandPlayPause");
    if (pp) pp.addEventListener("click", e => { e.stopPropagation(); musicToggle(); });
    const pv = document.getElementById("islandPrev");
    if (pv) pv.addEventListener("click", e => { e.stopPropagation(); musicPrev(); });
    const nx = document.getElementById("islandNext");
    if (nx) nx.addEventListener("click", e => { e.stopPropagation(); musicNext(); });
    const stp = document.getElementById("islandStop");
    if (stp) stp.addEventListener("click", e => { e.stopPropagation(); musicStopAll(); card.classList.remove("open"); });
    const sb = document.getElementById("islandSeekBack");
    const sf = document.getElementById("islandSeekFwd");
    if (sb) sb.addEventListener("click", e => { e.stopPropagation(); islandSeekBy(-10); });
    if (sf) sf.addEventListener("click", e => { e.stopPropagation(); islandSeekBy(10); });
    const pr = document.getElementById("islandProg");
    if (pr) pr.addEventListener("click", e => {
      e.stopPropagation();
      if (spMode === "synth" || !spAu || !spAu.duration || !isFinite(spAu.duration)) return;
      const r = e.currentTarget.getBoundingClientRect();
      spAu.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * spAu.duration;
      islandSync();
    });
    document.addEventListener("click", e => { if (card && card.classList.contains("open") && !card.contains(e.target)) card.classList.remove("open"); });
  }
  function islandSeekBy(sec) {
    try {
      if (spMode === "synth") return;
      if (!spAu || !spAu.src || !isFinite(spAu.duration) || spAu.duration <= 0) {
        try { navToast("Seek hanya untuk lagu audio"); } catch (e) { }
        return;
      }
      const next = Math.max(0, Math.min(spAu.duration - 0.25, (spAu.currentTime || 0) + sec));
      spAu.currentTime = next;
      islandSync();
    } catch (e) { }
  }
  function islandSync() {
    let title = null, sub = "", playing = false, prog = null;
    const it = spItems().find(x => x.key === spKey);
    if (spNowMeta && spNowMeta.title && spMode !== "synth" && spAu && spAu.src) {
      title = spNowMeta.title; sub = spNowMeta.sub || ""; playing = !spAu.paused;
    } else if (it && it.key !== "main") {
      title = it.name; sub = it.sub; playing = spPlaying();
    } else if (musicCurrentIdx !== null && MUSIC_TRACKS[musicCurrentIdx]) {
      const t = MUSIC_TRACKS[musicCurrentIdx]; title = t.name; sub = t.genre + " • " + t.bpm + " BPM"; playing = musicPlaying;
    }
    if (spAu && spAu.src && spMode !== "synth" && spAu.duration && isFinite(spAu.duration)) prog = Math.min(100, spAu.currentTime / spAu.duration * 100);
    try {
      const t = document.getElementById("islandTitle");
      if (t) t.textContent = title || "Pilih musik";
      const n = document.getElementById("islandName2");
      if (n) n.textContent = title || "-";
      const g = document.getElementById("islandGenre");
      if (g) g.textContent = sub || "-";
      const dot = document.getElementById("islandDot");
      if (dot) dot.classList.toggle("on", playing);
      const pp = document.getElementById("islandPlayPause");
      if (pp) pp.innerHTML = playing ? "⏸" : "▶";
      const pf = document.getElementById("islandProgFill");
      if (pf) pf.style.width = (prog === null ? 0 : prog) + "%";
      const tc = document.getElementById("islandTimeCur"), td = document.getElementById("islandTimeDur");
      if (tc && td) {
        if (spAu && spAu.src && spMode !== "synth" && isFinite(spAu.duration) && spAu.duration > 0) {
          tc.textContent = spFmtTime(spAu.currentTime); td.textContent = spFmtTime(spAu.duration);
        } else { tc.textContent = "0:00"; td.textContent = "0:00"; }
      }
      const isl = document.getElementById("musicIsland");
      if (isl) isl.style.display = (title && navShouldShowSafe()) ? "flex" : "none";
    } catch (e) { }
  }

  /* ===== Playlist operations ===== */
  function spSyncSongs() { spSongs = spCloneSongs(spActivePl().songs); }
  function spSetActivePl(id) {
    if (!spPl.playlists.some(p => p.id === id)) return;
    if (id === spPl.activeId) return;
    const prev = spActivePl();
    if (prev) prev.songs = spCloneSongs(spSongs);
    spPl.activeId = id;
    spSyncSongs();
    spSave();
    spSig = ""; spKey = null;
    try { spRenderPlBar(); } catch (e) { }
    try { spRender(); } catch (e) { }
  }
  function spCreatePlaylist(name, switchTo) {
    name = (name || "").trim().slice(0, 40) || ("Playlist " + (spPl.playlists.length + 1));
    const id = spUid();
    const prev = spActivePl();
    if (prev) prev.songs = spCloneSongs(spSongs);
    spPl.playlists.push({ id, name, songs: [] });
    if (switchTo) { spPl.activeId = id; spSongs = []; spKey = null; }
    spSave(); spSig = "";
    try { spRenderPlBar(); } catch (e) { }
    try { spRender(); } catch (e) { }
    try { navToast('Playlist "' + name + '" dibuat'); } catch (e) { }
    return id;
  }
  function spDeletePlaylist(id) {
    if (spPl.playlists.length <= 1) { try { navToast("Minimal 1 playlist"); } catch (e) { } return; }
    const p = spPl.playlists.find(x => x.id === id);
    if (!p || !confirm('Hapus playlist "' + p.name + '"?')) return;
    spPl.playlists = spPl.playlists.filter(x => x.id !== id);
    if (spPl.activeId === id) { spPl.activeId = spPl.playlists[0].id; spSyncSongs(); spKey = null; }
    spSave(); spSig = "";
    try { spRenderPlBar(); spRender(); } catch (e) { }
  }
  function spSongInPl(pl, item) {
    if (!pl || !item) return -1;
    const songs = Array.isArray(pl.songs) ? pl.songs : [];
    const ur = (typeof spSongUrlFromItem === "function") ? spSongUrlFromItem(item) : (item.url || item.preview || item.external || "");
    const nm = ((item.title || item.name || "Lagu") + (item.artist ? " — " + item.artist : "")).slice(0, 80).toLowerCase();
    return songs.findIndex(x => x && ((ur && x.url === ur) || String(x.name || "").toLowerCase() === nm));
  }
  function spAddSongToPl(plId, songObj) {
    const p = spPl.playlists.find(x => x.id === plId);
    if (!p) return -1;
    const isActive = plId === spPl.activeId;
    const list = isActive ? spSongs : p.songs;
    const dup = list.findIndex(x => x && ((songObj.url && x.url === songObj.url) || String(x.name || "").toLowerCase() === String(songObj.name || "").toLowerCase()));
    if (dup >= 0) {
      if (songObj.url && !list[dup].url) list[dup].url = songObj.url;
      if (songObj.cover && !list[dup].cover) list[dup].cover = songObj.cover;
      if (isActive) p.songs = spSongs; spSave();
      return dup;
    }
    list.push({ name: songObj.name, url: songObj.url || "", cover: songObj.cover || "", source: songObj.source || "", artist: songObj.artist || "" });
    if (isActive) p.songs = spSongs; else p.songs = list;
    spSave();
    return list.length - 1;
  }

  /* ===== Render Playlist Bar ===== */
  function spRenderPlBar() {
    const bar = document.getElementById("spPlBar"); if (!bar) return;
    bar.innerHTML = "";
    spPl.playlists.forEach(p => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "sp-pl-chip" + (p.id === spPl.activeId ? " on" : "");
      const n = (p.id === spPl.activeId ? spSongs : p.songs).length;
      b.textContent = p.name + (n ? " (" + n + ")" : "");
      b.addEventListener("click", () => spSetActivePl(p.id));
      bar.appendChild(b);
    });
    const neu = document.createElement("button");
    neu.type = "button"; neu.className = "sp-pl-chip new"; neu.textContent = "+ Baru";
    neu.addEventListener("click", () => {
      const n = prompt("Nama playlist baru:", "");
      if (n === null) return;
      spCreatePlaylist(n, false);
    });
    bar.appendChild(neu);
  }
    /* ===== Items ===== */
  function spItems() {
    const a = [];
    spSongs.forEach((sg, i) => {
      let sub = "Ketuk untuk tambah link";
      if (sg.artist) sub = sg.artist;
      else if (sg.url) { try { sub = new URL(sg.url).hostname.replace(/^www\./, ""); } catch (e) { sub = "Link tersimpan"; } }
      a.push({ key: "l" + i, name: sg.name, sub, link: i });
    });
    return a;
  }
  function spPlaying() {
    if (spMode === "embed") { const f = document.getElementById("spEmbed"); return f && f.style.display === "block"; }
    if (spMode === "synth") return musicPlaying;
    return !!(spAu && spAu.src && !spAu.paused);
  }

  /* ===== Ask link ===== */
  function spAskLink(i) {
    const sg = spSongs[i]; if (!sg) return false;
    let u = prompt('Tempel link lagu untuk "' + sg.name + '"', sg.url || "");
    if (u === null) return false; u = u.trim(); if (!u) return false;
    if (!/^https?:\/\//i.test(u)) { try { navToast("Link harus diawali http"); } catch (e) { } return false; }
    sg.url = u; spSave(); return true;
  }

  /* ===== Play Link ===== */
  async function spPlayLink(i) {
    const sg = spSongs[i]; if (!sg) return;
    if (!sg.url && !spAskLink(i)) { spRender(); return; }
    const url = sg.url;
    spKey = "l" + i; spKeepKey = true;
    setTimeout(() => { spKeepKey = false; }, 20000);
    spHideEmbed();
    const sub = (sg.artist || sg.source || "Playlist") + " · play";
    try { navToast("Memutar: " + sg.name); } catch (e) { }
    try {
      const st = document.getElementById("spTitle"); if (st) st.textContent = sg.name;
      const ss = document.getElementById("spSub"); if (ss) ss.textContent = sub;
    } catch (e) { }
    spNowMeta = { title: sg.name, sub, cover: sg.cover || null };
    if (/\.(mp3|m4a|aac|ogg|wav|opus)(\?|$)/i.test(url) || /preview|audio|itunes|dzcdn|scdn/i.test(url)) {
      spMode = "audio"; musicPlayAudioUrl(url, sg.name, sub); spAu.loop = false;
      spKey = "l" + i; spRender(); return;
    }
    const pr = musicParseLink(url);
    if (pr && pr.platform === "yt") {
      spMode = "embed";
      musicHideEmbed(); musicStopTimer(); musicPlaying = false;
      const f = document.getElementById("spEmbed");
      if (f) { f.style.height = "200px"; f.src = pr.embed; f.style.display = "block"; }
      musicShowNow(sg.name, sub);
      spKey = "l" + i; spRender(); return;
    }
    if (pr && pr.platform === "sp") {
      spMode = "embed";
      musicHideEmbed(); musicStopTimer(); musicPlaying = false;
      const f = document.getElementById("spEmbed");
      if (f) { f.style.height = "152px"; f.src = pr.embed; f.style.display = "block"; }
      musicShowNow(sg.name, sub);
      spKey = "l" + i; spRender(); return;
    }
    spMode = "audio"; musicPlayAudioUrl(url, sg.name, sub); spAu.loop = false;
    spKey = "l" + i; spRender();
  }
  function spShowNow(title, sub) {
    try {
      const nt = document.getElementById("musicNowTitle"); if (nt) nt.textContent = title;
      const ns = document.getElementById("musicNowSub"); if (ns) ns.textContent = sub;
      const now = document.getElementById("musicNow"); if (now) now.classList.add("show");
    } catch (e) { }
  }
  function spHideEmbed() {
    const f = document.getElementById("spEmbed");
    if (f) { f.src = "about:blank"; f.style.display = "none"; }
  }

  /* ===== Toggle / play / step ===== */
  function spToggle() {
    if (spMode === "embed") {
      const f = document.getElementById("spEmbed");
      if (f && f.style.display === "block") spHideEmbed(); else spPlayKey(spKey || spFirstKey());
    } else if (spMode === "synth") musicToggle();
    else if (spAu && spAu.src && !spAu.error) {
      if (spAu.paused) spAu.play().catch(() => { }); else spAu.pause();
    } else spPlayKey(spKey && spKey !== "online" ? spKey : spFirstKey());
    setTimeout(spRender, 150);
  }
  function spFirstKey() { const keys = spItems().map(x => x.key); return keys.length ? keys[0] : null; }
  function spStep(d) {
    const keys = spItems().map(x => x.key); if (!keys.length) return;
    let k = keys.indexOf(spKey); if (k < 0) k = 0;
    spPlayKey(keys[((k + d) % keys.length + keys.length) % keys.length]);
  }
  function spPlayKey(key) {
    spKeepKey = false;
    if (!key || key === "main") {
      const fk = spFirstKey();
      if (fk && fk !== "main") { spPlayKey(fk); return; }
      spHideEmbed(); spMode = "audio"; spKey = null;
      try { const st = document.getElementById("spTitle"); if (st) st.textContent = "Spotify FebzTzy"; } catch (e) { }
      spRender(); return;
    }
    if (key[0] === "s") { spHideEmbed(); spMode = "synth"; spKey = key; musicPlay(parseInt(key.slice(1), 10)); spRender(); }
    else if (key[0] === "l") { spPlayLink(parseInt(key.slice(1), 10)); }
  }

  /* ===== Render panel ===== */
  function spRender() {
    const items = spItems();
    let cur = items.findIndex(x => x.key === spKey); if (cur < 0) cur = 0;
    const pl = spPlaying();
    try {
      const lab = document.querySelector("#spPanel .sp-section-label span");
      if (lab) { const ap = spActivePl(); lab.textContent = ap && ap.name ? ap.name : "Playlist kamu"; }
    } catch (e) { }
    const live = spNowMeta && spNowMeta.title && spMode !== "synth" && spAu && spAu.src && (pl || !spAu.paused || spAu.currentTime > 0);
    try {
      if (live) {
        const st = document.getElementById("spTitle"); if (st) st.textContent = spStr(spNowMeta.title);
        const ss = document.getElementById("spSub"); if (ss) ss.textContent = spStr(spNowMeta.sub) || spStr(items[cur] && items[cur].sub);
      } else if (spKey && items[cur]) {
        const st = document.getElementById("spTitle"); if (st) st.textContent = spStr(items[cur].name);
        const ss = document.getElementById("spSub"); if (ss) ss.textContent = spStr(items[cur].sub);
      } else {
        const st = document.getElementById("spTitle"); if (st) st.textContent = items[cur] ? spStr(items[cur].name) || "Spotify FebzTzy" : "Spotify FebzTzy";
        const ss = document.getElementById("spSub"); if (ss) ss.textContent = items[cur] ? spStr(items[cur].sub) || "Cari atau pilih lagu" : "Cari atau pilih lagu";
      }
      const d = document.getElementById("spDisc"); if (d) d.classList.toggle("spin", pl);
      const pp = document.getElementById("spPlay"); if (pp) pp.innerHTML = pl ? "⏸" : "▶";
    } catch (e) { }
    const list = document.getElementById("spList");
    const sig = items.map(x => x.key + "|" + x.name + "|" + x.sub).join("~");
    if (sig !== spSig) {
      spSig = sig; list.innerHTML = "";
      items.forEach((it, i) => {
        const r = document.createElement("div"); r.className = "sp-item";
        const nn = document.createElement("span"); nn.className = "n"; nn.textContent = i + 1;
        const tt = document.createElement("span"); tt.className = "t"; tt.textContent = spStr(it.name) || "Lagu";
        const sm = document.createElement("small"); sm.textContent = spStr(it.sub); tt.appendChild(sm);
        r.appendChild(nn); r.appendChild(tt);
        if (it.link !== undefined) {
          const ed = document.createElement("button"); ed.className = "act"; ed.type = "button"; ed.textContent = "✎";
          ed.addEventListener("click", e => { e.stopPropagation(); if (spAskLink(it.link)) { spSig = ""; spRender(); } });
          const dl = document.createElement("button"); dl.className = "act"; dl.type = "button"; dl.textContent = "×";
          dl.addEventListener("click", e => {
            e.stopPropagation();
            if (confirm('Hapus "' + it.name + '" dari daftar?')) {
              spSongs.splice(it.link, 1); spSave();
              if (spKey === "l" + it.link) spKey = null;
              spSig = ""; spRender(); try { spRenderPlBar(); } catch (err) { }
            }
          });
          r.appendChild(ed); r.appendChild(dl);
        }
        r.addEventListener("click", () => spPlayKey(it.key));
        list.appendChild(r);
      });
      const add = document.createElement("button"); add.className = "sp-add"; add.type = "button"; add.textContent = "+ Tambah lagu";
      add.addEventListener("click", spAdd);
      list.appendChild(add);
    }
    Array.prototype.forEach.call(list.querySelectorAll(".sp-item"), (r, i) => {
      const on = i === cur; r.classList.toggle("on", on);
      const num = r.querySelector(".n"); if (num) num.textContent = (on && pl) ? "♫" : (i + 1);
    });
  }
  function spAdd() {
    const name = prompt("Judul lagu?"); if (!name || !name.trim()) return;
    spSongs.push({ name: name.trim().slice(0, 60), url: "" }); spSave(); spSig = "";
    const i = spSongs.length - 1;
    if (spAskLink(i)) spPlayLink(i); else spRender();
    try { spRenderPlBar(); } catch (e) { }
  }

  /* ===== Lirik ===== */
  function spParseTitleArtist(name, artist) {
    let title = (name || "").trim(), art = (artist || "").trim();
    if (!art) {
      const m = title.match(/^(.+?)\s*[—–\-]\s*(.+)$/) || title.match(/^(.+?)\s+by\s+(.+)$/i);
      if (m) { title = m[1].trim(); art = m[2].trim(); }
    }
    title = title.replace(/\s*[\[(][^\])]*(official|lyric|audio|video|mv|hd|4k)[^\])]*[\])]\s*/gi, " ").replace(/\s+/g, " ").trim();
    art = art.replace(/\s*[\[(].*?[\])]\s*$/, "").trim();
    return { title: title || "Unknown", artist: art };
  }
  function spCloseLyrics() {
    const el = document.getElementById("spLyrOverlay");
    if (el) { el.classList.remove("show"); el.setAttribute("aria-hidden", "true"); }
  }
  function spLyrPickText(j) {
    if (!j) return "";
    if (typeof j === "string") return j.trim();
    if (j.plainLyrics) return String(j.plainLyrics).trim();
    if (j.syncedLyrics) return String(j.syncedLyrics).replace(/\[\d+:\d+[.\d]*\]/g, "").replace(/\n{3,}/g, "\n\n").trim();
    if (j.lyrics) return String(j.lyrics).replace(/\r\n/g, "\n").trim();
    if (j.lyric) return String(j.lyric).replace(/\r\n/g, "\n").trim();
    if (j.lrc) return String(j.lrc).replace(/\[\d+:\d+[.\d]*\]/g, "").replace(/\r\n/g, "\n").trim();
    if (j.result && typeof j.result !== "object") return String(j.result).trim();
    if (Array.isArray(j) && j.length) { let best = ""; j.forEach(x => { const t = spLyrPickText(x); if (t.length > best.length) best = t; }); return best; }
    if (j.data) return spLyrPickText(j.data);
    if (j.result) return spLyrPickText(j.result);
    return "";
  }
  async function spFetchJson(url, timeout) {
    const routes = [url, "https://corsproxy.io/?url=" + encodeURIComponent(url), "https://api.allorigins.win/raw?url=" + encodeURIComponent(url)];
    let last = "";
    for (let i = 0; i < routes.length; i++) {
      try {
        const ctl = new AbortController();
        const t = setTimeout(function () { ctl.abort(); }, timeout || 18000);
        const res = await fetch(routes[i], { signal: ctl.signal, cache: "no-store" });
        clearTimeout(t);
        const raw = await res.text();
        let j = null; try { j = JSON.parse(raw); } catch (e) { }
        if (j) return { ok: true, j: j, status: res.status };
        last = "bukan JSON";
      } catch (e) { last = (e && e.name === "AbortError") ? "waktu habis" : (e.message || "network"); }
    }
    return { ok: false, err: last };
  }
  async function spFetchLyricsText(name, artist) {
    const p = spParseTitleArtist(name, artist);
    const key = ((p.artist || "") + "|" + p.title).toLowerCase();
    if (SP_LYR_CACHE[key]) return SP_LYR_CACHE[key];
    let text = "";
    const q = p.artist ? (p.title + " " + p.artist) : p.title;
    const u = "https://lrclib.net/api/search?q=" + encodeURIComponent(q);
    const r = await spFetchJson(u, 18000);
    if (r.ok) {
      text = spLyrPickText(r.j);
      if (!text && Array.isArray(r.j) && r.j[0]) {
        const s0 = r.j[0];
        text = String(s0.plainLyrics || s0.syncedLyrics || s0.lyrics || "").replace(/\[\d+:\d+[.\d]*\]/g, "").replace(/\r\n/g, "\n").trim();
      }
    }
    if (!text && p.artist) {
      const u1 = "https://lrclib.net/api/get?artist_name=" + encodeURIComponent(p.artist) + "&track_name=" + encodeURIComponent(p.title);
      const r1 = await spFetchJson(u1, 15000);
      if (r1.ok) text = spLyrPickText(r1.j);
    }
    if (!text && p.artist) {
      const u3 = "https://api.lyrics.ovh/v1/" + encodeURIComponent(p.artist) + "/" + encodeURIComponent(p.title);
      const r3 = await spFetchJson(u3, 15000);
      if (r3.ok) text = spLyrPickText(r3.j);
    }
    if (text && text.length > 10) SP_LYR_CACHE[key] = text;
    return text || "";
  }
  async function spShowLyrics(name, artist) {
    const ov = document.getElementById("spLyrOverlay");
    const body = document.getElementById("spLyrBody");
    const tit = document.getElementById("spLyrTitle");
    const sub = document.getElementById("spLyrSub");
    if (!ov || !body) return;
    const p = spParseTitleArtist(name, artist);
    if (tit) tit.textContent = p.title;
    if (sub) sub.textContent = p.artist || "Mencari lirik…";
    body.className = "sp-lyr-body loading";
    body.textContent = "Memuat lirik…";
    ov.classList.add("show");
    const key = ((p.artist || "") + "|" + p.title).toLowerCase();
    if (SP_LYR_CACHE[key]) { body.className = "sp-lyr-body"; body.textContent = SP_LYR_CACHE[key]; return; }
    let text = "";
    try { text = await spFetchLyricsText(name, artist); } catch (e) { }
    body.className = "sp-lyr-body";
    if (text && text.length > 10) { body.textContent = text; if (sub) sub.textContent = p.artist || "Lirik ditemukan"; }
    else { body.textContent = "Lirik tidak ditemukan.\n\nTips:\n• Format: Judul — Nama Artis\n• Contoh: Night Changes — One Direction"; }
  }

  /* ===== Search online ===== */
  function spSongUrlFromItem(item) {
    if (!item) return "";
    if (item.url && /^https?:\/\//i.test(item.url)) return item.url;
    if (item.videoId) return "https://www.youtube.com/watch?v=" + item.videoId;
    if (item.preview && /^https?:\/\//i.test(item.preview)) return item.preview;
    if (item.external && /^https?:\/\//i.test(item.external)) return item.external;
    return "";
  }
  function spFmtDur(ms) {
    if (!ms || ms < 0) return "";
    const s = Math.round(ms / 1000), m = Math.floor(s / 60), r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }
  async function musicSearchItunes(q) {
    const url = "https://itunes.apple.com/search?term=" + encodeURIComponent(q) + "&media=music&entity=song&limit=20";
    const res = await fetch(url);
    if (!res.ok) throw new Error("iTunes " + res.status);
    const j = await res.json();
    return (j.results || []).map(r => ({
      id: "it-" + r.trackId, title: r.trackName, artist: r.artistName, album: r.collectionName,
      cover: (r.artworkUrl100 || "").replace("100x100", "200x200"),
      duration: spFmtDur(r.trackTimeMillis), preview: r.previewUrl || null,
      source: "iTunes", playType: "preview", external: r.trackViewUrl
    })).filter(x => x.title);
  }
  async function musicSearchDeezer(q) {
    const proxied = "https://api.allorigins.win/raw?url=" + encodeURIComponent("https://api.deezer.com/search?q=" + encodeURIComponent(q) + "&limit=20");
    const res = await fetch(proxied);
    if (!res.ok) throw new Error("Deezer " + res.status);
    const j = await res.json();
    return (j.data || []).map(r => ({
      id: "dz-" + r.id, title: r.title, artist: (r.artist && r.artist.name) || "",
      album: (r.album && r.album.title) || "",
      cover: (r.album && (r.album.cover_medium || r.album.cover_big || r.album.cover)) || "",
      duration: spFmtDur((r.duration || 0) * 1000), preview: r.preview || null,
      source: "Deezer", playType: "preview", external: r.link
    })).filter(x => x.title);
  }
  async function musicSearchYoutube(q) {
    const endpoints = [
      "https://api.siputzx.my.id/api/s/youtube?query=" + encodeURIComponent(q),
      "https://api.ryzumi.vip/api/search/youtube?query=" + encodeURIComponent(q)
    ];
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep);
        if (!res.ok) continue;
        const j = await res.json();
        let arr = j.data || j.result || j.results || j.videos || [];
        if (!Array.isArray(arr) && j.data && Array.isArray(j.data.items)) arr = j.data.items;
        if (!Array.isArray(arr)) arr = [];
        const mapped = arr.map(v => {
          const id = v.videoId || v.id || null;
          let ch = v.channel || v.author || v.uploader || v.channelName || "";
          if (ch && typeof ch === "object") ch = ch.name || ch.title || "";
          let cov = v.thumbnail || v.thumb || "";
          if (cov && typeof cov === "object") cov = cov.url || cov.src || "";
          if (!cov && id) cov = "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";
          let dur = v.duration || v.timestamp || v.lengthText || v.length || "";
          if (dur && typeof dur === "object") dur = dur.text || dur.label || "";
          return { id: "yt-" + (id || Math.random().toString(36).slice(2, 8)), title: v.title || v.name || "YouTube", artist: String(ch || "YouTube"), album: "", cover: String(cov || ""), duration: String(dur || ""), preview: null, source: "YouTube", playType: "youtube", videoId: id, url: v.url || v.link || (id ? "https://www.youtube.com/watch?v=" + id : null), external: v.url || v.link };
        }).filter(x => x.videoId);
        if (mapped.length) return mapped.slice(0, 20);
      } catch (e) { }
    }
    throw new Error("YouTube search gagal");
  }
  function spSearchRow(item) {
    const row = document.createElement("div"); row.className = "sp-srow";
    if (item.cover) { const img = document.createElement("img"); img.className = "cov"; img.alt = ""; img.loading = "lazy"; img.referrerPolicy = "no-referrer"; img.src = item.cover; row.appendChild(img); }
    else { const ph = document.createElement("div"); ph.className = "cov-ph"; ph.textContent = "♪"; row.appendChild(ph); }
    const mid = document.createElement("div"); mid.className = "mid";
    const tt = document.createElement("div"); tt.className = "tt"; tt.textContent = item.title || "Tanpa judul";
    const ar = document.createElement("div"); ar.className = "ar"; ar.textContent = [item.artist, item.duration].filter(Boolean).join(" · ") || item.source || "";
    mid.appendChild(tt); mid.appendChild(ar); row.appendChild(mid);
    const src = document.createElement("span");
    const s = (item.source || "").toLowerCase();
    src.className = "src" + (s === "youtube" ? " yt" : s === "itunes" ? " it" : s === "deezer" ? " dz" : "");
    src.textContent = s === "youtube" ? "YT" : s === "itunes" ? "IT" : s === "deezer" ? "DZ" : "♪";
    row.appendChild(src);
    const add = document.createElement("button"); add.type = "button"; add.className = "add"; add.title = "Simpan ke playlist"; add.textContent = "+";
    add.addEventListener("click", e => { e.stopPropagation(); spAddFromSearch(item, add); });
    row.appendChild(add);
    row.addEventListener("click", () => { spPlayOnline(item); });
    return row;
  }
  async function spPlayOnline(item) {
    spKey = "online"; spMode = "audio";
    spNowMeta = { title: item.title || "Lagu", sub: (item.artist || item.source || "") + " · play", cover: item.cover || null };
    try { navToast("▶ Memutar..."); } catch (e) { }
    if (item.videoId) {
      const f = document.getElementById("spEmbed");
      if (f) { f.style.height = "200px"; f.src = "https://www.youtube.com/embed/" + item.videoId + "?autoplay=1&playsinline=1&rel=0"; f.style.display = "block"; }
      spMode = "embed"; musicShowNow(item.title, item.artist || "YouTube");
      spRender(); return;
    }
    if (item.preview) {
      musicPlayAudioUrl(item.preview, item.title, item.artist || item.source);
      spRender(); return;
    }
    if (item.url) { musicPlayAudioUrl(item.url, item.title, item.artist || item.source); spRender(); return; }
    try { navToast("Tidak ada sumber audio"); } catch (e) { }
  }
  function spAddFromSearch(item, btn) {
    const art = spStr(item.artist);
    const name = ((spStr(item.title) || "Lagu") + (art ? " — " + art : "")).slice(0, 80);
    const url = spSongUrlFromItem(item);
    const song = { name, url, cover: item.cover || "", source: spStr(item.source) || "", artist: art };
    if (spPl.playlists.length <= 1) {
      const idx = spAddSongToPl(spPl.activeId, song);
      if (btn) { btn.classList.add("on"); btn.textContent = "✓"; }
      try { navToast("Ditambah · memutar..."); } catch (e) { }
      spSig = ""; spRender();
      try { spRenderPlBar(); } catch (e) { }
      try { spPlayLink(idx); } catch (e) { }
      return idx;
    }
    const p = prompt("Simpan ke playlist mana? (nama)", spActivePl().name);
    if (p === null) return -1;
    let pl = spPl.playlists.find(x => x.name === p);
    if (!pl) pl = { id: spCreatePlaylist(p, false), name: p, songs: [] };
    const idx = spAddSongToPl(pl.id, song);
    if (btn) { btn.classList.add("on"); btn.textContent = "✓"; }
    try { navToast('Disimpan ke "' + pl.name + '"'); } catch (e) { }
    spSig = ""; spRender(); spRenderPlBar();
    return idx;
  }
  async function spDoSearch() {
    if (spSearchBusy) return;
    const inp = document.getElementById("spSearchInput");
    const st = document.getElementById("spSearchSt");
    const box = document.getElementById("spSearchList");
    const btn = document.getElementById("spSearchBtn");
    const q = (inp && inp.value || "").trim();
    if (q.length < 2) { if (st) st.textContent = "Ketik minimal 2 huruf."; return; }
    spSearchBusy = true;
    if (btn) btn.disabled = true;
    if (st) { st.style.color = "#b3b3b3"; st.textContent = 'Mencari "' + q + '"...'; }
    if (box) box.innerHTML = "";
    const results = [];
    try {
      await Promise.all([
        musicSearchItunes(q).then(r => (r || []).forEach(x => results.push(x))).catch(() => { }),
        musicSearchDeezer(q).then(r => (r || []).forEach(x => results.push(x))).catch(() => { }),
        musicSearchYoutube(q).then(r => (r || []).forEach(x => results.push(x))).catch(() => { })
      ]);
    } catch (e) { }
    const seen = new Set(), uniq = [];
    results.forEach(it => {
      const k = ((it.title || "") + "|" + (it.artist || "")).toLowerCase().slice(0, 48);
      if (seen.has(k)) return; seen.add(k); uniq.push(it);
    });
    uniq.sort((a, b) => {
      const sa = a.source === "YouTube" ? 0 : a.preview ? 1 : 2;
      const sb = b.source === "YouTube" ? 0 : b.preview ? 1 : 2;
      return sa - sb;
    });
    if (!uniq.length) { if (st) { st.style.color = "#ff6b6b"; st.textContent = "Tidak ketemu."; } }
    else {
      if (st) { st.style.color = "#1db954"; st.textContent = uniq.length + " lagu · ketuk putar · + simpan"; }
      if (box) uniq.slice(0, 30).forEach(it => box.appendChild(spSearchRow(it)));
    }
    spSearchBusy = false;
    if (btn) btn.disabled = false;
  }

  /* ===== Swap panel ===== */
  let spBusy = false;
  function spSwap(toSpotify) {
    if (spBusy) return false;
    const sb = document.querySelector(".statusbar");
    if (!sb || sb.classList.contains("sp-on") === toSpotify) return false;
    spBusy = true;
    const h0 = sb.getBoundingClientRect().height;
    sb.classList.add(toSpotify ? "sp-leaving" : "sp-closing");
    setTimeout(() => {
      sb.classList.remove("sp-leaving", "sp-closing");
      sb.classList.toggle("sp-on", toSpotify);
      sb.classList.add(toSpotify ? "sp-entering" : "sp-returning");
      const h1 = sb.getBoundingClientRect().height;
      sb.style.boxSizing = "border-box"; sb.style.overflow = "hidden"; sb.style.height = h0 + "px";
      void sb.offsetHeight;
      sb.style.transition = "height .38s cubic-bezier(.2,.8,.2,1)"; sb.style.height = h1 + "px";
      setTimeout(() => {
        sb.style.height = ""; sb.style.transition = ""; sb.style.overflow = ""; sb.style.boxSizing = "";
        sb.classList.remove("sp-entering", "sp-returning"); spBusy = false;
      }, 460);
    }, 220);
    return true;
  }
  function spOpen() {
    if (!spSwap(true)) return;
    if (!spKey || !spItems().some(x => x.key === spKey)) { spKey = spFirstKey(); spMode = "audio"; }
    try { spRenderPlBar(); } catch (e) { }
    spRender();
    clearInterval(spTimer);
    spTimer = setInterval(function () { if (document.hidden) return; try { spRenderLight(); } catch (e) { } }, 500);
  }
  function spRenderLight() {
    try {
      const pl = spPlaying();
      const d = document.getElementById("spDisc"); if (d) d.classList.toggle("spin", pl);
      const btn = document.getElementById("spPlay"); if (btn) btn.innerHTML = pl ? "⏸" : "▶";
    } catch (e) { }
  }
  function spClose() {
    spSwap(false);
    clearInterval(spTimer); spTimer = null;
    try { spCloseLyrics(); } catch (e) { }
  }
  
    /* ===== Buka / tutup modal musik ===== */
  function musicOpen() {
    spRenderChips("Semua"); spRenderList("", "Semua");
    document.getElementById("musicModal").classList.remove("hidden");
  }
  function musicClose() { document.getElementById("musicModal").classList.add("hidden"); }
  function musicRenderChips(activeGenre) {
    const box = document.getElementById("musicGenreChips"); if (!box) return;
    box.innerHTML = "";
    const genres = ["Semua", "Link", ...Array.from(new Set(MUSIC_TRACKS.map(t => t.genre)))];
    genres.forEach(g => {
      const b = document.createElement("button");
      b.className = "kmk-chip" + ((activeGenre || "Semua") === g ? " active" : "");
      b.textContent = g;
      b.addEventListener("click", () => { musicRenderChips(g); musicRenderList(document.getElementById("musicSearchInput").value, g); });
      box.appendChild(b);
    });
  }
  function musicRenderList(q, genre) {
    q = (q || "").toLowerCase(); genre = genre || "Semua";
    const list = document.getElementById("musicList"); if (!list) return;
    list.innerHTML = "";
    if (genre === "Semua" || genre === "Link") {
      spSongs.filter(t => ((t.name || "").toLowerCase().includes(q) || (t.url || "").toLowerCase().includes(q))).forEach(t => {
        const row = document.createElement("div"); row.className = "music-row";
        const art = document.createElement("div"); art.className = "mart"; art.textContent = "♪";
        row.appendChild(art);
        const mid = document.createElement("div"); mid.className = "mmid";
        mid.appendChild(document.createElement("div")).className = "mn";
        mid.lastChild.textContent = t.name;
        const mg = document.createElement("div"); mg.className = "mg"; mg.textContent = (t.url || "no link").replace(/^https?:\/\//, "").slice(0, 40);
        mid.appendChild(mg); row.appendChild(mid);
        row.addEventListener("click", () => { const i = spSongs.indexOf(t); if (i >= 0) spPlayLink(i); });
        list.appendChild(row);
      });
    }
    if (genre !== "Link") {
      MUSIC_TRACKS.filter(t => (genre === "Semua" || t.genre === genre) && (t.name.toLowerCase().includes(q) || t.genre.toLowerCase().includes(q))).forEach(t => {
        const idx = MUSIC_TRACKS.indexOf(t);
        const row = document.createElement("div"); row.className = "music-row" + (musicCurrentIdx === idx && musicPlaying ? " playing" : "");
        const art = document.createElement("div"); art.className = "mart"; art.textContent = "♫";
        row.appendChild(art);
        const mid = document.createElement("div"); mid.className = "mmid";
        mid.innerHTML = '<div class="mn">' + t.name + '</div><div class="mg">' + t.genre + ' • ' + t.bpm + ' BPM</div>';
        row.appendChild(mid);
        row.addEventListener("click", () => { musicHideEmbed(); if (musicCurrentIdx === idx && musicPlaying) musicPause(); else musicPlay(idx); musicRenderList(document.getElementById("musicSearchInput").value, genre); });
        list.appendChild(row);
      });
    }
  }

  /* ===== Init bind ===== */
  function init() {
    bindIsland();
    spAu = document.getElementById("musicAudio");
    if (spAu) {
      ["play", "pause", "ended", "loadedmetadata", "emptied"].forEach(ev => spAu.addEventListener(ev, () => { islandSync(); try { spRender(); } catch (x) { } }));
      spAu.addEventListener("ended", function () {
        try {
          const items = spItems();
          const playable = items.filter(it => it.key && it.key[0] === "l" && spSongs[parseInt(it.key.slice(1), 10)] && spSongs[parseInt(it.key.slice(1), 10)].url);
          if (!playable.length) return;
          let idx = playable.findIndex(it => it.key === spKey);
          const next = playable[(idx + 1) % playable.length];
          if (next) spPlayKey(next.key);
        } catch (e) { }
      });
    }
    setInterval(function () { if (!document.hidden) try { islandSync(); } catch (e) { } }, 3000);
    islandSync();

    // Search UI
    const btn = document.getElementById("spSearchBtn");
    const inp = document.getElementById("spSearchInput");
    if (btn) btn.addEventListener("click", spDoSearch);
    if (inp) inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); spDoSearch(); } });

    // Controls
    const pp = document.getElementById("spPlay"); if (pp) pp.addEventListener("click", spToggle);
    const nx = document.getElementById("spNext"); if (nx) nx.addEventListener("click", () => spStep(1));
    const pv = document.getElementById("spPrev"); if (pv) pv.addEventListener("click", () => spStep(-1));
    const bk = document.getElementById("spBackBtn"); if (bk) bk.addEventListener("click", spClose);
    const sw = document.getElementById("spSwitchBtn"); if (sw) sw.addEventListener("click", spOpen);

    // Lyrics
    const lc = document.getElementById("spLyrClose"); if (lc) lc.addEventListener("click", spCloseLyrics);
    const lo = document.getElementById("spLyrOverlay"); if (lo) lo.addEventListener("click", e => { if (e.target === lo) spCloseLyrics(); });
    const ls = document.getElementById("spLyrSide");
    if (ls) ls.addEventListener("click", () => {
      const t = document.getElementById("spTitle");
      const s = document.getElementById("spSub");
      if (t) spShowLyrics(t.textContent, s ? s.textContent.replace(/\s*·.*$/, "").trim() : "");
    });

    // Modal musik
    const mo = document.getElementById("musicOpenBtn"); if (mo) mo.addEventListener("click", musicOpen);
    const mc = document.getElementById("musicCloseBtn"); if (mc) mc.addEventListener("click", musicClose);
    const mm = document.getElementById("musicModal"); if (mm) mm.addEventListener("click", e => { if (e.target.id === "musicModal") musicClose(); });
    const ma = document.getElementById("musicAddLinkBtn");
    if (ma) ma.addEventListener("click", () => {
      const inp = document.getElementById("musicLinkInput");
      const parsed = musicParseLink(inp.value || "");
      if (!parsed) { try { navToast("Link tidak valid"); } catch (e) { } return; }
      const name = prompt("Judul lagu:", parsed.title || "Link baru");
      if (name === null) return;
      spSongs.push({ name: name.slice(0, 60), url: parsed.url, source: parsed.platform, cover: "" });
      spSave(); inp.value = "";
      try { navToast("Ditambah"); } catch (e) { }
      musicRenderList("", "Semua");
    });
    const ms = document.getElementById("musicSearchBtn"); if (ms) ms.addEventListener("click", musicOpen);
    const ns = document.getElementById("musicNowStop"); if (ns) ns.addEventListener("click", () => { musicHideEmbed(); musicStopAll(); try { navToast("Stop"); } catch (e) { } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  /* ===== Export ===== */
  window.febzOpenSpotify = spOpen;
  window.febzCloseSpotify = spClose;
  window.febzMusicOpen = musicOpen;
})();
/* ============================================================
   KELOMPOK A — GAME SIMPEL
   Snake Neon · Block Blast · Geometry Dash · Snake Arena
   ============================================================ */

/* ===== UTIL AUDIO ===== */
function febzTone(freq, dur, type, vol, delay) {
  try {
    if (!window.__febzAudioCtx) window.__febzAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = window.__febzAudioCtx;
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(vol || 0.12, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + dur);
  } catch (e) { }
}
function febzJump() { febzTone(520, 0.10, "square", 0.10); }
function febzDie() { febzTone(220, 0.18, "sawtooth", 0.14); febzTone(140, 0.22, "sawtooth", 0.12, 0.05); }
function febzWin() { [523, 659, 784, 1047].forEach((f, i) => febzTone(f, 0.16, "square", 0.11, i * 0.09)); }

/* ============================================================
   1. SNAKE NEON
   ============================================================ */
const SNAKE_COLS = 20, SNAKE_ROWS = 20, SNAKE_CELL = 15;
let snake, snakeDir, snakeNextDir, snakeGrowPending, snakeScore, snakeHighScore = 0,
  snakeFood, snakeSpeedMult, snakeSpeedTimer, snakeRunning = false, snakeTickTimer;
const snakeCanvas = document.getElementById("snakeCanvas");
const snakeCtx = snakeCanvas ? snakeCanvas.getContext("2d") : null;

const SNAKE_FOOD = {
  normal: { grow: 1, score: 10, color: "#60d4ff" },
  plus3: { grow: 3, score: 30, color: "#ffce54" },
  plus5: { grow: 5, score: 50, color: "#ff3ec8" },
  speed: { grow: 1, score: 15, color: "#4ade80" },
  slow: { grow: 1, score: 15, color: "#8b3ffb" }
};

function snakeReset() {
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  snakeDir = { x: 1, y: 0 };
  snakeNextDir = { x: 1, y: 0 };
  snakeGrowPending = 0;
  snakeScore = 0;
  snakeSpeedMult = 1;
  snakeSpawnFood();
}
function snakeSpawnFood() {
  const r = Math.random();
  let type;
  if (r < 0.55) type = "normal";
  else if (r < 0.70) type = "plus3";
  else if (r < 0.78) type = "plus5";
  else if (r < 0.89) type = "speed";
  else type = "slow";
  let pos;
  do { pos = { x: Math.floor(Math.random() * SNAKE_COLS), y: Math.floor(Math.random() * SNAKE_ROWS) }; }
  while (snake.some(s => s.x === pos.x && s.y === pos.y));
  snakeFood = Object.assign(pos, { type });
}
function snakeResetSpeedTimer() {
  if (snakeSpeedTimer) clearTimeout(snakeSpeedTimer);
  snakeSpeedTimer = setTimeout(() => { snakeSpeedMult = 1; }, 5000);
}
function snakeApplyFood() {
  const info = SNAKE_FOOD[snakeFood.type];
  snakeGrowPending += info.grow;
  snakeScore += info.score;
  if (snakeFood.type === "speed") { snakeSpeedMult = 0.6; snakeResetSpeedTimer(); }
  else if (snakeFood.type === "slow") { snakeSpeedMult = 1.6; snakeResetSpeedTimer(); }
  snakeSpawnFood();
}
function snakeStepMs() {
  const base = Math.max(75, 150 - Math.floor(snakeScore / 80) * 5);
  return base * snakeSpeedMult;
}
function snakeScheduleTick() {
  snakeTickTimer = setTimeout(() => { snakeStep(); if (snakeRunning) snakeScheduleTick(); }, snakeStepMs());
}
function snakeStep() {
  snakeDir = snakeNextDir;
  const newHead = { x: snake[0].x + snakeDir.x, y: snake[0].y + snakeDir.y };
  if (newHead.x < 0 || newHead.x >= SNAKE_COLS || newHead.y < 0 || newHead.y >= SNAKE_ROWS) { snakeDie(); return; }
  const willGrow = snakeGrowPending > 0;
  const bodyCheck = willGrow ? snake : snake.slice(0, -1);
  if (bodyCheck.some(s => s.x === newHead.x && s.y === newHead.y)) { snakeDie(); return; }
  snake.unshift(newHead);
  if (newHead.x === snakeFood.x && newHead.y === snakeFood.y) snakeApplyFood();
  if (snakeGrowPending > 0) snakeGrowPending--; else snake.pop();
  snakeDraw();
  const s = document.getElementById("snakeScore");
  if (s) s.textContent = snakeScore;
}
function snakeDie() {
  snakeRunning = false;
  if (snakeTickTimer) clearTimeout(snakeTickTimer);
  febzDie();
  snakeHighScore = Math.max(snakeHighScore, snakeScore);
  try { localStorage.setItem("febztzy-snake-high", String(snakeHighScore)); } catch (e) { }
  const fin = document.getElementById("snakeFinalScore");
  const hi = document.getElementById("snakeHighScore2");
  const ov = document.getElementById("snakeOverOverlay");
  if (fin) fin.textContent = snakeScore;
  if (hi) hi.textContent = snakeHighScore;
  if (ov) ov.classList.add("show");
}
function snakeShowStart() {
  try { snakeHighScore = parseInt(localStorage.getItem("febztzy-snake-high") || "0", 10); } catch (e) { snakeHighScore = 0; }
  const el = document.getElementById("snakeHigh");
  if (el) el.textContent = snakeHighScore;
  const st = document.getElementById("snakeStart");
  const gm = document.getElementById("snakeGame");
  if (st) st.style.display = "block";
  if (gm) gm.style.display = "none";
}
function snakeStart() {
  if (!snakeCtx) return;
  snakeReset();
  const s = document.getElementById("snakeScore"); if (s) s.textContent = "0";
  const hi = document.getElementById("snakeHigh2"); if (hi) hi.textContent = snakeHighScore;
  const ov = document.getElementById("snakeOverOverlay"); if (ov) ov.classList.remove("show");
  const st = document.getElementById("snakeStart"); if (st) st.style.display = "none";
  const gm = document.getElementById("snakeGame"); if (gm) gm.style.display = "block";
  snakeRunning = true;
  snakeScheduleTick();
  snakeDraw();
}
function snakeStop() {
  snakeRunning = false;
  if (snakeTickTimer) clearTimeout(snakeTickTimer);
  if (snakeSpeedTimer) clearTimeout(snakeSpeedTimer);
  snakeSpeedMult = 1;
}
function snakeSetDir(x, y) { if (snakeDir.x === -x && snakeDir.y === -y) return; snakeNextDir = { x, y }; }
function snakeRoundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function snakeDrawHex(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 3 * i - Math.PI / 2;
    const px = x + r * Math.cos(a), py = y + r * Math.sin(a);
    i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
  }
  c.closePath(); c.fill();
}
function snakeDrawBolt(c, x, y) {
  c.beginPath(); c.moveTo(x - 2, y - 7); c.lineTo(x + 3, y - 1); c.lineTo(x - 1, y - 1);
  c.lineTo(x + 3, y + 7); c.lineTo(x - 4, y + 1); c.lineTo(x, y + 1); c.closePath(); c.fill();
}
function snakeDrawHourglass(c, x, y) {
  c.beginPath(); c.moveTo(x - 6, y - 6); c.lineTo(x + 6, y - 6); c.lineTo(x, y); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(x - 6, y + 6); c.lineTo(x + 6, y + 6); c.lineTo(x, y); c.closePath(); c.fill();
}
function snakeDraw() {
  if (!snakeCtx) return;
  const grad = snakeCtx.createLinearGradient(0, 0, 300, 300);
  grad.addColorStop(0, "#140c24"); grad.addColorStop(1, "#0a0714");
  snakeCtx.fillStyle = grad;
  snakeCtx.fillRect(0, 0, 300, 300);
  snakeCtx.strokeStyle = "rgba(180,88,255,0.08)";
  snakeCtx.lineWidth = 1;
  for (let i = 0; i <= SNAKE_COLS; i++) { snakeCtx.beginPath(); snakeCtx.moveTo(i * SNAKE_CELL, 0); snakeCtx.lineTo(i * SNAKE_CELL, 300); snakeCtx.stroke(); }
  for (let j = 0; j <= SNAKE_ROWS; j++) { snakeCtx.beginPath(); snakeCtx.moveTo(0, j * SNAKE_CELL); snakeCtx.lineTo(300, j * SNAKE_CELL); snakeCtx.stroke(); }
  if (!snakeFood) return;
  const fx = snakeFood.x * SNAKE_CELL + SNAKE_CELL / 2;
  const fy = snakeFood.y * SNAKE_CELL + SNAKE_CELL / 2;
  const info = SNAKE_FOOD[snakeFood.type];
  snakeCtx.save(); snakeCtx.shadowColor = info.color; snakeCtx.shadowBlur = 14; snakeCtx.fillStyle = info.color;
  if (snakeFood.type === "normal") { snakeCtx.beginPath(); snakeCtx.arc(fx, fy, SNAKE_CELL / 2 - 2, 0, 7); snakeCtx.fill(); }
  else if (snakeFood.type === "plus3") { snakeCtx.save(); snakeCtx.translate(fx, fy); snakeCtx.rotate(Math.PI / 4); snakeCtx.fillRect(-SNAKE_CELL / 2 + 2, -SNAKE_CELL / 2 + 2, SNAKE_CELL - 4, SNAKE_CELL - 4); snakeCtx.restore(); }
  else if (snakeFood.type === "plus5") { snakeDrawHex(snakeCtx, fx, fy, SNAKE_CELL / 2); }
  else if (snakeFood.type === "speed") { snakeDrawBolt(snakeCtx, fx, fy); }
  else if (snakeFood.type === "slow") { snakeDrawHourglass(snakeCtx, fx, fy); }
  snakeCtx.restore();
  const t = Date.now() / 20;
  snake.forEach((s, i) => {
    const hue = (t + i * 14) % 360;
    snakeCtx.save();
    snakeCtx.shadowColor = "hsl(" + hue + ",90%,55%)";
    snakeCtx.shadowBlur = i === 0 ? 16 : 9;
    snakeCtx.fillStyle = i === 0 ? "#ffffff" : ("hsl(" + hue + ",90%,60%)");
    snakeRoundRect(snakeCtx, s.x * SNAKE_CELL + 1, s.y * SNAKE_CELL + 1, SNAKE_CELL - 2, SNAKE_CELL - 2, i === 0 ? 6 : 4);
    snakeCtx.fill();
    snakeCtx.restore();
  });
  const head = snake[0];
  const hx = head.x * SNAKE_CELL, hy = head.y * SNAKE_CELL;
  snakeCtx.fillStyle = "#1a0f2b";
  let e1 = { x: hx + 4, y: hy + 4 }, e2 = { x: hx + SNAKE_CELL - 6, y: hy + 4 };
  if (snakeDir.x === 1) { e1 = { x: hx + SNAKE_CELL - 6, y: hy + 4 }; e2 = { x: hx + SNAKE_CELL - 6, y: hy + SNAKE_CELL - 6 }; }
  else if (snakeDir.x === -1) { e1 = { x: hx + 4, y: hy + 4 }; e2 = { x: hx + 4, y: hy + SNAKE_CELL - 6 }; }
  else if (snakeDir.y === 1) { e1 = { x: hx + 4, y: hy + SNAKE_CELL - 6 }; e2 = { x: hx + SNAKE_CELL - 6, y: hy + SNAKE_CELL - 6 }; }
  snakeCtx.beginPath(); snakeCtx.arc(e1.x, e1.y, 1.6, 0, 7); snakeCtx.fill();
  snakeCtx.beginPath(); snakeCtx.arc(e2.x, e2.y, 1.6, 0, 7); snakeCtx.fill();
}

/* Bind Snake */
document.addEventListener("click", function (e) {
  const t = e.target;
  if (!t) return;
  if (t.id === "snakePlayBtn" || (t.closest && t.closest("#snakePlayBtn"))) { e.preventDefault(); snakeStart(); }
  if (t.id === "snakeBackBtn" || (t.closest && t.closest("#snakeBackBtn"))) { snakeStop(); snakeShowStart(); }
  if (t.id === "snakeRetryBtn" || (t.closest && t.closest("#snakeRetryBtn"))) {
    const ov = document.getElementById("snakeOverOverlay"); if (ov) ov.classList.remove("show");
    snakeStart();
  }
  if (t.id === "snakeMenuBtn" || (t.closest && t.closest("#snakeMenuBtn"))) {
    const ov = document.getElementById("snakeOverOverlay"); if (ov) ov.classList.remove("show");
    snakeStop(); snakeShowStart();
  }
  const d = t.id;
  if (d === "dUp") snakeSetDir(0, -1);
  if (d === "dDown") snakeSetDir(0, 1);
  if (d === "dLeft") snakeSetDir(-1, 0);
  if (d === "dRight") snakeSetDir(1, 0);
});
document.addEventListener("keydown", e => {
  if (e.key === "ArrowUp") snakeSetDir(0, -1);
  if (e.key === "ArrowDown") snakeSetDir(0, 1);
  if (e.key === "ArrowLeft") snakeSetDir(-1, 0);
  if (e.key === "ArrowRight") snakeSetDir(1, 0);
});
let snakeTouchStart = null;
if (snakeCanvas) {
  snakeCanvas.addEventListener("touchstart", e => { const t = e.touches[0]; snakeTouchStart = { x: t.clientX, y: t.clientY }; }, { passive: true });
  snakeCanvas.addEventListener("touchend", e => {
    if (!snakeTouchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - snakeTouchStart.x, dy = t.clientY - snakeTouchStart.y;
    if (Math.abs(dx) > Math.abs(dy)) { if (Math.abs(dx) > 20) snakeSetDir(dx > 0 ? 1 : -1, 0); }
    else { if (Math.abs(dy) > 20) snakeSetDir(0, dy > 0 ? 1 : -1); }
    snakeTouchStart = null;
  });
}

/* ============================================================
   2. BLOCK BLAST
   ============================================================ */
const BB_SIZE = 8;
const BB_SHAPES = [
  [[0, 0]],
  [[0, 0], [1, 0]], [[0, 0], [0, 1]],
  [[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]], [[0, 0], [0, 1], [1, 1]], [[1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [0, 1], [0, 2], [1, 2]], [[0, 0], [1, 0], [2, 0], [0, 1]], [[0, 0], [1, 0], [1, 1], [1, 2]], [[2, 0], [0, 1], [1, 1], [2, 1]],
  [[0, 0], [1, 0], [2, 0], [1, 1]], [[1, 0], [0, 1], [1, 1], [1, 2]]
];
const BB_COLORS = ["#ff3ec8", "#8b3ffb", "#60d4ff", "#4ade80", "#ffce54", "#ff7a3e"];
let bbGridState, bbTrayPieces, bbScore, bbHighScore = 0, bbCellEls, bbSkin = null, bbDragging = null;

function bbRandColor() { return BB_COLORS[Math.floor(Math.random() * BB_COLORS.length)]; }
function bbGenPiece() { return { cells: BB_SHAPES[Math.floor(Math.random() * BB_SHAPES.length)], color: bbRandColor() }; }
function bbPieceSize(cells) { let mx = 0, my = 0; cells.forEach(([x, y]) => { if (x > mx) mx = x; if (y > my) my = y; }); return { w: mx + 1, h: my + 1 }; }
function bbEmptyGrid() { const g = []; for (let y = 0; y < BB_SIZE; y++) { g.push(new Array(BB_SIZE).fill(null)); } return g; }
function bbCanPlace(cells, gx, gy) {
  return cells.every(([dx, dy]) => { const x = gx + dx, y = gy + dy; return x >= 0 && x < BB_SIZE && y >= 0 && y < BB_SIZE && bbGridState[y][x] === null; });
}
function bbAnyValidPlacement() { return bbTrayPieces.some(p => { if (!p) return false; for (let gy = 0; gy < BB_SIZE; gy++) for (let gx = 0; gx < BB_SIZE; gx++) if (bbCanPlace(p.cells, gx, gy)) return true; return false; }); }
function bbBuildGridDom() {
  const el = document.getElementById("bbGrid"); if (!el) return;
  el.innerHTML = "";
  bbCellEls = [];
  for (let y = 0; y < BB_SIZE; y++) {
    const row = [];
    for (let x = 0; x < BB_SIZE; x++) {
      const c = document.createElement("div"); c.className = "bb-cell";
      el.appendChild(c); row.push(c);
    }
    bbCellEls.push(row);
  }
}
function bbRenderGrid() {
  if (!bbCellEls) return;
  for (let y = 0; y < BB_SIZE; y++) for (let x = 0; x < BB_SIZE; x++) {
    const el = bbCellEls[y][x], val = bbGridState[y][x];
    if (val) { el.classList.add("filled"); el.style.background = val; el.style.color = val; }
    else { el.classList.remove("filled"); el.style.background = ""; el.style.color = ""; }
  }
}
function bbRenderTray() {
  const tray = document.getElementById("bbTray"); if (!tray) return;
  tray.innerHTML = "";
  bbTrayPieces.forEach((p, idx) => {
    const slot = document.createElement("div");
    slot.className = "bb-piece-slot" + (p === null ? " used" : "");
    if (p) {
      const size = bbPieceSize(p.cells);
      const pg = document.createElement("div"); pg.className = "bb-piece-grid";
      pg.style.gridTemplateColumns = "repeat(" + size.w + ",13px)";
      pg.style.gridTemplateRows = "repeat(" + size.h + ",13px)";
      for (let y = 0; y < size.h; y++) for (let x = 0; x < size.w; x++) {
        const c = document.createElement("div");
        const filled = p.cells.some(([cx, cy]) => cx === x && cy === y);
        c.className = "bb-piece-cell" + (filled ? "" : " empty");
        if (filled) { c.style.background = p.color; c.style.boxShadow = "0 0 6px " + p.color; }
        pg.appendChild(c);
      }
      slot.appendChild(pg);
      slot.addEventListener("pointerdown", e => bbStartDrag(e, idx));
    }
    tray.appendChild(slot);
  });
}
function bbStartDrag(e, idx) {
  const piece = bbTrayPieces[idx]; if (!piece) return;
  e.preventDefault();
  const grid = document.getElementById("bbGrid");
  if (!grid) return;
  const rect = grid.getBoundingClientRect();
  const cellSize = rect.width / BB_SIZE;
  const size = bbPieceSize(piece.cells);
  const ghost = document.createElement("div");
  ghost.style.cssText = "position:fixed; pointer-events:none; z-index:400; display:grid; grid-template-columns:repeat(" + size.w + "," + cellSize + "px); grid-template-rows:repeat(" + size.h + "," + cellSize + "px); gap:2px;";
  for (let y = 0; y < size.h; y++) for (let x = 0; x < size.w; x++) {
    const filled = piece.cells.some(([cx, cy]) => cx === x && cy === y);
    const c = document.createElement("div");
    if (filled) c.style.cssText = "border-radius:5px; background:" + piece.color + "; box-shadow:0 0 10px " + piece.color;
    else c.style.cssText = "background:transparent;";
    ghost.appendChild(c);
  }
  document.body.appendChild(ghost);
  bbDragging = { idx, piece, ghost, cellSize, size, gx: -99, gy: -99 };
  const slot = tray.children[idx]; if (slot) slot.style.opacity = "0.25";
  bbUpdateDrag(e.clientX, e.clientY);
}
function bbUpdateDrag(clientX, clientY) {
  if (!bbDragging) return;
  const { ghost, cellSize, size } = bbDragging;
  const liftY = cellSize * 1.5;
  const left = clientX - (size.w * cellSize) / 2;
  const top = clientY - liftY - (size.h * cellSize) / 2;
  ghost.style.left = left + "px"; ghost.style.top = top + "px";
  const grid = document.getElementById("bbGrid");
  if (!grid) return;
  const rect = grid.getBoundingClientRect();
  const gx = Math.round((left - rect.left) / cellSize);
  const gy = Math.round((top - rect.top) / cellSize);
  bbDragging.gx = gx; bbDragging.gy = gy;
  bbShowGhostPreview(bbDragging.piece.cells, gx, gy);
}
function bbClearGhostPreview() {
  if (!bbCellEls) return;
  for (let y = 0; y < BB_SIZE; y++) for (let x = 0; x < BB_SIZE; x++) bbCellEls[y][x].classList.remove("ghost", "ghost-bad");
}
function bbShowGhostPreview(cells, gx, gy) {
  bbClearGhostPreview();
  const valid = bbCanPlace(cells, gx, gy);
  cells.forEach(([dx, dy]) => { const x = gx + dx, y = gy + dy; if (x >= 0 && x < BB_SIZE && y >= 0 && y < BB_SIZE) bbCellEls[y][x].classList.add(valid ? "ghost" : "ghost-bad"); });
}
function bbEndDrag() {
  if (!bbDragging) return;
  const { idx, piece, ghost, gx, gy } = bbDragging;
  document.body.removeChild(ghost);
  bbClearGhostPreview();
  const tray = document.getElementById("bbTray");
  if (tray) { const slot = tray.children[idx]; if (slot) slot.style.opacity = ""; }
  if (bbCanPlace(piece.cells, gx, gy)) {
    piece.cells.forEach(([dx, dy]) => { bbGridState[gy + dy][gx + dx] = piece.color; });
    febzTone(360, 0.07, "square", 0.12);
    bbTrayPieces[idx] = null;
    bbScore += piece.cells.length * 2;
    bbClearLines();
    bbRenderGrid();
    if (bbTrayPieces.every(p => p === null)) bbTrayPieces = [bbGenPiece(), bbGenPiece(), bbGenPiece()];
    bbRenderTray();
    const s = document.getElementById("bbScore"); if (s) s.textContent = bbScore;
    if (!bbAnyValidPlacement()) bbGameOver();
  } else febzTone(150, 0.09, "sawtooth", 0.08);
  bbDragging = null;
}
document.addEventListener("pointermove", e => { if (bbDragging) bbUpdateDrag(e.clientX, e.clientY); });
document.addEventListener("pointerup", () => { if (bbDragging) bbEndDrag(); });
document.addEventListener("pointercancel", () => { if (bbDragging) bbEndDrag(); });

function bbClearLines() {
  const fullRows = [], fullCols = [];
  for (let y = 0; y < BB_SIZE; y++) if (bbGridState[y].every(v => v !== null)) fullRows.push(y);
  for (let x = 0; x < BB_SIZE; x++) { let full = true; for (let y = 0; y < BB_SIZE; y++) if (bbGridState[y][x] === null) { full = false; break; } if (full) fullCols.push(x); }
  const total = fullRows.length + fullCols.length;
  if (total === 0) return;
  fullRows.forEach(y => { for (let x = 0; x < BB_SIZE; x++) bbGridState[y][x] = null; });
  fullCols.forEach(x => { for (let y = 0; y < BB_SIZE; y++) bbGridState[y][x] = null; });
  bbScore += total * 50 * total;
  const base = 520;
  for (let i = 0; i < 3 + total; i++) febzTone(base + i * 90, 0.09, "square", 0.10, i * 0.05);
}
function bbGameOver() {
  febzDie();
  bbHighScore = Math.max(bbHighScore, bbScore);
  try { localStorage.setItem("febztzy-bb-high", String(bbHighScore)); } catch (e) { }
  const fin = document.getElementById("bbFinalScore"); if (fin) fin.textContent = bbScore;
  const hi = document.getElementById("bbHighScore2"); if (hi) hi.textContent = bbHighScore;
  const ov = document.getElementById("bbOverOverlay"); if (ov) ov.classList.add("show");
}
function bbShowStart() {
  try { bbHighScore = parseInt(localStorage.getItem("febztzy-bb-high") || "0", 10); } catch (e) { bbHighScore = 0; }
  const el = document.getElementById("bbHigh"); if (el) el.textContent = bbHighScore;
  const st = document.getElementById("blockStart"); if (st) st.style.display = "block";
  const gm = document.getElementById("blockGame"); if (gm) gm.style.display = "none";
}
function bbStart() {
  bbGridState = bbEmptyGrid();
  bbTrayPieces = [bbGenPiece(), bbGenPiece(), bbGenPiece()];
  bbScore = 0;
  const s = document.getElementById("bbScore"); if (s) s.textContent = "0";
  const hi = document.getElementById("bbHigh2"); if (hi) hi.textContent = bbHighScore;
  const ov = document.getElementById("bbOverOverlay"); if (ov) ov.classList.remove("show");
  const st = document.getElementById("blockStart"); if (st) st.style.display = "none";
  const gm = document.getElementById("blockGame"); if (gm) gm.style.display = "block";
  bbBuildGridDom(); bbRenderGrid(); bbRenderTray();
}
function bbStop() { if (bbDragging) { document.body.removeChild(bbDragging.ghost); bbDragging = null; } }

document.addEventListener("click", e => {
  const t = e.target;
  if (!t) return;
  if (t.id === "blockPlayBtn" || (t.closest && t.closest("#blockPlayBtn"))) { e.preventDefault(); bbStart(); }
  if (t.id === "blockBackBtn" || (t.closest && t.closest("#blockBackBtn"))) bbShowStart();
  if (t.id === "bbRetryBtn" || (t.closest && t.closest("#bbRetryBtn"))) { const ov = document.getElementById("bbOverOverlay"); if (ov) ov.classList.remove("show"); bbStart(); }
  if (t.id === "bbMenuBtn" || (t.closest && t.closest("#bbMenuBtn"))) { const ov = document.getElementById("bbOverOverlay"); if (ov) ov.classList.remove("show"); bbShowStart(); }
});

/* ============================================================
   3. GEOMETRY DASH
   ============================================================ */
const GD_THEMES = [
  { bg1: "#120a22", bg2: "#241238", player: "#ff3ec8", spike: "#ffce54", block: "#8b3ffb", ground: "#2a1a44" },
  { bg1: "#0a1a22", bg2: "#123244", player: "#4ade80", spike: "#ff4d5e", block: "#2dd4bf", ground: "#123044" },
  { bg1: "#22120a", bg2: "#3a1c12", player: "#ffce54", spike: "#ff3ec8", block: "#ff7a3e", ground: "#3a2010" },
  { bg1: "#0a0f22", bg2: "#131a44", player: "#60d4ff", spike: "#ff4d5e", block: "#b458ff", ground: "#101838" },
  { bg1: "#1a0a22", bg2: "#33123f", player: "#ff9ef2", spike: "#ffce54", block: "#8b3ffb", ground: "#2a1038" },
  { bg1: "#0a2212", bg2: "#123a1e", player: "#ffce54", spike: "#ff3ec8", block: "#4ade80", ground: "#123420" },
  { bg1: "#220a16", bg2: "#3a1226", player: "#60d4ff", spike: "#ffce54", block: "#ff3ec8", ground: "#341024" },
  { bg1: "#0a1622", bg2: "#12283a", player: "#ff7a3e", spike: "#ff4d5e", block: "#60d4ff", ground: "#102438" }
];
function gdShade(hex, pct) {
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) + pct, g = ((num >> 8) & 0xff) + pct, b = (num & 0xff) + pct;
  r = Math.min(255, Math.max(0, r)); g = Math.min(255, Math.max(0, g)); b = Math.min(255, Math.max(0, b));
  return "#" + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}
function gdSeeded(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function gdGenerateLevel(n) {
  const rnd = gdSeeded(n * 977 + 31);
  const speed = 3.1 + Math.min(n, 30) * 0.065;
  const trackLength = 2200 + n * 90;
  const minGap = Math.max(78, 205 - n * 3.2), maxGap = minGap + 150;
  const obstacles = []; let x = 420;
  while (x < trackLength - 260) {
    const clusterRoll = rnd(); let cluster = 1;
    if (n >= 25 && clusterRoll < 0.22) cluster = 3;
    else if (n >= 10 && clusterRoll < 0.32) cluster = 2;
    const typeRoll = rnd(); let type, w, h;
    if (typeRoll < 0.58) { type = "spike"; w = 26 * cluster; h = 26; }
    else { type = "block"; w = 40; h = [28, 44, 60][Math.floor(rnd() * 3)]; cluster = 1; }
    obstacles.push({ x, type, w, h });
    x += w + minGap + rnd() * (maxGap - minGap);
  }
  const decor = []; for (let i = 0; i < 6; i++) decor.push({ x: rnd() * trackLength, y: 20 + rnd() * 50, r: 2 + rnd() * 3 });
  return { obstacles, decor, trackLength, speed, theme: GD_THEMES[(n - 1) % GD_THEMES.length] };
}
const GD_STORE_KEY = "febztzy-gd-unlocked";
function gdGetUnlocked() { try { return Math.max(1, parseInt(localStorage.getItem(GD_STORE_KEY) || "1", 10)); } catch (e) { return 1; } }
function gdSetUnlocked(v) { try { localStorage.setItem(GD_STORE_KEY, String(v)); } catch (e) { } }
let gdLevel = 1, gdData = null, gdWorldX = 0, gdPlayer = null, gdRunning = false, gdRaf = null, gdRot = 0;
const gdCanvas = document.getElementById("canvas");
const gdCtx = gdCanvas ? gdCanvas.getContext("2d") : null;
const GD_W = 320, GD_H = 380, GD_GROUND_Y = 320, GD_PLAYER_X = 56, GD_PLAYER_SIZE = 26, GD_GRAV = 0.85, GD_JUMP_VEL = -13.2;

function gdRenderLevelSelect() {
  const unlocked = gdGetUnlocked();
  const progLine = document.getElementById("progLine"); if (progLine) progLine.textContent = "Level terbuka: " + unlocked + " / 40";
  const grid = document.getElementById("lvlGrid"); if (!grid) return;
  grid.innerHTML = "";
  for (let i = 1; i <= 40; i++) {
    const btn = document.createElement("button");
    const isLocked = i > unlocked, isDone = i < unlocked;
    btn.className = "lvl-btn" + (isLocked ? " locked" : "") + (isDone ? " done" : "");
    btn.innerHTML = (isLocked ? "🔒" : i) + (isDone ? '<span class="star">★</span>' : "");
    btn.disabled = isLocked;
    btn.addEventListener("click", () => gdStartLevel(i));
    grid.appendChild(btn);
  }
  const ls = document.getElementById("levelSelect"); if (ls) ls.style.display = "block";
  const gs = document.getElementById("gameScreen"); if (gs) gs.style.display = "none";
}
function gdStartLevel(n) {
  gdLevel = n; gdData = gdGenerateLevel(n); gdWorldX = 0; gdRot = 0;
  gdPlayer = { y: GD_GROUND_Y - GD_PLAYER_SIZE, vy: 0, grounded: true };
  gdRunning = true;
  const lbl = document.getElementById("lvlLabel"); if (lbl) lbl.textContent = "Level " + n;
  const pf = document.getElementById("progFill"); if (pf) pf.style.width = "0%";
  const lo = document.getElementById("loseOverlay"); if (lo) lo.classList.remove("show");
  const wo = document.getElementById("winOverlay"); if (wo) wo.classList.remove("show");
  const ls = document.getElementById("levelSelect"); if (ls) ls.style.display = "none";
  const gs = document.getElementById("gameScreen"); if (gs) gs.style.display = "block";
  if (gdRaf) cancelAnimationFrame(gdRaf);
  gdRaf = requestAnimationFrame(gdLoop);
}
function gdStop() { gdRunning = false; if (gdRaf) cancelAnimationFrame(gdRaf); gdRaf = null; }
function gdRestart() { gdStartLevel(gdLevel); }
function gdDoJump() {
  if (!gdRunning || !gdPlayer) return;
  if (gdPlayer.grounded) { gdPlayer.vy = GD_JUMP_VEL; gdPlayer.grounded = false; febzJump(); }
}
if (gdCanvas) gdCanvas.addEventListener("pointerdown", gdDoJump);
document.addEventListener("keydown", e => {
  const ga = document.getElementById("gameApp");
  if (!ga || ga.style.display !== "block") return;
  if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); gdDoJump(); }
});
function gdOverlap(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }
function gdDie() {
  if (!gdRunning) return;
  gdRunning = false;
  febzDie();
  const lo = document.getElementById("loseOverlay"); if (lo) lo.classList.add("show");
}
function gdWin() {
  if (!gdRunning) return;
  gdRunning = false;
  febzWin();
  const unlocked = gdGetUnlocked();
  if (gdLevel === unlocked && gdLevel < 40) gdSetUnlocked(unlocked + 1);
  const wt = document.getElementById("winText");
  if (wt) wt.textContent = gdLevel < 40 ? "Level " + (gdLevel + 1) + " terbuka." : "Semua 40 level selesai!";
  const wo = document.getElementById("winOverlay"); if (wo) wo.classList.add("show");
}
function gdLoop() {
  if (!gdRunning || !gdCtx) return;
  gdWorldX += gdData.speed;
  gdPlayer.vy += GD_GRAV;
  gdPlayer.y += gdPlayer.vy;
  let landedOnBlock = false;
  for (const o of gdData.obstacles) {
    const sx = o.x - gdWorldX;
    if (sx < -80 || sx > GD_W + 80) continue;
    if (o.type === "block") {
      const bTop = GD_GROUND_Y - o.h;
      if (gdOverlap(GD_PLAYER_X, gdPlayer.y, GD_PLAYER_SIZE, GD_PLAYER_SIZE, sx, bTop, o.w, o.h)) {
        if (gdPlayer.vy >= 0 && gdPlayer.y + GD_PLAYER_SIZE - gdPlayer.vy <= bTop + 2) {
          gdPlayer.y = bTop - GD_PLAYER_SIZE; gdPlayer.vy = 0; gdPlayer.grounded = true; landedOnBlock = true;
        } else { gdDie(); return; }
      }
    } else {
      const sTop = GD_GROUND_Y - o.h;
      const pad = 5;
      if (gdOverlap(GD_PLAYER_X + pad, gdPlayer.y + pad, GD_PLAYER_SIZE - pad * 2, GD_PLAYER_SIZE - pad * 2, sx, sTop, o.w, o.h)) { gdDie(); return; }
    }
  }
  if (!landedOnBlock) {
    if (gdPlayer.y + GD_PLAYER_SIZE >= GD_GROUND_Y) { gdPlayer.y = GD_GROUND_Y - GD_PLAYER_SIZE; gdPlayer.vy = 0; gdPlayer.grounded = true; }
    else gdPlayer.grounded = false;
  }
  if (gdWorldX >= gdData.trackLength) { gdWin(); return; }
  const pf = document.getElementById("progFill"); if (pf) pf.style.width = Math.min(100, gdWorldX / gdData.trackLength * 100) + "%";
  gdDraw();
  gdRaf = requestAnimationFrame(gdLoop);
}
function gdDraw() {
  if (!gdCtx) return;
  const c = gdCtx;
  const th = gdData.theme;
  const sky = c.createLinearGradient(0, 0, 0, GD_H);
  sky.addColorStop(0, th.bg1); sky.addColorStop(1, th.bg2);
  c.fillStyle = sky; c.fillRect(0, 0, GD_W, GD_H);
  c.strokeStyle = "rgba(255,255,255,0.05)"; c.lineWidth = 1;
  const off = (-gdWorldX * 0.4) % 40;
  for (let x = off; x < GD_W; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, GD_GROUND_Y); c.stroke(); }
  const grnd = c.createLinearGradient(0, GD_GROUND_Y, 0, GD_H);
  grnd.addColorStop(0, gdShade(th.ground, 25)); grnd.addColorStop(1, gdShade(th.ground, -25));
  c.fillStyle = grnd; c.fillRect(0, GD_GROUND_Y, GD_W, GD_H - GD_GROUND_Y);
  c.strokeStyle = th.player; c.lineWidth = 2; c.beginPath(); c.moveTo(0, GD_GROUND_Y); c.lineTo(GD_W, GD_GROUND_Y); c.stroke();
  for (const o of gdData.obstacles) {
    const sx = o.x - gdWorldX;
    if (sx < -60 || sx > GD_W + 60) continue;
    if (o.type === "block") {
      const bTop = GD_GROUND_Y - o.h;
      const bg = c.createLinearGradient(sx, bTop, sx, bTop + o.h);
      bg.addColorStop(0, gdShade(th.block, 45)); bg.addColorStop(1, gdShade(th.block, -30));
      c.fillStyle = bg; c.fillRect(sx, bTop, o.w, o.h);
      c.fillStyle = "rgba(255,255,255,0.2)"; c.fillRect(sx, bTop, o.w, 4);
    } else {
      const sTop = GD_GROUND_Y - o.h;
      const spikes = Math.max(1, Math.round(o.w / 26)), sw = o.w / spikes;
      for (let i = 0; i < spikes; i++) {
        const px = sx + i * sw;
        const sg = c.createLinearGradient(px, GD_GROUND_Y, px + sw / 2, sTop);
        sg.addColorStop(0, gdShade(th.spike, -25)); sg.addColorStop(1, gdShade(th.spike, 55));
        c.fillStyle = sg;
        c.beginPath(); c.moveTo(px, GD_GROUND_Y); c.lineTo(px + sw / 2, sTop); c.lineTo(px + sw, GD_GROUND_Y); c.closePath(); c.fill();
      }
    }
  }
  gdRot += gdPlayer.grounded ? 0 : 7;
  c.save();
  c.translate(GD_PLAYER_X + GD_PLAYER_SIZE / 2, gdPlayer.y + GD_PLAYER_SIZE / 2);
  c.rotate(gdRot * Math.PI / 180);
  const pg = c.createLinearGradient(-13, -13, 13, 13);
  pg.addColorStop(0, gdShade(th.player, 60)); pg.addColorStop(1, gdShade(th.player, -40));
  c.shadowColor = th.player; c.shadowBlur = 14;
  c.fillStyle = pg; c.fillRect(-13, -13, 26, 26);
  c.shadowBlur = 0;
  c.strokeStyle = "rgba(255,255,255,0.35)"; c.lineWidth = 1.3;
  c.beginPath(); c.moveTo(-13, -13); c.lineTo(13, 13); c.moveTo(13, -13); c.lineTo(-13, 13); c.stroke();
  c.fillStyle = "rgba(255,255,255,0.9)"; c.beginPath(); c.arc(4, -4, 2.3, 0, 7); c.fill();
  c.restore();
}
document.addEventListener("click", e => {
  const t = e.target;
  if (!t) return;
  if (t.id === "backBtn" || (t.closest && t.closest("#backBtn"))) { gdStop(); gdRenderLevelSelect(); }
  if (t.id === "restartBtn" || (t.closest && t.closest("#restartBtn"))) gdRestart();
  if (t.id === "retryBtn" || (t.closest && t.closest("#retryBtn"))) { const ov = document.getElementById("loseOverlay"); if (ov) ov.classList.remove("show"); gdRestart(); }
  if (t.id === "nextBtn" || (t.closest && t.closest("#nextBtn"))) { const ov = document.getElementById("winOverlay"); if (ov) ov.classList.remove("show"); if (gdLevel < 40) gdStartLevel(gdLevel + 1); else gdRenderLevelSelect(); }
  if (t.id === "loseBackBtn" || (t.closest && t.closest("#loseBackBtn"))) { const ov = document.getElementById("loseOverlay"); if (ov) ov.classList.remove("show"); gdStop(); gdRenderLevelSelect(); }
  if (t.id === "winBackBtn" || (t.closest && t.closest("#winBackBtn"))) { const ov = document.getElementById("winOverlay"); if (ov) ov.classList.remove("show"); gdStop(); gdRenderLevelSelect(); }
});

/* ============================================================
   4. SNAKE ARENA (.io style)
   ============================================================ */
const SIO_SKINS = [
  { name: "Neon Hijau", a: "#4ade80", b: "#60d4ff" },
  { name: "Pink Cyber", a: "#ff3ec8", b: "#8b3ffb" },
  { name: "Emas", a: "#ffce54", b: "#ff7a3e" },
  { name: "Es", a: "#60d4ff", b: "#ffffff" },
  { name: "Racun", a: "#4ade80", b: "#1a1a1a" },
  { name: "Galaksi", a: "#8b3ffb", b: "#ff3ec8" }
];
const SIO_WORLD_R = 650, SIO_SEG_SPACE = 6, SIO_HEAD_R = 8, SIO_BODY_R = 6.5, SIO_SPEED = 2.4, SIO_TURN = 0.07;
const SIO_HIGH_KEY = "febztzy-sio-high";
let sioSkinIdx = 0;
try { sioSkinIdx = parseInt(localStorage.getItem("febztzy-sio-skin") || "0", 10) || 0; } catch (e) { }
let sioPlayer = null, sioBots = [], sioFoods = [], sioEffects = [], sioRunning = false, sioRaf = null, sioScore = 0, sioHigh = 0;
let sioSteerAngle = null;
const sioCanvas = document.getElementById("sioCanvas");
const sioCtx = sioCanvas ? sioCanvas.getContext("2d") : null;

function sioHeadR(s) { return Math.min(15, SIO_HEAD_R + s.segCount * 0.06); }
function sioBodyR(s) { return Math.min(12, SIO_BODY_R + s.segCount * 0.05); }
function sioNewSnake(x, y, heading, isBot, skin) {
  return { x, y, heading, target: heading, trail: [{ x, y }], segCount: 8, segs: [], isBot, skin, alive: true, wanderT: 0, energy: 100, boosting: false };
}
function sioSpawnFoodNear(cx, cy) {
  const ang = Math.random() * Math.PI * 2, dist = Math.random() * SIO_WORLD_R;
  const x = Math.cos(ang) * dist, y = Math.sin(ang) * dist;
  const r = Math.random();
  const type = r < 0.7 ? "normal" : (r < 0.92 ? "big" : "rare");
  sioFoods.push({ x, y, type, taken: false });
}
function sioEnsureFood() { while (sioFoods.filter(f => !f.taken).length < 40) sioSpawnFoodNear(0, 0); }
function sioStart() {
  sioPlayer = sioNewSnake(0, 0, 0, false, SIO_SKINS[sioSkinIdx]);
  sioBots = [];
  for (let i = 0; i < 4; i++) {
    const ang = Math.random() * Math.PI * 2, dist = 200 + Math.random() * 350;
    sioBots.push(sioNewSnake(Math.cos(ang) * dist, Math.sin(ang) * dist, Math.random() * Math.PI * 2, true, SIO_SKINS[Math.floor(Math.random() * SIO_SKINS.length)]));
  }
  sioFoods = []; sioEnsureFood();
  sioEffects = []; sioScore = 0; sioSteerAngle = null;
  try { sioHigh = parseInt(localStorage.getItem(SIO_HIGH_KEY) || "0", 10); } catch (e) { sioHigh = 0; }
  const s = document.getElementById("sioScore"); if (s) s.textContent = "0";
  const h = document.getElementById("sioHigh2"); if (h) h.textContent = sioHigh;
  const ov = document.getElementById("sioOverOverlay"); if (ov) ov.classList.remove("show");
  const st = document.getElementById("sioStart"); if (st) st.style.display = "none";
  const gm = document.getElementById("sioGame"); if (gm) gm.style.display = "block";
  sioRunning = true;
  if (sioRaf) cancelAnimationFrame(sioRaf);
  sioRaf = requestAnimationFrame(sioLoop);
}
function sioStop() { sioRunning = false; if (sioRaf) cancelAnimationFrame(sioRaf); sioRaf = null; sioSteerAngle = null; }
function sioUpdateSnake(s, speedMult) {
  let diff = ((s.target - s.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const t = Math.max(-SIO_TURN, Math.min(SIO_TURN, diff));
  s.heading += t;
  const sp = Math.max(1.1, SIO_SPEED - s.segCount * 0.018) * (speedMult || 1);
  s.x += Math.cos(s.heading) * sp; s.y += Math.sin(s.heading) * sp;
  s.trail.unshift({ x: s.x, y: s.y });
  const maxLen = s.segCount * SIO_SEG_SPACE + 40;
  if (s.trail.length > maxLen) s.trail.length = maxLen;
  s.segs = []; let acc = 0, last = s.trail[0];
  for (let i = 1; i < s.trail.length && s.segs.length < s.segCount; i++) {
    const p = s.trail[i]; acc += Math.hypot(p.x - last.x, p.y - last.y); last = p;
    if (acc >= SIO_SEG_SPACE) { s.segs.push(p); acc = 0; }
  }
}
function sioBotAI(b) {
  b.wanderT--;
  if (b.wanderT <= 0) { b.wanderT = 40 + Math.random() * 40; b.target = b.heading + (Math.random() - 0.5) * 1.6; }
  let nearest = null, nd = 140;
  sioFoods.forEach(f => { if (f.taken) return; const d = Math.hypot(f.x - b.x, f.y - b.y); if (d < nd) { nd = d; nearest = f; } });
  if (nearest) b.target = Math.atan2(nearest.y - b.y, nearest.x - b.x);
  const distC = Math.hypot(b.x, b.y);
  if (distC > SIO_WORLD_R - 80) b.target = Math.atan2(-b.y, -b.x);
}
function sioEat(s, isPlayer) {
  for (const f of sioFoods) {
    if (f.taken) continue;
    if (Math.hypot(f.x - s.x, f.y - s.y) < sioHeadR(s) + 6) {
      f.taken = true;
      const grow = f.type === "rare" ? 4 : (f.type === "big" ? 2 : 1);
      s.segCount += grow;
      sioEffects.push({ x: f.x, y: f.y, r: 6, alpha: 1, color: f.type === "rare" ? "#ff3ec8" : f.type === "big" ? "#ffce54" : "#60d4ff" });
      if (isPlayer) { sioScore += grow * 10; const sc = document.getElementById("sioScore"); if (sc) sc.textContent = sioScore; febzTone(600, 0.08, "sine", 0.12); }
    }
  }
  sioFoods = sioFoods.filter(f => !f.taken);
  sioEnsureFood();
}
function sioKillBot(b) {
  b.alive = false;
  const dropCount = Math.max(3, Math.floor(b.segCount / 2));
  for (let i = 0; i < dropCount; i++) {
    const ang = Math.random() * Math.PI * 2, dist = Math.random() * 22;
    sioFoods.push({ x: b.x + Math.cos(ang) * dist, y: b.y + Math.sin(ang) * dist, type: Math.random() < 0.25 ? "big" : "normal", taken: false });
  }
  setTimeout(() => {
    if (!sioRunning) return;
    const idx = sioBots.indexOf(b); if (idx >= 0) sioBots.splice(idx, 1);
    const ang = Math.random() * Math.PI * 2, dist = 200 + Math.random() * 350;
    sioBots.push(sioNewSnake(Math.cos(ang) * dist, Math.sin(ang) * dist, Math.random() * Math.PI * 2, true, SIO_SKINS[Math.floor(Math.random() * SIO_SKINS.length)]));
  }, 1200);
}
function sioCheckBotDeaths() {
  sioBots.forEach(b => {
    if (!b.alive) return;
    for (let i = 0; i < sioPlayer.segs.length; i++) {
      if (Math.hypot(sioPlayer.segs[i].x - b.x, sioPlayer.segs[i].y - b.y) < sioBodyR(sioPlayer) + sioHeadR(b) - 2) { sioKillBot(b); return; }
    }
  });
}
function sioCheckDeath() {
  const p = sioPlayer;
  if (Math.hypot(p.x, p.y) > SIO_WORLD_R) return true;
  for (let i = 6; i < p.segs.length; i++) { if (Math.hypot(p.segs[i].x - p.x, p.segs[i].y - p.y) < sioBodyR(p) + sioHeadR(p) - 2) return true; }
  for (const b of sioBots) {
    if (!b.alive) continue;
    const dHead = Math.hypot(b.x - p.x, b.y - p.y);
    if (dHead < sioHeadR(b) + sioHeadR(p)) continue;
    for (let i = 0; i < b.segs.length; i++) { if (Math.hypot(b.segs[i].x - p.x, b.segs[i].y - p.y) < sioBodyR(b) + sioHeadR(p) - 2) return true; }
  }
  return false;
}
function sioGameOver() {
  sioRunning = false;
  febzDie();
  sioHigh = Math.max(sioHigh, sioScore);
  try { localStorage.setItem(SIO_HIGH_KEY, String(sioHigh)); } catch (e) { }
  const fin = document.getElementById("sioFinalScore"); if (fin) fin.textContent = sioScore;
  const hi = document.getElementById("sioHighScore2"); if (hi) hi.textContent = sioHigh;
  const ov = document.getElementById("sioOverOverlay"); if (ov) ov.classList.add("show");
}
function sioDrawSnake(s, camX, camY, skin) {
  if (!sioCtx) return;
  const br = sioBodyR(s), hr = sioHeadR(s);
  for (let i = s.segs.length - 1; i >= 0; i--) {
    const seg = s.segs[i], sx = seg.x - camX + 170, sy = seg.y - camY + 170;
    if (sx < -16 || sx > 356 || sy < -16 || sy > 356) continue;
    const tcol = i % 2 === 0 ? skin.a : skin.b;
    sioCtx.save(); sioCtx.shadowColor = tcol; sioCtx.shadowBlur = 6; sioCtx.fillStyle = tcol;
    sioCtx.beginPath(); sioCtx.arc(sx, sy, br, 0, 7); sioCtx.fill(); sioCtx.restore();
  }
  const hx = s.x - camX + 170, hy = s.y - camY + 170;
  sioCtx.save(); sioCtx.shadowColor = s.boosting ? "#ffce54" : "#fff"; sioCtx.shadowBlur = 10;
  sioCtx.fillStyle = s.boosting ? "#ffe066" : "#fff";
  sioCtx.beginPath(); sioCtx.arc(hx, hy, hr, 0, 7); sioCtx.fill(); sioCtx.restore();
}
function sioDrawFood(f, camX, camY) {
  if (!sioCtx) return;
  const sx = f.x - camX + 170, sy = f.y - camY + 170;
  if (sx < -10 || sx > 350 || sy < -10 || sy > 350) return;
  const col = f.type === "rare" ? "#ff3ec8" : f.type === "big" ? "#ffce54" : "#60d4ff";
  const r = f.type === "rare" ? 6 : f.type === "big" ? 5 : 3.4;
  sioCtx.save(); sioCtx.shadowColor = col; sioCtx.shadowBlur = 8; sioCtx.fillStyle = col;
  if (f.type === "rare") { sioCtx.save(); sioCtx.translate(sx, sy); sioCtx.rotate(Math.PI / 4); sioCtx.fillRect(-r, -r, r * 2, r * 2); sioCtx.restore(); }
  else { sioCtx.beginPath(); sioCtx.arc(sx, sy, r, 0, 7); sioCtx.fill(); }
  sioCtx.restore();
}
function sioLoop() {
  if (!sioRunning || !sioCtx) return;
  if (sioSteerAngle !== null) sioPlayer.target = sioSteerAngle;
  if (sioPlayer.boosting && sioPlayer.energy > 0) {
    sioPlayer.energy = Math.max(0, sioPlayer.energy - 1.3);
    if (sioPlayer.energy <= 0) sioPlayer.boosting = false;
  } else { sioPlayer.energy = Math.min(100, sioPlayer.energy + 0.45); }
  sioUpdateSnake(sioPlayer, sioPlayer.boosting && sioPlayer.energy > 0 ? 1.9 : 1);
  sioBots.forEach(b => { if (b.alive) { sioBotAI(b); sioUpdateSnake(b, 1); } });
  sioEat(sioPlayer, true);
  sioBots.forEach(b => { if (b.alive) sioEat(b, false); });
  sioCheckBotDeaths();
  sioEffects.forEach(e => { e.r += 1.4; e.alpha -= 0.07; });
  sioEffects = sioEffects.filter(e => e.alpha > 0);
  if (sioCheckDeath()) { sioGameOver(); return; }
  const camX = sioPlayer.x, camY = sioPlayer.y;
  const grad = sioCtx.createLinearGradient(0, 0, 340, 340);
  grad.addColorStop(0, "#140c24"); grad.addColorStop(1, "#0a0714");
  sioCtx.fillStyle = grad; sioCtx.fillRect(0, 0, 340, 340);
  sioCtx.strokeStyle = "rgba(180,88,255,0.06)"; sioCtx.lineWidth = 1;
    for (let x = -170; x <= 170; x += 30) { const sx = x - (camX % 30); sioCtx.beginPath(); sioCtx.moveTo(sx, 0); sioCtx.lineTo(sx, 340); sioCtx.stroke(); }
  for (let y = -170; y <= 170; y += 30) { const sy = y - (camY % 30); sioCtx.beginPath(); sioCtx.moveTo(0, sy); sioCtx.lineTo(340, sy); sioCtx.stroke(); }
  const bx = 0 - camX + 170, by = 0 - camY + 170;
  sioCtx.strokeStyle = "rgba(255,77,94,0.5)"; sioCtx.lineWidth = 3;
  sioCtx.beginPath(); sioCtx.arc(bx, by, SIO_WORLD_R, 0, 7); sioCtx.stroke();
  sioFoods.forEach(f => sioDrawFood(f, camX, camY));
  sioBots.forEach(b => { if (b.alive) sioDrawSnake(b, camX, camY, b.skin); });
  sioDrawSnake(sioPlayer, camX, camY, sioPlayer.skin);
  sioEffects.forEach(e => {
    const sx = e.x - camX + 170, sy = e.y - camY + 170;
    sioCtx.save(); sioCtx.globalAlpha = Math.max(0, e.alpha); sioCtx.strokeStyle = e.color; sioCtx.lineWidth = 2;
    sioCtx.beginPath(); sioCtx.arc(sx, sy, e.r, 0, 7); sioCtx.stroke(); sioCtx.restore();
  });
  sioRaf = requestAnimationFrame(sioLoop);
}
if (sioCanvas) {
  sioCanvas.addEventListener("pointermove", e => {
    const r = sioCanvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    sioSteerAngle = Math.atan2(y - 170, x - 170);
  });
  sioCanvas.addEventListener("touchmove", e => {
    const t = e.touches[0];
    const r = sioCanvas.getBoundingClientRect();
    const x = t.clientX - r.left, y = t.clientY - r.top;
    sioSteerAngle = Math.atan2(y - 170, x - 170);
  }, { passive: true });
}
document.addEventListener("click", e => {
  const t = e.target;
  if (!t) return;
  if (t.id === "sioPlayBtn" || (t.closest && t.closest("#sioPlayBtn"))) { e.preventDefault(); sioStart(); }
  if (t.id === "sioBackBtn" || (t.closest && t.closest("#sioBackBtn"))) { sioStop(); const st = document.getElementById("sioStart"); if (st) st.style.display = "block"; const gm = document.getElementById("sioGame"); if (gm) gm.style.display = "none"; }
  if (t.id === "sioRetryBtn" || (t.closest && t.closest("#sioRetryBtn"))) { const ov = document.getElementById("sioOverOverlay"); if (ov) ov.classList.remove("show"); sioStart(); }
  if (t.id === "sioMenuBtn" || (t.closest && t.closest("#sioMenuBtn"))) { const ov = document.getElementById("sioOverOverlay"); if (ov) ov.classList.remove("show"); sioStop(); const st = document.getElementById("sioStart"); if (st) st.style.display = "block"; const gm = document.getElementById("sioGame"); if (gm) gm.style.display = "none"; }
});

/* ===== Init ===== */
document.addEventListener("DOMContentLoaded", () => {
  snakeShowStart();
  bbShowStart();
  gdRenderLevelSelect();
  sioStop();
  const sioStartEl = document.getElementById("sioStart");
  const sioGameEl = document.getElementById("sioGame");
  if (sioStartEl) sioStartEl.style.display = "block";
  if (sioGameEl) sioGameEl.style.display = "none";
});

/* ============================================================
   KOMIK READER — FebzTzy
   Home · Update · Browse · Search · Genre · Detail · Chapter
   ============================================================ */
(function () {
  const KMK_API = "https://apiii-xrina.my.id/komik";
  const kmk = {
    tab: "home", q: "", page: 1, hasNext: false, loading: false, reqId: 0, opened: false,
    detailUrl: "", chapters: [], chIdx: -1
  };

  const $ = id => document.getElementById(id);
  const kmkGrid = $("kmkGrid"), kmkStatus = $("kmkStatus"), kmkMore = $("kmkMore");
  const kmkInput = $("kmkInput"), kmkClearBtn = $("kmkClear");
  const kmkReader = $("kmkReader");
  const kmkModal = $("kmkModal");

  function kmkEsc(t) { const d = document.createElement("div"); d.textContent = t == null ? "" : String(t); return d.innerHTML; }

  function kmkPickList(j) {
    if (!j) return [];
    if (Array.isArray(j)) return j;
    const roots = [j, j.data, j.result, j.results, j.payload];
    for (let r = 0; r < roots.length; r++) {
      const o = roots[r]; if (!o) continue;
      if (Array.isArray(o)) return o;
      const keys = ["comics", "komik", "manga", "items", "list", "latest", "popular", "update", "home", "data", "results", "manhwa", "manhua"];
      for (let i = 0; i < keys.length; i++) {
        if (Array.isArray(o[keys[i]])) return o[keys[i]];
      }
    }
    return [];
  }

  function kmkFindImg(obj, depth) {
    if (!obj || depth > 4) return "";
    if (typeof obj === "string") {
      const s = obj.trim();
      if (!s) return "";
      if (/^https?:\/\//i.test(s) && /\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(s)) return s;
      if (/^https?:\/\//i.test(s) && /(cover|thumb|poster|image|img|cdn|wp-content|uploads|komik|manga|manhwa)/i.test(s)) return s;
      if (/^\/\//.test(s)) return "https:" + s;
      if (/^\/(uploads|storage|assets|images|cover|thumb)/i.test(s)) return s;
      return "";
    }
    if (typeof obj !== "object") return "";
    const prefer = ["thumbnail", "thumb", "image", "cover", "poster", "img", "cover_url", "thumb_url", "image_url", "thumbnail_url", "gambar", "imageUrl", "coverImage", "cover_image", "poster_url", "posterUrl", "src", "photo", "banner"];
    for (let i = 0; i < prefer.length; i++) {
      const v = obj[prefer[i]];
      if (typeof v === "string" && v.trim()) {
        const found = kmkFindImg(v, (depth || 0) + 1);
        if (found) return found;
        if (/^https?:\/\//i.test(v.trim())) return v.trim();
      }
      if (v && typeof v === "object") {
        const nested = v.url || v.src || v.image_url || v.large || v.medium || v.small || v.jpg || v.webp || v.original || v.full;
        if (typeof nested === "string" && /^https?:\/\//i.test(nested)) return nested;
      }
    }
    try {
      for (const k in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
        if (k === "url" || k === "link" || k === "href" || k === "endpoint" || k === "detail_url") continue;
        const found = kmkFindImg(obj[k], (depth || 0) + 1);
        if (found) return found;
      }
    } catch (e) { }
    return "";
  }

  function kmkProxyImg(src) {
    if (!src) return "";
    try {
      let s = String(src).trim();
      if (/^\/\//.test(s)) s = "https:" + s;
      if (!/^https?:\/\//i.test(s)) return s;
      const u = s.replace(/^https?:\/\//i, "");
      return "https://wsrv.nl/?url=" + encodeURIComponent(u) + "&w=480&output=webp&n=-1";
    } catch (e) { return src; }
  }
  function kmkProxyAlt(src, tryN) {
    if (!src) return "";
    try {
      let s = String(src).trim();
      if (/^\/\//.test(s)) s = "https:" + s;
      if (!/^https?:\/\//i.test(s)) return s;
      const u = s.replace(/^https?:\/\//i, "");
      if (tryN === 1) return "https://images.weserv.nl/?url=" + encodeURIComponent(u) + "&w=480&output=webp";
      if (tryN === 2) return "https://cdn.statically.io/img/" + u;
      return s;
    } catch (e) { return src; }
  }

  function kmkNormItem(it) {
    if (!it || typeof it !== "object") return null;
    const title = it.title || it.name || it.judul || it.comic_title || it.series || "Tanpa judul";
    let img = kmkFindImg(it, 0);
    if (img) img = kmkProxyImg(img);
    const url = it.url || it.link || it.href || it.endpoint || it.detail_url || it.comic_url || it.series_url || "";
    const type = it.type || it.tipe || it.genre || it.comic_type || "";
    const score = it.score || it.rating || it.rate || "";
    const latest = it.latest_chapter || it.chapter || it.last_chapter || it.LastChapter || it.latest || it.chapter_update || "";
    let latestStr = "";
    if (typeof latest === "string") latestStr = latest;
    else if (Array.isArray(latest) && latest[0]) latestStr = latest[0].chapter || latest[0].name || latest[0].title || "";
    else if (latest && typeof latest === "object") latestStr = latest.chapter || latest.name || "";
    const typeStr = typeof type === "object" ? (type.name || type.title || "") : String(type || "");
    return { title: String(title), img: String(img || ""), url: String(url || ""), type: typeStr, score: String(score || ""), latest: String(latestStr || ""), raw: it };
  }

  function kmkEndpoint(tab, page, q) {
    if (tab === "search") return KMK_API + "/search?q=" + encodeURIComponent(q || "") + (page > 1 ? "&page=" + page : "");
    if (tab === "update") return KMK_API + "/update?page=" + (page || 1);
    if (tab === "browse") return KMK_API + "/browse?page=" + (page || 1);
    return KMK_API + "/home?page=" + (page || 1);
  }

  async function kmkFetch(url) {
    const routes = [
      url,
      "https://api.allorigins.win/raw?url=" + encodeURIComponent(url),
      "https://corsproxy.io/?url=" + encodeURIComponent(url)
    ];
    let last = "";
    for (let i = 0; i < routes.length; i++) {
      try {
        const ctl = new AbortController();
        const t = setTimeout(function () { ctl.abort(); }, 28000);
        const res = await fetch(routes[i], { signal: ctl.signal, cache: "no-store", headers: { "Accept": "application/json" } });
        clearTimeout(t);
        const text = await res.text();
        let j = null; try { j = JSON.parse(text); } catch (e) { }
        if (j && j.contents && typeof j.contents === "string") { try { j = JSON.parse(j.contents); } catch (e) { } }
        if (!j) { last = "bukan JSON"; continue; }
        if (j.status === false || j.success === false) {
          last = j.message || j.error || "gagal";
          if (/blokir|block|rate|limit/i.test(String(last))) continue;
          if (!kmkPickList(j).length) throw new Error(String(last));
        }
        return j;
      } catch (e) {
        last = (e && e.name === "AbortError") ? "waktu habis" : (e.message || "network");
      }
    }
    throw new Error(last || "Gagal ambil data komik");
  }

  function kmkRenderChips() {
    const box = $("kmkChips"); if (!box) return;
    box.innerHTML = "";
    const tabs = [
      { id: "home", l: "🏠 Home" },
      { id: "update", l: "🆕 Update" },
      { id: "browse", l: "📚 Browse" }
    ];
    tabs.forEach(function (t) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "kmk-chip" + (kmk.tab === t.id ? " active" : "");
      b.textContent = t.l;
      b.addEventListener("click", function () {
        kmk.tab = t.id; kmk.q = "";
        if (kmkInput) kmkInput.value = "";
        kmkRenderChips(); kmkReload();
      });
      box.appendChild(b);
    });
  }
  function kmkHeadingText() {
    if (kmk.q) return 'Hasil "' + kmk.q + '"';
    if (kmk.tab === "update") return "Update terbaru";
    if (kmk.tab === "browse") return "Browse komik";
    return "Beranda komik";
  }
  function kmkSkeleton(on) {
    if (!on) return;
    kmkGrid.innerHTML = "";
    for (let i = 0; i < 6; i++) {
      const s = document.createElement("div"); s.className = "kmk-skel"; kmkGrid.appendChild(s);
    }
  }

  async function kmkLoad(page) {
    if (kmk.loading) return;
    kmk.loading = true; kmk.page = page || 1;
    const req = ++kmk.reqId;
    if (page <= 1) { kmkSkeleton(true); kmkStatus.textContent = ""; kmkMore.style.display = "none"; }
    else { kmkStatus.textContent = "Memuat…"; }
    const heading = $("kmkHeading"); if (heading) heading.textContent = kmkHeadingText();
    try {
      const tab = kmk.q ? "search" : kmk.tab;
      const url = kmkEndpoint(tab, kmk.page, kmk.q);
      const j = await kmkFetch(url);
      if (req !== kmk.reqId) return;
      let list = kmkPickList(j).map(kmkNormItem).filter(Boolean);
      if (page <= 1) kmkGrid.innerHTML = "";
      if (!list.length && page <= 1) {
        kmkStatus.textContent = "Tidak ada hasil. Coba kata kunci lain.";
        kmkMore.style.display = "none";
      } else {
        list.forEach(function (n) {
          const c = document.createElement("div"); c.className = "kmk-card";
          const poster = document.createElement("div"); poster.className = "kmk-poster";
          poster.setAttribute("data-t", (n.title || "?").charAt(0).toUpperCase());
          if (!n.img) poster.classList.add("noimg");
          if (n.img) {
            const img = document.createElement("img");
            img.alt = n.title || ""; img.loading = "lazy"; img.decoding = "async";
            img.referrerPolicy = "no-referrer";
            img.src = n.img;
            img.onerror = function () {
              const step = parseInt(this.dataset.fb || "0", 10);
              const raw = kmkFindImg(n.raw || {}, 0) || (n.img || "");
              if (step === 0) { this.dataset.fb = "1"; this.src = kmkProxyAlt(raw, 1); return; }
              if (step === 1) { this.dataset.fb = "2"; this.src = kmkProxyAlt(raw, 2); return; }
              if (step === 2) { this.dataset.fb = "3"; this.src = raw; return; }
              poster.classList.add("noimg"); this.remove();
            };
            poster.appendChild(img);
          }
          if (n.score && String(n.score) !== "[object Object]") { const sc = document.createElement("div"); sc.className = "kmk-score"; sc.textContent = "★ " + n.score; poster.appendChild(sc); }
          if (n.type && String(n.type) !== "[object Object]") { const tp = document.createElement("div"); tp.className = "kmk-type"; tp.textContent = String(n.type).slice(0, 14); poster.appendChild(tp); }
          c.appendChild(poster);
          const info = document.createElement("div"); info.className = "kmk-info";
          const name = document.createElement("div"); name.className = "kmk-name"; name.textContent = n.title;
          info.appendChild(name);
          if (n.latest && String(n.latest) !== "[object Object]") { const sub = document.createElement("div"); sub.className = "kmk-sub"; sub.textContent = n.latest; info.appendChild(sub); }
          c.appendChild(info);
          c.addEventListener("click", function () { kmkOpenDetail(n); });
          kmkGrid.appendChild(c);
        });
        kmk.hasNext = list.length >= 10;
        kmkMore.style.display = kmk.hasNext ? "block" : "none";
        kmkStatus.textContent = list.length + " komik · halaman " + kmk.page;
      }
    } catch (e) {
      if (req !== kmk.reqId) return;
      kmkGrid.innerHTML = "";
      kmkStatus.innerHTML = "";
      const msg = document.createElement("div");
      msg.textContent = (e && e.message) || "Gagal memuat komik";
      kmkStatus.appendChild(msg);
      const rb = document.createElement("button");
      rb.className = "hud-btn"; rb.type = "button"; rb.textContent = "Coba lagi";
      rb.addEventListener("click", function () { kmkLoad(page); });
      kmkStatus.appendChild(rb);
      kmkMore.style.display = "none";
    }
    kmk.loading = false;
  }
  function kmkReload() { kmk.page = 1; kmkLoad(1); }
  if (kmkMore) kmkMore.addEventListener("click", function () { kmkLoad(kmk.page + 1); });

  function kmkCloseDetail() {
    if (kmkModal) kmkModal.classList.add("hidden");
  }
  async function kmkOpenDetail(n) {
    if (!n) return;
    const modal = kmkModal;
    const body = $("kmkModalBody");
    if (!modal || !body) return;
    modal.classList.remove("hidden");
    body.innerHTML = '<div class="kmk-status">Memuat detail…</div>';
    const detailUrl = n.url || "";
    kmk.detailUrl = detailUrl;
    try {
      let j = null;
      if (detailUrl) {
        j = await kmkFetch(KMK_API + "/detail?url=" + encodeURIComponent(detailUrl));
      } else throw new Error("URL detail tidak tersedia");
      const data = (j && (j.data || j.result)) || j || {};
      const title = data.title || data.name || n.title || "Komik";
      let img = kmkFindImg(data, 0) || n.img || "";
      if (img && img.indexOf("weserv") < 0) img = kmkProxyImg(img);
      const syn = data.synopsis || data.description || data.sinopsis || data.desc || "";
      const status = data.status || "";
      const type = data.type || n.type || "";
      const genres = data.genres || data.genre || [];
      let chs = data.chapters || data.chapter_list || data.chapter || data.list_chapter || [];
      if (!Array.isArray(chs) && data.data && Array.isArray(data.data.chapters)) chs = data.data.chapters;
      if (!Array.isArray(chs)) chs = [];
      kmk.chapters = chs.map(function (c, i) {
        return {
          title: c.title || c.name || c.chapter || ("Chapter " + (c.num || c.number || i + 1)),
          url: c.url || c.link || c.href || c.endpoint || c.chapter_url || "",
          date: c.date || c.time || ""
        };
      }).filter(function (c) { return c.url; });

      body.innerHTML = "";
      const hero = document.createElement("div"); hero.className = "kmk-hero";
      const bgw = document.createElement("div"); bgw.className = "bgwrap";
      if (img) { const bg = document.createElement("div"); bg.className = "bg"; bg.style.backgroundImage = "url(" + img + ")"; bgw.appendChild(bg); }
      hero.appendChild(bgw);
      const close = document.createElement("button"); close.className = "kmk-close"; close.type = "button"; close.textContent = "×";
      close.addEventListener("click", kmkCloseDetail); hero.appendChild(close);
      body.appendChild(hero);

      const head = document.createElement("div"); head.className = "kmk-head";
      if (img) { const p = document.createElement("img"); p.className = "poster"; p.src = img; p.alt = ""; p.referrerPolicy = "no-referrer"; head.appendChild(p); }
      const titles = document.createElement("div"); titles.className = "kmk-titles";
      const t = document.createElement("div"); t.className = "t"; t.textContent = title; titles.appendChild(t);
      const jline = [type, status].filter(Boolean).join(" · ");
      if (jline) { const j2 = document.createElement("div"); j2.className = "j"; j2.textContent = jline; titles.appendChild(j2); }
      head.appendChild(titles); body.appendChild(head);

      const pad = document.createElement("div"); pad.style.padding = "12px 16px 20px";
      if (Array.isArray(genres) && genres.length) {
        const g = document.createElement("div"); g.className = "an-gen"; g.style.marginBottom = "10px";
        genres.forEach(function (x) {
          const s = document.createElement("span"); s.textContent = typeof x === "string" ? x : (x.name || ""); if (s.textContent) g.appendChild(s);
        });
        pad.appendChild(g);
      } else if (typeof genres === "string" && genres) {
        const g = document.createElement("div"); g.className = "kmk-sub"; g.textContent = genres; pad.appendChild(g);
      }
      if (syn) { const sy = document.createElement("div"); sy.className = "an-syn"; sy.textContent = syn; pad.appendChild(sy); }

      const chHead = document.createElement("div"); chHead.className = "kmk-heading"; chHead.style.margin = "8px 0";
      chHead.textContent = "Chapter (" + kmk.chapters.length + ")"; pad.appendChild(chHead);

      const list = document.createElement("div"); list.className = "kmk-ch-list";
      if (!kmk.chapters.length) list.innerHTML = '<div class="kmk-status">Chapter tidak ditemukan.</div>';
      else kmk.chapters.forEach(function (ch, idx) {
        const row = document.createElement("div"); row.className = "kmk-ch-item";
        row.innerHTML = "<span>" + kmkEsc(ch.title) + "</span>" + (ch.date ? "<small>" + kmkEsc(ch.date) + "</small>" : "");
        row.addEventListener("click", function () { kmkOpenReader(idx); });
        list.appendChild(row);
      });
      pad.appendChild(list);
      body.appendChild(pad);
    } catch (e) {
      body.innerHTML = '<div class="kmk-status">' + (e.message || "Gagal detail") + '<br><button class="hud-btn" type="button" id="kmkDetRetry">Coba lagi</button></div>';
      const r = $("kmkDetRetry");
      if (r) r.addEventListener("click", function () { kmkOpenDetail(n); });
    }
  }

  function kmkCloseReader() {
    if (kmkReader) { kmkReader.classList.remove("open"); kmkReader.setAttribute("aria-hidden", "true"); }
    const pages = $("kmkReadPages");
    if (pages) pages.innerHTML = "";
  }
  async function kmkOpenReader(idx) {
    if (idx < 0 || idx >= kmk.chapters.length) return;
    kmk.chIdx = idx;
    const ch = kmk.chapters[idx];
    if (kmkReader) { kmkReader.classList.add("open"); kmkReader.setAttribute("aria-hidden", "false"); }
    const titleEl = $("kmkReadTitle");
    if (titleEl) titleEl.textContent = ch.title || ("Chapter " + (idx + 1));
    const pages = $("kmkReadPages");
    pages.innerHTML = '<div class="kmk-status">Memuat halaman…</div>';
    pages.scrollTop = 0;
    try {
      const j = await kmkFetch(KMK_API + "/read?url=" + encodeURIComponent(ch.url));
      const data = (j && (j.data || j.result)) || j || {};
      let imgs = data.images || data.pages || data.image || data.panel || [];
      if (!Array.isArray(imgs) && typeof imgs === "string") imgs = [imgs];
      if (!Array.isArray(imgs)) imgs = [];
      imgs = imgs.map(function (x) {
        if (typeof x === "string") return x;
        if (x && typeof x === "object") return x.url || x.src || x.image || x.link || "";
        return "";
      }).filter(Boolean);
      pages.innerHTML = "";
      if (!imgs.length) { pages.innerHTML = '<div class="kmk-status">Gambar chapter tidak ditemukan.</div>'; return; }
      imgs.forEach(function (src, i) {
        const img = document.createElement("img");
        img.src = src; img.alt = "Halaman " + (i + 1); img.loading = i < 3 ? "eager" : "lazy";
        img.referrerPolicy = "no-referrer";
        img.onerror = function () { this.style.minHeight = "0"; this.style.display = "none"; };
        pages.appendChild(img);
      });
    } catch (e) {
      pages.innerHTML = '<div class="kmk-status">' + (e.message || "Gagal memuat chapter") + "</div>";
    }
  }
  function kmkReadNav(d) {
    const n = kmk.chIdx + d;
    if (n >= 0 && n < kmk.chapters.length) kmkOpenReader(n);
    else try { navToast(d > 0 ? "Chapter terakhir" : "Chapter pertama"); } catch (e) { }
  }

  /* Bind */
  const rb = $("kmkReadBack"); if (rb) rb.addEventListener("click", kmkCloseReader);
  const rc = $("kmkReadClose"); if (rc) rc.addEventListener("click", kmkCloseReader);
  const rn = $("kmkReadNext"); if (rn) rn.addEventListener("click", function () { kmkReadNav(1); });
  const rn2 = $("kmkReadNext2"); if (rn2) rn2.addEventListener("click", function () { kmkReadNav(1); });
  const rp2 = $("kmkReadPrev2"); if (rp2) rp2.addEventListener("click", function () { kmkReadNav(-1); });

  let kmkSearchT = null;
  if (kmkInput) {
    kmkInput.addEventListener("input", function () {
      const v = kmkInput.value.trim();
      if (kmkClearBtn) kmkClearBtn.style.display = v ? "block" : "none";
      clearTimeout(kmkSearchT);
      kmkSearchT = setTimeout(function () {
        kmk.q = v;
        if (v) kmk.tab = "search";
        else if (kmk.tab === "search") kmk.tab = "home";
        kmkRenderChips(); kmkReload();
      }, 450);
    });
    kmkInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault(); clearTimeout(kmkSearchT);
        kmk.q = kmkInput.value.trim();
        kmk.tab = kmk.q ? "search" : "home";
        kmkRenderChips(); kmkReload();
      }
    });
  }
  if (kmkClearBtn) kmkClearBtn.addEventListener("click", function () {
    kmkInput.value = ""; kmkClearBtn.style.display = "none";
    kmk.q = ""; kmk.tab = "home"; kmkRenderChips(); kmkReload();
  });
  if (kmkModal) kmkModal.addEventListener("click", function (e) { if (e.target === kmkModal) kmkCloseDetail(); });

  /* Trigger load saat tab komik dibuka */
  document.addEventListener("click", function (e) {
    const t = e.target.closest && e.target.closest('.nav-item[data-tab="komik"]');
    if (!t) return;
    setTimeout(function () {
      if (!kmk.opened) { kmk.opened = true; kmkRenderChips(); kmkReload(); }
      else if (!kmkGrid.children.length) kmkReload();
    }, 80);
  });

  /* Export */
  window.febzKomikOpen = function () {
    kmk.opened = true;
    kmkRenderChips();
    kmkReload();
  };
})();

/* ============================================================
   PROFIL & DEV TAB — FebzTzy
   ============================================================ */
(function () {
  const $ = id => document.getElementById(id);

  /* ===== Util ===== */
  function mkEl(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  function fmtNum(n) { return Number(n || 0).toLocaleString("id-ID"); }
  function fmtDur(sec) {
    sec = Math.floor(sec || 0);
    if (sec < 60) return sec + " dtk";
    const m = Math.floor(sec / 60);
    if (m < 60) return m + " mnt";
    return Math.floor(m / 60) + " j " + (m % 60) + " mnt";
  }
  function pfNum(k) { try { return parseInt(localStorage.getItem(k) || "0", 10) || 0; } catch (e) { return 0; } }
  function pfRank(l) { if (l >= 15) return "Legenda"; if (l >= 10) return "Elit"; if (l >= 6) return "Veteran"; if (l >= 3) return "Petualang"; return "Pemula"; }
  function getProfilePic() { try { return localStorage.getItem("febztzy-profile-pic"); } catch (e) { return null; } }
  function getProfileName() { try { return localStorage.getItem("febztzy-profile-name") || "FebzTzy"; } catch (e) { return "FebzTzy"; } }

  const PF_TROPHY = '<svg viewBox="0 0 24 24"><path d="M8 4h8v6a4 4 0 0 1-8 0z"/><path d="M8 6H5a2 2 0 0 0 2 4M16 6h3a2 2 0 0 1-2 4M12 14v4M8 20h8"/></svg>';

  /* ===== RPG Save reference ===== */
  function rpgSave() {
    try { return JSON.parse(localStorage.getItem("febztzy-rpg-save") || "null"); } catch (e) { return null; }
  }
  function rpgItems() {
    return (typeof RN_ITEMS !== "undefined" && RN_ITEMS) ? RN_ITEMS : {};
  }
  function rpgDrawChar() {
    if (typeof rnDrawChar !== "function") return null;
    return rnDrawChar;
  }
  function rpgWeaponAtk() {
    const s = rpgSave();
    if (!s) return 0;
    const it = rpgItems()[s.weaponId];
    return (s.baseAtk || 0) + (it && it.atk ? it.atk : 0);
  }

  /* ===== Render Profil ===== */
  function pfRender() {
    const root = $("pfBody");
    if (!root) return;
    root.innerHTML = "";

    const gdUnl = Math.max(1, pfNum("febztzy-gd-unlocked"));
    const bmxUnl = Math.max(1, pfNum("febztzy-bmx-unlocked"));
    const st = {
      gdUnl, gdDone: gdUnl - 1,
      snake: pfNum("febztzy-snake-high"),
      bb: pfNum("febztzy-bb-high"),
      sio: pfNum("febztzy-sio-high"),
      prk: pfNum("febztzy-prk-high"),
      bmxUnl, bmxDone: bmxUnl - 1,
      bmxCoins: pfNum("febztzy-bmx-coins"),
      playtime: pfNum("febztzy-playtime")
    };

    const rnSave = rpgSave();
    const lvl = (rnSave && rnSave.level) || 1;
    const xp = (rnSave && rnSave.xp) || 0;
    const need = lvl * 30;
    const pct = Math.min(100, Math.round(xp / need * 100));

    const name = getProfileName();
    const pic = getProfilePic();

    /* Hero */
    const hero = mkEl("div", "pf-hero");
    const ring = mkEl("div", "pf-ring"); ring.style.setProperty("--xp", pct);
    const inner = mkEl("div", "in");
    if (pic) { const im = document.createElement("img"); im.alt = ""; im.src = pic; inner.appendChild(im); }
    else inner.textContent = name.trim().charAt(0).toUpperCase() || "F";
    ring.appendChild(inner); hero.appendChild(ring);
    hero.appendChild(mkEl("h2", "pf-name", name));
    hero.appendChild(mkEl("div", "pf-rank", "Lv " + lvl + " • " + pfRank(lvl)));

    const xpBox = mkEl("div", "pf-xp");
    const xl = mkEl("div", "stat-label");
    xl.appendChild(mkEl("span", null, "XP menuju Lv " + (lvl + 1)));
    xl.appendChild(mkEl("span", null, xp + " / " + need));
    const xb = mkEl("div", "stat-bar");
    const xf = mkEl("div", "stat-fill xp"); xf.style.width = pct + "%"; xb.appendChild(xf);
    xpBox.appendChild(xl); xpBox.appendChild(xb); hero.appendChild(xpBox);

    let since = "-";
    try { const d = localStorage.getItem("febztzy-first-open"); if (d) since = new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { }
    hero.appendChild(mkEl("div", "pf-since", "Bergabung sejak " + since));

    const eb = mkEl("button", "hud-btn", "Edit Profil");
    eb.style.marginTop = "14px";
    eb.addEventListener("click", () => {
      const ebtn = document.getElementById("editProfileBtn");
      if (ebtn) ebtn.click();
    });
    hero.appendChild(eb);
    root.appendChild(hero);

    /* Ringkasan */
    const games = [
      { n: "Geometry Dash", c: "#ff3ec8", d: "Level terbuka " + st.gdUnl + "/40 • Selesai " + st.gdDone, p: st.gdDone / 40 * 100, on: st.gdDone > 0 },
      { n: "Snake Neon", c: "#4ade80", d: "Skor tertinggi " + fmtNum(st.snake), on: st.snake > 0 },
      { n: "Block Blast", c: "#60d4ff", d: "Skor tertinggi " + fmtNum(st.bb), on: st.bb > 0 },
      { n: "RPG NEON", c: "#ffce54", d: rnSave && rnSave.character ? ("Lv " + rnSave.level + " • " + fmtNum(rnSave.kills || 0) + " monster") : "Belum main", p: rnSave ? Math.min(100, Math.round(rnSave.level / 10 * 100)) : 0, on: !!(rnSave && rnSave.character) },
      { n: "BMX Rider", c: "#ff7a3e", d: "Level terbuka " + st.bmxUnl + "/12 • " + fmtNum(st.bmxCoins) + " koin", p: st.bmxDone / 12 * 100, on: st.bmxDone > 0 || st.bmxCoins > 0 },
      { n: "Snake Arena", c: "#8b3ffb", d: "Skor tertinggi " + fmtNum(st.sio) + " • Skin " + ((typeof SIO_SKINS !== "undefined" && SIO_SKINS[pfNum("febztzy-sio-skin")]) ? SIO_SKINS[pfNum("febztzy-sio-skin")].name : "Default"), on: st.sio > 0 },
      { n: "Parkour Runner", c: "#b458ff", d: "Skor tertinggi " + fmtNum(st.prk), on: st.prk > 0 }
    ];
    const played = games.filter(g => g.on).length;
    let favCount = 0;
    try { favCount = (JSON.parse(localStorage.getItem("febztzy-favorites") || "[]") || []).length; } catch (e) { }
    const totalScore = st.snake + st.bb + st.sio + st.prk;

    root.appendChild(mkEl("div", "sec-title", "Ringkasan"));
    const grid = mkEl("div", "pf-grid");
    [
      [played + "/" + games.length, "Game dimainkan"],
      [fmtNum(totalScore), "Total skor tertinggi"],
      [(rnSave ? fmtNum(rnSave.kills || 0) : "0"), "Monster dikalahkan"],
      [fmtDur(st.playtime), "Waktu di aplikasi"],
      [fmtNum(st.bmxCoins), "Koin BMX"],
      [favCount + "", "Game favorit"]
    ].forEach(([v, l]) => {
      const c = mkEl("div", "pf-stat");
      c.appendChild(mkEl("div", "v", v));
      c.appendChild(mkEl("div", "l", l));
      grid.appendChild(c);
    });
    root.appendChild(grid);

    /* Statistik per game */
    root.appendChild(mkEl("div", "sec-title", "Statistik per Game"));
    games.forEach(g => {
      const row = mkEl("div", "pf-row");
      const ic = mkEl("div", "pf-ic", g.n.charAt(0)); ic.style.background = g.c; ic.style.boxShadow = "0 0 14px " + g.c + "88";
      row.appendChild(ic);
      const mid = mkEl("div", "mid");
      mid.appendChild(mkEl("div", "n", g.n));
      mid.appendChild(mkEl("div", "d", g.on ? g.d : "Belum dimainkan"));
      if (g.p !== undefined && g.on) {
        const mb = mkEl("div", "pf-mini");
        const mi = document.createElement("i"); mi.style.width = Math.min(100, g.p) + "%"; mb.appendChild(mi);
        mid.appendChild(mb);
      }
      row.appendChild(mid);
      row.appendChild(mkEl("div", "tag2" + (g.on ? " on" : ""), g.on ? "Aktif" : "Baru"));
      root.appendChild(row);
    });

    /* Karakter RPG */
    root.appendChild(mkEl("div", "sec-title", "Karakter RPG NEON"));
    const ch = mkEl("div", "pf-char");
    if (rnSave && rnSave.character) {
      const cv = document.createElement("canvas"); cv.width = 90; cv.height = 116; ch.appendChild(cv);
      const draw = rpgDrawChar();
      if (draw) { try { draw(cv.getContext("2d"), 8, 8, 4, rnSave.character); } catch (e) { } }
      const info = mkEl("div", "info");
      info.appendChild(mkEl("b", null, rnSave.character.name || "Petualang"));
      const w = rpgItems()[rnSave.weaponId];
      [
        ["HP", Math.max(0, Math.round(rnSave.hp)) + "/" + rnSave.maxHp],
        ["ATK", String(rpgWeaponAtk())],
        ["Senjata", w ? w.name : "Tangan kosong"],
        ["Emas", String(rnSave.gold || 0)],
        ["Lapar / Haus", Math.round(rnSave.hunger) + "% / " + Math.round(rnSave.thirst) + "%"]
      ].forEach(([k, v]) => info.appendChild(mkEl("div", null, k + ": " + v)));
      ch.appendChild(info);
    } else {
      ch.appendChild(mkEl("div", "info", "Belum membuat karakter. Buka RPG NEON untuk membuatnya."));
    }
    root.appendChild(ch);

    /* Achievement */
    const ach = [
      { n: "Pemain Baru", d: "Mainkan 1 game", ok: played >= 1 },
      { n: "Kolektor", d: "Mainkan 4 game", ok: played >= 4 },
      { n: "Serba Bisa", d: "Mainkan semua game", ok: played >= games.length },
      { n: "Pelompat", d: "Selesaikan 10 level Geometry Dash", ok: st.gdDone >= 10 },
      { n: "Ular Neon", d: "Skor Snake Neon 200+", ok: st.snake >= 200 },
      { n: "Ahli Blok", d: "Skor Block Blast 500+", ok: st.bb >= 500 },
      { n: "Pemburu", d: "Kalahkan 20 monster", ok: (rnSave && (rnSave.kills || 0) >= 20) },
      { n: "Level 5", d: "Capai Lv 5 di RPG NEON", ok: lvl >= 5 },
      { n: "Kaya Koin", d: "Kumpulkan 100 koin BMX", ok: st.bmxCoins >= 100 },
      { n: "Raja Arena", d: "Skor Snake Arena 1000+", ok: st.sio >= 1000 },
      { n: "Pelari Kilat", d: "Skor Parkour 1500+", ok: st.prk >= 1500 },
      { n: "Penggemar Setia", d: "30 menit di aplikasi", ok: st.playtime >= 1800 }
    ];
    const got = ach.filter(a => a.ok).length;
    root.appendChild(mkEl("div", "sec-title", "Pencapaian (" + got + "/" + ach.length + ")"));
    const bg = mkEl("div", "pf-badges");
    ach.forEach(a => {
      const b = mkEl("div", "pf-badge" + (a.ok ? "" : " locked"));
      const ic = mkEl("div", "ic"); ic.innerHTML = PF_TROPHY;
      b.appendChild(ic);
      b.appendChild(mkEl("div", "bn", a.n));
      b.appendChild(mkEl("div", "bd", a.d));
      bg.appendChild(b);
    });
    root.appendChild(bg);
    root.appendChild(mkEl("div", "dev-foot", "Semua data tersimpan di perangkat ini."));
  }

  /* Re-render Profil saat modal edit ditutup */
  try {
    const editOv = document.getElementById("editProfileOverlay");
    if (editOv && window.MutationObserver) {
      new MutationObserver(function () {
        if (editOv.classList.contains("hidden")) {
          if (document.getElementById("tabProfile") && document.getElementById("tabProfile").style.display === "block") pfRender();
        }
      }).observe(editOv, { attributes: true, attributeFilter: ["class"] });
    }
  } catch (e) { }

  /* ===== Dev ===== */
  const DEV_ROLES = ["Web Developer", "Game Creator", "UI Designer", "Pemburu Bug", "Peracik Neon"];
  let devRoleIdx = 0;
  setInterval(function () {
    const tab = document.getElementById("tabDev");
    if (!tab || tab.style.display !== "block") return;
    const r = document.getElementById("devRole");
    if (!r) return;
    r.style.opacity = "0";
    setTimeout(function () {
      devRoleIdx = (devRoleIdx + 1) % DEV_ROLES.length;
      r.textContent = DEV_ROLES[devRoleIdx];
      r.style.opacity = "1";
    }, 250);
  }, 2400);

  function devCountUp(el, target) {
    if (!el) return;
    const t0 = performance.now();
    (function step(now) {
      const p = Math.min(1, (now - t0) / 900);
      el.textContent = Math.round(target * p);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  function devOnOpen() {
    const totalGames = document.querySelectorAll("#gameGrid .card").length || 25;
    const totalLevels = 40 + 40 + 12 + 20;
    devCountUp(document.getElementById("devGames"), totalGames);
    devCountUp(document.getElementById("devLevels"), totalLevels);
  }

  /* Bind tab click */
  document.addEventListener("click", function (e) {
    const t = e.target.closest && e.target.closest('.nav-item[data-tab="dev"]');
    if (!t) return;
    setTimeout(devOnOpen, 80);
  });
  document.addEventListener("click", function (e) {
    const t = e.target.closest && e.target.closest('.nav-item[data-tab="profile"]');
    if (!t) return;
    setTimeout(pfRender, 80);
  });
  document.addEventListener("click", function (e) {
    const t = e.target.closest && e.target.closest("#navProfile");
    if (!t) return;
    setTimeout(pfRender, 80);
  });

  /* Export */
  window.febzPfRender = pfRender;
  window.febzDevOnOpen = devOnOpen;

  /* Init saat DOM ready */
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { pfRender(); });
  else pfRender();
})();

/* ============================================================
   NAVIGASI BAWAH — FebzTzy
   Tab switching · active state · nav toast
   ============================================================ */
(function () {
  const NAV_TABS = {
    game: document.getElementById("hub"),
    komik: document.getElementById("tabKomik"),
    profile: document.getElementById("tabProfile"),
    dev: document.getElementById("tabDev"),
    tools: document.getElementById("tabTools")
  };
  let navCurrent = "game";
  const navEl = document.getElementById("bottomNav");
  if (!navEl) return;
  let navToastTimer = null;

  function navToast(msg) {
    const t = document.getElementById("navToast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(navToastTimer);
    navToastTimer = setTimeout(() => t.classList.remove("show"), 1800);
  }
  window.febzNavToast = navToast;

  function navSetActive(name) {
    navEl.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
    const np = document.getElementById("navProfile");
    if (np) np.classList.toggle("active", name === "profile");
  }

  function showTab(name) {
    if (!NAV_TABS[name]) name = "game";
    navCurrent = name;
    Object.keys(NAV_TABS).forEach(k => {
      const el = NAV_TABS[k];
      if (!el) return;
      el.style.display = (k === name) ? "block" : "none";
    });
    const el = NAV_TABS[name];
    if (el) {
      el.classList.remove("fade-in");
      void el.offsetWidth;
      el.classList.add("fade-in");
    }
    navSetActive(name);
    window.scrollTo(0, 0);
    if (name === "profile" && window.febzPfRender) window.febzPfRender();
    if (name === "dev" && window.febzDevOnOpen) window.febzDevOnOpen();
    if (name === "komik" && window.febzKomikOpen) window.febzKomikOpen();
    try { window.febzUpdateNav && window.febzUpdateNav(); } catch (e) { }
  }
  window.febzShowTab = showTab;

  /* Bind tombol nav-item */
  navEl.querySelectorAll(".nav-item").forEach(b => {
    b.addEventListener("click", () => {
      const tab = b.dataset.tab;
      if (tab === "komik") {
        showTab("komik");
        if (window.febzKomikOpen) setTimeout(() => window.febzKomikOpen(), 80);
      } else {
        showTab(tab);
      }
    });
  });
  const navProfile = document.getElementById("navProfile");
  if (navProfile) navProfile.addEventListener("click", () => showTab("profile"));

  /* Sinkronisasi profil di nav */
  function syncNavProfile() {
    let lvl = 1, xp = 0;
    try {
      const s = JSON.parse(localStorage.getItem("febztzy-rpg-save") || "null");
      if (s && s.level) { lvl = s.level; xp = s.xp || 0; }
    } catch (e) { }
    const pct = Math.min(100, Math.round(xp / (lvl * 30) * 100));
    const np = document.getElementById("navProfile");
    if (np) np.style.setProperty("--xp", pct);
    const lv = document.getElementById("navLv");
    if (lv) lv.textContent = "Lv " + lvl;
    const pic = (function () { try { return localStorage.getItem("febztzy-profile-pic"); } catch (e) { return null; } })();
    let ini = "F";
    try { ini = ((localStorage.getItem("febztzy-profile-name") || "FebzTzy").trim().charAt(0).toUpperCase()) || "F"; } catch (e) { }
    const av = document.getElementById("navAvatar");
    if (av) {
      const key = pic ? "p:" + pic.length + ":" + pic.slice(-24) : "t:" + ini;
      if (av.dataset.key !== key) {
        av.dataset.key = key;
        av.innerHTML = "";
        if (pic) { const im = document.createElement("img"); im.alt = ""; im.src = pic; av.appendChild(im); }
        else av.textContent = ini;
      }
    }
  }
  syncNavProfile();
  setInterval(syncNavProfile, 4000);

  /* Cek apakah nav boleh tampil */
  function navShouldShow() {
    if (document.body.classList.contains("game-open")) return false;
    const sp = document.getElementById("splash");
    if (sp && sp.style.display !== "none" && getComputedStyle(sp).display !== "none") return false;
    const reg = document.getElementById("registerScreen");
    if (reg && reg.style.display && reg.style.display !== "none") return false;
    const appIds = ["gameApp", "snakeApp", "blockApp", "rpgApp", "bmxApp", "sioApp", "prkApp", "ludoApp", "zenApp", "beatApp", "drumApp", "subApp", "msApp", "farmApp", "physApp", "paintApp", "chessApp", "hackApp", "slashApp", "neoApp", "unoApp", "iqApp", "sharkApp", "bldApp"];
    for (let i = 0; i < appIds.length; i++) {
      const a = document.getElementById(appIds[i]);
      if (a && a.style.display && a.style.display !== "none") return false;
    }
    return true;
  }

  function updateNav() {
    const show = navShouldShow();
    navEl.style.display = show ? "block" : "none";
    document.body.classList.toggle("has-nav", show);
  }
  window.febzUpdateNav = updateNav;

  /* MutationObserver untuk sinkronisasi otomatis */
  if (window.MutationObserver) {
    const obs = new MutationObserver(() => { try { updateNav(); } catch (e) { } });
    const watchIds = ["splash", "registerScreen", "hub", "tabTools", "tabDev", "tabProfile", "tabKomik", "gameApp", "snakeApp", "blockApp", "rpgApp", "bmxApp", "sioApp", "prkApp", "ludoApp", "zenApp", "beatApp", "drumApp", "subApp", "msApp", "farmApp", "physApp", "paintApp", "chessApp", "hackApp", "slashApp", "neoApp", "unoApp", "iqApp", "sharkApp", "bldApp"];
    watchIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) obs.observe(el, { attributes: true, attributeFilter: ["style", "class"] });
    });
  }

  /* Interval fallback */
  setInterval(function () {
    try {
      if (document.hidden) return;
      updateNav();
    } catch (e) { }
  }, 3000);

  /* Tampilkan tab default saat pertama load */
  updateNav();
  setTimeout(function () {
    if (navCurrent === "game" && NAV_TABS.game) {
      NAV_TABS.game.style.display = "block";
      navSetActive("game");
    }
  }, 2600);

  /* Init nav toast */
  const nt = document.getElementById("navToast");
  if (nt) nt.textContent = "Mode: Geser";
})();

/* ============================================================
   MASKOT PIKSEL — FebzTzy
   Karakter 32x32 digambar ulang ke canvas 512x512, bisa digeser,
   diklik, ngasih bubble chat, dan bisa duduk di pinggir layar.
   ============================================================ */
(function () {
  /* ===== Konfigurasi maskot ===== */
  let MASCOT_IMG = "https://u.pone.rs/zttjwitl.jpg";
  let MOOD = {
    normal: "https://u.pone.rs/zttjwitl.jpg",
    press: "https://u.pone.rs/glngglih.jpg",
    drag: "https://u.pone.rs/jzclkppx.jpg",
    idle: "https://u.pone.rs/emnfjiim.jpg",
    side: "https://u.pone.rs/qoendkvr.jpg"
  };
  let NUDGE_TEXT = "serius ga mau chat sama febz?";
  let PRESS_TEXT = "mau chat sama aku? yey";
  const SIZE = 96, EDGE = 40, KEY = "febztzy-mascot";

  /* Bersihkan maskot duplikat dari DOM */
  try {
    document.querySelectorAll(".mascot, .mc-bubble").forEach(n => n.remove());
  } catch (e) { }

  /* ===== Buat elemen ===== */
  const root = document.createElement("div");
  root.className = "mascot"; root.id = "mascot";
  root.setAttribute("aria-label", "Maskot FebzTzy");
  const inner = document.createElement("div"); inner.className = "mc-in"; root.appendChild(inner);
  const fl = document.createElement("div"); fl.className = "mc-fl"; inner.appendChild(fl);
  const cv = document.createElement("canvas");
  cv.width = 512; cv.height = 512;
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  fl.appendChild(cv);

  const bub = document.createElement("button");
  bub.type = "button"; bub.className = "mc-bubble";
  const b1 = document.createElement("b"); b1.textContent = "mau chat sama aku? yey";
  const b2 = document.createElement("small"); b2.textContent = "pencet text ini";
  bub.appendChild(b1); bub.appendChild(b2);
  document.body.appendChild(root);
  document.body.appendChild(bub);

  /* ===== Kelola gambar foto ===== */
  let im = null, photoUrl = null;
  let mood = "normal", moodTm = null, idleTm = null, nudgeTm = null, lastInteract = Date.now();
  const moodCache = {};

  function preloadMoods() {
    Object.keys(MOOD).forEach(k => {
      if (k === "normal") return;
      const g = new Image(); g.referrerPolicy = "no-referrer"; g.src = MOOD[k]; moodCache[k] = g;
    });
  }
  preloadMoods();

  function onlyOneImg(keep) {
    try {
      const imgs = fl.querySelectorAll("img");
      imgs.forEach(n => { if (keep && n === keep) return; n.remove(); });
      if (keep && !fl.contains(keep)) fl.appendChild(keep);
      if (fl.querySelector("img")) cv.style.display = "none";
    } catch (e) { }
  }

  function purgeExtraMascots() {
    try {
      document.querySelectorAll("body > .mascot").forEach(el => { if (el !== root) el.remove(); });
      document.querySelectorAll("body > .mc-bubble").forEach((el, i) => { if (i > 0) el.remove(); });
    } catch (e) { }
  }

  /* Coba muat foto maskot */
  (function () {
    if (!MASCOT_IMG) return;
    function use(u) {
      const g = document.createElement("img");
      g.alt = ""; g.draggable = false; g.referrerPolicy = "no-referrer";
      g.onload = function () {
        im = g; photoUrl = u;
        cv.style.display = "none";
        onlyOneImg(g);
        root.classList.add("photo");
        render();
      };
      g.src = u;
    }
    const t = new Image(); t.crossOrigin = "anonymous"; t.referrerPolicy = "no-referrer";
    t.onload = () => { let u = MASCOT_IMG; use(u); };
    t.onerror = () => { const t2 = new Image(); t2.referrerPolicy = "no-referrer"; t2.onload = () => use(MASCOT_IMG); t2.src = MASCOT_IMG; };
    t.src = MASCOT_IMG;
  })();

  /* ===== Suara ===== */
  function ensureAudio() {
    try {
      if (!window.__febzAudioCtx) window.__febzAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (window.__febzAudioCtx.state === "suspended") window.__febzAudioCtx.resume();
      return window.__febzAudioCtx;
    } catch (e) { return null; }
  }
  function tone(freq, dur, type, vol) {
    const c = ensureAudio(); if (!c) return;
    try {
      const t0 = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(vol || 0.05, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur);
    } catch (e) { }
  }

  /* ===== Mood / pose ===== */
  function glitchOnce() {
    root.classList.remove("mc-glitch");
    void root.offsetWidth;
    root.classList.add("mc-glitch");
    setTimeout(() => root.classList.remove("mc-glitch"), 420);
  }
  function setMood(next, opts) {
    opts = opts || {};
    if (next === mood && !opts.force) return;
    mood = next;
    const url = MOOD[next] || MOOD.normal;
    glitchOnce();
    onlyOneImg(fl.querySelector("img"));
    const img = fl.querySelector("img");
    if (img) {
      img.classList.toggle("mc-wave-side", next === "side");
      img.style.opacity = "0.55";
      const done = () => { img.style.opacity = "1"; };
      const onload = () => { img.removeEventListener("load", onload); done(); };
      img.addEventListener("load", onload);
      img.src = url;
      setTimeout(done, 500);
    } else {
      const g = document.createElement("img");
      g.alt = ""; g.draggable = false; g.referrerPolicy = "no-referrer";
      g.onload = function () { im = g; photoUrl = url; cv.style.display = "none"; onlyOneImg(g); root.classList.add("photo"); };
      g.src = url;
    }
    root.classList.toggle("mood-side", next === "side");
    if (next === "side") {
      root.classList.add("a-wave");
      setTimeout(() => root.classList.remove("a-wave"), 2000);
    }
  }

  function touchInteract() {
    lastInteract = Date.now();
    clearTimeout(idleTm); clearTimeout(nudgeTm); clearTimeout(moodTm);
  }

  function scheduleIdle() {
    clearTimeout(idleTm); clearTimeout(nudgeTm);
    if (!visible || dragging) return;
    idleTm = setTimeout(function () {
      if (!visible || dragging) return;
      if (dock) setMood("side");
      else setMood("idle");
      clearTimeout(moodTm);
      moodTm = setTimeout(function () {
        if (dragging) return;
        if (dock) setMood("side");
        else setMood("normal");
      }, 4000);
    }, 3000);
    nudgeTm = setTimeout(function tickNudge() {
      if (!visible || dragging) { scheduleIdle(); return; }
      showNudgeBubble();
      nudgeTm = setTimeout(tickNudge, 5000);
    }, 5000);
  }

  let bt = null;
  function hideBubble() { clearTimeout(bt); bub.classList.remove("show"); }
  function showNudgeBubble() {
    if (!bub) return;
    const vw = window.innerWidth, w = Math.min(200, vw - 16);
    const cx = dock === "L" ? 16 : (dock === "R" ? vw - 16 : x + SIZE / 2);
    const left = Math.min(vw - w - 8, Math.max(8, cx - w / 2));
    bub.style.width = w + "px"; bub.style.left = left + "px";
    bub.style.setProperty("--tx", Math.min(w - 18, Math.max(18, cx - left)) + "px");
    const above = y - 68 >= 58;
    bub.classList.toggle("below", !above);
    bub.style.top = (above ? y - 68 : y + (dock ? 56 : SIZE) + 8) + "px";
    bub.classList.add("nudge", "show");
    b1.textContent = NUDGE_TEXT;
    b2.textContent = "";
    clearTimeout(bt);
    bt = setTimeout(function () { hideBubble(); bub.classList.remove("nudge"); }, 2200);
  }
  function showPressBubble() {
    if (!bub) return;
    const vw = window.innerWidth, w = Math.min(200, vw - 16);
    const cx = dock === "L" ? 16 : (dock === "R" ? vw - 16 : x + SIZE / 2);
    const left = Math.min(vw - w - 8, Math.max(8, cx - w / 2));
    bub.style.width = w + "px"; bub.style.left = left + "px";
    bub.style.setProperty("--tx", Math.min(w - 18, Math.max(18, cx - left)) + "px");
    const above = y - 68 >= 58;
    bub.classList.toggle("below", !above);
    bub.style.top = (above ? y - 68 : y + (dock ? 56 : SIZE) + 8) + "px";
    bub.classList.remove("nudge");
    bub.classList.add("show");
    b1.textContent = PRESS_TEXT;
    b2.textContent = "pencet text ini";
    clearTimeout(bt);
    bt = setTimeout(hideBubble, 5500);
  }
  bub.addEventListener("click", () => {
    hideBubble();
    if (window.agyOpenAI) window.agyOpenAI();
    else if (window.febzNavToast) window.febzNavToast("Buka AI di menu");
    tone(660, 0.08, "sine", 0.06);
  });
  document.addEventListener("pointerdown", e => {
    if (!bub.contains(e.target) && !root.contains(e.target)) hideBubble();
  }, true);

  /* ===== Sprite piksel 32x32 ===== */
  const sc = document.createElement("canvas"); sc.width = sc.height = 32;
  const sx = sc.getContext("2d");
  const oc = document.createElement("canvas"); oc.width = oc.height = 32;
  const ox = oc.getContext("2d");
  const HAIR = "#7a5cff", HAIR2 = "#a893ff", SKIN = "#ffd9bf",
    HOOD = "#ff8a3d", HOOD2 = "#d9661f", SHORT = "#2b2f4a",
    BOOT = "#1b1d2e", EYE = "#1b1020", BLUSH = "#ff9fb0", CLIP = "#ffe14d";

  function drawChar(st) {
    sx.clearRect(0, 0, 32, 32);
    const F = (x, y, w, h, c) => { sx.fillStyle = c; sx.fillRect(x, y, w, h); };
    const R = (x, y, w, h, c) => F(x, y + st.bob, w, h, c);
    F(12, 27, 3, 3, SKIN); F(17, 27, 3, 3, SKIN);
    F(11, 30, 5, 2, BOOT); F(16, 30, 5, 2, BOOT);
    F(11, 24, 10, 3, SHORT);
    R(10, 16, 12, 8, HOOD); R(10, 22, 12, 2, HOOD2); R(15, 17, 1, 3, "#fff0e0");
    R(7, 17, 3, 6, HOOD); R(7, 23, 3, 2, SKIN);
    if (st.arm === 0) { R(22, 17, 3, 6, HOOD); R(22, 23, 3, 2, SKIN); }
    else if (st.arm === 1) { R(22, 16, 3, 2, HOOD); R(24, 12, 3, 5, HOOD); R(24, 9, 3, 3, SKIN); }
    else { R(22, 16, 3, 2, HOOD); R(24, 14, 2, 3, HOOD); R(25, 12, 2, 3, HOOD); R(26, 9, 3, 3, SKIN); }
    R(8, 3, 16, 13, HAIR); R(10, 3, 7, 1, HAIR2); R(15, 1, 2, 2, HAIR);
    R(10, 9, 12, 7, SKIN);
    R(10, 8, 12, 2, HAIR); R(10, 10, 3, 1, HAIR); R(19, 10, 3, 1, HAIR);
    if (!st.blink) { R(12, 11, 2, 3, EYE); R(18, 11, 2, 3, EYE); R(12, 11, 1, 1, "#ffffff"); R(18, 11, 1, 1, "#ffffff"); }
    else { R(12, 13, 2, 1, EYE); R(18, 13, 2, 1, EYE); }
    R(11, 14, 2, 1, BLUSH); R(19, 14, 2, 1, BLUSH);
    if (st.arm > 0) R(15, 14, 2, 2, "#c0392b"); else R(15, 14, 2, 1, "#c0392b");
    R(20, 5, 2, 2, CLIP);
    const d = sx.getImageData(0, 0, 32, 32), a = d.data, out = ox.createImageData(32, 32), o = out.data;
    o.set(a);
    const op = (x, y) => x >= 0 && y >= 0 && x < 32 && y < 32 && a[(y * 32 + x) * 4 + 3] > 0;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      if (!op(x, y) && (op(x + 1, y) || op(x - 1, y) || op(x, y + 1) || op(x, y - 1))) {
        const k = (y * 32 + x) * 4;
        o[k] = 30; o[k + 1] = 16; o[k + 2] = 32; o[k + 3] = 255;
      }
    }
    ox.putImageData(out, 0, 0);
    ctx.clearRect(0, 0, 512, 512);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(oc, 0, 0, 512, 512);
  }

  /* ===== Keadaan posisi ===== */
  let dock = "R";
  let x = 8, y = Math.round(window.innerHeight * 0.55);
  let visible = false, dragging = false;
  let frame = 0, act = null, actEnd = 0, blinkOn = false, lastKey = "", tm = null, iv = null;

  try {
    const sv = JSON.parse(localStorage.getItem(KEY) || "null");
    if (sv) {
      dock = (sv.d === "L" || sv.d === "R") ? sv.d : null;
      if (typeof sv.x === "number") x = sv.x;
      if (typeof sv.y === "number") y = sv.y;
    }
  } catch (e) { }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ d: dock, x: x, y: y })); } catch (e) { }
  }
  function clampY(v) {
    const lo = 56, hi = Math.max(lo, window.innerHeight - 98 - SIZE);
    return Math.min(hi, Math.max(lo, v));
  }
  function place() {
    y = clampY(y);
    const vw = window.innerWidth;
    root.classList.toggle("docked", !!dock);
    root.classList.toggle("flip", dock === "R");
    let left;
    if (dock === "L") left = -40;
    else if (dock === "R") left = vw - 56;
    else { x = Math.min(vw - SIZE, Math.max(0, x)); left = x; }
    root.style.left = left + "px"; root.style.top = y + "px";
    root.style.height = dock ? "96px" : "";
    root.style.overflow = dock ? "visible" : "";
  }

  /* ===== Animasi ===== */
  function waving() { return (act === "wave" && Date.now() < actEnd) || dragging; }
  function render() {
    if (photoUrl) return;
    const w = waving();
    const arm = w ? 1 + (frame % 2) : 0;
    const bob = (!w && frame % 4 >= 2) ? 1 : 0;
    const key = arm + "|" + bob + "|" + (blinkOn ? 1 : 0);
    if (key === lastKey) return;
    lastKey = key;
    drawChar({ arm: arm, bob: bob, blink: blinkOn });
  }
  function tick() {
    if (!visible || document.hidden) return;
    frame++;
    blinkOn = Math.random() < 0.1;
    render();
  }
  function hop() {
    root.classList.remove("hop");
    void root.offsetWidth;
    root.classList.add("hop");
    setTimeout(() => root.classList.remove("hop"), 650);
  }
  function doAct(k) {
    ["a-wave", "a-wiggle", "a-spin"].forEach(c => root.classList.remove(c));
    if (k === "hop") { hop(); return; }
    if (k === "wave") { act = "wave"; actEnd = Date.now() + 1900; }
    void root.offsetWidth;
    root.classList.add("a-" + k);
    setTimeout(() => root.classList.remove("a-" + k), k === "spin" ? 1000 : 1900);
    render();
  }
  function schedule() {
    clearTimeout(tm);
    tm = setTimeout(function () {
      if (visible && !dragging && !document.hidden) {
        if (dock) doAct("wave");
        else doAct(["wave", "hop", "wiggle", "spin", "wave"][Math.floor(Math.random() * 5)]);
      }
      schedule();
    }, 3500 + Math.random() * 2500);
  }

  /* ===== Drag / tap ===== */
  let sx0 = 0, sy0 = 0, offX = 0, offY = 0, moved = false, pid = null;
  root.addEventListener("pointerdown", e => {
    if (pid !== null) return;
    pid = e.pointerId;
    moved = false;
    const r = root.getBoundingClientRect();
    sx0 = e.clientX; sy0 = e.clientY; offX = e.clientX - r.left; offY = e.clientY - r.top;
    try { root.setPointerCapture(pid); } catch (err) { }
    touchInteract();
    if (!dock) setMood("press");
  });
  root.addEventListener("pointermove", e => {
    if (e.pointerId !== pid) return;
    if (!moved && Math.hypot(e.clientX - sx0, e.clientY - sy0) < 6) return;
    if (!moved) {
      moved = true; dragging = true; hideBubble();
      if (dock) dock = null;
      root.classList.add("drag");
      root.classList.remove("docked", "flip");
      setMood("drag");
    }
    touchInteract();
    x = Math.min(window.innerWidth - SIZE, Math.max(0, e.clientX - offX));
    y = clampY(e.clientY - offY);
    root.style.left = x + "px";
    root.style.top = y + "px";
    render();
  });
  function up(e) {
    if (e.pointerId !== pid) return;
    try { root.releasePointerCapture(pid); } catch (err) { }
    pid = null;
    root.classList.remove("drag");
    if (moved) {
      dragging = false;
      const cx = x + SIZE / 2;
      if (cx < EDGE + SIZE / 2 - 20) dock = "L";
      else if (cx > window.innerWidth - (EDGE + SIZE / 2 - 20)) dock = "R";
      else dock = null;
      place(); save(); render();
      if (dock) setMood("side");
      else setMood("normal");
      touchInteract(); scheduleIdle();
    } else if (dock) {
      const vw = window.innerWidth;
      x = (dock === "L") ? 8 : vw - SIZE - 8;
      dock = null; place(); save(); hop();
      act = "wave"; actEnd = Date.now() + 1800; render();
      showPressBubble();
      setMood("normal");
      touchInteract(); scheduleIdle();
    } else {
      act = "wave"; actEnd = Date.now() + 1800;
      hop(); render(); showPressBubble();
      setMood("press");
      clearTimeout(moodTm);
      moodTm = setTimeout(() => { if (!dragging) setMood("normal"); }, 900);
      touchInteract(); scheduleIdle();
    }
  }
  root.addEventListener("pointerup", up);
  root.addEventListener("pointercancel", up);
  window.addEventListener("resize", () => { place(); });

  /* ===== Show / hide ===== */
  window.febzMascotShow = function (show) {
    visible = !!show;
    root.style.display = show ? "block" : "none";
    if (show) {
      purgeExtraMascots();
      onlyOneImg(fl.querySelector("img"));
      place(); render();
      if (!iv) iv = setInterval(tick, 380);
      schedule();
      if (dock) setMood("side");
      else setMood("normal");
      touchInteract(); scheduleIdle();
    } else {
      clearTimeout(tm); clearTimeout(idleTm); clearTimeout(nudgeTm); clearTimeout(moodTm);
      hideBubble();
      if (iv) { clearInterval(iv); iv = null; }
    }
  };

  window.febzMascotSetPack = function (pack) {
    if (!pack || !pack.mood) return;
    MOOD = Object.assign({}, pack.mood);
    MASCOT_IMG = pack.mood.normal || MASCOT_IMG;
    if (pack.nudge) NUDGE_TEXT = pack.nudge;
    if (pack.press) PRESS_TEXT = pack.press;
    preloadMoods();
    try {
      const img = fl.querySelector("img");
      if (img) {
        root.classList.remove("mc-glitch");
        void root.offsetWidth;
        root.classList.add("mc-glitch");
        setTimeout(() => root.classList.remove("mc-glitch"), 420);
        img.src = MOOD.normal;
        photoUrl = MOOD.normal;
      } else {
        const g = document.createElement("img");
        g.alt = ""; g.draggable = false; g.referrerPolicy = "no-referrer";
        g.onload = function () { im = g; photoUrl = MOOD.normal; cv.style.display = "none"; onlyOneImg(g); root.classList.add("photo"); };
        g.src = MOOD.normal;
      }
      mood = "normal";
    } catch (e) { }
  };

  window.febzMascotPhoto = function () { return !!photoUrl; };
  window.febzMascotHead = function () {
    if (MOOD && MOOD.normal) return MOOD.normal;
    if (photoUrl) return photoUrl;
    try {
      drawChar({ arm: 0, bob: 0, blink: false });
      const c = document.createElement("canvas"); c.width = c.height = 192;
      const k = c.getContext("2d"); k.imageSmoothingEnabled = false;
      k.drawImage(oc, 4, 0, 24, 20, 0, 0, 192, 160);
      lastKey = ""; render();
      return c.toDataURL("image/png");
    } catch (e) { return photoUrl || ""; }
  };
  window.febzMascotNormal = function () { return (MOOD && MOOD.normal) || photoUrl || ""; };

  place();
})();

/* ============================================================
   LIVE LATENCY MONITOR — FebzTzy
   Gauge · grafik realtime · target ukur · info jaringan · verdict
   ============================================================ */
(function () {
  if (window.__febzLatInit) return;
  window.__febzLatInit = true;

  /* ===== Target ukur ===== */
  const TG = [
    { id: "cf", name: "Cloudflare", host: "1.1.1.1", url: "https://1.1.1.1/cdn-cgi/trace", c: "#f6a04d" },
    { id: "gg", name: "Google", host: "google.com", url: "https://www.google.com/generate_204", c: "#60a5fa" },
    { id: "xr", name: "API Xrina", host: "apiii-xrina.my.id", url: "https://apiii-xrina.my.id/", c: "#ff3ec8", hide: 1 },
    { id: "sy", name: "API Synox", host: "api.synoxcloud.xyz", url: "https://api.synoxcloud.xyz/", c: "#a78bfa", hide: 1 }
  ];
  if (/^https?:$/.test(location.protocol)) {
    TG.push({ id: "self", name: "Server Web", host: location.host, url: location.origin + "/", c: "#4ade80" });
  }

  const MAXH = 60, TIMEOUT = 4000, ARC = 339.29, CIRC = 452.39;
  const hist = {};
  TG.forEach(t => { hist[t.id] = []; });
  let sel = "cf";
  let running = true;
  let every = 1500;
  let timer = null;
  let busy = false;
  let isOpen = false;
  let built = false;

  const $ = id => document.getElementById(id);
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function hostHtml(t) { return t.hide ? '<span class="lt-hide">' + esc(t.host) + '</span>' : esc(t.host); }

  function qual(ms) {
    if (ms == null) return { t: "Terputus", c: "#ff4d5e", n: 0 };
    if (ms < 60) return { t: "Sangat Lancar", c: "#4ade80", n: 4 };
    if (ms < 120) return { t: "Lancar", c: "#22d3ee", n: 3 };
    if (ms < 250) return { t: "Cukup", c: "#ffce54", n: 2 };
    return { t: "Lambat", c: "#ff4d5e", n: 1 };
  }
  function stats(arr) {
    const v = arr.filter(x => x != null);
    const o = { v: v, total: arr.length, loss: arr.length - v.length, avg: 0, min: 0, max: 0, jit: 0, last: arr.length ? arr[arr.length - 1] : undefined };
    if (v.length) {
      let s = 0, mn = 1e9, mx = 0;
      v.forEach(x => { s += x; if (x < mn) mn = x; if (x > mx) mx = x; });
      o.avg = s / v.length; o.min = mn; o.max = mx;
      if (v.length > 1) { let d = 0; for (let i = 1; i < v.length; i++) d += Math.abs(v[i] - v[i - 1]); o.jit = d / (v.length - 1); }
    }
    return o;
  }

  /* ===== Build UI ===== */
  function build() {
    if (built) return;
    built = true;

    const fab = document.createElement("button");
    fab.type = "button"; fab.className = "lat-fab"; fab.id = "latFab";
    fab.setAttribute("aria-label", "Live Latency Monitor"); fab.title = "Live Latency Monitor";
    fab.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l2.5-7 4 14 2.5-7H21"/></svg>';
    document.body.appendChild(fab);
    fab.addEventListener("click", e => {
      e.preventDefault(); e.stopPropagation();
      try { if (window.agyMenuHide) window.agyMenuHide(); } catch (err) { }
      open();
    });

    const page = document.createElement("div");
    page.id = "latPage";
    page.setAttribute("aria-hidden", "true");

    let ticks = "";
    for (let i = 0; i <= 10; i++) {
      const a = (135 + 27 * i) * Math.PI / 180;
      const x1 = 90 + 82 * Math.cos(a), y1 = 90 + 82 * Math.sin(a);
      const x2 = 90 + 89 * Math.cos(a), y2 = 90 + 89 * Math.sin(a);
      ticks += '<line class="lt-tick" x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '"/>';
    }

    page.innerHTML =
      '<div class="lt-head">' +
        '<button type="button" class="lt-back" id="latBack" aria-label="Kembali"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>' +
        '<div class="lt-tt"><b>Live Latency Monitor</b><span><i class="lt-dot" id="latDot"></i><em id="latState">LIVE</em><em>-</em><em id="latTgName">Cloudflare</em></span></div>' +
        '<button type="button" class="lt-ico" id="latToggle" aria-label="Jeda"><svg viewBox="0 0 24 24" id="latToggleIc"><path d="M8 5v14M16 5v14"/></svg></button>' +
      '</div>' +
      '<div class="lt-body">' +
        '<section class="lt-card lt-hero">' +
          '<div class="lt-gauge">' +
            '<svg viewBox="0 0 180 180" aria-hidden="true">' +
              '<defs><linearGradient id="ltGrad" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#22d3ee"/><stop offset=".55" stop-color="#8b3ffb"/><stop offset="1" stop-color="#ff3ec8"/></linearGradient></defs>' +
              ticks +
              '<circle class="lt-track" cx="90" cy="90" r="72" transform="rotate(135 90 90)" stroke-dasharray="' + ARC + ' ' + CIRC + '"/>' +
              '<circle class="lt-arc" id="latArc" cx="90" cy="90" r="72" transform="rotate(135 90 90)" stroke-dasharray="0 ' + CIRC + '"/>' +
            '</svg>' +
            '<div class="lt-read"><strong id="latMs">--</strong><small>milidetik</small><span class="lt-q" id="latQ">Mengukur</span></div>' +
          '</div>' +
          '<div class="lt-hero-row"><div class="lt-signal" id="latSig"><i></i><i></i><i></i><i></i></div><span id="latSub">Menunggu sampel pertama</span></div>' +
        '</section>' +
        '<section class="lt-card">' +
          '<div class="lt-ct"><b>Grafik realtime</b><span id="latRange">0 sampel</span></div>' +
          '<svg class="lt-chart" id="latChart" viewBox="0 0 300 120"></svg>' +
        '</section>' +
        '<section class="lt-grid3" id="latStats"></section>' +
        '<section class="lt-card">' +
          '<div class="lt-ct"><b>Target ukur</b><span>ketuk untuk memilih</span></div>' +
          '<div class="lt-rows" id="latRows"></div>' +
        '</section>' +
        '<section class="lt-card"><div class="lt-ct"><b>Info jaringan</b><span id="latNetState"></span></div><div class="lt-grid3" id="latNet"></div></section>' +
        '<section class="lt-card lt-verdict" id="latVerdict"></section>' +
        '<div class="lt-actions">' +
          '<button type="button" class="lt-chip" data-ev="1000">1 dtk</button>' +
          '<button type="button" class="lt-chip on" data-ev="1500">1.5 dtk</button>' +
          '<button type="button" class="lt-chip" data-ev="3000">3 dtk</button>' +
          '<span class="lt-sp"></span>' +
          '<button type="button" class="lt-chip ghost" id="latReset">Reset</button>' +
          '<button type="button" class="lt-chip" id="latCopy">Salin laporan</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(page);

    /* Bind */
    $("latBack").addEventListener("click", close);
    $("latToggle").addEventListener("click", () => { running = !running; loop(); render(); });
    $("latReset").addEventListener("click", () => { TG.forEach(t => { hist[t.id] = []; }); render(); if (running && isOpen) tick(); });
    $("latCopy").addEventListener("click", copyReport);
    $("latRows").addEventListener("click", e => {
      const b = e.target.closest(".lt-row"); if (!b) return;
      sel = b.getAttribute("data-id"); render();
    });
    page.querySelectorAll(".lt-chip[data-ev]").forEach(b => {
      b.addEventListener("click", () => {
        every = parseInt(b.getAttribute("data-ev"), 10) || 1500;
        page.querySelectorAll(".lt-chip[data-ev]").forEach(x => x.classList.toggle("on", x === b));
        loop();
      });
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && isOpen) close(); });
    window.addEventListener("online", () => { if (isOpen) { render(); if (running) tick(); } });
    window.addEventListener("offline", () => { if (isOpen) render(); });
    document.addEventListener("visibilitychange", () => { if (isOpen && running && !document.hidden) tick(); });
  }

  /* ===== Ukur ===== */
  function measure(t) {
    return new Promise(res => {
      const ac = ("AbortController" in window) ? new AbortController() : null;
      let done = false;
      function fin(v) { if (done) return; done = true; clearTimeout(to); res(v); }
      const to = setTimeout(() => { try { if (ac) ac.abort(); } catch (e) { } fin(null); }, TIMEOUT);
      const t0 = performance.now();
      const url = t.url + (t.url.indexOf("?") > -1 ? "&" : "?") + "_lt=" + Date.now();
      try {
        fetch(url, { method: "HEAD", mode: "no-cors", cache: "no-store", referrerPolicy: "no-referrer", signal: ac ? ac.signal : undefined })
          .then(() => { fin(Math.max(1, Math.round(performance.now() - t0))); })
          .catch(() => { fin(null); });
      } catch (e) { fin(null); }
    });
  }
  function tick() {
    if (busy || !isOpen || document.hidden) return;
    busy = true;
    Promise.all(TG.map(measure)).then(res => {
      TG.forEach((t, i) => {
        const h = hist[t.id]; h.push(res[i]); if (h.length > MAXH) h.shift();
      });
      busy = false;
      render();
    }).catch(() => { busy = false; });
  }
  function loop() {
    clearInterval(timer); timer = null;
    if (running && isOpen) { tick(); timer = setInterval(tick, every); }
  }

  /* ===== Render grafik ===== */
  function renderChart(arr, col) {
    const svg = $("latChart"); if (!svg) return;
    const W = 300, H = 120, padL = 26, padB = 6, padT = 8;
    const cw = W - padL - 4, ch = H - padB - padT;
    const st = stats(arr);
    const ymax = Math.max(100, Math.ceil((st.max || 0) * 1.25 / 50) * 50);
    const step = cw / (MAXH - 1), off = MAXH - arr.length;
    function X(i) { return padL + (off + i) * step; }
    function Y(v) { return padT + ch - (v / ymax) * ch; }
    let s = '<defs><linearGradient id="ltFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".42"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>';
    for (let g = 0; g <= 3; g++) {
      const gy = padT + ch * g / 3, lab = Math.round(ymax * (1 - g / 3));
      s += '<line x1="' + padL + '" x2="' + (W - 4) + '" y1="' + gy.toFixed(1) + '" y2="' + gy.toFixed(1) + '" stroke="rgba(255,255,255,0.09)" stroke-dasharray="3 4"/>';
      s += '<text x="' + (padL - 4) + '" y="' + (gy + 3).toFixed(1) + '" fill="#a89bcf" font-size="8" text-anchor="end">' + lab + '</text>';
    }
    let line = "", area = "", seg = [], lastPt = null;
    function flush() {
      if (!seg.length) return;
      let d = "";
      seg.forEach((p, k) => { d += (k ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1) + " "; });
      line += '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
      area += '<path d="' + d + 'L' + seg[seg.length - 1][0].toFixed(1) + ' ' + (padT + ch) + ' L' + seg[0][0].toFixed(1) + ' ' + (padT + ch) + ' Z" fill="url(#ltFill)"/>';
      seg = [];
    }
    let loss = "";
    arr.forEach((v, i) => {
      if (v == null) { flush(); loss += '<rect x="' + (X(i) - 1.5).toFixed(1) + '" y="' + padT + '" width="3" height="' + ch + '" fill="#ff4d5e" opacity=".28"/>'; }
      else { const p = [X(i), Y(v)]; seg.push(p); lastPt = p; }
    });
    flush();
    s += loss + area + line;
    if (lastPt && arr[arr.length - 1] != null) {
      s += '<circle cx="' + lastPt[0].toFixed(1) + '" cy="' + lastPt[1].toFixed(1) + '" r="6" fill="' + col + '" opacity=".22"/><circle cx="' + lastPt[0].toFixed(1) + '" cy="' + lastPt[1].toFixed(1) + '" r="3" fill="#fff" stroke="' + col + '" stroke-width="1.5"/>';
    }
    if (!arr.length) s += '<text x="' + (W / 2) + '" y="' + (H / 2) + '" fill="#a89bcf" font-size="10" text-anchor="middle">Mengumpulkan data...</text>';
    svg.innerHTML = s;
  }

  /* ===== Helper render ===== */
  function tile(label, val, unit, ac) {
    return '<div class="lt-tile" style="--ac:' + ac + '"><label>' + label + '</label><b>' + val + (unit ? '<small>' + unit + '</small>' : '') + '</b></div>';
  }
  function fmt(n) { return n >= 100 ? String(Math.round(n)) : n.toFixed(n >= 10 ? 0 : 1); }

  /* ===== Render utama ===== */
  function render() {
    if (!built) return;
    const tg = TG.filter(t => t.id === sel)[0] || TG[0];
    const arr = hist[tg.id], st = stats(arr);
    const cur = st.last, q = qual(cur);
    const hasData = arr.length > 0;

    $("latTgName").textContent = tg.name;
    $("latState").textContent = running ? "LIVE" : "JEDA";
    $("latDot").classList.toggle("off", !running);
    $("latToggleIc").innerHTML = running ? '<path d="M8 5v14M16 5v14"/>' : '<path d="M7 5l12 7-12 7z"/>';
    $("latToggle").setAttribute("aria-label", running ? "Jeda" : "Lanjut");

    const ms = $("latMs");
    ms.textContent = hasData ? (cur == null ? "--" : String(cur)) : "--";
    ms.style.color = hasData ? q.c : "#f4eeff";
    const qq = $("latQ"); qq.textContent = hasData ? q.t : "Mengukur"; qq.style.color = hasData ? q.c : "#a89bcf";
    const ratio = cur == null ? 0 : Math.min(1, Math.max(0.03, cur / 300));
    $("latArc").style.strokeDasharray = (ARC * ratio).toFixed(1) + " " + CIRC;
    const sig = $("latSig").children;
    for (let i = 0; i < 4; i++) sig[i].style.background = (hasData && i < q.n) ? q.c : "";
    $("latSub").innerHTML = hasData ? (hostHtml(tg) + " - " + st.total + " sampel") : "Menunggu sampel pertama";
    $("latRange").textContent = st.total + " / " + MAXH + " sampel";

    renderChart(arr, hasData && cur != null ? q.c : "#22d3ee");

    $("latStats").innerHTML =
      tile("Rata-rata", st.v.length ? fmt(st.avg) : "--", "ms", "#22d3ee") +
      tile("Terendah", st.v.length ? st.min : "--", "ms", "#4ade80") +
      tile("Tertinggi", st.v.length ? st.max : "--", "ms", "#ff3ec8") +
      tile("Jitter", st.v.length > 1 ? fmt(st.jit) : "--", "ms", "#a78bfa") +
      tile("Paket hilang", st.total ? (st.loss / st.total * 100).toFixed(st.loss ? 1 : 0) : "0", "%", st.loss ? "#ff4d5e" : "#4ade80") +
      tile("Interval", (every / 1000).toString().replace(".", ","), "dtk", "#ffce54");

    let rows = "";
    TG.forEach(t => {
      const s2 = stats(hist[t.id]), l = s2.last, q2 = qual(l), has = hist[t.id].length > 0;
      const w = l == null ? 0 : Math.min(100, Math.max(4, l / 300 * 100));
      rows += '<button type="button" class="lt-row' + (t.id === sel ? ' on' : '') + '" data-id="' + t.id + '">' +
        '<span class="rn"><i style="background:' + (has ? q2.c : "#a89bcf") + '"></i>' + esc(t.name) + '</span>' +
        '<span class="rv" style="color:' + (has ? q2.c : "#a89bcf") + '">' + (has ? (l == null ? "RTO" : l) : "--") + (l != null ? '<small>ms</small>' : '') + '</span>' +
        '<span class="rh">' + hostHtml(t) + (s2.v.length ? ' - rata-rata ' + fmt(s2.avg) + ' ms' : '') + '</span>' +
        '<span class="rb"><u style="width:' + w + '%;background:linear-gradient(90deg,' + t.c + ',' + q2.c + ')"></u></span>' +
        '</button>';
    });
    $("latRows").innerHTML = rows;

    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const online = navigator.onLine !== false;
    $("latNetState").textContent = online ? "Online" : "Offline";
    $("latNet").innerHTML =
      tile("Status", online ? "Online" : "Offline", "", online ? "#4ade80" : "#ff4d5e") +
      tile("Tipe", c && c.effectiveType ? String(c.effectiveType).toUpperCase() : "-", "", "#22d3ee") +
      tile("Downlink", c && c.downlink ? c.downlink : "-", c && c.downlink ? "Mbps" : "", "#8b3ffb");

    let vc, vt, vp, vicon;
    if (!st.v.length) {
      vc = "#a89bcf"; vt = "Belum ada data"; vp = "Tunggu beberapa detik sampai sampel pertama masuk.";
      vicon = '<path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="9"/>';
    } else {
      const a = st.avg, lp = st.total ? st.loss / st.total * 100 : 0;
      if (a < 60 && lp === 0 && st.jit < 25) { vc = "#4ade80"; vt = "Koneksi sangat stabil"; vp = "Aman untuk game realtime, streaming HD, dan video call tanpa delay terasa."; }
      else if (a < 120 && lp < 3) { vc = "#22d3ee"; vt = "Koneksi lancar"; vp = "Streaming dan browsing mulus. Game realtime masih nyaman dimainkan."; }
      else if (a < 250 && lp < 10) { vc = "#ffce54"; vt = "Koneksi cukup"; vp = "Streaming kadang buffering dan game realtime bisa terasa delay."; }
      else { vc = "#ff4d5e"; vt = "Koneksi kurang baik"; vp = "Latensi tinggi atau banyak paket hilang. Coba pindah posisi, dekati router, atau ganti jaringan."; }
      if (lp >= 3) vp += " Ada " + lp.toFixed(1) + "% paket hilang, sinyal terindikasi tidak stabil.";
      vicon = a < 120 ? '<path d="M5 12l5 5 9-10"/>' : '<path d="M12 8v5M12 17h.01"/><path d="M10.3 4l-8 14a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0z"/>';
    }
    const v = $("latVerdict");
    v.style.color = vc;
    v.innerHTML = '<div class="vi"><svg viewBox="0 0 24 24">' + vicon + '</svg></div><div style="color:#f4eeff"><b>' + vt + '</b><p>' + vp + '</p></div>';
  }

  /* ===== Copy laporan ===== */
  function copyReport() {
    const lines = ["LIVE LATENCY MONITOR - " + new Date().toLocaleString("id-ID")];
    TG.forEach(t => {
      const s = stats(hist[t.id]);
      lines.push(t.name + (t.hide ? "" : " (" + t.host + ")") + ": " + (s.v.length ? ("rata-rata " + fmt(s.avg) + " ms, min " + s.min + ", max " + s.max + ", jitter " + fmt(s.jit) + " ms, hilang " + s.loss + "/" + s.total) : "belum ada data"));
    });
    const text = lines.join("\n"), btn = $("latCopy");
    function ok() { if (btn) { const o = btn.textContent; btn.textContent = "Tersalin"; setTimeout(() => btn.textContent = o, 1400); } }
    function fb() { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); ok(); } catch (e) { } ta.remove(); }
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(ok).catch(fb); } else fb();
  }

  /* ===== Open / close ===== */
  function open() {
    build();
    isOpen = true;
    const p = $("latPage"); p.classList.add("open"); p.setAttribute("aria-hidden", "false");
    try {
      document.body.classList.add("lat-open");
      document.body.classList.remove("menu-tab-ok");
      const mf = document.getElementById("menuFab"); if (mf) mf.style.display = "none";
      const mp = document.getElementById("menuPanel"); if (mp) mp.classList.remove("open");
    } catch (e) { }
    try { if (window.febzMascotShow) window.febzMascotShow(false); } catch (e) { }
    render(); loop();
  }
  function close() {
    isOpen = false; clearInterval(timer); timer = null;
    const p = $("latPage");
    if (p) { p.classList.remove("open"); p.setAttribute("aria-hidden", "true"); }
    try { document.body.classList.remove("lat-open"); } catch (e) { }
    try { if (window.febzMascotShow) window.febzMascotShow(true); } catch (e) { }
    try { if (window.febzUpdateNav) window.febzUpdateNav(); } catch (e) { }
  }
  window.febzOpenLatency = open;
  window.febzCloseLatency = close;

  /* Auto-build saat DOM ready */
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();

/* ============================================================
   PANAH TAMPIL / SEMBUNYI CLI + MONITOR
   ============================================================ */
(function () {
  const KEY = "febztzy-dock-open";

  function mk(id, cls, label, path) {
    const b = document.createElement("button");
    b.type = "button"; b.id = id; b.className = "dock-arrow " + cls;
    b.setAttribute("aria-label", label); b.title = label;
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + path + '"/></svg>';
    document.body.appendChild(b);
    return b;
  }
  const down = mk("dockDown", "dock-down", "Tampilkan CLI dan monitor", "M6 9l6 6 6-6");
  const up = mk("dockUp", "dock-up", "Sembunyikan CLI dan monitor", "M6 15l6-6 6 6");

  function set(o) {
    document.body.classList.toggle("dock-open", o);
    down.setAttribute("aria-expanded", o ? "true" : "false");
    try { localStorage.setItem(KEY, o ? "1" : "0"); } catch (e) { }
    try { if (window.agyMenuHide) window.agyMenuHide(); } catch (e) { }
  }
  function bind(b, o) { b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); set(o); }); }
  bind(down, true); bind(up, false);

  try { if (localStorage.getItem(KEY) === "1") { document.body.classList.add("dock-open"); down.setAttribute("aria-expanded", "true"); } } catch (e) { }

  window.febzDockSet = set;
})();
/* ============================================================
   TEMA — FebzTzy
   17 tema · UI variant · animasi · custom theme builder
   ============================================================ */
(function () {
  const $ = id => document.getElementById(id);

  /* ===== Daftar tema ===== */
  const THEME_LIST = [
    { id: "default", name: "Ungu Neon", desc: "Neon klasik FebzTzy", a: "#b458ff", b: "#ff3ec8", bg: "#12081f" },
    { id: "ocean", name: "Laut Biru", desc: "Dingin & tenang", a: "#38bdf8", b: "#60d4ff", bg: "#050b14" },
    { id: "sunset", name: "Sunset Jingga", desc: "Hangat saat senja", a: "#ff7a3e", b: "#ffce54", bg: "#160a08" },
    { id: "forest", name: "Hutan Hijau", desc: "Natural & segar", a: "#4ade80", b: "#a3e635", bg: "#071009" },
    { id: "rose", name: "Rose Pink", desc: "Soft pink elegan", a: "#fb7185", b: "#f9a8d4", bg: "#160810" },
    { id: "cartoon", name: "3D Kartun", desc: "Border tebal ala komik", a: "#7c3aed", b: "#ffd23f", bg: "#12121f" },
    { id: "glass", name: "Liquid Glass", desc: "Kaca buram modern", a: "#e8e0ff", b: "#60d4ff", bg: "#0a0a12" },
    { id: "cyber", name: "Cyberpunk", desc: "Cyan · magenta · malam", a: "#00f0ff", b: "#ff00aa", bg: "#05010a" },
    { id: "retro", name: "Retro Pixel", desc: "Terminal hijau 8-bit", a: "#33ff66", b: "#ffcc00", bg: "#0d1b0d" },
    { id: "minimal", name: "Minimal Soft", desc: "Bersih & lega", a: "#a78bfa", b: "#e2e8f0", bg: "#0f0f14" },
    { id: "paper", name: "Kertas Komik", desc: "Kertas · tinta · halftone", a: "#1a1a1a", b: "#ff6b35", bg: "#f2ebe0" },
    { id: "angel", name: "Malaikat", desc: "Putih · emas · surgawi", a: "#f8fafc", b: "#fbbf24", bg: "#0c1220" },
    { id: "devil", name: "Devil", desc: "Merah · hitam · api", a: "#ef4444", b: "#7f1d1d", bg: "#0a0202" },
    { id: "gold", name: "Royal Gold", desc: "Emas mewah & elegan", a: "#fbbf24", b: "#f59e0b", bg: "#120e06" },
    { id: "sakura", name: "Sakura", desc: "Pink lembut Jepang", a: "#f9a8d4", b: "#fb7185", bg: "#160814" },
    { id: "midnight", name: "Midnight", desc: "Indigo dalam malam", a: "#818cf8", b: "#c4b5fd", bg: "#06061a" },
    { id: "anime", name: "Anime Neon", desc: "Magenta · cyan · stage light", a: "#ff2d95", b: "#00e5ff", bg: "#0a0618" }
  ];

  /* ===== UI variants ===== */
  const UI_LIST = [
    { id: "default", name: "Standar", desc: "Tampilan normal app" },
    { id: "compact", name: "Kompak", desc: "Lebih rapat, hemat ruang" },
    { id: "cozy", name: "Nyaman", desc: "Sudut lembut & lega" },
    { id: "bold", name: "Tegas", desc: "Border tebal & huruf kuat" },
    { id: "round", name: "Bulat", desc: "Semua elemen membulat" },
    { id: "island", name: "Dock Lonjong", desc: "Nav lonjong + profil bulat di tengah" },
    { id: "luxury", name: "Mewah", desc: "Glow lembut & bayangan dalam" },
    { id: "sharp", name: "Tajam", desc: "Sudut siku, border tipis" },
    { id: "soft", name: "Embun", desc: "Blur & transparan lembut" }
  ];

  /* ===== Animasi ===== */
  const ANIM_LIST = [
    { id: "default", name: "Standar", desc: "Gerak normal app" },
    { id: "smooth", name: "Smooth", desc: "Halus · cubic ease · nyaman" },
    { id: "silk", name: "Silk", desc: "Sangat lembut & lambat elegan" },
    { id: "snappy", name: "Snappy", desc: "Cepat & responsif" },
    { id: "bounce", name: "Bounce", desc: "Lentur seperti spring" },
    { id: "float", name: "Float", desc: "Kartu mengambang pelan" },
    { id: "none", name: "Tanpa animasi", desc: "Matikan semua gerak" }
  ];

  /* ===== Gaya kartu game ===== */
  const CARD_STYLE_LIST = [
    { id: "default", name: "Standar", desc: "Kartu klasik FebzTzy" },
    { id: "minimal", name: "Minimalis", desc: "Rapi, tipis, tanpa bayangan" },
    { id: "poster", name: "Poster", desc: "Gambar besar seperti poster" },
    { id: "glass", name: "Glass", desc: "Kaca buram modern" },
    { id: "neon", name: "Neon", desc: "Glow ungu-pink" },
    { id: "comic", name: "Komik", desc: "Border tinta tebal" },
    { id: "magazine", name: "Majalah", desc: "Thumb menonjol, teks bersih" }
  ];

  /* ===== Apply theme ===== */
  function applyTheme(id) {
    THEME_LIST.forEach(t => document.body.classList.remove("theme-" + t.id));
    document.body.classList.remove("theme-custom");
    if (id !== "custom") {
      ["--purple","--purple-soft","--pink","--gold","--bg","--bg-panel","--card","--text","--text-dim","--line","--radius-ui"].forEach(v => {
        try { document.body.style.removeProperty(v); } catch (e) { }
      });
      try { document.documentElement.style.removeProperty("--radius-ui"); } catch (e) { }
    }
    if (id && id !== "default" && id !== "custom") document.body.classList.add("theme-" + id);
    if (id === "custom") document.body.classList.add("theme-custom");
    document.body.dataset.theme = id || "default";
    try { localStorage.setItem("febztzy-theme", id || "default"); } catch (e) { }
  }

  /* ===== Apply UI ===== */
  function uiApply(id) {
    UI_LIST.forEach(u => document.body.classList.remove("ui-" + u.id));
    if (id && id !== "default") document.body.classList.add("ui-" + id);
    document.body.dataset.ui = id || "default";
    try { localStorage.setItem("febztzy-ui", id || "default"); } catch (e) { }
    try { uiRenderGrid(); } catch (e) { }
  }

  /* ===== Apply animasi ===== */
  function animApply(id) {
    ANIM_LIST.forEach(a => document.body.classList.remove("anim-" + a.id));
    if (id && id !== "default") document.body.classList.add("anim-" + id);
    document.body.dataset.anim = id || "default";
    try { localStorage.setItem("febztzy-anim", id || "default"); } catch (e) { }
    try { animRenderGrid(); } catch (e) { }
  }

  /* ===== Apply card style ===== */
  function cardStyleApply(id) {
    CARD_STYLE_LIST.forEach(c => document.body.classList.remove("card-" + c.id));
    if (id && id !== "default") document.body.classList.add("card-" + id);
    document.body.dataset.cardStyle = id || "default";
    try { localStorage.setItem("febztzy-card-style", id || "default"); } catch (e) { }
    try { cardStyleRender(); } catch (e) { }
  }

  /* ===== Custom theme ===== */
  function applyCustomTheme(c, silent) {
    c = c || {};
    const purple = c.purple || "#b458ff";
    const pink = c.pink || "#ff3ec8";
    const gold = c.gold || "#ffce54";
    const bg = c.bg || "#07050c";
    const card = c.card || "#150f26";
    const text = c.text || "#f4eeff";
    const radius = c.radius != null ? c.radius : 16;
    const blur = c.blur != null ? c.blur : 14;
    const name = c.name || "Tema Custom";
    applyTheme("custom");
    const s = document.body.style;
    s.setProperty("--purple", purple);
    s.setProperty("--purple-soft", purple);
    s.setProperty("--pink", pink);
    s.setProperty("--gold", gold);
    s.setProperty("--bg", bg);
    s.setProperty("--bg-panel", card);
    s.setProperty("--card", card);
    s.setProperty("--text", text);
    s.setProperty("--text-dim", "color-mix(in srgb, " + text + " 65%, transparent)");
    s.setProperty("--line", "color-mix(in srgb, " + purple + " 32%, transparent)");
    s.setProperty("--radius-ui", radius + "px");
    document.documentElement.style.setProperty("--radius-ui", radius + "px");
    try {
      const styleId = "febztzy-custom-theme-style";
      let el = document.getElementById(styleId);
      if (!el) { el = document.createElement("style"); el.id = styleId; document.head.appendChild(el); }
      el.textContent =
        "body.theme-custom .card, body.theme-custom .modal-box, body.theme-custom .statusbar, body.theme-custom .titlebar, body.theme-custom .tool-card, body.theme-custom .bottom-nav, body.theme-custom .island-card, body.theme-custom .mc-bubble, body.theme-custom .ai-box, body.theme-custom .ai-head{" +
        "border-radius:" + radius + "px !important;" +
        (blur > 0 ? ("-webkit-backdrop-filter:blur(" + blur + "px);backdrop-filter:blur(" + blur + "px);") : "") +
        "}" +
        "body.theme-custom{ background:" + bg + " !important; background-image:radial-gradient(600px 300px at 10% -10%, color-mix(in srgb, " + purple + " 22%, transparent), transparent 60%), radial-gradient(500px 280px at 95% 0%, color-mix(in srgb, " + pink + " 14%, transparent), transparent 60%) !important; }";
    } catch (e) { }
    if (c.uiStyle) { try { uiApply(c.uiStyle); } catch (e) { } }
    try { localStorage.setItem("febztzy-theme-custom", JSON.stringify({ purple, pink, gold, bg, card, text, radius, blur, name, uiStyle: c.uiStyle || "default" })); } catch (e) { }
    if (!silent) { try { if (window.febzNavToast) window.febzNavToast("Tema: " + name); } catch (e) { } }
  }

  /* ===== Form custom theme ===== */
  function tcReadForm() {
    return {
      purple: ($("tcPurple") || {}).value || "#b458ff",
      pink: ($("tcPink") || {}).value || "#ff3ec8",
      gold: ($("tcGold") || {}).value || "#ffce54",
      bg: ($("tcBg") || {}).value || "#07050c",
      card: ($("tcCard") || {}).value || "#150f26",
      text: ($("tcText") || {}).value || "#f4eeff",
      radius: parseInt(($("tcRadius") || {}).value || "16", 10),
      blur: parseInt(($("tcBlur") || {}).value || "14", 10),
      name: (($("tcName") || {}).value || "Tema Custom").trim() || "Tema Custom",
      uiStyle: ($("tcUiStyle") || {}).value || "default"
    };
  }
  function tcUpdatePreview() {
    const c = tcReadForm();
    const ball = $("tcPrevBall");
    const nm = $("tcPrevName");
    const rv = $("tcRadiusVal");
    if (rv) rv.textContent = c.radius + "px";
    if (nm) nm.textContent = c.name;
    if (ball) ball.style.background = "linear-gradient(145deg," + c.bg + " 0%," + c.purple + " 55%," + c.pink + " 100%)";
  }
  function tcSavedList() {
    let list = [];
    try { list = JSON.parse(localStorage.getItem("febztzy-theme-custom-list") || "[]"); } catch (e) { }
    return Array.isArray(list) ? list : [];
  }
  function tcRenderSaved() {
    const g = $("tcSavedGrid"); if (!g) return;
    g.innerHTML = "";
    const list = tcSavedList();
    list.forEach((c, i) => {
      const sw = document.createElement("div");
      sw.className = "theme-swatch";
      const ball = document.createElement("div"); ball.className = "theme-ball";
      ball.style.background = "linear-gradient(145deg," + (c.bg || "#12081f") + " 0%," + (c.purple || "#b458ff") + "55 55%," + (c.pink || "#ff3ec8") + "99 100%)";
      sw.appendChild(ball);
      const lab = document.createElement("div"); lab.className = "theme-label"; lab.textContent = c.name || ("Custom " + (i + 1));
      sw.appendChild(lab);
      const sub = document.createElement("div"); sub.className = "theme-sub"; sub.textContent = "Ketuk pakai · tahan hapus";
      sw.appendChild(sub);
      sw.addEventListener("click", () => { applyCustomTheme(c); themeRenderGrid(); });
      sw.addEventListener("contextmenu", e => {
        e.preventDefault();
        if (!confirm('Hapus tema "' + (c.name || "Custom") + '"?')) return;
        const next = tcSavedList().filter((_, j) => j !== i);
        try { localStorage.setItem("febztzy-theme-custom-list", JSON.stringify(next)); } catch (err) { }
        tcRenderSaved();
      });
      g.appendChild(sw);
    });
  }
  function tcBind() {
    ["tcPurple","tcPink","tcGold","tcBg","tcCard","tcText","tcRadius","tcBlur","tcName","tcUiStyle"].forEach(id => {
      const el = $(id); if (!el) return;
      el.addEventListener("input", tcUpdatePreview);
      el.addEventListener("change", tcUpdatePreview);
    });
    const applyBtn = $("tcApply");
    if (applyBtn) applyBtn.addEventListener("click", () => { const c = tcReadForm(); applyCustomTheme(c); themeRenderGrid(); });
    const saveBtn = $("tcSave");
    if (saveBtn) saveBtn.addEventListener("click", () => {
      const c = tcReadForm();
      applyCustomTheme(c);
      let list = tcSavedList();
      list.unshift(c);
      list = list.slice(0, 12);
      try { localStorage.setItem("febztzy-theme-custom-list", JSON.stringify(list)); } catch (e) { }
      tcRenderSaved();
      try { if (window.febzNavToast) window.febzNavToast("Tema disimpan"); } catch (e) { }
    });
    const resetBtn = $("tcReset");
    if (resetBtn) resetBtn.addEventListener("click", () => {
      applyTheme("default");
      try { uiApply("default"); } catch (e) { }
      const st = $("febztzy-custom-theme-style"); if (st) st.textContent = "";
      themeRenderGrid();
      try { if (window.febzNavToast) window.febzNavToast("Tema direset"); } catch (e) { }
    });
    tcUpdatePreview();
    tcRenderSaved();
  }

  /* ===== Render grid ===== */
  function themeRenderGrid() {
    const current = document.body.dataset.theme || "default";
    const g = $("themeGrid"); if (!g) return;
    g.innerHTML = "";
    THEME_LIST.forEach(t => {
      const sw = document.createElement("div");
      sw.className = "theme-swatch" + (t.id === current ? " active" : "");
      const ball = document.createElement("div"); ball.className = "theme-ball";
      ball.style.background = "linear-gradient(145deg," + (t.bg || "#12081f") + " 0%, " + t.a + "55 55%, " + t.b + "99 100%)";
      const ui = document.createElement("div"); ui.className = "theme-ball-ui";
      ui.innerHTML = '<span class="t1"></span><span class="t2" style="background:linear-gradient(135deg,' + t.a + ',' + t.b + ')"></span><span class="t3"></span>';
      ball.appendChild(ui);
      sw.appendChild(ball);
      sw.appendChild(document.createElement("div")).className = "theme-label";
      sw.lastChild.textContent = t.name;
      if (t.desc) {
        const sd = document.createElement("div"); sd.className = "theme-sub"; sd.textContent = t.desc;
        sw.appendChild(sd);
      }
      sw.addEventListener("click", () => {
        applyTheme(t.id);
        themeRenderGrid();
        try { if (window.febzNavToast) window.febzNavToast("Tema: " + t.name); } catch (e) { }
      });
      g.appendChild(sw);
    });
  }
  function uiRenderGrid() {
    const g = $("themeUiGrid"); if (!g) return;
    const cur = document.body.dataset.ui || "default";
    g.innerHTML = "";
    UI_LIST.forEach(u => {
      const card = document.createElement("div");
      card.className = "theme-ui-card" + (u.id === cur ? " active" : "");
      const prev = document.createElement("div"); prev.className = "u-prev";
      if (u.id === "compact") prev.innerHTML = '<i style="width:40%"></i><i style="width:20%;height:10px"></i>';
      else if (u.id === "cozy") prev.innerHTML = '<i style="width:50%;border-radius:10px;height:14px"></i><i style="width:28%;border-radius:12px;height:18px"></i>';
      else if (u.id === "bold") prev.innerHTML = '<i style="width:45%;height:14px;border:2px solid #fff"></i><i style="width:25%;height:16px;border:2px solid #fff"></i>';
      else if (u.id === "round") prev.innerHTML = '<i style="width:48%;border-radius:999px"></i><i style="width:24%;border-radius:999px;height:16px"></i>';
      else if (u.id === "island") prev.innerHTML = '<i style="width:70%;height:14px;border-radius:999px;margin:0 auto"></i><i style="width:16px;height:16px;border-radius:50%;margin-left:auto;margin-right:auto;position:relative;top:-6px"></i>';
      else prev.innerHTML = '<i style="width:42%"></i><i style="width:24%;height:16px"></i>';
      card.appendChild(prev);
      const n = document.createElement("div"); n.className = "u-name"; n.textContent = u.name; card.appendChild(n);
      const d = document.createElement("div"); d.className = "u-desc"; d.textContent = u.desc; card.appendChild(d);
      card.addEventListener("click", () => { uiApply(u.id); try { if (window.febzNavToast) window.febzNavToast("UI: " + u.name); } catch (e) { } });
      g.appendChild(card);
    });
  }
  function animRenderGrid() {
    const g = $("themeAnimGrid"); if (!g) return;
    const cur = document.body.dataset.anim || "default";
    g.innerHTML = "";
    ANIM_LIST.forEach(a => {
      const el = document.createElement("div");
      el.className = "theme-anim-opt" + (a.id === cur ? " active" : "");
      el.innerHTML = '<div class="a-preview"><i></i></div><b>' + a.name + '</b><span>' + a.desc + '</span>';
      el.addEventListener("click", () => { animApply(a.id); try { if (window.febzNavToast) window.febzNavToast("Animasi: " + a.name); } catch (e) { } });
      g.appendChild(el);
    });
  }
  function cardStyleRender() {
    const g = $("themeCardGrid"); if (!g) return;
    const cur = document.body.dataset.cardStyle || "default";
    g.innerHTML = "";
    CARD_STYLE_LIST.forEach(c => {
      const el = document.createElement("div");
      el.className = "theme-card-opt" + (c.id === cur ? " active" : "");
      el.innerHTML = "<b>" + c.name + "</b><span>" + c.desc + "</span>";
      el.addEventListener("click", () => { cardStyleApply(c.id); try { if (window.febzNavToast) window.febzNavToast("Kartu: " + c.name); } catch (e) { } });
      g.appendChild(el);
    });
  }

  /* ===== Load saved ===== */
  function loadSaved() {
    let id = "default";
    try { id = localStorage.getItem("febztzy-theme") || "default"; } catch (e) { }
    if (id === "custom") {
      try {
        const raw = localStorage.getItem("febztzy-theme-custom");
        if (raw) { const c = JSON.parse(raw); applyCustomTheme(c, true); }
        else applyTheme("default");
      } catch (e) { applyTheme("default"); }
    } else applyTheme(id);

    try { const su = localStorage.getItem("febztzy-ui"); if (su) uiApply(su); } catch (e) { }
    try { const sa = localStorage.getItem("febztzy-anim"); animApply(sa || "smooth"); } catch (e) { animApply("smooth"); }
    try { const sc = localStorage.getItem("febztzy-card-style"); if (sc) cardStyleApply(sc); } catch (e) { }
  }

  /* ===== Bind tombol tema ===== */
  function bindModal() {
    const openBtn = $("themeOpenBtn");
    const modal = $("themeModal");
    const closeBtn = $("themeCloseBtn");
    if (openBtn && modal) {
      openBtn.addEventListener("click", () => {
        themeRenderGrid(); uiRenderGrid(); animRenderGrid(); cardStyleRender();
        try { tcBind(); tcRenderSaved(); tcUpdatePreview(); } catch (e) { }
        modal.classList.remove("hidden");
      });
    }
    if (closeBtn && modal) closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
    if (modal) modal.addEventListener("click", e => { if (e.target === modal) modal.classList.add("hidden"); });
  }

  /* ===== Init ===== */
  loadSaved();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { bindModal(); tcBind(); });
  else { bindModal(); tcBind(); }

  /* ===== Export ===== */
  window.febzApplyTheme = applyTheme;
  window.febzApplyUi = uiApply;
  window.febzApplyAnim = animApply;
  window.febzApplyCardStyle = cardStyleApply;
  window.febzThemeRenderGrid = themeRenderGrid;
})();