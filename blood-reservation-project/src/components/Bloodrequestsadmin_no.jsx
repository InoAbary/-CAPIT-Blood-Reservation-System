import React, { useMemo, useState } from "react";

/**
 * BloodRequestsAdmin.jsx
 * Frontend-only blood request review page.
 *
 * Usage:
 *   import BloodRequestsAdmin from "./BloodRequestsAdmin";
 *   <BloodRequestsAdmin />
 *
 * No backend or external UI library required. Demo decisions and audit logs
 * are kept in React state and reset on page refresh.
 */

const INITIAL_REQUESTS = [
  {
    id: "BR-2026-0142",
    submittedAt: "Oct 15, 2026 · 12:08 AM",
    submittedBy: "Angela D. Ramos",
    patient: {
      name: "Maria Lourdes Santos",
      age: 42,
      gender: "Female",
      hospital: "Philippine General Hospital",
      wardRoom: "Ward 5B · Room 512",
    },
    clinical: {
      diagnosis: "Symptomatic anemia secondary to gastrointestinal bleeding",
      hemoglobin: "6.8 g/dL",
      platelets: "184 ×10³/µL",
      previousTransfusion: "Yes",
      previousTransfusionNotes: "Transfused in 2023; no known reaction.",
    },
    request: { bloodType: "O+", component: "Packed red blood cells", units: 2, urgency: "stat" },
    status: "Pending",
    history: [{ action: "Request submitted", actor: "Angela D. Ramos", role: "Hospital staff", at: "Oct 15, 2026 · 12:08 AM" }],
  },
  {
    id: "BR-2026-0141",
    submittedAt: "Oct 14, 2026 · 11:42 PM",
    submittedBy: "Mark Villanueva",
    patient: {
      name: "Jose Miguel Reyes",
      age: 67,
      gender: "Male",
      hospital: "East Avenue Medical Center",
      wardRoom: "ICU · Bed 08",
    },
    clinical: {
      diagnosis: "Severe thrombocytopenia requiring platelet support",
      hemoglobin: "9.2 g/dL",
      platelets: "18 ×10³/µL",
      previousTransfusion: "No",
      previousTransfusionNotes: "",
    },
    request: { bloodType: "B-", component: "Platelet concentrate", units: 1, urgency: "routine" },
    status: "Pending",
    history: [{ action: "Request submitted", actor: "Mark Villanueva", role: "Hospital staff", at: "Oct 14, 2026 · 11:42 PM" }],
  },
  {
    id: "BR-2026-0140",
    submittedAt: "Oct 14, 2026 · 10:15 PM",
    submittedBy: "Clarissa Mendoza",
    patient: {
      name: "Ana Patricia Cruz",
      age: 29,
      gender: "Female",
      hospital: "Ospital ng Makati",
      wardRoom: "Ward 2 · Room 204",
    },
    clinical: {
      diagnosis: "Postpartum hemorrhage; ongoing blood loss",
      hemoglobin: "7.4 g/dL",
      platelets: "—",
      previousTransfusion: "Unknown",
      previousTransfusionNotes: "",
    },
    request: { bloodType: "A+", component: "Fresh frozen plasma", units: 3, urgency: "stat" },
    status: "Approved",
    history: [
      { action: "Request submitted", actor: "Clarissa Mendoza", role: "Hospital staff", at: "Oct 14, 2026 · 10:15 PM" },
      { action: "Request approved", actor: "Rafael D. Garcia", role: "Blood Services Admin", at: "Oct 14, 2026 · 10:31 PM", note: "Request reviewed and approved." },
    ],
  },
  {
    id: "BR-2026-0139",
    submittedAt: "Oct 14, 2026 · 8:54 PM",
    submittedBy: "Paolo Lim",
    patient: {
      name: "Pedro Antonio Lim",
      age: 54,
      gender: "Male",
      hospital: "Rizal Medical Center",
      wardRoom: "Ward 7 · Room 711",
    },
    clinical: {
      diagnosis: "Anemia associated with chronic kidney disease",
      hemoglobin: "8.1 g/dL",
      platelets: "152 ×10³/µL",
      previousTransfusion: "Yes",
      previousTransfusionNotes: "Two previous transfusions; reaction history not reported.",
    },
    request: { bloodType: "AB+", component: "Packed red blood cells", units: 2, urgency: "routine" },
    status: "Denied",
    denialReason: "Required supporting clinical documentation is missing. Please resubmit with the attending physician's assessment.",
    history: [
      { action: "Request submitted", actor: "Paolo Lim", role: "Hospital staff", at: "Oct 14, 2026 · 8:54 PM" },
      { action: "Request denied", actor: "Rafael D. Garcia", role: "Blood Services Admin", at: "Oct 14, 2026 · 9:12 PM", note: "Required supporting clinical documentation is missing. Please resubmit with the attending physician's assessment." },
    ],
  },
  {
    id: "BR-2026-0138",
    submittedAt: "Oct 14, 2026 · 7:26 PM",
    submittedBy: "Nina Bautista",
    patient: {
      name: "Elena Flores",
      age: 73,
      gender: "Female",
      hospital: "Quezon City General Hospital",
      wardRoom: "",
    },
    clinical: {
      diagnosis: "Symptomatic anemia",
      hemoglobin: "7.0 g/dL",
      platelets: "205 ×10³/µL",
      previousTransfusion: "No",
      previousTransfusionNotes: "",
    },
    request: { bloodType: "A-", component: "Packed red blood cells", units: 1, urgency: "routine" },
    status: "Pending",
    history: [{ action: "Request submitted", actor: "Nina Bautista", role: "Hospital staff", at: "Oct 14, 2026 · 7:26 PM" }],
  },
];

const ADMIN_NAME = "Rafael D. Garcia";
const ADMIN_ROLE = "Blood Services Admin";

const styles = {
  page: { minHeight: "100vh", background: "#f7f7f8", color: "#222329", fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  shell: { display: "flex", minHeight: "100vh" },
  main: { flex: 1, minWidth: 0, padding: "30px 38px 40px", maxWidth: 1600, margin: "0 auto", width: "100%", boxSizing: "border-box" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 29 },
  eyebrow: { color: "#9a9ba4", fontSize: 11, fontWeight: 700, letterSpacing: "1.1px", textTransform: "uppercase", marginBottom: 7 },
  h1: { fontSize: 27, lineHeight: 1.2, letterSpacing: "-.8px", fontWeight: 750, margin: 0 },
  subtitle: { fontSize: 13, color: "#858690", marginTop: 8 },
  profile: { display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" },
  avatar: { width: 37, height: 37, display: "grid", placeItems: "center", borderRadius: "50%", background: "#f1dadd", color: "#8e2030", fontSize: 12, fontWeight: 800 },
  profileName: { fontSize: 12, fontWeight: 700 },
  profileRole: { fontSize: 11, color: "#999aa3", marginTop: 3 },
  stats: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14, marginBottom: 24 },
  statCard: { background: "#fff", border: "1px solid #ececef", borderRadius: 13, padding: "17px 18px", minWidth: 0 },
  statTop: { display: "flex", justifyContent: "space-between", alignItems: "center", color: "#858690", fontSize: 12, gap: 8 },
  statIcon: { width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", background: "#f8eff0", color: "#a82032", fontSize: 15 },
  statNumber: { fontSize: 26, fontWeight: 750, letterSpacing: "-.8px", marginTop: 12 },
  statFoot: { fontSize: 11, color: "#a0a1a9", marginTop: 4 },
  panel: { background: "#fff", border: "1px solid #e9e9ed", borderRadius: 14, overflow: "hidden" },
  panelHead: { padding: "20px 22px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 15, flexWrap: "wrap" },
  panelTitle: { fontSize: 15, fontWeight: 750, margin: 0 },
  panelHint: { color: "#92939c", fontSize: 11, marginTop: 5 },
  controls: { display: "flex", gap: 9, flexWrap: "wrap" },
  search: { border: "1px solid #e4e4e8", borderRadius: 8, padding: "9px 11px", fontSize: 12, outline: "none", minWidth: 210, background: "#fff", color: "#25252b" },
  select: { border: "1px solid #e4e4e8", borderRadius: 8, padding: "9px 10px", fontSize: 12, background: "#fff", color: "#555660", outline: "none" },
  tableWrap: { overflowX: "auto", borderTop: "1px solid #f0f0f2" },
  table: { borderCollapse: "collapse", width: "100%", minWidth: 900, textAlign: "left" },
  th: { fontSize: 10, color: "#a0a1a9", textTransform: "uppercase", letterSpacing: ".8px", fontWeight: 750, padding: "12px 15px", background: "#fcfcfd", whiteSpace: "nowrap" },
  td: { padding: "15px", borderTop: "1px solid #f1f1f3", verticalAlign: "middle", fontSize: 12, color: "#4e4f58" },
  reqId: { fontSize: 11, fontWeight: 750, color: "#a02032", whiteSpace: "nowrap" },
  patientName: { fontSize: 12, color: "#282930", fontWeight: 700 },
  secondary: { fontSize: 11, color: "#999aa3", marginTop: 4, lineHeight: 1.4 },
  blood: { fontWeight: 750, color: "#303139" },
  pill: { display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 100, padding: "5px 8px", fontSize: 10, fontWeight: 750, whiteSpace: "nowrap" },
  actionBtn: { border: "1px solid #e4e4e8", background: "#fff", color: "#555660", borderRadius: 7, padding: "7px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  approveBtn: { border: "1px solid #287d5a", background: "#287d5a", color: "#fff", borderRadius: 7, padding: "7px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  denyBtn: { border: "1px solid #ead5d8", background: "#fff", color: "#a82032", borderRadius: 7, padding: "7px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  viewBtn: { border: "none", background: "transparent", color: "#a82032", fontSize: 11, fontWeight: 750, cursor: "pointer", padding: "5px 2px" },
  panelFoot: { padding: "13px 20px", borderTop: "1px solid #f0f0f2", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#999aa3" },
  detailGrid: { display: "grid", gridTemplateColumns: "minmax(0, 1.45fr) minmax(270px, .8fr)", gap: 18, marginTop: 20, alignItems: "start" },
  detailPanel: { background: "#fff", border: "1px solid #e9e9ed", borderRadius: 14, overflow: "hidden" },
  detailHead: { padding: "19px 21px", borderBottom: "1px solid #f0f0f2", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  detailBody: { padding: "19px 21px" },
  sectionTitle: { fontSize: 10, color: "#9b9ca5", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 13px" },
  infoGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "15px 22px", marginBottom: 22 },
  infoLabel: { fontSize: 10, color: "#9b9ca5", marginBottom: 5 },
  infoValue: { fontSize: 12, color: "#303139", fontWeight: 650, lineHeight: 1.5, overflowWrap: "anywhere" },
  divider: { height: 1, background: "#f0f0f2", margin: "18px 0" },
  historyItem: { display: "flex", gap: 11, position: "relative", paddingBottom: 19 },
  historyDot: { width: 8, height: 8, borderRadius: "50%", background: "#c2c3ca", marginTop: 4, flexShrink: 0, boxShadow: "0 0 0 4px #f5f5f6" },
  historyAction: { fontSize: 12, fontWeight: 750, color: "#383940" },
  historyMeta: { fontSize: 10, color: "#9b9ca5", marginTop: 4, lineHeight: 1.5 },
  historyNote: { fontSize: 11, color: "#656670", marginTop: 6, lineHeight: 1.5, background: "#f8f8f9", borderRadius: 7, padding: 9 },
  overlay: { position: "fixed", inset: 0, zIndex: 20, background: "rgba(24, 20, 23, .42)", display: "grid", placeItems: "center", padding: 20 },
  modal: { background: "#fff", width: "100%", maxWidth: 470, borderRadius: 15, padding: 24, boxSizing: "border-box", boxShadow: "0 20px 60px rgba(0,0,0,.15)" },
  modalTitle: { fontSize: 19, fontWeight: 800, letterSpacing: "-.4px", margin: 0 },
  modalText: { fontSize: 12, color: "#858690", lineHeight: 1.6, margin: "9px 0 18px" },
  textarea: { display: "block", width: "100%", minHeight: 110, boxSizing: "border-box", border: "1px solid #e2e2e7", borderRadius: 9, padding: 12, resize: "vertical", fontFamily: "inherit", fontSize: 12, outline: "none" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 18 },
  empty: { padding: "35px 20px", textAlign: "center", color: "#92939c", fontSize: 12 },
};

function StatusPill({ status }) {
  const map = {
    Pending: { bg: "#fff4df", color: "#98661b", dot: "#d9a441" },
    Approved: { bg: "#e9f6ef", color: "#287d5a", dot: "#32956c" },
    Denied: { bg: "#fae9eb", color: "#a82032", dot: "#bf3548" },
  };
  const s = map[status] || map.Pending;
  return <span style={{ ...styles.pill, background: s.bg, color: s.color }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot }} />{status}</span>;
}

function UrgencyPill({ urgency }) {
  const stat = urgency === "stat";
  return <span style={{ ...styles.pill, background: stat ? "#fae9eb" : "#f1f1f4", color: stat ? "#a82032" : "#777883" }}>{stat ? "⚡ STAT" : "Routine"}</span>;
}

function Info({ label, children }) {
  return <div><div style={styles.infoLabel}>{label}</div><div style={styles.infoValue}>{children || "—"}</div></div>;
}

export default function BloodRequestsAdmin() {
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [selectedId, setSelectedId] = useState(INITIAL_REQUESTS[0].id);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [urgencyFilter, setUrgencyFilter] = useState("All urgency");
  const [modal, setModal] = useState(null);
  const [denialReason, setDenialReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      const matchesText = !q || [r.id, r.patient.name, r.patient.hospital, r.patient.wardRoom, r.request.bloodType, r.request.component].join(" ").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "All statuses" || r.status === statusFilter;
      const matchesUrgency = urgencyFilter === "All urgency" || (urgencyFilter === "STAT / Emergency" ? r.request.urgency === "stat" : r.request.urgency === "routine");
      return matchesText && matchesStatus && matchesUrgency;
    });
  }, [requests, search, statusFilter, urgencyFilter]);

  const selected = requests.find((r) => r.id === selectedId) || filtered[0] || null;
  const pendingCount = requests.filter((r) => r.status === "Pending").length;
  const statCount = requests.filter((r) => r.request.urgency === "stat" && r.status === "Pending").length;
  const approvedToday = requests.filter((r) => r.status === "Approved" && r.history.some((h) => h.action === "Request approved" && h.at.includes("Oct 15, 2026"))).length;

  function openDecision(type, request) {
    setDenialReason("");
    setReasonError("");
    setModal({ type, id: request.id });
  }

  function decide() {
    if (!modal) return;
    const request = requests.find((r) => r.id === modal.id);
    if (!request || request.status !== "Pending") {
      setModal(null);
      return;
    }
    if (modal.type === "Denied" && !denialReason.trim()) {
      setReasonError("Please provide a reason for denial.");
      return;
    }
    const now = new Date().toLocaleString("en-US", {
      month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
    const historyEntry = {
      action: modal.type === "Approved" ? "Request approved" : "Request denied",
      actor: ADMIN_NAME,
      role: ADMIN_ROLE,
      at: now,
      ...(modal.type === "Denied" ? { note: denialReason.trim() } : { note: "Request reviewed and approved." }),
    };
    setRequests((prev) => prev.map((r) => r.id === modal.id
      ? { ...r, status: modal.type, ...(modal.type === "Denied" ? { denialReason: denialReason.trim() } : {}), history: [...r.history, historyEntry] }
      : r
    ));
    setSelectedId(modal.id);
    setModal(null);
    setDenialReason("");
    setReasonError("");
  }

  return (
    <div style={styles.page}>
      <style>{`
        * { box-sizing: border-box; }
        button, input, select, textarea { font: inherit; }
        button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 2px solid #c45a68; outline-offset: 2px; }
        button { transition: background .15s ease, border-color .15s ease, transform .15s ease; }
        button:active { transform: translateY(1px); }
        @media (max-width: 1080px) {
          .br-shell { display: block !important; }
          .br-main { padding: 23px 18px !important; }
          .br-stats { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .br-detail-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 560px) {
          .br-topbar { align-items: flex-start !important; }
          .br-profile-copy { display: none; }
          .br-h1 { font-size: 23px !important; }
          .br-stats { gap: 9px !important; }
          .br-stat-card { padding: 13px !important; }
          .br-stat-number { font-size: 23px !important; }
          .br-search { min-width: 100% !important; width: 100%; }
          .br-controls { width: 100%; }
          .br-controls select { flex: 1; min-width: 0; }
          .br-info-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div className="br-shell" style={{ ...styles.shell, display: "block" }}>
        <main className="br-main" style={styles.main}>
          <header className="br-topbar" style={styles.topbar}>
            <div>
              <div style={styles.eyebrow}>WORKSPACE / REQUESTS</div>
              <h1 className="br-h1" style={styles.h1}>Blood Requests</h1>
              <div style={styles.subtitle}>Review incoming requests and record administrative decisions.</div>
            </div>
            <div style={styles.profile}>
              <div style={styles.avatar}>RG</div>
              <div className="br-profile-copy"><div style={styles.profileName}>{ADMIN_NAME}</div><div style={styles.profileRole}>{ADMIN_ROLE}</div></div>
            </div>
          </header>

          <section className="br-stats" style={styles.stats} aria-label="Request summary">
            {[
              { label: "Total requests", value: requests.length, icon: "▤", foot: "All submitted requests" },
              { label: "Pending review", value: pendingCount, icon: "◷", foot: "Awaiting a decision" },
              { label: "STAT / Emergency", value: statCount, icon: "⚡", foot: "Pending urgent requests" },
              { label: "Approved today", value: approvedToday, icon: "✓", foot: "Recorded approvals" },
            ].map((s) => <div key={s.label} className="br-stat-card" style={styles.statCard}>
              <div style={styles.statTop}><span>{s.label}</span><span style={styles.statIcon}>{s.icon}</span></div>
              <div className="br-stat-number" style={styles.statNumber}>{s.value}</div>
              <div style={styles.statFoot}>{s.foot}</div>
            </div>)}
          </section>

          <section style={styles.panel}>
            <div style={styles.panelHead}>
              <div><h2 style={styles.panelTitle}>Request queue</h2><div style={styles.panelHint}>Select a request to review patient and clinical details.</div></div>
              <div className="br-controls" style={styles.controls}>
                <input className="br-search" style={styles.search} aria-label="Search requests" placeholder="Search patient, hospital, request ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
                <select style={styles.select} aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  {["All statuses", "Pending", "Approved", "Denied"].map((s) => <option key={s}>{s}</option>)}
                </select>
                <select style={styles.select} aria-label="Filter by urgency" value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)}>
                  {["All urgency", "STAT / Emergency", "Routine"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead><tr>
                  {["Request / Submitted", "Patient / Hospital", "Blood request", "Urgency", "Status", "Decision"].map((h) => <th key={h} style={styles.th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {filtered.map((r) => {
                    const isSelected = selected?.id === r.id;
                    return <tr key={r.id} onClick={() => setSelectedId(r.id)} style={{ background: isSelected ? "#fffafb" : "#fff", cursor: "pointer" }}>
                      <td style={styles.td}><div style={styles.reqId}>{r.id}</div><div style={styles.secondary}>{r.submittedAt}</div></td>
                      <td style={styles.td}><div style={styles.patientName}>{r.patient.name}</div><div style={styles.secondary}>{r.patient.hospital}</div></td>
                      <td style={styles.td}><div style={styles.blood}>{r.request.bloodType} · {r.request.units} unit{r.request.units > 1 ? "s" : ""}</div><div style={styles.secondary}>{r.request.component}</div></td>
                      <td style={styles.td}><UrgencyPill urgency={r.request.urgency} /></td>
                      <td style={styles.td}><StatusPill status={r.status} /></td>
                      <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                        {r.status === "Pending" ? <div style={{ display: "flex", gap: 5 }}>
                          <button type="button" style={styles.approveBtn} onClick={() => { setSelectedId(r.id); openDecision("Approved", r); }}>Approve</button>
                          <button type="button" style={styles.denyBtn} onClick={() => { setSelectedId(r.id); openDecision("Denied", r); }}>Deny</button>
                        </div> : <button type="button" style={styles.viewBtn} onClick={() => setSelectedId(r.id)}>View details ↗</button>}
                      </td>
                    </tr>;
                  })}
                  {filtered.length === 0 && <tr><td colSpan="6" style={styles.empty}>No requests match your search or filters.</td></tr>}
                </tbody>
              </table>
            </div>
            <div style={styles.panelFoot}><span>Showing {filtered.length} of {requests.length} requests</span><span>Demo data · decisions are not sent to a server</span></div>
          </section>

          {selected && <section className="br-detail-grid" style={styles.detailGrid}>
            <article style={styles.detailPanel}>
              <div style={styles.detailHead}>
                <div><div style={styles.reqId}>{selected.id}</div><h2 style={{ ...styles.panelTitle, marginTop: 7 }}>{selected.patient.name}</h2><div style={styles.panelHint}>Submitted {selected.submittedAt}</div></div>
                <StatusPill status={selected.status} />
              </div>
              <div style={styles.detailBody}>
                <h3 style={styles.sectionTitle}>Patient information</h3>
                <div className="br-info-grid" style={styles.infoGrid}>
                  <Info label="Complete name">{selected.patient.name}</Info>
                  <Info label="Age / Gender">{selected.patient.age} years · {selected.patient.gender}</Info>
                  <Info label="Hospital">{selected.patient.hospital}</Info>
                  <Info label="Ward / Room">{selected.patient.wardRoom || "Not confined / not provided"}</Info>
                </div>
                <h3 style={styles.sectionTitle}>Clinical information</h3>
                <div style={{ marginBottom: 15 }}><Info label="Diagnostic reason">{selected.clinical.diagnosis}</Info></div>
                <div className="br-info-grid" style={styles.infoGrid}>
                  <Info label="Hemoglobin">{selected.clinical.hemoglobin}</Info>
                  <Info label="Platelet count">{selected.clinical.platelets}</Info>
                  <Info label="Previous transfusions">{selected.clinical.previousTransfusion}</Info>
                  {selected.clinical.previousTransfusion === "Yes" && <Info label="Previous transfusion notes">{selected.clinical.previousTransfusionNotes}</Info>}
                </div>
                <h3 style={styles.sectionTitle}>Specific request</h3>
                <div className="br-info-grid" style={{ ...styles.infoGrid, marginBottom: 0 }}>
                  <Info label="Blood type">{selected.request.bloodType}</Info>
                  <Info label="Needed component">{selected.request.component}</Info>
                  <Info label="Units requested">{selected.request.units} unit{selected.request.units > 1 ? "s" : ""}</Info>
                  <Info label="Urgency"><UrgencyPill urgency={selected.request.urgency} /></Info>
                </div>
                {selected.status === "Denied" && selected.denialReason && <div style={{ marginTop: 20, padding: 13, borderRadius: 9, background: "#fff5f5", border: "1px solid #f2dfe2" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".7px", color: "#a82032", textTransform: "uppercase", marginBottom: 6 }}>Reason for denial</div>
                  <div style={{ fontSize: 12, color: "#5e4246", lineHeight: 1.6 }}>{selected.denialReason}</div>
                </div>}
                {selected.status === "Pending" && <div style={{ display: "flex", gap: 9, marginTop: 23, paddingTop: 18, borderTop: "1px solid #f0f0f2" }}>
                  <button type="button" style={{ ...styles.approveBtn, padding: "10px 15px" }} onClick={() => openDecision("Approved", selected)}>✓ Approve request</button>
                  <button type="button" style={{ ...styles.denyBtn, padding: "10px 15px" }} onClick={() => openDecision("Denied", selected)}>Deny request</button>
                </div>}
              </div>
            </article>

            <aside style={styles.detailPanel}>
              <div style={styles.detailHead}><div><h2 style={styles.panelTitle}>Decision history</h2><div style={styles.panelHint}>Audit trail for this request</div></div><span style={{ fontSize: 11, color: "#9b9ca5" }}>{selected.history.length} event{selected.history.length !== 1 ? "s" : ""}</span></div>
              <div style={styles.detailBody}>
                {selected.history.slice().reverse().map((h, i) => <div key={`${h.action}-${h.at}-${i}`} style={{ ...styles.historyItem, paddingBottom: i === selected.history.length - 1 ? 0 : 19 }}>
                  <span style={{ ...styles.historyDot, background: h.action.includes("approved") ? "#32956c" : h.action.includes("denied") ? "#bf3548" : "#b7b8c0" }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={styles.historyAction}>{h.action}</div>
                    <div style={styles.historyMeta}>{h.actor} · {h.role}<br />{h.at}</div>
                    {h.note && h.action !== "Request submitted" && <div style={styles.historyNote}>{h.note}</div>}
                  </div>
                </div>)}
                <div style={styles.divider} />
                <div style={{ fontSize: 10, color: "#9b9ca5", lineHeight: 1.6 }}>Every approval or denial is recorded with the administrator and timestamp. This frontend demo stores entries in page state only.</div>
              </div>
            </aside>
          </section>}
          <footer style={{ textAlign: "center", fontSize: 10, color: "#b0b0b7", padding: "25px 0 0" }}>Blood Services Portal · Administrative review interface</footer>
        </main>
      </div>

      {modal && <div style={styles.overlay} role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
        <div style={styles.modal} role="dialog" aria-modal="true" aria-labelledby="decision-modal-title">
          <div style={{ width: 42, height: 42, borderRadius: 12, background: modal.type === "Approved" ? "#e9f6ef" : "#fae9eb", color: modal.type === "Approved" ? "#287d5a" : "#a82032", display: "grid", placeItems: "center", fontSize: 19, marginBottom: 16 }}>{modal.type === "Approved" ? "✓" : "!"}</div>
          <h2 id="decision-modal-title" style={styles.modalTitle}>{modal.type === "Approved" ? "Approve this request?" : "Deny this request?"}</h2>
          <p style={styles.modalText}>{modal.type === "Approved"
            ? `You're approving ${modal.id}. This decision will be added to the request's decision history.`
            : `Please provide a clear reason for denying ${modal.id}. The reason will be recorded in the audit trail.`}</p>
          {modal.type === "Denied" && <>
            <label htmlFor="denial-reason" style={{ display: "block", fontSize: 11, fontWeight: 750, color: "#4c4d55", marginBottom: 7 }}>Reason for denial <span style={{ color: "#a82032" }}>*</span></label>
            <textarea id="denial-reason" style={{ ...styles.textarea, borderColor: reasonError ? "#bf3548" : "#e2e2e7" }} placeholder="Explain why this request cannot be approved…" value={denialReason} onChange={(e) => { setDenialReason(e.target.value); setReasonError(""); }} />
            {reasonError && <div role="alert" style={{ color: "#a82032", fontSize: 11, marginTop: 6 }}>{reasonError}</div>}
          </>}
          <div style={styles.modalActions}>
            <button type="button" style={{ ...styles.actionBtn, padding: "10px 14px" }} onClick={() => setModal(null)}>Cancel</button>
            <button type="button" style={{ ...(modal.type === "Approved" ? styles.approveBtn : styles.denyBtn), padding: "10px 14px" }} onClick={decide}>{modal.type === "Approved" ? "Confirm approval" : "Confirm denial"}</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
