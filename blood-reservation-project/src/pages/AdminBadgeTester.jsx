import React, { useState, useEffect } from 'react';


export default function AdminBadgeTester() {
  // Issuers
  const [issuers, setIssuers] = useState([]);
  const [issuersError, setIssuersError] = useState(null);

  const [issuerForm, setIssuerForm] = useState({
    name: '',
    description: '',
    url: '',
    email: '',
  });
  const [issuerResult, setIssuerResult] = useState(null);
  const [issuerError, setIssuerError] = useState(null);

  // Create badge class form
  const [bcForm, setBcForm] = useState({
    name: '',
    description: '',
    image: '',
    criteriaNarrative: '',
  });
  const [bcResult, setBcResult] = useState(null);
  const [bcError, setBcError] = useState(null);

  // Issue badge form
  const [issueForm, setIssueForm] = useState({
    recipientEmail: '',
    badgeClassId: '',
  });
  const [issueResult, setIssueResult] = useState(null);
  const [issueError, setIssueError] = useState(null);

  // Donor badges lookup
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState(null);

  // ---- Load issuers on mount ----
  const loadIssuers = async () => {
    setIssuersError(null);
    try {
      const res = await fetch(`/api/badgr/issuers`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
      // Badgr returns result array directly (your service returns data.result)
      setIssuers(Array.isArray(data) ? data : data.result || []);
    } catch (e) {
      setIssuersError(e.message);
    }
  };

  useEffect(() => {
    loadIssuers();
  }, []);

  // ---- Create badge class ----
  const handleCreateBadgeClass = async (e) => {
    e.preventDefault();
    setBcError(null);
    setBcResult(null);
    try {
      const res = await fetch(`/api/badgr/badge-classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(bcForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
      setBcResult(data);
      // Autofill the issue form with the new badgeClassId
      if (data.entityId) {
        setIssueForm((f) => ({ ...f, badgeClassId: data.entityId }));
      }
    } catch (e) {
      setBcError(e.message);
    }
  };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            // result 格式: "data:image/png;base64,iVBOR..."
            setBcForm({ ...bcForm, image: reader.result });
        };
        reader.readAsDataURL(file);
    };
  // --- Create Issuer ---

  const handleCreateIssuer = async (e) => {
    e.preventDefault();
    setIssuerError(null);
    setIssuerResult(null);
    try {
      const res = await fetch(`/api/badgr/issuer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(issuerForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
      setIssuerResult(data);
      // Refresh list and auto-select in badge class form
      await loadIssuers();
      if (data.entityId) {
        setBcForm((f) => ({ ...f, issuerId: data.entityId }));
      }
    } catch (e) {
      setIssuerError(e.message);
    }
  };

  // ---- Issue badge ----
  const handleIssue = async (e) => {
    e.preventDefault();
    setIssueError(null);
    setIssueResult(null);
    try {
      const res = await fetch(`/api/badgr/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(issueForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
      setIssueResult(data);
    } catch (e) {
      setIssueError(e.message);
    }
  };

  // ---- Lookup donor badges ----
  const handleLookup = async (e) => {
    e.preventDefault();
    setLookupError(null);
    setLookupResult(null);
    try {
      const res = await fetch(
        `/api/badgr/donor-badges?email=${encodeURIComponent(lookupEmail)}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setLookupResult(data.result || []);
    } catch (e) {
      setLookupError(e.message);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 900, margin: '0 auto' }}>
      <h1>🛠️ Badgr Admin Tester</h1>
      <p style={{ color: '#666' }}>
        Requires a staff session (route is guarded by <code>requireStaff</code>).
      </p>

        {/*  -------- CREATE ISSUERS ----------*/}
        <section style={card}>
            <h2>0. Create Issuer</h2>
            <form onSubmit={handleCreateIssuer}>
            <Field label="Name">
                <input
                style={input}
                value={issuerForm.name}
                onChange={(e) => setIssuerForm({ ...issuerForm, name: e.target.value })}
                placeholder="My Org Badges"
                required
                />
            </Field>
            <Field label="Description">
                <input
                style={input}
                value={issuerForm.description}
                onChange={(e) => setIssuerForm({ ...issuerForm, description: e.target.value })}
                placeholder="Badges issued by My Org"
                required
                />
            </Field>
            <Field label="URL (fully qualified, public)">
                <input
                type="url"
                style={input}
                value={issuerForm.url}
                onChange={(e) => setIssuerForm({ ...issuerForm, url: e.target.value })}
                placeholder="https://yourdomain.com"
                required
                />
            </Field>
            <Field label="Email (must be verified on your Badgr account)">
                <input
                type="email"
                style={input}
                value={issuerForm.email}
                onChange={(e) => setIssuerForm({ ...issuerForm, email: e.target.value })}
                placeholder="you@yourdomain.com"
                required
                />
            </Field>
            <button type="submit" style={btn}>Create Issuer</button>
            </form>
            {issuerError && <ErrorBox msg={issuerError} />}
            {issuerResult && (
            <div style={successBox}>
                ✅ Created issuer <code>{issuerResult.entityId}</code>
                <pre style={pre}>{JSON.stringify(issuerResult, null, 2)}</pre>
            </div>
            )}
        </section>

      {/* ---------- ISSUERS ---------- */}
      <section style={card}>
        <h2>1. Issuers</h2>
        <button onClick={loadIssuers} style={btn}>Reload</button>
        {issuersError && <ErrorBox msg={issuersError} />}
        {issuers.length > 0 && (
          <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                <th>entityId</th>
                <th>name</th>
                <th>email</th>
              </tr>
            </thead>
            <tbody>
              {issuers.map((i) => (
                <tr key={i.entityId}>
                  <td><code>{i.entityId}</code></td>
                  <td>{i.name}</td>
                  <td>{i.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ---------- CREATE BADGE CLASS ---------- */}
      <section style={card}>
        <h2>2. Create Badge Class</h2>
        <form onSubmit={handleCreateBadgeClass}>
          
          <Field label="Name">
            <input
              style={input}
              value={bcForm.name}
              onChange={(e) => setBcForm({ ...bcForm, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Description">
            <input
              style={input}
              value={bcForm.description}
              onChange={(e) => setBcForm({ ...bcForm, description: e.target.value })}
              required
            />
          </Field>
          <Field label="Badge Image (PNG/SVG)">
            <input type="file" accept="image/png,image/svg+xml" onChange={handleImageChange} />
          </Field>
          <Field label="Criteria Narrative">
            <textarea
              style={{ ...input, minHeight: 60 }}
              value={bcForm.criteriaNarrative}
              onChange={(e) => setBcForm({ ...bcForm, criteriaNarrative: e.target.value })}
              required
            />
          </Field>
          <button type="submit" style={btn}>Create Badge Class</button>
        </form>
        {bcError && <ErrorBox msg={bcError} />}
        {bcResult && (
          <div style={successBox}>
            ✅ Created <code>{bcResult.entityId}</code>
            <pre style={pre}>{JSON.stringify(bcResult, null, 2)}</pre>
          </div>
        )}
      </section>

      {/* ---------- ISSUE BADGE ---------- */}
      <section style={card}>
        <h2>3. Issue Badge</h2>
        <form onSubmit={handleIssue}>
          <Field label="Recipient Email">
            <input
              type="email"
              style={input}
              value={issueForm.recipientEmail}
              onChange={(e) => setIssueForm({ ...issueForm, recipientEmail: e.target.value })}
              placeholder="donor@example.com"
              required
            />
          </Field>
          <Field label="Badge Class entityId">
            <input
              style={input}
              value={issueForm.badgeClassId}
              onChange={(e) => setIssueForm({ ...issueForm, badgeClassId: e.target.value })}
              placeholder="paste a badgeclass entityId"
              required
            />
          </Field>
          <button type="submit" style={btn}>Issue Badge</button>
        </form>
        {issueError && <ErrorBox msg={issueError} />}
        {issueResult && (
          <div style={successBox}>
            ✅ Issued assertion <code>{issueResult.entityId}</code>
            <pre style={pre}>{JSON.stringify(issueResult, null, 2)}</pre>
          </div>
        )}
      </section>

      {/* ---------- LOOKUP DONOR BADGES ---------- */}
      <section style={card}>
        <h2>4. Lookup Donor Badges</h2>
        <form onSubmit={handleLookup}>
          <Field label="Donor Email">
            <input
              type="email"
              style={input}
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
              placeholder="donor@example.com"
              required
            />
          </Field>
          <button type="submit" style={btn}>Lookup</button>
        </form>
        {lookupError && <ErrorBox msg={lookupError} />}
        {lookupResult && (
          <div style={{ marginTop: 12 }}>
            {lookupResult.length === 0 ? (
              <p>No badges found for this email.</p>
            ) : (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {lookupResult.map((b) => (
                  <div key={b.entityId} style={badgeCard}>
                    {b.image && <img src={b.image} alt={b.badgeclassName} style={{ width: 80, height: 80 }} />}
                    <div><strong>{b.badgeclassName}</strong></div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {b.issuedOn ? new Date(b.issuedOn).toLocaleDateString() : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// ---------- tiny UI helpers ----------
const card = {
  border: '1px solid #ddd',
  borderRadius: 8,
  padding: 16,
  margin: '16px 0',
  background: '#fafafa',
};
const input = { display: 'block', width: '100%', padding: 6, marginTop: 4 };
const btn = {
  marginTop: 10,
  padding: '8px 16px',
  background: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};
const successBox = {
  marginTop: 12,
  padding: 12,
  background: '#ecfdf5',
  border: '1px solid #10b981',
  borderRadius: 6,
};
const pre = { background: '#fff', padding: 8, overflowX: 'auto', fontSize: 12 };

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}
function ErrorBox({ msg }) {
  return (
    <div style={{ marginTop: 12, padding: 12, background: '#fef2f2', border: '1px solid #ef4444', borderRadius: 6, color: '#991b1b' }}>
      ❌ {msg}
    </div>
  );
}