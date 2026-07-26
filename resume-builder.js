/* ADP Digital Suite - Resume Builder
   Renders the resume as styled HTML and uses the browser's native print dialog
   (Save as PDF / Direct Print) so text - including Hindi - renders with correct fonts,
   without needing to bundle heavy custom font files. */

function open_resume_builder(){
  openModal("Resume Builder", `
    <div class="tabs">
      <button class="tab-btn active" data-tpl="modern">Modern (English)</button>
      <button class="tab-btn" data-tpl="classic">Classic (English)</button>
      <button class="tab-btn" data-tpl="hindi">Professional (Hindi)</button>
    </div>
    <div class="field"><label>Photo</label><input type="file" id="rb-photo" accept="image/*"></div>
    <div class="field"><label>Signature</label><input type="file" id="rb-sign" accept="image/*"></div>
    <div class="row-2">
      <div class="field"><label>Full Name</label><input type="text" id="rb-name"></div>
      <div class="field"><label>Date of Birth</label><input type="date" id="rb-dob"></div>
    </div>
    <div class="row-2">
      <div class="field"><label>Father's Name</label><input type="text" id="rb-father"></div>
      <div class="field"><label>Mother's Name</label><input type="text" id="rb-mother"></div>
    </div>
    <div class="row-2">
      <div class="field"><label>Gender</label><select id="rb-gender"><option>Male</option><option>Female</option><option>Other</option></select></div>
      <div class="field"><label>Marital Status</label><select id="rb-marital"><option>Single</option><option>Married</option></select></div>
    </div>
    <div class="field"><label>Address</label><textarea id="rb-address"></textarea></div>
    <div class="row-2">
      <div class="field"><label>Mobile Number</label><input type="text" id="rb-mobile"></div>
      <div class="field"><label>Email</label><input type="text" id="rb-email"></div>
    </div>
    <div class="field"><label>Career Objective</label><textarea id="rb-objective"></textarea></div>
    <div class="field"><label>Education (one per line)</label><textarea id="rb-education" placeholder="10th - ABC School - 2018&#10;12th - XYZ College - 2020"></textarea></div>
    <div class="field"><label>Experience (one per line)</label><textarea id="rb-experience"></textarea></div>
    <div class="field"><label>Skills (comma separated)</label><input type="text" id="rb-skills"></div>
    <div class="field"><label>Languages Known</label><input type="text" id="rb-languages"></div>
    <div class="field"><label>Certificates</label><textarea id="rb-certificates"></textarea></div>
    <div class="field"><label>Achievements</label><textarea id="rb-achievements"></textarea></div>
    <div class="field"><label>Hobbies</label><input type="text" id="rb-hobbies"></div>
    <div class="row-2">
      <div class="field"><label>Place</label><input type="text" id="rb-place"></div>
      <div class="field"><label>Date</label><input type="date" id="rb-date"></div>
    </div>
    <button class="btn btn-primary btn-block" id="rb-generate">Generate Resume Preview</button>
    <div id="rb-preview-wrap" style="margin-top:16px;"></div>
    <button class="btn btn-outline btn-block hidden" id="rb-print" style="margin-top:10px;">🖨️ Print / Save as PDF</button>
  `);

  document.querySelectorAll(".tab-btn[data-tpl]").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn[data-tpl]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }));
  document.getElementById("rb-date").valueAsDate = new Date();

  function getTemplate(){ return document.querySelector(".tab-btn[data-tpl].active").dataset.tpl; }

  async function collect(){
    const photo = document.getElementById("rb-photo").files[0];
    const sign = document.getElementById("rb-sign").files[0];
    return {
      photoUrl: photo ? await readAsDataURL(photo) : "",
      signUrl: sign ? await readAsDataURL(sign) : "",
      name: val("rb-name"), dob: val("rb-dob"), father: val("rb-father"), mother: val("rb-mother"),
      gender: val("rb-gender"), marital: val("rb-marital"), address: val("rb-address"),
      mobile: val("rb-mobile"), email: val("rb-email"), objective: val("rb-objective"),
      education: val("rb-education"), experience: val("rb-experience"), skills: val("rb-skills"),
      languages: val("rb-languages"), certificates: val("rb-certificates"), achievements: val("rb-achievements"),
      hobbies: val("rb-hobbies"), place: val("rb-place"), date: val("rb-date"),
    };
  }
  function val(id){ return document.getElementById(id).value.trim(); }
  function lines(t){ return t.split("\n").map(s=>s.trim()).filter(Boolean); }
  function esc(s){ return (s||"").replace(/</g,"&lt;"); }

  function renderEnglish(d, variant){
    const accent = variant === "modern" ? "#3b82f6" : "#1f2937";
    return `
      <div style="font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;padding:36px;background:#fff;max-width:720px;margin:0 auto;">
        <div style="display:flex;gap:20px;align-items:center;border-bottom:3px solid ${accent};padding-bottom:16px;margin-bottom:16px;">
          ${d.photoUrl ? `<img src="${d.photoUrl}" style="width:96px;height:96px;object-fit:cover;border-radius:${variant==='modern'?'50%':'6px'};">` : ""}
          <div>
            <h1 style="margin:0;font-size:26px;color:${accent};">${esc(d.name)||"Your Name"}</h1>
            <p style="margin:4px 0 0;font-size:13px;color:#555;">${esc(d.mobile)} ${d.mobile&&d.email?"•":""} ${esc(d.email)}</p>
            <p style="margin:2px 0 0;font-size:13px;color:#555;">${esc(d.address)}</p>
          </div>
        </div>
        ${d.objective ? sec("Career Objective", `<p style="font-size:13.5px;line-height:1.6;">${esc(d.objective)}</p>`, accent) : ""}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;font-size:13px;margin-bottom:14px;">
          ${row("Date of Birth", d.dob)}${row("Gender", d.gender)}${row("Father's Name", d.father)}${row("Mother's Name", d.mother)}${row("Marital Status", d.marital)}${row("Languages", d.languages)}
        </div>
        ${d.education ? sec("Education", listHtml(lines(d.education)), accent) : ""}
        ${d.experience ? sec("Experience", listHtml(lines(d.experience)), accent) : ""}
        ${d.skills ? sec("Skills", `<p style="font-size:13.5px;">${esc(d.skills)}</p>`, accent) : ""}
        ${d.certificates ? sec("Certificates", listHtml(lines(d.certificates)), accent) : ""}
        ${d.achievements ? sec("Achievements", listHtml(lines(d.achievements)), accent) : ""}
        ${d.hobbies ? sec("Hobbies", `<p style="font-size:13.5px;">${esc(d.hobbies)}</p>`, accent) : ""}
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:26px;">
          <div style="font-size:13px;">
            <p style="margin:0;"><b>Declaration:</b> I hereby declare that the above information is true to the best of my knowledge.</p>
            <p style="margin:8px 0 0;">Place: ${esc(d.place)} &nbsp;&nbsp; Date: ${esc(d.date)}</p>
          </div>
          ${d.signUrl ? `<img src="${d.signUrl}" style="height:50px;">` : ""}
        </div>
      </div>`;
  }
  function renderHindi(d){
    return `
      <div lang="hi" style="font-family:'Nirmala UI','Mangal','Noto Sans Devanagari',Arial,sans-serif;color:#1a1a1a;padding:36px;background:#fff;max-width:720px;margin:0 auto;">
        <div style="display:flex;gap:20px;align-items:center;border-bottom:3px solid #6d28d9;padding-bottom:16px;margin-bottom:16px;">
          ${d.photoUrl ? `<img src="${d.photoUrl}" style="width:96px;height:96px;object-fit:cover;border-radius:6px;">` : ""}
          <div>
            <h1 style="margin:0;font-size:24px;color:#6d28d9;">${esc(d.name)||"आपका नाम"}</h1>
            <p style="margin:4px 0 0;font-size:13px;color:#555;">मोबाइल: ${esc(d.mobile)} &nbsp; ईमेल: ${esc(d.email)}</p>
            <p style="margin:2px 0 0;font-size:13px;color:#555;">पता: ${esc(d.address)}</p>
          </div>
        </div>
        ${d.objective ? sec("कैरियर उद्देश्य", `<p style="font-size:13.5px;line-height:1.6;">${esc(d.objective)}</p>`, "#6d28d9") : ""}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;font-size:13px;margin-bottom:14px;">
          ${row("जन्म तिथि", d.dob)}${row("लिंग", d.gender)}${row("पिता का नाम", d.father)}${row("माता का नाम", d.mother)}${row("वैवाहिक स्थिति", d.marital)}${row("भाषाएं", d.languages)}
        </div>
        ${d.education ? sec("शिक्षा", listHtml(lines(d.education)), "#6d28d9") : ""}
        ${d.experience ? sec("अनुभव", listHtml(lines(d.experience)), "#6d28d9") : ""}
        ${d.skills ? sec("कौशल", `<p style="font-size:13.5px;">${esc(d.skills)}</p>`, "#6d28d9") : ""}
        ${d.certificates ? sec("प्रमाण पत्र", listHtml(lines(d.certificates)), "#6d28d9") : ""}
        ${d.achievements ? sec("उपलब्धियां", listHtml(lines(d.achievements)), "#6d28d9") : ""}
        ${d.hobbies ? sec("शौक", `<p style="font-size:13.5px;">${esc(d.hobbies)}</p>`, "#6d28d9") : ""}
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:26px;">
          <div style="font-size:13px;">
            <p style="margin:0;"><b>घोषणा:</b> मैं घोषणा करता/करती हूं कि उपरोक्त जानकारी मेरी सर्वोत्तम जानकारी अनुसार सत्य है।</p>
            <p style="margin:8px 0 0;">स्थान: ${esc(d.place)} &nbsp;&nbsp; दिनांक: ${esc(d.date)}</p>
          </div>
          ${d.signUrl ? `<img src="${d.signUrl}" style="height:50px;">` : ""}
        </div>
      </div>`;
  }
  function sec(title, html, accent){ return `<div style="margin-bottom:14px;"><h3 style="font-size:14px;color:${accent};border-bottom:1px solid #ddd;padding-bottom:4px;margin:0 0 8px;">${title}</h3>${html}</div>`; }
  function row(label, val){ return `<div><b>${label}:</b> ${esc(val)}</div>`; }
  function listHtml(arr){ return `<ul style="margin:0;padding-left:18px;font-size:13.5px;line-height:1.6;">${arr.map(l=>`<li>${esc(l)}</li>`).join("")}</ul>`; }

  let lastHtml = "";
  document.getElementById("rb-generate").addEventListener("click", async () => {
    if (!val("rb-name")) return showToast("Enter at least the full name.");
    const d = await collect();
    const tpl = getTemplate();
    lastHtml = tpl === "hindi" ? renderHindi(d) : renderEnglish(d, tpl);
    document.getElementById("rb-preview-wrap").innerHTML = `<div style="border:1px solid var(--panel-border);border-radius:12px;overflow:hidden;">${lastHtml}</div>`;
    document.getElementById("rb-print").classList.remove("hidden");
  });
  document.getElementById("rb-print").addEventListener("click", () => {
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>Resume</title><style>@page{margin:0;} body{margin:0;}</style></head><body>${lastHtml}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  });
}
