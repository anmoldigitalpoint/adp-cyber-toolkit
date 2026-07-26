/* ADP Digital Suite - Tool catalog
   Each tool: id, name, desc, category, icon (emoji), color class, ready (true = fully working),
   and open() which renders the tool's modal body (implemented in the matching *-tools.js file). */

const CATEGORIES = [
  { id: "pdf",     name: "PDF Tools",     icon: "📄", color: "ic-red",    count: 13 },
  { id: "image",   name: "Image Tools",   icon: "🖼️", color: "ic-green",  count: 12 },
  { id: "idcard",  name: "ID Card Tools", icon: "🪪", color: "ic-orange", count: 3 },
  { id: "resume",  name: "Resume Builder",icon: "📃", color: "ic-purple", count: 1 },
  { id: "scanner", name: "Scanner Tools", icon: "🖨️", color: "ic-blue",   count: 5 },
  { id: "utility", name: "Utility Tools", icon: "🧰", color: "ic-teal",   count: 8 },
  { id: "qr",      name: "QR & Barcode",  icon: "🔗", color: "ic-pink",   count: 3 },
];

const TOOLS = [
  // ---------------- PDF TOOLS ----------------
  { id:"image-to-pdf", name:"Image to PDF", desc:"Convert single or multiple images into one PDF file.", cat:"pdf", icon:"🖼️", color:"ic-red", ready:true },
  { id:"pdf-to-image", name:"PDF to Image", desc:"Convert every PDF page into JPG or PNG images.", cat:"pdf", icon:"📤", color:"ic-red", ready:true },
  { id:"merge-pdf", name:"Merge PDF", desc:"Combine multiple PDF files into a single document.", cat:"pdf", icon:"➕", color:"ic-red", ready:true },
  { id:"split-pdf", name:"Split PDF", desc:"Split a PDF into separate files by page range.", cat:"pdf", icon:"✂️", color:"ic-red", ready:true },
  { id:"compress-pdf", name:"Compress PDF", desc:"Reduce PDF file size by re-optimising pages.", cat:"pdf", icon:"📉", color:"ic-red", ready:true },
  { id:"rotate-pdf", name:"Rotate PDF", desc:"Rotate one or all pages of a PDF.", cat:"pdf", icon:"🔄", color:"ic-red", ready:true },
  { id:"watermark-pdf", name:"Watermark PDF", desc:"Stamp a custom text watermark across every page.", cat:"pdf", icon:"💧", color:"ic-red", ready:true },
  { id:"protect-pdf", name:"Protect PDF", desc:"Add a password to a PDF file.", cat:"pdf", icon:"🔒", color:"ic-red", ready:false, note:"Reliable password encryption needs a proper crypto library we haven't wired in safely yet - coming in an update rather than shipping a half-working lock." },
  { id:"unlock-pdf", name:"Unlock PDF", desc:"Remove a known password from your own PDF.", cat:"pdf", icon:"🔓", color:"ic-red", ready:false, note:"Same as Protect PDF - proper handling of encrypted PDFs is on the roadmap." },
  { id:"remove-pages", name:"Remove Pages", desc:"Delete specific pages from a PDF.", cat:"pdf", icon:"🗑️", color:"ic-red", ready:true },
  { id:"extract-pages", name:"Extract Pages", desc:"Pull out selected pages into a new PDF.", cat:"pdf", icon:"📑", color:"ic-red", ready:true },
  { id:"reorder-pages", name:"Reorder Pages", desc:"Drag and rearrange PDF pages.", cat:"pdf", icon:"🔀", color:"ic-red", ready:true },
  { id:"preview-pdf", name:"Preview PDF", desc:"Open and view a PDF page by page.", cat:"pdf", icon:"👁️", color:"ic-red", ready:true },

  // ---------------- IMAGE TOOLS ----------------
  { id:"image-resize", name:"Image Resize", desc:"Resize an image to exact width and height.", cat:"image", icon:"📐", color:"ic-green", ready:true },
  { id:"image-compress", name:"Image Compress", desc:"Shrink image file size with a quality slider.", cat:"image", icon:"📉", color:"ic-green", ready:true },
  { id:"image-crop", name:"Image Crop", desc:"Crop an image to any custom rectangle.", cat:"image", icon:"✂️", color:"ic-green", ready:true },
  { id:"image-enhance", name:"Image Enhancement", desc:"Adjust brightness, contrast and sharpness.", cat:"image", icon:"✨", color:"ic-green", ready:true },
  { id:"bg-remover", name:"Background Remover", desc:"Remove a plain background from a photo.", cat:"image", icon:"🪄", color:"ic-green", ready:false, note:"Needs an AI model - marked as coming soon rather than faked." },
  { id:"jpg-to-png", name:"JPG to PNG", desc:"Convert JPG images to PNG format.", cat:"image", icon:"🔁", color:"ic-green", ready:true },
  { id:"png-to-jpg", name:"PNG to JPG", desc:"Convert PNG images to JPG format.", cat:"image", icon:"🔁", color:"ic-green", ready:true },
  { id:"webp-converter", name:"WEBP Converter", desc:"Convert images to or from WEBP.", cat:"image", icon:"🔁", color:"ic-green", ready:true },
  { id:"dpi-checker", name:"DPI Checker", desc:"Check the resolution and DPI of an image.", cat:"image", icon:"🔍", color:"ic-green", ready:true },
  { id:"signature-crop", name:"Signature Crop", desc:"Auto-trim empty space around a signature.", cat:"image", icon:"✍️", color:"ic-green", ready:true },
  { id:"image-format-converter", name:"Format Converter", desc:"Convert between JPG, PNG and WEBP.", cat:"image", icon:"🔁", color:"ic-green", ready:true },

  // ---------------- ID CARD TOOLS ----------------
  { id:"passport-photo", name:"Passport Photo Maker", desc:"Generate print-ready passport/visa photo sheets.", cat:"idcard", icon:"👤", color:"ic-orange", ready:true },
  { id:"smart-id-print", name:"Smart ID Card Auto Print", desc:"Auto-crop front & back of any ID card onto an A4 sheet.", cat:"idcard", icon:"🪪", color:"ic-orange", ready:true },

  // ---------------- RESUME BUILDER ----------------
  { id:"resume-builder", name:"Resume Builder", desc:"Fill one form, get a print-ready resume in 3 templates.", cat:"resume", icon:"📃", color:"ic-purple", ready:true },

  // ---------------- SCANNER TOOLS ----------------
  { id:"multi-scanner", name:"Multi Document Scanner", desc:"Auto-crop many photos and merge into one clean PDF.", cat:"scanner", icon:"📷", color:"ic-blue", ready:true },
  { id:"camera-scanner", name:"Camera Scanner", desc:"Scan a single document straight from your camera.", cat:"scanner", icon:"📸", color:"ic-blue", ready:true },
  { id:"qr-generator", name:"QR Generator", desc:"Create a QR code from text, link or contact info.", cat:"qr", icon:"🔗", color:"ic-pink", ready:true },
  { id:"qr-scanner", name:"QR Scanner", desc:"Scan a QR code using your camera or an image.", cat:"qr", icon:"📷", color:"ic-pink", ready:true },
  { id:"barcode-generator", name:"Barcode Generator", desc:"Generate common barcode formats instantly.", cat:"qr", icon:"▥", color:"ic-pink", ready:true },

  // ---------------- UTILITY TOOLS ----------------
  { id:"age-calculator", name:"Age Calculator", desc:"Calculate exact age from a date of birth.", cat:"utility", icon:"🎂", color:"ic-teal", ready:true },
  { id:"date-calculator", name:"Date Calculator", desc:"Find the difference between two dates.", cat:"utility", icon:"📅", color:"ic-teal", ready:true },
  { id:"word-counter", name:"Word Counter", desc:"Count words, characters, sentences and reading time.", cat:"utility", icon:"🔤", color:"ic-teal", ready:true },
  { id:"character-counter", name:"Character Counter", desc:"Count characters with and without spaces.", cat:"utility", icon:"#️⃣", color:"ic-teal", ready:true },
  { id:"text-formatter", name:"Text Formatter", desc:"UPPERCASE, lowercase, Title Case and more.", cat:"utility", icon:"🔡", color:"ic-teal", ready:true },
  { id:"zip-creator", name:"ZIP Creator", desc:"Bundle multiple files into one ZIP.", cat:"utility", icon:"🗜️", color:"ic-teal", ready:true },
  { id:"zip-extractor", name:"ZIP Extractor", desc:"View and download files from inside a ZIP.", cat:"utility", icon:"📦", color:"ic-teal", ready:true },
  { id:"unit-converter", name:"Unit Converter", desc:"Convert length, weight, and temperature units.", cat:"utility", icon:"🔁", color:"ic-teal", ready:true },
];

function getToolById(id){ return TOOLS.find(t => t.id === id); }
