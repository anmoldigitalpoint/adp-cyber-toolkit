/* ADP Digital Suite - Image tools (all client-side, Canvas API) */

function singleImageDropZone(){
  return `<div class="drop-zone" id="it-drop">🖼️ Click or drop an image here</div><input type="file" id="it-input" accept="image/*" class="hidden">`;
}

/* ---------------- Image Resize ---------------- */
function open_image_resize(){
  openModal("Image Resize", `
    ${singleImageDropZone()}
    <div class="row-2" style="margin-top:14px;">
      <div class="field"><label>Width (px)</label><input type="number" id="it-w"></div>
      <div class="field"><label>Height (px)</label><input type="number" id="it-h"></div>
    </div>
    <label style="font-size:13px;display:flex;gap:8px;align-items:center;margin-bottom:12px;"><input type="checkbox" id="it-lock" checked> Lock aspect ratio</label>
    <canvas id="it-preview" class="hidden"></canvas>
    <button class="btn btn-primary btn-block" id="it-go" style="margin-top:10px;">Resize & Download</button>
  `);
  let img = null, ratio = 1;
  wireDropZone(document.getElementById("it-drop"), document.getElementById("it-input"), async (files) => {
    const f = files[0]; if (!f) return;
    img = await loadImage(await readAsDataURL(f));
    ratio = img.naturalWidth / img.naturalHeight;
    document.getElementById("it-w").value = img.naturalWidth;
    document.getElementById("it-h").value = img.naturalHeight;
  });
  document.getElementById("it-w").addEventListener("input", (e) => {
    if (document.getElementById("it-lock").checked && img) document.getElementById("it-h").value = Math.round(e.target.value / ratio);
  });
  document.getElementById("it-h").addEventListener("input", (e) => {
    if (document.getElementById("it-lock").checked && img) document.getElementById("it-w").value = Math.round(e.target.value * ratio);
  });
  document.getElementById("it-go").addEventListener("click", async () => {
    if (!img) return showToast("Add an image first.");
    const w = parseInt(document.getElementById("it-w").value,10), h = parseInt(document.getElementById("it-h").value,10);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    c.getContext("2d").drawImage(img, 0, 0, w, h);
    downloadDataURL(c.toDataURL("image/png"), "resized.png");
    showToast(`Resized to ${w}×${h} and downloaded.`);
  });
}

/* ---------------- Image Compress ---------------- */
function open_image_compress(){
  openModal("Image Compress", `
    ${singleImageDropZone()}
    <div class="field" style="margin-top:14px;"><label>Quality: <span id="it-qlabel">80%</span></label><input type="range" id="it-q" min="0.2" max="0.95" step="0.05" value="0.8"></div>
    <div class="hint" id="it-sizehint"></div>
    <button class="btn btn-primary btn-block" id="it-go" style="margin-top:10px;">Compress & Download</button>
  `);
  let file = null, img = null;
  wireDropZone(document.getElementById("it-drop"), document.getElementById("it-input"), async (files) => {
    file = files[0]; if (!file) return;
    img = await loadImage(await readAsDataURL(file));
    document.getElementById("it-sizehint").textContent = `Original size: ${fmtBytes(file.size)}`;
  });
  document.getElementById("it-q").addEventListener("input", (e) => document.getElementById("it-qlabel").textContent = Math.round(e.target.value*100)+"%");
  document.getElementById("it-go").addEventListener("click", async () => {
    if (!img) return showToast("Add an image first.");
    const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img,0,0);
    const q = parseFloat(document.getElementById("it-q").value);
    const blob = await canvasToBlob(c, "image/jpeg", q);
    downloadBlob(blob, "compressed.jpg");
    document.getElementById("it-sizehint").innerHTML += `<br>New size: ${fmtBytes(blob.size)} (was ${fmtBytes(file.size)}) — downloaded.`;
  });
}

/* ---------------- Image Crop ---------------- */
function open_image_crop(){
  openModal("Image Crop", `
    ${singleImageDropZone()}
    <div class="hint">Drag on the image to select the crop area, then click Crop.</div>
    <div style="position:relative; margin-top:10px;" id="it-wrap"></div>
    <button class="btn btn-primary btn-block" id="it-go" style="margin-top:10px;">Crop & Download</button>
  `);
  let img = null, canvas, ctx, start = null, rect = null;
  wireDropZone(document.getElementById("it-drop"), document.getElementById("it-input"), async (files) => {
    const f = files[0]; if (!f) return;
    img = await loadImage(await readAsDataURL(f));
    const wrap = document.getElementById("it-wrap");
    wrap.innerHTML = "";
    canvas = document.createElement("canvas");
    const maxW = 660;
    const scale = Math.min(1, maxW / img.naturalWidth);
    canvas.width = img.naturalWidth * scale; canvas.height = img.naturalHeight * scale;
    canvas.style.cursor = "crosshair";
    ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    wrap.appendChild(canvas);

    canvas.addEventListener("mousedown", (e) => { const r = canvas.getBoundingClientRect(); start = { x: e.clientX-r.left, y: e.clientY-r.top }; });
    canvas.addEventListener("mousemove", (e) => {
      if (!start) return;
      const r = canvas.getBoundingClientRect();
      const cur = { x: e.clientX-r.left, y: e.clientY-r.top };
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      rect = { x: Math.min(start.x,cur.x), y: Math.min(start.y,cur.y), w: Math.abs(cur.x-start.x), h: Math.abs(cur.y-start.y) };
      ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 2; ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = "rgba(59,130,246,0.15)"; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    });
    window.addEventListener("mouseup", () => start = null);
  });
  document.getElementById("it-go").addEventListener("click", async () => {
    if (!img || !rect || rect.w < 4) return showToast("Draw a crop area on the image first.");
    const scaleX = img.naturalWidth / canvas.width, scaleY = img.naturalHeight / canvas.height;
    const out = document.createElement("canvas");
    out.width = rect.w * scaleX; out.height = rect.h * scaleY;
    out.getContext("2d").drawImage(img, rect.x*scaleX, rect.y*scaleY, rect.w*scaleX, rect.h*scaleY, 0, 0, out.width, out.height);
    downloadDataURL(out.toDataURL("image/png"), "cropped.png");
    showToast("Cropped image downloaded.");
  });
}

/* ---------------- Image Enhancement ---------------- */
function open_image_enhance(){
  openModal("Image Enhancement", `
    ${singleImageDropZone()}
    <div class="row-2" style="margin-top:14px;">
      <div class="field"><label>Brightness</label><input type="range" id="it-b" min="-50" max="50" value="0"></div>
      <div class="field"><label>Contrast</label><input type="range" id="it-c" min="-50" max="50" value="0"></div>
    </div>
    <div class="field"><label>Sharpen</label><input type="range" id="it-s" min="0" max="100" value="0"></div>
    <canvas id="it-canvas" style="width:100%;"></canvas>
    <button class="btn btn-primary btn-block" id="it-go" style="margin-top:10px;">Download Result</button>
  `);
  let img = null;
  const canvas = document.getElementById("it-canvas");
  function render(){
    if (!img) return;
    const b = document.getElementById("it-b").value, c = document.getElementById("it-c").value;
    const maxW = 660; const scale = Math.min(1, maxW/img.naturalWidth);
    canvas.width = img.naturalWidth*scale; canvas.height = img.naturalHeight*scale;
    const ctx = canvas.getContext("2d");
    ctx.filter = `brightness(${100+parseInt(b)}%) contrast(${100+parseInt(c)}%)`;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }
  ["it-b","it-c","it-s"].forEach(id => document.getElementById(id).addEventListener("input", render));
  wireDropZone(document.getElementById("it-drop"), document.getElementById("it-input"), async (files) => {
    const f = files[0]; if (!f) return;
    img = await loadImage(await readAsDataURL(f));
    render();
  });
  document.getElementById("it-go").addEventListener("click", async () => {
    if (!img) return showToast("Add an image first.");
    const b = document.getElementById("it-b").value, c = document.getElementById("it-c").value, s = parseInt(document.getElementById("it-s").value,10);
    const full = document.createElement("canvas"); full.width = img.naturalWidth; full.height = img.naturalHeight;
    const ctx = full.getContext("2d");
    ctx.filter = `brightness(${100+parseInt(b)}%) contrast(${100+parseInt(c)}%)`;
    ctx.drawImage(img, 0, 0);
    const outCanvas = s > 0 ? enhanceCanvas(full, { brightness: parseInt(b), contrast: parseInt(c) }) : full;
    downloadDataURL(outCanvas.toDataURL("image/png"), "enhanced.png");
    showToast("Enhanced image downloaded.");
  });
}

/* ---------------- Generic format converter ---------------- */
function genericConvert(title, outType, outExt){
  openModal(title, `
    ${singleImageDropZone()}
    <img id="it-prev" style="max-height:220px;border-radius:10px;margin-top:12px;" class="hidden">
    <button class="btn btn-primary btn-block" id="it-go" style="margin-top:14px;">Convert & Download</button>
  `);
  let img = null;
  wireDropZone(document.getElementById("it-drop"), document.getElementById("it-input"), async (files) => {
    const f = files[0]; if (!f) return;
    const url = await readAsDataURL(f);
    img = await loadImage(url);
    const p = document.getElementById("it-prev"); p.src = url; p.classList.remove("hidden");
  });
  document.getElementById("it-go").addEventListener("click", async () => {
    if (!img) return showToast("Add an image first.");
    const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext("2d");
    if (outType === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0,0,c.width,c.height); } // flatten transparency for JPG
    ctx.drawImage(img, 0, 0);
    const blob = await canvasToBlob(c, outType, 0.92);
    downloadBlob(blob, `converted.${outExt}`);
    showToast("Converted and downloaded.");
  });
}
function open_jpg_to_png(){ genericConvert("JPG to PNG", "image/png", "png"); }
function open_png_to_jpg(){ genericConvert("PNG to JPG", "image/jpeg", "jpg"); }
function open_image_format_converter(){
  openModal("Format Converter", `
    ${singleImageDropZone()}
    <div class="field" style="margin-top:14px;"><label>Convert to</label>
      <select id="it-fmt"><option value="image/png">PNG</option><option value="image/jpeg">JPG</option><option value="image/webp">WEBP</option></select>
    </div>
    <button class="btn btn-primary btn-block" id="it-go">Convert & Download</button>
  `);
  let img = null;
  wireDropZone(document.getElementById("it-drop"), document.getElementById("it-input"), async (files) => {
    const f = files[0]; if (!f) return;
    img = await loadImage(await readAsDataURL(f));
  });
  document.getElementById("it-go").addEventListener("click", async () => {
    if (!img) return showToast("Add an image first.");
    const fmt = document.getElementById("it-fmt").value;
    const ext = fmt.split("/")[1];
    const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext("2d");
    if (fmt === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0,0,c.width,c.height); }
    ctx.drawImage(img,0,0);
    const blob = await canvasToBlob(c, fmt, 0.92);
    downloadBlob(blob, `converted.${ext}`);
    showToast("Converted and downloaded.");
  });
}
function open_webp_converter(){ open_image_format_converter(); }

/* ---------------- DPI / Resolution checker ---------------- */
function open_dpi_checker(){
  openModal("DPI Checker", `
    ${singleImageDropZone()}
    <div id="it-info" class="result-box hidden"></div>
  `);
  wireDropZone(document.getElementById("it-drop"), document.getElementById("it-input"), async (files) => {
    const f = files[0]; if (!f) return;
    const img = await loadImage(await readAsDataURL(f));
    let dpiText = "Not embedded (most web images don't store DPI — treated as 72 DPI by default)";
    if (f.type === "image/jpeg"){
      try {
        const buf = await readAsArrayBuffer(f);
        const view = new DataView(buf);
        // JFIF DPI is stored at a fixed offset in most JPEGs (APP0 marker)
        if (view.getUint16(0) === 0xFFD8 && view.getUint16(2) === 0xFFE0) {
          const xDensity = view.getUint16(14);
          const yDensity = view.getUint16(16);
          if (xDensity) dpiText = `${xDensity} × ${yDensity} DPI (from JFIF header)`;
        }
      } catch(e){}
    }
    const info = document.getElementById("it-info");
    info.classList.remove("hidden");
    info.innerHTML = `📐 Resolution: <b>${img.naturalWidth} × ${img.naturalHeight}px</b><br>🧾 File size: <b>${fmtBytes(f.size)}</b><br>🔍 DPI: <b>${dpiText}</b>`;
  });
}

/* ---------------- Signature Crop (auto-trim whitespace) ---------------- */
function open_signature_crop(){
  openModal("Signature Crop", `
    ${singleImageDropZone()}
    <div class="hint">Upload a photo of a signature on plain paper — the empty background is trimmed automatically.</div>
    <canvas id="it-out" class="hidden" style="margin-top:12px;"></canvas>
    <button class="btn btn-primary btn-block hidden" id="it-go" style="margin-top:10px;">Download Cropped Signature</button>
  `);
  let cropped = null;
  wireDropZone(document.getElementById("it-drop"), document.getElementById("it-input"), async (files) => {
    const f = files[0]; if (!f) return;
    const c = await fileToCanvas(f);
    cropped = autoCropCanvas(c, { threshold: 30 });
    const out = document.getElementById("it-out");
    out.width = cropped.width; out.height = cropped.height;
    out.getContext("2d").drawImage(cropped, 0, 0);
    out.classList.remove("hidden");
    document.getElementById("it-go").classList.remove("hidden");
  });
  document.getElementById("it-go").addEventListener("click", () => {
    if (!cropped) return;
    downloadDataURL(cropped.toDataURL("image/png"), "signature-cropped.png");
  });
}
