/* ADP Digital Suite - PDF tools (pdf-lib for editing, pdf.js for rendering/preview) */

function wireDropZone(zoneEl, inputEl, onFiles){
  zoneEl.addEventListener("click", () => inputEl.click());
  inputEl.addEventListener("change", () => onFiles(Array.from(inputEl.files)));
  ["dragenter","dragover"].forEach(ev => zoneEl.addEventListener(ev, (e) => { e.preventDefault(); zoneEl.classList.add("drag"); }));
  ["dragleave","drop"].forEach(ev => zoneEl.addEventListener(ev, (e) => { e.preventDefault(); zoneEl.classList.remove("drag"); }));
  zoneEl.addEventListener("drop", (e) => onFiles(Array.from(e.dataTransfer.files)));
}

async function pdfToPageImages(arrayBuffer, scale = 1.3){
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images = [];
  for (let i = 1; i <= pdf.numPages; i++){
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width; canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    images.push(canvas);
  }
  return images;
}

/* ---------------- Image to PDF ---------------- */
function open_image_to_pdf(){
  openModal("Image to PDF", `
    <div class="drop-zone" id="pt-drop">📤 Click or drop images here (JPG / PNG) — multiple allowed</div>
    <input type="file" id="pt-input" accept="image/*" multiple class="hidden">
    <div class="file-list" id="pt-list"></div>
    <div class="field" style="margin-top:14px;">
      <label>Page size</label>
      <select id="pt-size"><option value="a4">A4</option><option value="fit">Fit to image</option></select>
    </div>
    <button class="btn btn-primary btn-block" id="pt-go" style="margin-top:6px;">Create PDF</button>
    <div id="pt-result"></div>
  `);
  let files = [];
  const list = document.getElementById("pt-list");
  wireDropZone(document.getElementById("pt-drop"), document.getElementById("pt-input"), async (newFiles) => {
    files = files.concat(newFiles);
    list.innerHTML = "";
    for (const f of files){
      const url = await readAsDataURL(f);
      const row = document.createElement("div");
      row.className = "file-chip";
      row.innerHTML = `<img src="${url}"><span class="fc-name">${f.name}</span><span>${fmtBytes(f.size)}</span>`;
      list.appendChild(row);
    }
  });
  document.getElementById("pt-go").addEventListener("click", async () => {
    if (!files.length) return showToast("Add at least one image first.");
    const { PDFDocument } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const fit = document.getElementById("pt-size").value === "fit";
    for (const f of files){
      const bytes = await readAsArrayBuffer(f);
      const isPng = f.type.includes("png");
      const img = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
      let pw = 595.28, ph = 841.89; // A4 pt
      if (fit) { pw = img.width; ph = img.height; }
      const page = pdfDoc.addPage([pw, ph]);
      const scale = Math.min(pw / img.width, ph / img.height);
      const w = img.width * scale, h = img.height * scale;
      page.drawImage(img, { x: (pw - w)/2, y: (ph - h)/2, width: w, height: h });
    }
    const bytes = await pdfDoc.save();
    downloadBlob(new Blob([bytes], { type:"application/pdf" }), "images-to-pdf.pdf");
    document.getElementById("pt-result").innerHTML = `<div class="result-box">✅ PDF created with ${files.length} page(s) and downloaded.</div>`;
  });
}

/* ---------------- PDF to Image ---------------- */
function open_pdf_to_image(){
  openModal("PDF to Image", `
    <div class="drop-zone" id="pt-drop">📄 Click or drop a PDF file here</div>
    <input type="file" id="pt-input" accept="application/pdf" class="hidden">
    <div class="field" style="margin-top:14px;">
      <label>Output format</label>
      <select id="pt-fmt"><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select>
    </div>
    <div id="pt-thumbs" class="thumb-grid"></div>
    <button class="btn btn-primary btn-block hidden" id="pt-zip" style="margin-top:14px;">Download all as ZIP</button>
  `);
  let canvases = [];
  wireDropZone(document.getElementById("pt-drop"), document.getElementById("pt-input"), async (files) => {
    const f = files[0]; if (!f) return;
    showToast("Rendering pages...");
    const buf = await readAsArrayBuffer(f);
    canvases = await pdfToPageImages(buf, 1.5);
    const thumbs = document.getElementById("pt-thumbs");
    thumbs.innerHTML = canvases.map((c,i) => `<div class="thumb"><img src="${c.toDataURL('image/jpeg',0.85)}"><span class="thumb-num">Page ${i+1}</span></div>`).join("");
    document.getElementById("pt-zip").classList.remove("hidden");
  });
  document.getElementById("pt-zip").addEventListener("click", async () => {
    if (!canvases.length) return;
    const fmt = document.getElementById("pt-fmt").value;
    const ext = fmt === "image/png" ? "png" : "jpg";
    const zip = new JSZip();
    for (let i = 0; i < canvases.length; i++){
      const blob = await canvasToBlob(canvases[i], fmt, 0.9);
      zip.file(`page-${i+1}.${ext}`, blob);
    }
    const zipBlob = await zip.generateAsync({ type:"blob" });
    downloadBlob(zipBlob, "pdf-pages.zip");
  });
}

/* ---------------- Merge PDF ---------------- */
function open_merge_pdf(){
  openModal("Merge PDF", `
    <div class="drop-zone" id="pt-drop">📄 Click or drop two or more PDF files</div>
    <input type="file" id="pt-input" accept="application/pdf" multiple class="hidden">
    <div class="file-list" id="pt-list"></div>
    <button class="btn btn-primary btn-block" id="pt-go" style="margin-top:14px;">Merge PDFs</button>
    <div id="pt-result"></div>
  `);
  let files = [];
  const list = document.getElementById("pt-list");
  const renderList = () => {
    list.innerHTML = files.map((f,i) => `<div class="file-chip"><span class="fc-name">${i+1}. ${f.name}</span><span>${fmtBytes(f.size)}</span></div>`).join("");
  };
  wireDropZone(document.getElementById("pt-drop"), document.getElementById("pt-input"), (nf) => { files = files.concat(nf); renderList(); });
  document.getElementById("pt-go").addEventListener("click", async () => {
    if (files.length < 2) return showToast("Add at least two PDF files.");
    const { PDFDocument } = PDFLib;
    const merged = await PDFDocument.create();
    for (const f of files){
      const bytes = await readAsArrayBuffer(f);
      const src = await PDFDocument.load(bytes);
      const pages = await merged.copyPages(src, src.getPageIndices());
      pages.forEach(p => merged.addPage(p));
    }
    const bytes = await merged.save();
    downloadBlob(new Blob([bytes], { type:"application/pdf" }), "merged.pdf");
    document.getElementById("pt-result").innerHTML = `<div class="result-box">✅ Merged ${files.length} files and downloaded.</div>`;
  });
}

/* ---------------- Split PDF ---------------- */
function open_split_pdf(){
  openModal("Split PDF", `
    <div class="drop-zone" id="pt-drop">📄 Click or drop a PDF file here</div>
    <input type="file" id="pt-input" accept="application/pdf" class="hidden">
    <div class="field" style="margin-top:14px;">
      <label>Page range (e.g. 1-3,5)</label>
      <input type="text" id="pt-range" placeholder="e.g. 1-3,5">
    </div>
    <div class="hint" id="pt-pages"></div>
    <button class="btn btn-primary btn-block" id="pt-go" style="margin-top:10px;">Split & Download</button>
    <div id="pt-result"></div>
  `);
  let srcBytes = null, numPages = 0;
  wireDropZone(document.getElementById("pt-drop"), document.getElementById("pt-input"), async (files) => {
    const f = files[0]; if (!f) return;
    srcBytes = await readAsArrayBuffer(f);
    const doc = await PDFLib.PDFDocument.load(srcBytes);
    numPages = doc.getPageCount();
    document.getElementById("pt-pages").textContent = `This PDF has ${numPages} pages.`;
  });
  function parseRange(str, max){
    const out = new Set();
    str.split(",").forEach(part => {
      part = part.trim(); if (!part) return;
      if (part.includes("-")){
        const [a,b] = part.split("-").map(n => parseInt(n.trim(),10));
        for (let i=a; i<=b; i++) if (i>=1 && i<=max) out.add(i-1);
      } else {
        const n = parseInt(part,10); if (n>=1 && n<=max) out.add(n-1);
      }
    });
    return Array.from(out).sort((a,b)=>a-b);
  }
  document.getElementById("pt-go").addEventListener("click", async () => {
    if (!srcBytes) return showToast("Add a PDF first.");
    const idxs = parseRange(document.getElementById("pt-range").value, numPages);
    if (!idxs.length) return showToast("Enter a valid page range.");
    const { PDFDocument } = PDFLib;
    const src = await PDFDocument.load(srcBytes);
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, idxs);
    pages.forEach(p => out.addPage(p));
    const bytes = await out.save();
    downloadBlob(new Blob([bytes], { type:"application/pdf" }), "split.pdf");
    document.getElementById("pt-result").innerHTML = `<div class="result-box">✅ Extracted ${idxs.length} page(s) and downloaded.</div>`;
  });
}

/* ---------------- Compress PDF ---------------- */
function open_compress_pdf(){
  openModal("Compress PDF", `
    <div class="drop-zone" id="pt-drop">📄 Click or drop a PDF file here</div>
    <input type="file" id="pt-input" accept="application/pdf" class="hidden">
    <div class="field" style="margin-top:14px;">
      <label>Compression level: <span id="pt-qlabel">Medium</span></label>
      <input type="range" id="pt-q" min="0.35" max="0.85" step="0.05" value="0.6">
    </div>
    <div class="hint">Pages are re-rendered as images at the chosen quality, which usually shrinks scanned/photo-heavy PDFs significantly. Text-only PDFs may not shrink much.</div>
    <button class="btn btn-primary btn-block" id="pt-go" style="margin-top:10px;">Compress & Download</button>
    <div class="progress-bar hidden" id="pt-bar"><div id="pt-bar-fill"></div></div>
    <div id="pt-result"></div>
  `);
  let file = null;
  wireDropZone(document.getElementById("pt-drop"), document.getElementById("pt-input"), (files) => { file = files[0]; });
  document.getElementById("pt-q").addEventListener("input", (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById("pt-qlabel").textContent = v < 0.5 ? "High (smaller file)" : v < 0.7 ? "Medium" : "Low (better quality)";
  });
  document.getElementById("pt-go").addEventListener("click", async () => {
    if (!file) return showToast("Add a PDF first.");
    const bar = document.getElementById("pt-bar"); bar.classList.remove("hidden");
    const originalSize = file.size;
    const buf = await readAsArrayBuffer(file);
    const pageCanvases = await pdfToPageImages(buf, 1.15);
    const q = parseFloat(document.getElementById("pt-q").value);
    const { PDFDocument } = PDFLib;
    const out = await PDFDocument.create();
    for (let i=0; i<pageCanvases.length; i++){
      const jpgBlob = await canvasToBlob(pageCanvases[i], "image/jpeg", q);
      const jpgBytes = new Uint8Array(await jpgBlob.arrayBuffer());
      const img = await out.embedJpg(jpgBytes);
      const page = out.addPage([img.width, img.height]);
      page.drawImage(img, { x:0, y:0, width: img.width, height: img.height });
      setProgress(document.getElementById("pt-bar-fill"), ((i+1)/pageCanvases.length)*100);
    }
    const bytes = await out.save();
    const newSize = bytes.byteLength;
    downloadBlob(new Blob([bytes], { type:"application/pdf" }), "compressed.pdf");
    const pct = Math.max(0, Math.round((1 - newSize/originalSize) * 100));
    document.getElementById("pt-result").innerHTML = `<div class="result-box">✅ ${fmtBytes(originalSize)} → ${fmtBytes(newSize)} (${pct}% smaller). Downloaded.</div>`;
  });
}

/* ---------------- Rotate PDF ---------------- */
function open_rotate_pdf(){
  openModal("Rotate PDF", `
    <div class="drop-zone" id="pt-drop">📄 Click or drop a PDF file here</div>
    <input type="file" id="pt-input" accept="application/pdf" class="hidden">
    <div class="field" style="margin-top:14px;">
      <label>Rotate</label>
      <select id="pt-deg"><option value="90">90° clockwise</option><option value="180">180°</option><option value="270">90° counter-clockwise</option></select>
    </div>
    <div class="field">
      <label>Apply to</label>
      <select id="pt-scope"><option value="all">All pages</option><option value="one">Single page number</option></select>
    </div>
    <input type="number" id="pt-pagenum" placeholder="Page number" class="hidden" min="1">
    <button class="btn btn-primary btn-block" id="pt-go" style="margin-top:10px;">Rotate & Download</button>
    <div id="pt-result"></div>
  `);
  let file = null;
  wireDropZone(document.getElementById("pt-drop"), document.getElementById("pt-input"), (files) => { file = files[0]; });
  document.getElementById("pt-scope").addEventListener("change", (e) => {
    document.getElementById("pt-pagenum").classList.toggle("hidden", e.target.value !== "one");
  });
  document.getElementById("pt-go").addEventListener("click", async () => {
    if (!file) return showToast("Add a PDF first.");
    const { PDFDocument, degrees } = PDFLib;
    const bytes = await readAsArrayBuffer(file);
    const doc = await PDFDocument.load(bytes);
    const deg = parseInt(document.getElementById("pt-deg").value, 10);
    const scope = document.getElementById("pt-scope").value;
    const pages = doc.getPages();
    if (scope === "all") {
      pages.forEach(p => p.setRotation(degrees((p.getRotation().angle + deg) % 360)));
    } else {
      const n = parseInt(document.getElementById("pt-pagenum").value, 10);
      if (!n || n < 1 || n > pages.length) return showToast("Enter a valid page number.");
      const p = pages[n-1];
      p.setRotation(degrees((p.getRotation().angle + deg) % 360));
    }
    const out = await doc.save();
    downloadBlob(new Blob([out], { type:"application/pdf" }), "rotated.pdf");
    document.getElementById("pt-result").innerHTML = `<div class="result-box">✅ Rotated and downloaded.</div>`;
  });
}

/* ---------------- Watermark PDF ---------------- */
function open_watermark_pdf(){
  openModal("Watermark PDF", `
    <div class="drop-zone" id="pt-drop">📄 Click or drop a PDF file here</div>
    <input type="file" id="pt-input" accept="application/pdf" class="hidden">
    <div class="field" style="margin-top:14px;"><label>Watermark text</label><input type="text" id="pt-text" placeholder="e.g. ANMOL DIGITAL POINT"></div>
    <div class="row-2">
      <div class="field"><label>Opacity</label><input type="range" id="pt-op" min="0.1" max="0.6" step="0.05" value="0.25"></div>
      <div class="field"><label>Font size</label><input type="number" id="pt-fs" value="48"></div>
    </div>
    <button class="btn btn-primary btn-block" id="pt-go">Add Watermark & Download</button>
    <div id="pt-result"></div>
  `);
  let file = null;
  wireDropZone(document.getElementById("pt-drop"), document.getElementById("pt-input"), (files) => { file = files[0]; });
  document.getElementById("pt-go").addEventListener("click", async () => {
    if (!file) return showToast("Add a PDF first.");
    const text = document.getElementById("pt-text").value.trim();
    if (!text) return showToast("Enter watermark text.");
    const { PDFDocument, rgb, degrees, StandardFonts } = PDFLib;
    const bytes = await readAsArrayBuffer(file);
    const doc = await PDFDocument.load(bytes);
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const opacity = parseFloat(document.getElementById("pt-op").value);
    const size = parseInt(document.getElementById("pt-fs").value, 10) || 48;
    doc.getPages().forEach(page => {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: width/2 - textWidth/2, y: height/2, size, font,
        color: rgb(0.5,0.5,0.6), opacity, rotate: degrees(35),
      });
    });
    const out = await doc.save();
    downloadBlob(new Blob([out], { type:"application/pdf" }), "watermarked.pdf");
    document.getElementById("pt-result").innerHTML = `<div class="result-box">✅ Watermark added and downloaded.</div>`;
  });
}

/* ---------------- Remove / Extract / Reorder pages (shared page-manager UI) ---------------- */
function pageManagerModal(title, mode){
  openModal(title, `
    <div class="drop-zone" id="pt-drop">📄 Click or drop a PDF file here</div>
    <input type="file" id="pt-input" accept="application/pdf" class="hidden">
    <div class="hint" id="pt-hint">${mode === "remove" ? "Click pages to mark them for removal." : mode === "extract" ? "Click pages to select which ones to keep." : "Drag thumbnails to reorder, then save."}</div>
    <div class="thumb-grid" id="pt-thumbs"></div>
    <button class="btn btn-primary btn-block hidden" id="pt-go" style="margin-top:14px;"></button>
    <div id="pt-result"></div>
  `);
  document.getElementById("pt-go").textContent = mode === "remove" ? "Remove Selected & Download" : mode === "extract" ? "Extract Selected & Download" : "Save New Order & Download";

  let srcBytes = null;
  let order = []; // array of original page indices in current order
  const selected = new Set();

  wireDropZone(document.getElementById("pt-drop"), document.getElementById("pt-input"), async (files) => {
    const f = files[0]; if (!f) return;
    srcBytes = await readAsArrayBuffer(f);
    const canvases = await pdfToPageImages(srcBytes, 0.6);
    order = canvases.map((_, i) => i);
    renderThumbs(canvases);
    document.getElementById("pt-go").classList.remove("hidden");
  });

  let dragFrom = null;
  function renderThumbs(canvases){
    const grid = document.getElementById("pt-thumbs");
    grid.innerHTML = "";
    order.forEach((origIdx, pos) => {
      const div = document.createElement("div");
      div.className = "thumb";
      div.draggable = mode === "reorder";
      div.dataset.orig = origIdx;
      div.innerHTML = `<img src="${canvases[origIdx].toDataURL('image/jpeg',0.7)}"><span class="thumb-num">${pos+1}</span>`;
      if (mode !== "reorder"){
        div.style.cursor = "pointer";
        div.style.outline = selected.has(origIdx) ? "3px solid var(--blue)" : "none";
        div.addEventListener("click", () => {
          if (selected.has(origIdx)) selected.delete(origIdx); else selected.add(origIdx);
          renderThumbs(canvases);
        });
      } else {
        div.addEventListener("dragstart", () => dragFrom = pos);
        div.addEventListener("dragover", (e) => e.preventDefault());
        div.addEventListener("drop", () => {
          const item = order.splice(dragFrom, 1)[0];
          order.splice(pos, 0, item);
          renderThumbs(canvases);
        });
      }
      grid.appendChild(div);
    });
  }

  document.getElementById("pt-go").addEventListener("click", async () => {
    if (!srcBytes) return;
    const { PDFDocument } = PDFLib;
    const src = await PDFDocument.load(srcBytes);
    const out = await PDFDocument.create();
    let keepIdxs;
    if (mode === "remove") keepIdxs = order.filter(i => !selected.has(i));
    else if (mode === "extract") keepIdxs = order.filter(i => selected.has(i));
    else keepIdxs = order; // reorder = keep all, new order

    if (!keepIdxs.length) return showToast("Select at least one page.");
    const pages = await out.copyPages(src, keepIdxs);
    pages.forEach(p => out.addPage(p));
    const bytes = await out.save();
    downloadBlob(new Blob([bytes], { type:"application/pdf" }), mode + "-result.pdf");
    document.getElementById("pt-result").innerHTML = `<div class="result-box">✅ Done — ${keepIdxs.length} page(s) saved and downloaded.</div>`;
  });
}
function open_remove_pages(){ pageManagerModal("Remove Pages", "remove"); }
function open_extract_pages(){ pageManagerModal("Extract Pages", "extract"); }
function open_reorder_pages(){ pageManagerModal("Reorder Pages", "reorder"); }

/* ---------------- Preview PDF ---------------- */
function open_preview_pdf(){
  openModal("Preview PDF", `
    <div class="drop-zone" id="pt-drop">📄 Click or drop a PDF file here</div>
    <input type="file" id="pt-input" accept="application/pdf" class="hidden">
    <div class="thumb-grid" id="pt-thumbs" style="margin-top:14px;"></div>
  `);
  wireDropZone(document.getElementById("pt-drop"), document.getElementById("pt-input"), async (files) => {
    const f = files[0]; if (!f) return;
    const buf = await readAsArrayBuffer(f);
    const canvases = await pdfToPageImages(buf, 0.8);
    document.getElementById("pt-thumbs").innerHTML = canvases.map((c,i) => `<div class="thumb"><img src="${c.toDataURL('image/jpeg',0.8)}"><span class="thumb-num">Page ${i+1}</span></div>`).join("");
  });
}
