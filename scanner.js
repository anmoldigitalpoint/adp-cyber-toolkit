/* ADP Digital Suite - Scanner tools (client-side auto document crop) */

/* ---------------- Multi Document Scanner ---------------- */
function open_multi_scanner(){
  openModal("Multi Document Scanner", `
    <div class="tabs">
      <button class="tab-btn active" id="ms-tab-cam">📸 Use Camera</button>
      <button class="tab-btn" id="ms-tab-gal">🖼️ From Gallery</button>
    </div>
    <div id="ms-cam-panel">
      <video id="ms-video" autoplay playsinline style="width:100%;border-radius:12px;background:#000;max-height:300px;"></video>
      <button class="btn btn-primary btn-block" id="ms-capture" style="margin-top:10px;">📸 Capture Page</button>
      <div class="hint" id="ms-cam-hint"></div>
    </div>
    <div id="ms-gal-panel" class="hidden">
      <div class="drop-zone" id="ms-drop">🖼️ Click or drop multiple photos here (2 to 100 images)</div>
      <input type="file" id="ms-input" accept="image/*" multiple class="hidden">
    </div>
    <div class="hint">Each photo is auto-cropped to the document and cleaned up. Reorder, rotate or delete pages below, then merge them into one PDF.</div>
    <div class="thumb-grid" id="ms-thumbs"></div>
    <button class="btn btn-primary btn-block hidden" id="ms-merge" style="margin-top:16px;">📄 Merge All Into One PDF</button>
    <div id="ms-result"></div>
  `);

  let pages = []; // array of {canvas}
  let stream = null;

  function renderThumbs(){
    const grid = document.getElementById("ms-thumbs");
    grid.innerHTML = pages.map((p,i) => `
      <div class="thumb" draggable="true" data-i="${i}">
        <img src="${p.canvas.toDataURL('image/jpeg',0.75)}">
        <span class="thumb-num">${i+1}</span>
        <div class="thumb-actions">
          <button data-act="rotate" data-i="${i}">⟳</button>
          <button data-act="delete" data-i="${i}">✕</button>
        </div>
      </div>`).join("");
    document.getElementById("ms-merge").classList.toggle("hidden", pages.length === 0);

    grid.querySelectorAll("button[data-act]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const i = parseInt(btn.dataset.i,10);
        if (btn.dataset.act === "delete") { pages.splice(i,1); renderThumbs(); }
        else {
          const c = pages[i].canvas;
          const rc = document.createElement("canvas");
          rc.width = c.height; rc.height = c.width;
          const ctx = rc.getContext("2d");
          ctx.translate(rc.width/2, rc.height/2); ctx.rotate(Math.PI/2); ctx.drawImage(c, -c.width/2, -c.height/2);
          pages[i].canvas = rc; renderThumbs();
        }
      });
    });
    let dragFrom = null;
    grid.querySelectorAll(".thumb").forEach(el => {
      el.addEventListener("dragstart", () => dragFrom = parseInt(el.dataset.i,10));
      el.addEventListener("dragover", (e) => e.preventDefault());
      el.addEventListener("drop", () => {
        const to = parseInt(el.dataset.i,10);
        const item = pages.splice(dragFrom,1)[0];
        pages.splice(to,0,item);
        renderThumbs();
      });
    });
  }

  async function processFile(file){
    const raw = await fileToCanvas(file);
    const cropped = autoCropCanvas(raw, { threshold: 24 });
    const clean = enhanceCanvas(cropped, { brightness: 10, contrast: 16 });
    pages.push({ canvas: clean });
    renderThumbs();
  }

  wireDropZone(document.getElementById("ms-drop"), document.getElementById("ms-input"), async (files) => {
    showToast(`Processing ${files.length} image(s)...`);
    for (const f of files) await processFile(f);
  });

  // camera
  const video = document.getElementById("ms-video");
  navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" } })
    .then(s => { stream = s; video.srcObject = s; })
    .catch(() => { document.getElementById("ms-cam-hint").textContent = "Camera not available — use Gallery instead."; });

  document.getElementById("ms-capture").addEventListener("click", async () => {
    if (!stream) return showToast("Camera isn't available on this device.");
    const c = document.createElement("canvas");
    c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext("2d").drawImage(video, 0, 0);
    const cropped = autoCropCanvas(c, { threshold: 24 });
    const clean = enhanceCanvas(cropped, { brightness: 10, contrast: 16 });
    pages.push({ canvas: clean });
    renderThumbs();
    showToast(`Page ${pages.length} captured.`);
  });

  function stopStream(){ if (stream) stream.getTracks().forEach(t => t.stop()); }
  document.getElementById("modalClose").addEventListener("click", stopStream);

  document.getElementById("ms-tab-cam").addEventListener("click", () => {
    document.getElementById("ms-tab-cam").classList.add("active");
    document.getElementById("ms-tab-gal").classList.remove("active");
    document.getElementById("ms-cam-panel").classList.remove("hidden");
    document.getElementById("ms-gal-panel").classList.add("hidden");
  });
  document.getElementById("ms-tab-gal").addEventListener("click", () => {
    document.getElementById("ms-tab-gal").classList.add("active");
    document.getElementById("ms-tab-cam").classList.remove("active");
    document.getElementById("ms-gal-panel").classList.remove("hidden");
    document.getElementById("ms-cam-panel").classList.add("hidden");
  });

  document.getElementById("ms-merge").addEventListener("click", async () => {
    if (!pages.length) return;
    const { PDFDocument } = PDFLib;
    const doc = await PDFDocument.create();
    for (const p of pages){
      const blob = await canvasToBlob(p.canvas, "image/jpeg", 0.9);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const img = await doc.embedJpg(bytes);
      const page = doc.addPage([img.width, img.height]);
      page.drawImage(img, { x:0, y:0, width: img.width, height: img.height });
    }
    const bytes = await doc.save();
    downloadBlob(new Blob([bytes], { type:"application/pdf" }), "scanned-document.pdf");
    document.getElementById("ms-result").innerHTML = `<div class="result-box">✅ Merged ${pages.length} page(s) into one PDF and downloaded.</div>`;
  });
}

/* ---------------- Single Camera Scanner ---------------- */
function open_camera_scanner(){
  openModal("Camera Scanner", `
    <video id="cs-video" autoplay playsinline style="width:100%;border-radius:12px;background:#000;max-height:340px;"></video>
    <button class="btn btn-primary btn-block" id="cs-capture" style="margin-top:10px;">📸 Capture & Auto-Crop</button>
    <canvas id="cs-out" class="hidden" style="margin-top:12px;"></canvas>
    <div id="cs-actions" class="hidden" style="display:flex;gap:10px;margin-top:12px;">
      <button class="btn btn-outline btn-block" id="cs-jpg">Download JPG</button>
      <button class="btn btn-primary btn-block" id="cs-pdf">Download PDF</button>
    </div>
  `);
  const video = document.getElementById("cs-video");
  let stream = null, resultCanvas = null;
  navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" } })
    .then(s => { stream = s; video.srcObject = s; })
    .catch(() => showToast("Camera not available on this device."));

  document.getElementById("cs-capture").addEventListener("click", async () => {
    if (!stream) return;
    const c = document.createElement("canvas");
    c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext("2d").drawImage(video,0,0);
    resultCanvas = enhanceCanvas(autoCropCanvas(c, { threshold: 24 }), { brightness: 10, contrast: 16 });
    const out = document.getElementById("cs-out");
    out.width = resultCanvas.width; out.height = resultCanvas.height;
    out.getContext("2d").drawImage(resultCanvas, 0, 0);
    out.classList.remove("hidden");
    document.getElementById("cs-actions").classList.remove("hidden");
  });
  document.getElementById("cs-jpg").addEventListener("click", () => { if (resultCanvas) downloadDataURL(resultCanvas.toDataURL("image/jpeg",0.92), "scan.jpg"); });
  document.getElementById("cs-pdf").addEventListener("click", async () => {
    if (!resultCanvas) return;
    const { PDFDocument } = PDFLib;
    const doc = await PDFDocument.create();
    const blob = await canvasToBlob(resultCanvas, "image/jpeg", 0.92);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const img = await doc.embedJpg(bytes);
    const page = doc.addPage([img.width, img.height]);
    page.drawImage(img, { x:0, y:0, width: img.width, height: img.height });
    const out = await doc.save();
    downloadBlob(new Blob([out], { type:"application/pdf" }), "scan.pdf");
  });
  function stopStream(){ if (stream) stream.getTracks().forEach(t => t.stop()); }
  document.getElementById("modalClose").addEventListener("click", stopStream);
}
