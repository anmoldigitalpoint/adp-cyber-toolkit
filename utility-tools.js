/* ADP Digital Suite - Utility tools */

function open_age_calculator(){
  openModal("Age Calculator", `
    <div class="field"><label>Date of birth</label><input type="date" id="ac-dob"></div>
    <div class="field"><label>Calculate age as of</label><input type="date" id="ac-asof"></div>
    <button class="btn btn-primary btn-block" id="ac-go">Calculate Age</button>
    <div id="ac-result"></div>
  `);
  document.getElementById("ac-asof").valueAsDate = new Date();
  document.getElementById("ac-go").addEventListener("click", () => {
    const dob = new Date(document.getElementById("ac-dob").value);
    const asOf = new Date(document.getElementById("ac-asof").value);
    if (isNaN(dob) || isNaN(asOf)) return showToast("Pick both dates.");
    if (dob > asOf) return showToast("Date of birth must be before the target date.");
    let y = asOf.getFullYear() - dob.getFullYear();
    let m = asOf.getMonth() - dob.getMonth();
    let d = asOf.getDate() - dob.getDate();
    if (d < 0) { m--; d += new Date(asOf.getFullYear(), asOf.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    const totalDays = Math.floor((asOf - dob) / 86400000);
    document.getElementById("ac-result").innerHTML = `<div class="result-box">🎂 Age: <b>${y} years, ${m} months, ${d} days</b> (${totalDays.toLocaleString()} total days)</div>`;
  });
}

function open_date_calculator(){
  openModal("Date Calculator", `
    <div class="row-2">
      <div class="field"><label>Start date</label><input type="date" id="dc-a"></div>
      <div class="field"><label>End date</label><input type="date" id="dc-b"></div>
    </div>
    <button class="btn btn-primary btn-block" id="dc-go">Find Difference</button>
    <div id="dc-result"></div>
  `);
  document.getElementById("dc-go").addEventListener("click", () => {
    const a = new Date(document.getElementById("dc-a").value);
    const b = new Date(document.getElementById("dc-b").value);
    if (isNaN(a) || isNaN(b)) return showToast("Pick both dates.");
    const days = Math.round(Math.abs(b - a) / 86400000);
    const weeks = (days/7).toFixed(1);
    document.getElementById("dc-result").innerHTML = `<div class="result-box">📅 Difference: <b>${days} days</b> (${weeks} weeks)</div>`;
  });
}

function open_word_counter(){
  openModal("Word Counter", `
    <div class="field"><textarea id="wc-text" rows="8" placeholder="Paste or type text here..."></textarea></div>
    <div id="wc-stats" class="result-box"></div>
  `);
  const ta = document.getElementById("wc-text");
  function update(){
    const text = ta.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g,"").length;
    const sentences = text.trim() ? (text.match(/[.!?]+/g) || []).length : 0;
    const readingMins = Math.max(1, Math.ceil(words / 200));
    document.getElementById("wc-stats").innerHTML = `Words: <b>${words}</b> &nbsp;|&nbsp; Characters: <b>${chars}</b> &nbsp;|&nbsp; No spaces: <b>${charsNoSpace}</b> &nbsp;|&nbsp; Sentences: <b>${sentences}</b> &nbsp;|&nbsp; Reading time: <b>~${readingMins} min</b>`;
  }
  ta.addEventListener("input", update); update();
}

function open_character_counter(){
  openModal("Character Counter", `
    <div class="field"><textarea id="cc-text" rows="8" placeholder="Type or paste text..."></textarea></div>
    <div id="cc-stats" class="result-box"></div>
  `);
  const ta = document.getElementById("cc-text");
  function update(){
    document.getElementById("cc-stats").innerHTML = `With spaces: <b>${ta.value.length}</b> &nbsp;|&nbsp; Without spaces: <b>${ta.value.replace(/\s/g,"").length}</b>`;
  }
  ta.addEventListener("input", update); update();
}

function open_text_formatter(){
  openModal("Text Formatter", `
    <div class="field"><textarea id="tf-text" rows="8" placeholder="Type or paste text..."></textarea></div>
    <div class="filter-row">
      <button class="chip" data-f="upper">UPPERCASE</button>
      <button class="chip" data-f="lower">lowercase</button>
      <button class="chip" data-f="title">Title Case</button>
      <button class="chip" data-f="sentence">Sentence case</button>
      <button class="chip" data-f="trim">Trim extra spaces</button>
    </div>
    <button class="btn btn-outline btn-block" id="tf-copy">Copy Result</button>
  `);
  const ta = document.getElementById("tf-text");
  document.querySelectorAll(".chip[data-f]").forEach(btn => btn.addEventListener("click", () => {
    const f = btn.dataset.f, t = ta.value;
    if (f === "upper") ta.value = t.toUpperCase();
    else if (f === "lower") ta.value = t.toLowerCase();
    else if (f === "title") ta.value = t.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
    else if (f === "sentence") ta.value = t.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase());
    else if (f === "trim") ta.value = t.trim().replace(/\s+/g, " ");
  }));
  document.getElementById("tf-copy").addEventListener("click", () => {
    navigator.clipboard.writeText(ta.value).then(() => showToast("Copied to clipboard."));
  });
}

function open_zip_creator(){
  openModal("ZIP Creator", `
    <div class="drop-zone" id="zc-drop">📁 Click or drop multiple files here</div>
    <input type="file" id="zc-input" multiple class="hidden">
    <div class="file-list" id="zc-list"></div>
    <button class="btn btn-primary btn-block hidden" id="zc-go" style="margin-top:14px;">Create ZIP & Download</button>
  `);
  let files = [];
  wireDropZone(document.getElementById("zc-drop"), document.getElementById("zc-input"), (nf) => {
    files = files.concat(nf);
    document.getElementById("zc-list").innerHTML = files.map(f => `<div class="file-chip"><span class="fc-name">${f.name}</span><span>${fmtBytes(f.size)}</span></div>`).join("");
    document.getElementById("zc-go").classList.remove("hidden");
  });
  document.getElementById("zc-go").addEventListener("click", async () => {
    if (!files.length) return;
    const zip = new JSZip();
    for (const f of files) zip.file(f.name, await readAsArrayBuffer(f));
    const blob = await zip.generateAsync({ type:"blob" });
    downloadBlob(blob, "archive.zip");
    showToast("ZIP created and downloaded.");
  });
}

function open_zip_extractor(){
  openModal("ZIP Extractor", `
    <div class="drop-zone" id="ze-drop">🗜️ Click or drop a .zip file here</div>
    <input type="file" id="ze-input" accept=".zip" class="hidden">
    <div class="file-list" id="ze-list"></div>
  `);
  wireDropZone(document.getElementById("ze-drop"), document.getElementById("ze-input"), async (files) => {
    const f = files[0]; if (!f) return;
    const zip = await JSZip.loadAsync(await readAsArrayBuffer(f));
    const list = document.getElementById("ze-list");
    list.innerHTML = "";
    const entries = Object.values(zip.files).filter(e => !e.dir);
    for (const entry of entries){
      const row = document.createElement("div");
      row.className = "file-chip";
      row.innerHTML = `<span class="fc-name">${entry.name}</span><button data-name="${entry.name}" style="color:var(--blue-light);">⬇️</button>`;
      list.appendChild(row);
      row.querySelector("button").addEventListener("click", async () => {
        const blob = await entry.async("blob");
        downloadBlob(blob, entry.name.split("/").pop());
      });
    }
    if (!entries.length) list.innerHTML = `<p style="color:var(--text-faint)">This ZIP file is empty.</p>`;
  });
}

const UNIT_GROUPS = {
  length: { m:1, km:1000, cm:0.01, mm:0.001, mile:1609.34, yard:0.9144, foot:0.3048, inch:0.0254 },
  weight: { kg:1, g:0.001, mg:0.000001, ton:1000, lb:0.453592, oz:0.0283495 },
};
function open_unit_converter(){
  openModal("Unit Converter", `
    <div class="tabs">
      <button class="tab-btn active" data-t="length">Length</button>
      <button class="tab-btn" data-t="weight">Weight</button>
      <button class="tab-btn" data-t="temp">Temperature</button>
    </div>
    <div id="uc-body"></div>
  `);
  const body = document.getElementById("uc-body");
  function renderUnitTab(group){
    const units = Object.keys(UNIT_GROUPS[group]);
    body.innerHTML = `
      <div class="row-2">
        <div class="field"><label>From</label><input type="number" id="uc-val" value="1"><select id="uc-from">${units.map(u=>`<option value="${u}">${u}</option>`).join("")}</select></div>
        <div class="field"><label>To</label><div id="uc-out" style="padding:10px 12px;background:var(--panel);border-radius:10px;border:1px solid var(--panel-border);">—</div><select id="uc-to">${units.map(u=>`<option value="${u}">${u}</option>`).join("")}</select></div>
      </div>`;
    document.getElementById("uc-to").selectedIndex = 1;
    function update(){
      const v = parseFloat(document.getElementById("uc-val").value) || 0;
      const from = document.getElementById("uc-from").value, to = document.getElementById("uc-to").value;
      const base = v * UNIT_GROUPS[group][from];
      const result = base / UNIT_GROUPS[group][to];
      document.getElementById("uc-out").textContent = (Math.round(result*100000)/100000).toString();
    }
    ["uc-val","uc-from","uc-to"].forEach(id => document.getElementById(id).addEventListener("input", update));
    update();
  }
  function renderTempTab(){
    body.innerHTML = `
      <div class="row-2">
        <div class="field"><label>From</label><input type="number" id="uc-val" value="0"><select id="uc-from"><option value="c">Celsius</option><option value="f">Fahrenheit</option><option value="k">Kelvin</option></select></div>
        <div class="field"><label>To</label><div id="uc-out" style="padding:10px 12px;background:var(--panel);border-radius:10px;border:1px solid var(--panel-border);">—</div><select id="uc-to"><option value="c">Celsius</option><option value="f" selected>Fahrenheit</option><option value="k">Kelvin</option></select></div>
      </div>`;
    function toC(v,u){ return u==="c"?v : u==="f"?(v-32)*5/9 : v-273.15; }
    function fromC(v,u){ return u==="c"?v : u==="f"?(v*9/5)+32 : v+273.15; }
    function update(){
      const v = parseFloat(document.getElementById("uc-val").value) || 0;
      const from = document.getElementById("uc-from").value, to = document.getElementById("uc-to").value;
      const result = fromC(toC(v, from), to);
      document.getElementById("uc-out").textContent = (Math.round(result*100)/100).toString();
    }
    ["uc-val","uc-from","uc-to"].forEach(id => document.getElementById(id).addEventListener("input", update));
    update();
  }
  document.querySelectorAll(".tab-btn").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    btn.dataset.t === "temp" ? renderTempTab() : renderUnitTab(btn.dataset.t);
  }));
  renderUnitTab("length");
}
