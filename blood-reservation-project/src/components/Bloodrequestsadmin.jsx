import React, { useEffect, useMemo, useState } from "react";

// Uses the existing credentialed API helper and staffToken cookie.
import { apiFetch } from "../utils/api";
const REQUEST_STATUSES = ["Pending", "Approved", "Partially Fulfilled", "Fulfilled", "Rejected", "Cancelled"];
const REQUEST_API = "/api/blood-requests";

const styles = {
  page: { minHeight: "100vh", background: "#f7f7f8", color: "#222329", fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  shell: { display: "flex", minHeight: "100vh" },
  sidebar: { width: 232, background: "#fff", borderRight: "1px solid #ececef", padding: "26px 16px", boxSizing: "border-box", flexShrink: 0 },
  brand: { display: "flex", alignItems: "center", gap: 10, padding: "0 9px 30px" },
  brandMark: { width: 35, height: 35, borderRadius: 11, background: "#a82032", color: "#fff", display: "grid", placeItems: "center", fontSize: 23, fontWeight: 700, lineHeight: 1 },
  brandTitle: { fontSize: 14, fontWeight: 750, letterSpacing: "-.2px" },
  brandSub: { fontSize: 11, color: "#8b8c95", marginTop: 3 },
  navLabel: { color: "#a0a1a9", fontSize: 10, fontWeight: 750, letterSpacing: "1.3px", padding: "0 12px", margin: "8px 0 11px" },
  nav: { display: "flex", flexDirection: "column", gap: 5 },
  navItem: { padding: "11px 12px", borderRadius: 9, display: "flex", alignItems: "center", gap: 11, color: "#747580", fontSize: 13, fontWeight: 550 },
  navActive: { background: "#fbebed", color: "#9f1f31", fontWeight: 700 },
  sideFoot: { marginTop: 38, borderTop: "1px solid #f0f0f2", padding: "20px 10px 0", fontSize: 11, color: "#999aa3", lineHeight: 1.7 },
  main: { flex: 1, minWidth: 0, padding: "27px 34px 40px", maxWidth: 1600, margin: "0 auto", width: "100%", boxSizing: "border-box" },
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


function fullName(record) {
  return [record.firstName, record.middleName, record.lastName].filter(Boolean).join(" ");
}
function formatDate(value, dateOnly = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila", dateStyle: "medium",
    ...(dateOnly ? {} : { timeStyle: "short" }),
  }).format(date);
}
function displayValue(value) {
  return value === null || value === undefined || value === "" ? "—" : value;
}
function Info({ label, children }) {
  return <div><div style={styles.infoLabel}>{label}</div><div style={styles.infoValue}>{displayValue(children)}</div></div>;
}
function StatusPill({ status }) {
  const colors = {
    Pending: ["#fff4df", "#98661b"], Approved: ["#e9f6ef", "#287d5a"],
    "Partially Fulfilled": ["#edf0ff", "#5559a6"], Fulfilled: ["#e6f5f5", "#226f73"],
    Rejected: ["#fae9eb", "#a82032"], Cancelled: ["#f1f1f4", "#666772"],
  };
  const [background, color] = colors[status] || ["#f1f1f4", "#666772"];
  return <span style={{ ...styles.pill, background, color }}>{status || "—"}</span>;
}
function UrgencyPill({ urgency }) {
  const urgent = String(urgency).toLowerCase() === "stat";
  return <span style={{ ...styles.pill, background: urgent ? "#fae9eb" : "#f1f1f4", color: urgent ? "#a82032" : "#666772" }}>{urgent ? "⚡ STAT" : urgency === "routine" ? "Routine" : displayValue(urgency)}</span>;
}

export default function BloodRequestsAdmin() {
  const [requests, setRequests] = useState([]);
  const [receivingFacility, setReceivingFacility] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [urgencyFilter, setUrgencyFilter] = useState("All urgency");
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError("");
    setRequests([]);
    (async () => {
      try {
        const response = await apiFetch(REQUEST_API, { signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || "Could not load blood requests.");
        if (!Array.isArray(body.requests)) throw new Error("The API returned an invalid request list.");
        if (active) { setRequests(body.requests); setReceivingFacility(body.facility || null); }
      } catch (err) {
        if (active && err.name !== "AbortError") setError(err.message || "Could not load blood requests.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; controller.abort(); };
  }, [refreshKey]);
  const filtered = useMemo(() => requests.filter(record => {
    const text = [record._id, fullName(record), record.hospital, record.wardRoom, record.bloodType, record.component, record.hospitalFacilityID, record.requestedBy].join(" ").toLowerCase();
    return text.includes(search.trim().toLowerCase()) &&
    (statusFilter === "All statuses" || record.requestStatus === statusFilter) &&
    (urgencyFilter === "All urgency" || record.urgency === urgencyFilter);
  }), [requests, search, statusFilter, urgencyFilter]);
  const selected = filtered.find(record => record._id === selectedId) || filtered[0] || null;
  const pendingCount = requests.filter(record => record.requestStatus === "Pending").length;
  async function confirmDecision() {
    if (!modal || saving) return;
    setSaving(true);
    setDecisionError("");
    try {
      const response = await apiFetch(`${REQUEST_API}/${modal.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestStatus: modal.status }),
      });
      const body = await response.json();
      if (!response.ok) {
        if (response.status === 409 || response.status === 404) {
          setModal(null);
          setRefreshKey(value => value + 1);
          setNotice(body.message || "This request has changed. The list is being refreshed.");
        }
        throw new Error(body.message || "Could not save the decision.");
      }
      if (!body.request?._id) throw new Error("The API returned an invalid updated request.");
      setRequests(previous => previous.map(record => record._id === body.request._id ? body.request : record));
      setModal(null);
    } catch (err) {
      setDecisionError(err.message || "Could not save the decision.");
    } finally {
      setSaving(false);
    }
  }
  function openDecision(record, status) {
    setDecisionError("");
    setNotice("");
    setModal({ id: record._id, status });
  }
  return (
    <div className="br-design" style={styles.page}>
    <style>{`
      .br-design, .br-design * { box-sizing: border-box; }
      .br-design button, .br-design input, .br-design select, .br-design textarea { font: inherit; }
      .br-design button:focus-visible, .br-design input:focus-visible, .br-design select:focus-visible, .br-design textarea:focus-visible { outline: 2px solid #c45a68; outline-offset: 2px; }
      .br-design button { transition: background .15s ease, border-color .15s ease, transform .15s ease; }
      .br-design button:active { transform: translateY(1px); }
      @media (max-width: 1080px) {
        .br-shell { display: block !important; }
        .br-sidebar { width: 100% !important; padding: 13px 16px !important; border-right: 0 !important; border-bottom: 1px solid #ececef; }
        .br-brand { padding: 0 5px 10px !important; }
        .br-nav-label, .br-side-foot { display: none !important; }
        .br-nav { flex-direction: row !important; overflow-x: auto; }
        .br-nav-item { white-space: nowrap; padding: 9px 10px !important; }
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
      <div className="br-shell" style={styles.shell}>
      <aside className="br-sidebar" style={styles.sidebar}>
      <div className="br-brand" style={styles.brand}>
      <div style={styles.brandMark}>✚</div>
      <div><div style={styles.brandTitle}>Blood Services</div><div style={styles.brandSub}>Request review</div></div>
      </div>
      <div style={{ ...styles.navItem, ...styles.navActive }}>Blood Requests <span style={{ marginLeft: "auto" }}>{pendingCount}</span></div>
      <div className="br-side-foot" style={styles.sideFoot}>Facility staff access<br />Requests sent to your facility</div>
      </aside>
      <main className="br-main" style={styles.main}>
      <header className="br-topbar" style={styles.topbar}>
      <div><div style={styles.eyebrow}>WORKSPACE / REQUESTS</div><h1 className="br-h1" style={styles.h1}>Blood Requests</h1><p style={styles.subtitle}>{receivingFacility?.facilityName ? `Requests forwarded to ${receivingFacility.facilityName}.` : "Review requests forwarded to your assigned facility."}</p></div>
      <span style={{ ...styles.pill, background: "#fbebed", color: "#9f1f31" }}>Live records</span>
      </header>
      <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" style={styles.actionBtn} disabled={loading || saving} onClick={() => setRefreshKey(value => value + 1)}>Refresh requests</button>
      {loading && <span role="status" style={styles.secondary}>Loading blood requests…</span>}
      {notice && <span role="status" style={{ fontSize: 13 }}>{notice}</span>}
      {error && <span role="alert" style={{ color: "#a82032", fontSize: 13 }}>{error}</span>}
      </div>
      <section className="br-stats" style={styles.stats} aria-label="Request summary">
      {[
        ["Total requests", requests.length, "Forwarded to your facility"],
        ["Pending review", pendingCount, "Awaiting a decision"],
        ["Partially fulfilled", requests.filter(r => r.requestStatus === "Partially Fulfilled").length, "Remaining units needed"],
          ["Fulfilled", requests.filter(r => r.requestStatus === "Fulfilled").length, "Completed requests"],
      ].map(([label, count, hint]) => <div key={label} className="br-stat-card" style={styles.statCard}><div style={styles.statTop}>{label}</div><div className="br-stat-number" style={styles.statNumber}>{count}</div><div style={styles.statFoot}>{hint}</div></div>)}
      </section>
      <section style={styles.panel}>
      <div style={styles.panelHead}>
      <div><h2 style={styles.panelTitle}>Request queue</h2><p style={styles.panelHint}>Open a request to see its complete details.</p></div>
      <div className="br-controls" style={styles.controls}>
      <input className="br-search" style={styles.search} aria-label="Search requests" placeholder="Search patient, hospital, or component…" value={search} onChange={event => setSearch(event.target.value)} />
      <select style={styles.select} aria-label="Filter by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>{["All statuses", ...REQUEST_STATUSES].map(value => <option key={value}>{value}</option>)}</select>
      <select style={styles.select} aria-label="Filter by urgency" value={urgencyFilter} onChange={event => setUrgencyFilter(event.target.value)}><option>All urgency</option>{[...new Set(requests.map(r => r.urgency))].map(value => <option key={value} value={value}>{value === "stat" ? "STAT" : value === "routine" ? "Routine" : value}</option>)}</select>
      </div>
      </div>
      <div style={styles.tableWrap}><table style={styles.table}>
      <thead><tr>{["Submitted date / time", "Patient / Hospital", "Blood requirement", "Urgency", "Request status", "Review"].map(label => <th key={label} scope="col" style={styles.th}>{label}</th>)}</tr></thead>
      <tbody>{filtered.map(record => <tr key={record._id} style={{ background: selected?._id === record._id ? "#fffafb" : "#fff" }}>
      <td style={styles.td}><div style={styles.patientName}>{formatDate(record.createdAt)}</div></td>
      <td style={styles.td}><div style={styles.patientName}>{fullName(record)}</div><div style={styles.secondary}>{record.hospital}</div></td>
      <td style={styles.td}><div style={styles.blood}>{record.bloodType} · {record.units} unit{record.units === 1 ? "" : "s"}</div><div style={styles.secondary}>{record.component}</div></td>
      <td style={styles.td}><UrgencyPill urgency={record.urgency} /></td>
      <td style={styles.td}><StatusPill status={record.requestStatus} /></td>
      <td style={styles.td}><button type="button" style={styles.actionBtn} aria-label={`Review request for ${fullName(record)}`} aria-pressed={selected?._id === record._id} onClick={() => setSelectedId(record._id)}>View details</button></td>
      </tr>)}{filtered.length === 0 && <tr><td colSpan={6} style={styles.empty}>{loading ? "Loading blood requests…" : error ? "The request list could not be loaded." : requests.length === 0 ? "No blood requests have been submitted yet." : "No requests match your search or filters."}</td></tr>}</tbody>
      </table></div>
      <div style={styles.panelFoot}><span>Showing {filtered.length} of {requests.length} requests</span><span>Dates shown in Philippine time</span></div>
      </section>
      {selected && <section className="br-detail-grid" style={styles.detailGrid} aria-label="Selected request details">
      <article style={styles.detailPanel}>
      <div style={styles.detailHead}><div><h2 style={styles.panelTitle}>{fullName(selected)}</h2><div style={styles.panelHint}>Submitted {formatDate(selected.createdAt)}</div></div><StatusPill status={selected.requestStatus} /></div>
      <div style={styles.detailBody}>
      <h3 style={styles.sectionTitle}>Patient information</h3>
      <div className="br-info-grid" style={styles.infoGrid}>
      <Info label="First name">{selected.firstName}</Info><Info label="Last name">{selected.lastName}</Info>
      <Info label="Middle name">{selected.middleName}</Info><Info label="Age">{selected.age}</Info>
      <Info label="Sex">{selected.sex}</Info><Info label="Hospital">{selected.hospital}</Info><Info label="Ward / Room">{selected.wardRoom}</Info>
      </div>
      <h3 style={styles.sectionTitle}>Clinical information</h3>
      <div className="br-info-grid" style={styles.infoGrid}>
      <Info label="Diagnosis">{selected.diagnosis}</Info>
      <Info label="Hemoglobin (g/dL)">{selected.hemoglobin}</Info>
      <Info label="Platelets (×10³/µL)">{selected.platelets}</Info>
      <Info label="Prior transfusion">{selected.priorTransfusion}</Info>
      <Info label="Prior transfusion date">{formatDate(selected.priorTransfusionDate, true)}</Info>
      <Info label="Prior transfusion notes">{selected.priorTransfusionNotes}</Info>
      </div>
      <h3 style={styles.sectionTitle}>Blood requirement</h3>
      <div className="br-info-grid" style={{ ...styles.infoGrid, marginBottom: 0 }}>
      <Info label="Blood type">{selected.bloodType}</Info><Info label="Component">{selected.component}</Info>
      <Info label="Units requested">{selected.units}</Info><Info label="Urgency"><UrgencyPill urgency={selected.urgency} /></Info>
      </div>
      {selected.requestStatus === "Pending" && <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 23, paddingTop: 18, borderTop: "1px solid #f0f0f2" }}>
      <button type="button" style={styles.approveBtn} onClick={() => openDecision(selected, "Approved")}>Approve request</button>
      <button type="button" style={styles.denyBtn} onClick={() => openDecision(selected, "Rejected")}>Reject request</button>
      </div>}
      </div>
      </article>
      <aside style={styles.detailPanel}>
      <div style={styles.detailHead}><h2 style={styles.panelTitle}>Request tracking</h2></div>
      <div style={styles.detailBody}>
      <div className="br-info-grid" style={{ ...styles.infoGrid, gridTemplateColumns: "1fr" }}>
      <Info label="Receiving facility">{selected.receivingFacilityID?.facilityName || receivingFacility?.facilityName || "—"}</Info>
      <Info label="Request status"><StatusPill status={selected.requestStatus} /></Info>
      <Info label="Fulfilled at">{formatDate(selected.fulfilledAt)}</Info>
      <Info label="Created at">{formatDate(selected.createdAt)}</Info><Info label="Updated at">{formatDate(selected.updatedAt)}</Info>
      </div>
      <p style={styles.historyNote}>Approvals and rejections are saved to the database. Approval does not allocate blood units or mark a request as fulfilled.</p>
      </div>
      </aside>
      </section>}
      </main>
      </div>
      {modal && <div style={styles.overlay} onKeyDown={event => { if (event.key === "Escape" && !saving) setModal(null); }} onMouseDown={event => { if (event.target === event.currentTarget && !saving) setModal(null); }}>
      <div style={styles.modal} role="dialog" aria-modal="true" aria-labelledby="br-decision-title" aria-describedby="br-decision-description">
      <h2 id="br-decision-title" style={styles.modalTitle}>{modal.status === "Approved" ? "Approve this request?" : "Reject this request?"}</h2>
      <p id="br-decision-description" style={styles.modalText}>The request status will become {modal.status}. This decision will be saved to the database.</p>
      {decisionError && <p role="alert" style={{ color: "#a82032", fontSize: 12 }}>{decisionError}</p>}
      <div style={styles.modalActions}><button autoFocus disabled={saving} type="button" style={styles.actionBtn} onClick={() => setModal(null)}>Cancel</button><button type="button" style={modal.status === "Approved" ? styles.approveBtn : styles.denyBtn} onClick={confirmDecision} disabled={saving}>{saving ? "Saving…" : "Confirm decision"}</button></div>
      </div>
      </div>}
      </div>
  );
}
