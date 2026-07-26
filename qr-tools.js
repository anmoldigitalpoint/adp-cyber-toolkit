/* ADP Digital Suite - QR & Barcode tools */

function open_qr_generator(){
  openModal("QR Generator", `
    <div class="field"><label>Text, link, or contact info</label><textarea id="qr-text" placeholder="https://example.com"></textarea></div>
    <div class="row-2">
      <div class="field"><label>Size</label><select id="qr-size"><option value="200">Small (200px)</option><option value="300" selected>Medium (300px)</option><option value="400">Large (400px)</option></select></div>
      <div class="field"><label>Color</label><input type="text" id="qr-color" value="#000000"></div>
    </div>
    <div id="qr-out" style="display:flex;justify-content:center;padding:14px;background:#fff;border-radius:12px;min-height:80px;"></div>
    <button class="btn btn-primary btn-block hidden" id="qr-dl" style="margin-top:12px;">Download QR Code</button>
  `);
  const out = document.getElementById("qr-out");
  let lastCanvas = null;
  function generate(){
    const text = document.getElementById("qr-text").value.trim();
    if (!text) { out.innerHTML = ""; document.getElementById("qr-dl").classList.add("hidden"); return; }
    out.innerHTML = "";
    const size = parseInt(document.getElementById("qr-size").value,10) || 300;
    const color = document.getElementById("qr-color").value || "#000000";
    new QRCode(out, { text, width: size, height: size, colorDark: color, colorLight: "#ffffff" });
    setTimeout(() => {
      lastCanvas = out.querySelector("canvas") || out.querySelector("img");
      document.getElementById("qr-dl").classList.remove("hidden");
    }, 60);
  }
  document.getElementById("qr-text").addEventListener("input", generate);
  document.getElementById("qr-size").addEventListener("change", generate);
  document.getElementById("qr-color").addEventListener("input", generate);
  document.getElementById("qr-dl").addEventListener("click", () => {
    if (!lastCanvas) return;
    const url = lastCanvas.tagName === "CANVAS" ? lastCanvas.toDataURL("image/png") : lastCanvas.src;
    downloadDataURL(url, "qr-code.png");
  });
}

function open_qr_scanner(){
  openModal("QR Scanner", `
    <div class="tabs">
      <button class="tab-btn active" id="qs-tab-cam">📷 Camera</button>
      <button class="tab-btn" id="qs-tab-img">🖼️ Upload Image</button>
    </div>
    <div id="qs-cam-panel">
      <video id="qs-video" autoplay playsinline style="width:100%;border-radius:12px;background:#000;max-height:300px;"></video>
    </div>
    <div id="qs-img-panel" class="hidden">
      <div class="drop-zone" id="qs-drop">🖼️ Click or drop a QR code image</div>
      <input type="file" id="qs-input" accept="image/*" class="hidden">
    </div>
    <div id="qs-result" class="result-box hidden"></div>
  `);
  let stream = null, raf = null;
  const video = document.getElementById("qs-video");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  function showResult(text){
    const box = document.getElementById("qs-result");
    box.classList.remove("hidden");
    const isLink = /^https?:\/\//i.test(text);
    box.innerHTML = `✅ Found: <b>${text.replace(/</g,"&lt;")}</b>` + (isLink ? ` <a href="${text}" target="_blank" rel="noopener" class="btn btn-sm btn-outline">Open Link</a>` : "");
  }

  function scanFrame(){
    if (video.readyState === video.HAVE_ENOUGH_DATA){
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const img = ctx.getImageData(0,0,canvas.width, canvas.height);
      const code = jsQR(img.data, img.width, img.height);
      if (code) { showResult(code.data); cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach(t=>t.stop()); return; }
    }
    raf = requestAnimationFrame(scanFrame);
  }
  navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" } })
    .then(s => { stream = s; video.srcObject = s; raf = requestAnimationFrame(scanFrame); })
    .catch(() => showToast("Camera not available — try Upload Image instead."));

  wireDropZone(document.getElementById("qs-drop"), document.getElementById("qs-input"), async (files) => {
    const f = files[0]; if (!f) return;
    const img = await loadImage(await readAsDataURL(f));
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    ctx.drawImage(img,0,0);
    const data = ctx.getImageData(0,0,canvas.width,canvas.height);
    const code = jsQR(data.data, data.width, data.height);
    if (code) showResult(code.data); else showToast("No QR code detected in that image.");
  });

  document.getElementById("qs-tab-cam").addEventListener("click", () => {
    document.getElementById("qs-tab-cam").classList.add("active"); document.getElementById("qs-tab-img").classList.remove("active");
    document.getElementById("qs-cam-panel").classList.remove("hidden"); document.getElementById("qs-img-panel").classList.add("hidden");
  });
  document.getElementById("qs-tab-img").addEventListener("click", () => {
    document.getElementById("qs-tab-img").classList.add("active"); document.getElementById("qs-tab-cam").classList.remove("active");
    document.getElementById("qs-img-panel").classList.remove("hidden"); document.getElementById("qs-cam-panel").classList.add("hidden");
    if (stream) stream.getTracks().forEach(t=>t.stop());
    if (raf) cancelAnimationFrame(raf);
  });
  document.getElementById("modalClose").addEventListener("click", () => {
    if (stream) stream.getTracks().forEach(t=>t.stop());
    if (raf) cancelAnimationFrame(raf);
  });
}

function open_barcode_generator(){
  openModal("Barcode Generator", `
    <div class="field"><label>Value</label><input type="text" id="bc-text" value="123456789012" placeholder="Enter numbers/text"></div>
    <div class="field"><label>Format</label>
      <select id="bc-format">
        <option value="CODE128">CODE128 (any text)</option>
        <option value="EAN13">EAN-13 (13 digits)</option>
        <option value="UPC">UPC (12 digits)</option>
        <option value="CODE39">CODE39</option>
      </select>
    </div>
    <div style="background:#fff;border-radius:12px;padding:14px;display:flex;justify-content:center;"><svg id="bc-svg"></svg></div>
    <button class="btn btn-primary btn-block" id="bc-dl" style="margin-top:12px;">Download Barcode</button>
  `);
  function render(){
    const text = document.getElementById("bc-text").value.trim();
    const format = document.getElementById("bc-format").value;
    if (!text) return;
    try {
      JsBarcode("#bc-svg", text, { format, lineColor: "#000", width: 2, height: 80, displayValue: true });
    } catch(e){ showToast("That value isn't valid for the selected format."); }
  }
  document.getElementById("bc-text").addEventListener("input", render);
  document.getElementById("bc-format").addEventListener("change", render);
  render();
  document.getElementById("bc-dl").addEventListener("click", () => {
    const svg = document.getElementById("bc-svg");
    const xml = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([xml], { type: "image/svg+xml" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = img.width || 400; c.height = img.height || 160;
      const ctx = c.getContext("2d"); ctx.fillStyle="#fff"; ctx.fillRect(0,0,c.width,c.height); ctx.drawImage(img,0,0);
      downloadDataURL(c.toDataURL("image/png"), "barcode.png");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}
