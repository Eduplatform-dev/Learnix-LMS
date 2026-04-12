// Fee receipt generator — call generateFeeReceipt(fee) anywhere
export type FeeForReceipt = {
  _id: string;
  description: string;
  amount: number;
  status: string;
  dueDate: string;
  paidAt: string | null;
  invoice: string;
  semester: string;
  category: string;
};

export function generateFeeReceipt(fee: FeeForReceipt, studentName?: string, instituteName = "Learnix University") {
  const paidDate = fee.paidAt ? new Date(fee.paidAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : "—";
  const dueDate  = new Date(fee.dueDate).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  const now      = new Date().toLocaleString("en-IN");

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Fee Receipt ${fee.invoice}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Segoe UI',Tahoma,sans-serif; background:#f5f5f5; padding:30px; }
.receipt { background:#fff; max-width:700px; margin:0 auto; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1); }
.header { background:linear-gradient(135deg,#1a1a2e,#16213e); color:#fff; padding:28px; position:relative; }
.header::after { content:''; position:absolute; bottom:0; left:0; right:0; height:4px; background:linear-gradient(90deg,#c8956c,#f5d58a,#c8956c); }
.logo-row { display:flex; align-items:center; gap:14px; margin-bottom:12px; }
.logo { width:44px; height:44px; background:#c8956c; border-radius:10px; display:flex; align-items:center; justify-content:center; }
.logo svg { width:24px; height:24px; stroke:white; fill:none; stroke-width:2; }
.inst-name { font-size:22px; font-weight:800; letter-spacing:2px; }
.inst-sub  { font-size:11px; opacity:0.7; margin-top:2px; letter-spacing:1px; }
.receipt-title { font-size:14px; opacity:0.6; text-transform:uppercase; letter-spacing:3px; }
.inv-row { display:flex; justify-content:space-between; align-items:flex-end; margin-top:8px; }
.inv-num { font-size:20px; font-weight:800; color:#f5d58a; }
.inv-date { font-size:11px; opacity:0.6; }
.body { padding:28px; }
.status-bar { display:flex; align-items:center; gap:10px; margin-bottom:20px; padding:10px 16px; border-radius:8px;
  background:${fee.status === "paid" ? "#f0fdf4" : "#fff7ed"};
  border:1px solid ${fee.status === "paid" ? "#bbf7d0" : "#fed7aa"}; }
.status-dot { width:10px; height:10px; border-radius:50%; background:${fee.status === "paid" ? "#16a34a" : "#f97316"}; }
.status-text { font-weight:700; color:${fee.status === "paid" ? "#16a34a" : "#f97316"}; font-size:14px; }
.section { margin:16px 0; }
.section-title { font-size:11px; text-transform:uppercase; letter-spacing:2px; color:#888; margin-bottom:10px; font-weight:700; }
.info-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.info-item { background:#f8f8f8; border-radius:8px; padding:12px; }
.info-lbl { font-size:10px; color:#888; text-transform:uppercase; letter-spacing:1px; }
.info-val { font-size:14px; font-weight:600; color:#1a1a2e; margin-top:3px; }
.amount-box { background:linear-gradient(135deg,#1a1a2e,#2d2b50); color:#fff; border-radius:12px; padding:20px; text-align:center; margin:20px 0; }
.amount-lbl { font-size:12px; opacity:0.7; text-transform:uppercase; letter-spacing:2px; }
.amount-val { font-size:40px; font-weight:900; color:#f5d58a; margin:4px 0; }
.rupee { font-size:24px; }
.footer { padding:20px 28px; background:#f8f8f8; border-top:1px solid #eee; display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#999; }
.watermark-paid { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-30deg); font-size:100px; font-weight:900; color:rgba(22,163,74,0.04); pointer-events:none; z-index:0; }
@media print { body{background:#fff; padding:0;} .receipt{box-shadow:none;border-radius:0;} .watermark-paid{display:none;} }
</style></head>
<body>
${fee.status === "paid" ? '<div class="watermark-paid">PAID</div>' : ""}
<div class="receipt">
  <div class="header">
    <div class="logo-row">
      <div class="logo"><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>
      <div><div class="inst-name">${instituteName}</div><div class="inst-sub">Official Fee Receipt</div></div>
    </div>
    <div class="inv-row">
      <div><div class="receipt-title">Receipt</div><div class="inv-num">${fee.invoice || `#${fee._id.slice(-6).toUpperCase()}`}</div></div>
      <div class="inv-date">Generated: ${now}</div>
    </div>
  </div>

  <div class="body">
    <div class="status-bar">
      <div class="status-dot"></div>
      <span class="status-text">${fee.status.toUpperCase()}</span>
      ${fee.status === "paid" ? `<span style="font-size:13px;color:#666;margin-left:auto;">Payment confirmed</span>` : ""}
    </div>

    <div class="section">
      <div class="section-title">Student Information</div>
      <div class="info-grid">
        <div class="info-item"><div class="info-lbl">Name</div><div class="info-val">${studentName || "Student"}</div></div>
        <div class="info-item"><div class="info-lbl">Semester</div><div class="info-val">${fee.semester || "—"}</div></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Payment Details</div>
      <div class="info-grid">
        <div class="info-item"><div class="info-lbl">Description</div><div class="info-val">${fee.description}</div></div>
        <div class="info-item"><div class="info-lbl">Category</div><div class="info-val" style="text-transform:capitalize">${fee.category}</div></div>
        <div class="info-item"><div class="info-lbl">Due Date</div><div class="info-val">${dueDate}</div></div>
        <div class="info-item"><div class="info-lbl">Paid On</div><div class="info-val">${paidDate}</div></div>
      </div>
    </div>

    <div class="amount-box">
      <div class="amount-lbl">Amount</div>
      <div class="amount-val"><span class="rupee">₹</span>${fee.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
      <div style="font-size:12px;opacity:0.6;margin-top:4px;">Indian Rupees Only</div>
    </div>
  </div>

  <div class="footer">
    <span>This is a computer-generated receipt. No signature required.</span>
    <span>${fee.invoice} | ${instituteName}</span>
  </div>
</div></body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, "_blank");
  if (win) win.onload = () => win.print();
  URL.revokeObjectURL(url);
}
