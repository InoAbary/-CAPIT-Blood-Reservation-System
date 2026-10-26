import { useEffect, useRef, useState } from "react";
import "../styles/Bloodrequestform.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const COMPONENTS = [
  { value: "Packed RBC", label: "Packed RBC" },
{ value: "Platelets", label: "Platelets" },
{ value: "Plasma", label: "Plasma" },
{ value: "Whole Blood", label: "Whole Blood" },
];

const SEXES = ["Female", "Male"];

const INITIAL = {
  lastName: "",
  firstName: "",
  middleName: "",
  age: "",
  sex: "",
  hospital: "",
  receivingFacilityID: "",
  wardRoom: "",
  diagnosis: "",
  hemoglobin: "",
  platelets: "",
  priorTransfusion: "",
  priorTransfusionDate: "",
  priorTransfusionNotes: "",
  bloodType: "",
  products: [{ rowId: 1, component: "", units: 1 }],
  urgency: "routine",
};

function todayLocalISO() {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function validate(v) {
  const e = {};
  if (!v.lastName.trim()) e.lastName = "Enter the last name.";
  if (!v.firstName.trim()) e.firstName = "Enter the first name.";
  if (v.age === "" || Number(v.age) < 0 || Number(v.age) > 120)
    e.age = "Enter 0 to 120.";
  if (!v.sex) e.sex = "Select a sex.";
  if (!v.hospital.trim()) e.hospital = "Enter the hospital.";
  if (!v.diagnosis.trim()) e.diagnosis = "Enter the reason for transfusion.";
  if (v.hemoglobin === "" && v.platelets === "")
    e.counts = "Enter a hemoglobin or platelet count.";
  if (!v.priorTransfusion) e.priorTransfusion = "Select an option.";
  if (v.priorTransfusion === "yes" && !v.priorTransfusionDate)
    e.priorTransfusionDate = "Select the date of the previous transfusion.";
  if (v.priorTransfusion === "yes" && v.priorTransfusionDate && v.priorTransfusionDate > todayLocalISO())
    e.priorTransfusionDate = "The date cannot be in the future.";
  if (!v.receivingFacilityID) e.receivingFacilityID = "Select a receiving BSF or PRC facility.";
  if (!v.bloodType) e.bloodType = "Select a blood type.";
  v.products.forEach((product) => {
    if (!COMPONENTS.some(option => option.value === product.component))
      e[`component-${product.rowId}`] = "Select a component.";
    if (!Number.isSafeInteger(Number(product.units)) || Number(product.units) < 1)
      e[`units-${product.rowId}`] = "Enter a whole number of at least 1.";
  });
  return e;
}

export default function BloodRequestForm() {
  const [values, setValues] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedRows, setSavedRows] = useState({});
  const [uncertainRow, setUncertainRow] = useState(null);
  const [receivingFacilities, setReceivingFacilities] = useState([]);
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [facilityError, setFacilityError] = useState("");
  const [facilityRefresh, setFacilityRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoadingFacilities(true); setFacilityError("");
    (async () => {
      try {
        const response = await fetch(`${API_URL}/api/blood-requests/receiving-facilities`, { credentials: "include", signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || "Could not load receiving facilities.");
        if (!Array.isArray(body.facilities)) throw new Error("The server returned an invalid facility list.");
        if (active) setReceivingFacilities(body.facilities);
      } catch (error) {
        if (active && error.name !== "AbortError") { setReceivingFacilities([]); setFacilityError(error.message); }
      } finally { if (active) setLoadingFacilities(false); }
    })();
    return () => { active = false; controller.abort(); };
  }, [facilityRefresh]);
  const nextRowId = useRef(2);
  const saveInProgress = useRef(false);

  const updateProduct = (rowId, name, value) => {
    setValues(previous => ({ ...previous, products: previous.products.map(product =>
      product.rowId === rowId ? { ...product, [name]: value } : product) }));
    setErrors(previous => {
      const next = { ...previous };
      delete next[`${name}-${rowId}`];
      return next;
    });
  };
  const addProduct = () => {
    const rowId = nextRowId.current++;
    setValues(previous => ({ ...previous, products: [...previous.products, { rowId, component: "", units: 1 }] }));
  };
  const removeProduct = (rowId) => {
    setValues(previous => previous.products.length > 1
    ? { ...previous, products: previous.products.filter(product => product.rowId !== rowId) } : previous);
    setErrors(previous => {
      const next = { ...previous };
      delete next[`component-${rowId}`]; delete next[`units-${rowId}`];
      return next;
    });
  };

  const set = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name] && !(prev.counts && (name === "hemoglobin" || name === "platelets")))
        return prev;
      const next = { ...prev };
      delete next[name];
      if (name === "hemoglobin" || name === "platelets") delete next.counts;
      return next;
    });
  };

  const onChange = (e) => set(e.target.name, e.target.value);

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validate(values);
    if (!receivingFacilities.some(facility => facility._id === values.receivingFacilityID))
      found.receivingFacilityID = "Select an available BSF or PRC facility.";
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document
      .querySelector("[data-invalid='true']")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const payload = {
      ...values,
      products: values.products.map(product => ({ ...product, units: Number(product.units) })),
      submittedAt: new Date().toISOString(),
    };
    setSaveError("");
    setSubmitted(payload);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveRequest = async () => {
    if (!submitted || saveInProgress.current || uncertainRow !== null) return;
    saveInProgress.current = true;
    setSaving(true);
    setSaveError("");
    // Only shared model fields go into every record; products/rowId are UI state.
    const { products, submittedAt, ...shared } = submitted;
    // This destination comes ONLY from the supplier dropdown. The backend
    // derives hospitalFacilityID and requestedBy from the signed-in account.
    const destinationID = submitted.receivingFacilityID;
    const basePayload = Object.fromEntries(Object.entries(shared).filter(([, value]) => value !== ""));
    try {
      for (const product of products) {
        if (savedRows[product.rowId]) continue;
        let response;
        try {
          response = await fetch(`${API_URL}/api/blood-requests`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...basePayload, receivingFacilityID: destinationID, component: product.component, units: product.units }),
          });
        } catch {
          setUncertainRow(product.rowId);
          throw new Error(`Could not confirm whether ${product.component} was saved. Check your submitted requests before starting another submission to avoid duplicates.`);
        }
        if (!response.ok) {
          let body = {};
          try { body = await response.json(); } catch { /* Keep the fallback message. */ }
          if (response.status >= 500) {
            setUncertainRow(product.rowId);
            throw new Error(`The server could not confirm the save for ${product.component}. Check your submitted requests before starting another submission.`);
          }
          throw new Error(`${product.component}: ${body.message || body.error || "The server could not save this product."} Earlier saved products will not be sent again.`);
        }
        // Confirm that the API persisted the selected destination before showing
        // success. An old model may otherwise discard an unknown schema field.
        let result;
        try { result = await response.json(); } catch {
          setUncertainRow(product.rowId);
          throw new Error("The server returned an unconfirmed save. Check submitted requests before trying again.");
        }
        const record = result.request || result.bloodRequest;
        const persistedDestination = typeof record?.receivingFacilityID === "string"
        ? record.receivingFacilityID : record?.receivingFacilityID?._id;
        if (persistedDestination !== destinationID) {
          setUncertainRow(product.rowId);
          throw new Error("The server did not confirm the selected receiving facility. Update the BloodRequest model and submission route, restart the backend, and check this request before resubmitting.");
        }
        setSavedRows(previous => ({ ...previous, [product.rowId]: true }));
      }
    } catch (error) {
      setSaveError(error.message || "Could not save the requests.");
    } finally {
      saveInProgress.current = false;
      setSaving(false);
    }
  };

  const reset = () => {
    setValues(INITIAL);
    setErrors({});
    setSubmitted(null);
    setSavedRows({});
    setUncertainRow(null);
    nextRowId.current = 2;
    setSaveError("");
  };

  if (submitted) {
    const s = submitted;
    const savedCount = s.products.filter(product => savedRows[product.rowId]).length;
    const allSaved = savedCount === s.products.length;
    const canEdit = savedCount === 0 && uncertainRow === null && !saving;
    return (
      <main className="brf">
      <div className="brf-wrap">
      <div className="brf-confirm-icon" aria-hidden="true">✓</div>
      <div className="brf-eyebrow">REQUEST SUMMARY</div>
      <h1>{allSaved ? "Requests saved successfully" : savedCount > 0 ? "Some requests have been saved" : "Review your request"}</h1>
      <p className="brf-lead">
      {allSaved
        ? `${savedCount} blood request${savedCount === 1 ? " has" : "s have"} been submitted successfully.`
        : `Each product below will be saved as a separate request with the same patient and clinical details. ${savedCount} of ${s.products.length} saved.`}
        </p>
        <dl className="brf-summary">
        <dt>Patient</dt>
        <dd>
        {s.lastName}, {s.firstName} {s.middleName}, {s.age}, {s.sex}
        </dd>
        <dt>Requesting hospital</dt>
        <dd>
        {s.hospital}
        {s.wardRoom && ` · ${s.wardRoom}`}
        </dd>
        <dt>Facility supplying the blood</dt>
        <dd>{receivingFacilities.find(facility => facility._id === s.receivingFacilityID)?.facilityName || "Selected facility"}</dd>
        <dt>Request</dt>
        <dd>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
        {s.products.map((product, index) => <li key={product.rowId} style={{ marginBottom: 8 }}>
        {product.units} unit{product.units === 1 ? "" : "s"} of {s.bloodType} {product.component}
        <span style={{ marginLeft: 8, fontSize: "0.85em" }}>
        {savedRows[product.rowId] ? "✓ Saved" : uncertainRow === product.rowId ? "Save unconfirmed — check requests" : `Product ${index + 1}`}
        </span>
        </li>)}
        </ul>
        </dd>
        <dt>Urgency</dt>
        <dd>{s.urgency === "stat" ? "STAT / Emergency" : "Routine"}</dd>
        </dl>
        {saveError && <p className="brf-error" role="alert">{saveError}</p>}
        <div className="brf-review-actions">
        {canEdit && <button
          type="button"
          className="brf-btn brf-btn--quiet"
          onClick={() => {
            setSubmitted(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          >
          <span aria-hidden="true">←</span> Back to form
          </button>}
          {!allSaved && uncertainRow === null && (
            <button type="button" className="brf-btn" onClick={saveRequest} disabled={saving}>
            {saving ? "Saving…" : savedCount > 0 ? "Submit remaining products" : "Submit requests"}
            </button>
          )}
          <button type="button" className="brf-btn brf-btn--quiet" onClick={reset} disabled={saving}>
          Start a new request
          </button>
          </div>
          </div>
          </main>
    );
  }

  const bad = (name) => (errors[name] ? "true" : undefined);

  return (
    <main className="brf">
    <div className="brf-wrap">
    <header className="brf-header">
    <div className="brf-brandline">
    <span className="brf-brandmark" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none"><path d="M12 2.5C9.3 6.4 5.5 10.5 5.5 14.7a6.5 6.5 0 0 0 13 0C18.5 10.5 14.7 6.4 12 2.5Z" fill="currentColor"/><path d="M12 10v8m-4-4h8" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
    </span>
    <span>HEALTHCARE SERVICES <span className="brf-brand-dot">/</span> TRANSFUSION REQUEST</span>
    </div>
    <div className="brf-header-main">
    <div>
    <div className="brf-eyebrow">PATIENT CARE · BLOOD SERVICES</div>
    <h1>Blood Request Form<span className="brf-title-dot">.</span></h1>
    <p className="brf-lead">Request blood products for a patient. Please complete the clinical information below.</p>
    </div>
    <div className="brf-header-art" aria-hidden="true">
    <svg viewBox="0 0 100 100" fill="none"><path d="M50 11C36 31 22 47 22 63a28 28 0 0 0 56 0C78 47 64 31 50 11Z" fill="currentColor" opacity=".12"/><path d="M50 24C39 40 32 50 32 63a18 18 0 0 0 36 0C68 50 61 40 50 24Z" fill="currentColor" opacity=".23"/><path d="M50 51v24M38 63h24" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/></svg>
    </div>
    </div>
    <div className="brf-info-banner"><span className="brf-info-icon" aria-hidden="true">i</span><span>For completion by an attending physician or nurse. Fields marked optional may be left blank.</span></div>
    </header>

    <form onSubmit={handleSubmit} noValidate>
    {/* ---------- Patient ---------- */}
    <fieldset className="brf-section">
    <legend>Patient information</legend>

    <div className="brf-row">
    <Field label="Last name" error={errors.lastName} invalid={bad("lastName")} grow>
    <input name="lastName" value={values.lastName} onChange={onChange} autoComplete="off" />
    </Field>
    <Field label="First name" error={errors.firstName} invalid={bad("firstName")} grow>
    <input name="firstName" value={values.firstName} onChange={onChange} autoComplete="off" />
    </Field>
    <Field label="Middle name" optional grow>
    <input name="middleName" value={values.middleName} onChange={onChange} autoComplete="off" />
    </Field>
    </div>

    <div className="brf-row brf-row--demographics">
    <Field label="Age" error={errors.age} invalid={bad("age")} width="xs">
    <input
    name="age"
    type="number"
    min="0"
    max="120"
    inputMode="numeric"
    value={values.age}
    onChange={onChange}
    />
    </Field>
    <Field label="Sex" error={errors.sex} invalid={bad("sex")} width="sm">
    <select name="sex" value={values.sex} onChange={onChange}>
    <option value="">Select</option>
    {SEXES.map((g) => (
      <option key={g} value={g}>
      {g}
      </option>
    ))}
    </select>
    </Field>
    </div>

    <div className="brf-row">
    <Field label="Requesting hospital" error={errors.hospital} invalid={bad("hospital")} grow>
    <input name="hospital" value={values.hospital} onChange={onChange} autoComplete="off" />
    </Field>
    <Field label="Ward / room" optional width="md">
    <input name="wardRoom" value={values.wardRoom} onChange={onChange} autoComplete="off" />
    </Field>
    </div>
    </fieldset>

    {/* ---------- Clinical ---------- */}
    <fieldset className="brf-section">
    <legend>Clinical information</legend>

    <Field label="Reason for transfusion" error={errors.diagnosis} invalid={bad("diagnosis")}>
    <textarea
    name="diagnosis"
    rows={3}
    value={values.diagnosis}
    onChange={onChange}
    placeholder="Diagnosis or clinical reason"
    />
    </Field>

    <div className="brf-row brf-row--blood-counts" data-invalid={bad("counts")}>
    <Field label="Hemoglobin (g/dL)" width="xs">
    <div className="brf-suffix">
    <input
    name="hemoglobin"
    type="number"
    step="0.1"
    min="0"
    inputMode="decimal"
    value={values.hemoglobin}
    onChange={onChange}
    />
    </div>
    </Field>
    <Field label="Platelets (×10³/µL)" width="sm">
    <div className="brf-suffix">
    <input
    name="platelets"
    type="number"
    min="0"
    inputMode="numeric"
    value={values.platelets}
    onChange={onChange}
    />
    </div>
    </Field>
    {errors.counts && <p className="brf-error brf-error--row">{errors.counts}</p>}
    </div>

    <Field
    label="Previous transfusions"
    error={errors.priorTransfusion}
    invalid={bad("priorTransfusion")}
    group
    >
    <div className="brf-chips" role="radiogroup" aria-label="Previous transfusions">
    {[
      ["no", "None"],
      ["yes", "Yes"],
      ["unknown", "Not known"],
    ].map(([val, label]) => (
      <label key={val} className={`brf-chip${values.priorTransfusion === val ? " is-on" : ""}`}>
      <input
      type="radio"
      name="priorTransfusion"
      value={val}
      checked={values.priorTransfusion === val}
      onChange={onChange}
      />
      <span>{label}</span>
      </label>
    ))}
    </div>
    </Field>

    {values.priorTransfusion === "yes" && (
      <div className="brf-transfusion-details">
      <Field
      label="Date of previous transfusion"
      error={errors.priorTransfusionDate}
      invalid={bad("priorTransfusionDate")}
      >
      <input
      type="date"
      name="priorTransfusionDate"
      value={values.priorTransfusionDate}
      max={todayLocalISO()}
      onChange={onChange}
      aria-label="Date of previous transfusion"
      />
      </Field>
      <Field label="Previous transfusion reactions or notes" optional>
      <textarea
      name="priorTransfusionNotes"
      rows={2}
      value={values.priorTransfusionNotes}
      onChange={onChange}
      placeholder="Describe any reactions or relevant details (if any)"
      />
      </Field>
      </div>
    )}
    </fieldset>

    {/* ---------- Request ---------- */}
    <fieldset className="brf-section">
    <legend>Blood product request</legend>
    <Field label="Facility to get blood from (BSF / PRC)" error={errors.receivingFacilityID} invalid={bad("receivingFacilityID")}>
    <select name="receivingFacilityID" value={values.receivingFacilityID} onChange={onChange} disabled={loadingFacilities || receivingFacilities.length === 0}>
    <option value="">{loadingFacilities ? "Loading facilities…" : "Select the facility that will supply the blood"}</option>
    {receivingFacilities.map(facility => <option key={facility._id} value={facility._id}>{facility.facilityName} · {facility.facilityType === "bsf" ? "BSF" : "PRC Chapter"}</option>)}
    </select>
    </Field>
    {facilityError && <div role="alert"><p className="brf-error">{facilityError}</p><button type="button" className="brf-btn brf-btn--quiet" onClick={() => setFacilityRefresh(value => value + 1)}>Retry facilities</button></div>}
    <p style={{ fontSize: "0.9em", marginTop: 4 }}>Choose the BSF or PRC chapter that will receive this request and supply the blood. This is separate from the requesting hospital.</p>
    {!loadingFacilities && !facilityError && receivingFacilities.length === 0 && <p className="brf-error" role="status">No active BSF or PRC facilities are available.</p>}


    <div className="brf-row">
    <Field label="Blood type" error={errors.bloodType} invalid={bad("bloodType")} width="sm">
    <select name="bloodType" value={values.bloodType} onChange={onChange}>
    <option value="">Select</option>
    {BLOOD_TYPES.map((t) => (
      <option key={t} value={t}>
      {t}
      </option>
    ))}
    </select>
    </Field>
    </div>

    {values.products.map((product, index) => (
      <div key={product.rowId} className="brf-row" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
      <Field label={`Component ${index + 1}`} error={errors[`component-${product.rowId}`]} invalid={bad(`component-${product.rowId}`)} grow>
      <select name={`component-${product.rowId}`} value={product.component} onChange={event => updateProduct(product.rowId, "component", event.target.value)}>
      <option value="">Select</option>
      {COMPONENTS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      </Field>
      <Field label="Units" error={errors[`units-${product.rowId}`]} invalid={bad(`units-${product.rowId}`)} width="sm" group>
      <div className="brf-stepper" role="group" aria-label={`Number of units for product ${index + 1}`}>
      <button type="button" aria-label={`Decrease units for product ${index + 1}`} onClick={() => updateProduct(product.rowId, "units", Math.max(1, Number(product.units || 1) - 1))}>−</button>
      <input name={`units-${product.rowId}`} type="number" min="1" step="1" inputMode="numeric" value={product.units} onChange={event => updateProduct(product.rowId, "units", event.target.value)} aria-label={`Units for product ${index + 1}`} />
      <button type="button" aria-label={`Increase units for product ${index + 1}`} onClick={() => updateProduct(product.rowId, "units", Number(product.units || 0) + 1)}>+</button>
      </div>
      </Field>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 26 }}>
      <button type="button" className="brf-btn brf-btn--quiet" onClick={addProduct} aria-label="Add another blood product" title="Add another blood product" style={{ padding: "10px 14px" }}>＋ Add</button>
      <button type="button" className="brf-btn brf-btn--quiet" onClick={() => removeProduct(product.rowId)} disabled={values.products.length === 1} aria-label={`Remove product ${index + 1}`} style={{ padding: "10px 14px" }}>Remove</button>
      </div>
      </div>
    ))}


    <Field label="Urgency" group>
    <div className="brf-urgency" role="radiogroup" aria-label="Urgency">
    {[
      ["routine", "Routine", "Needed within the next day or more"],
      ["stat", "STAT / Emergency", "Needed immediately"],
    ].map(([val, label, hint]) => (
      <label
      key={val}
      className={`brf-urg brf-urg--${val}${values.urgency === val ? " is-on" : ""}`}
      >
      <input
      type="radio"
      name="urgency"
      value={val}
      checked={values.urgency === val}
      onChange={onChange}
      />
      <strong>{label}</strong>
      <small>{hint}</small>
      </label>
    ))}
    </div>
    </Field>
    </fieldset>

    <div className="brf-actions">
    <p className="brf-actions-note">Please review all details before submitting.</p>
    <button type="button" className="brf-btn brf-btn--quiet" onClick={reset} disabled={saving}>
    Clear form
    </button>
    <button type="submit" className="brf-btn">
    Review request <span aria-hidden="true">→</span>
    </button>
    </div>
    </form>
    </div>
    </main>
  );
}

function Field({ label, error, invalid, optional, width, grow, group, children }) {
  const cls = ["brf-field", width && `brf-w-${width}`, grow && "brf-grow"].filter(Boolean).join(" ");
  const Wrapper = group ? "div" : "label";
  return (
    <div className={cls} data-invalid={invalid}>
    <Wrapper className="brf-field-inner">
    <span className="brf-label">
    {label}
    {optional && <em>(optional)</em>}
    </span>
    {children}
    </Wrapper>
    {error && (
      <p className="brf-error" role="alert">
      {error}
      </p>
    )}
    </div>
  );
}
