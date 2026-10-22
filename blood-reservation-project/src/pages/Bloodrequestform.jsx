import { useState } from "react";
import "./Bloodrequestform.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const COMPONENTS = [
  "Whole blood",
"Packed red blood cells",
"Platelet concentrate",
"Fresh frozen plasma",
"Cryoprecipitate",
];

const SEXES = ["Female", "Male"];

const INITIAL = {
  lastName: "",
  firstName: "",
  middleName: "",
  age: "",
  sex: "",
  hospital: "",
  wardRoom: "",
  diagnosis: "",
  hemoglobin: "",
  platelets: "",
  priorTransfusion: "",
  priorTransfusionDate: "",
  priorTransfusionNotes: "",
  bloodType: "",
  component: "",
  units: 1,
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
  if (!v.bloodType) e.bloodType = "Select a blood type.";
  if (!v.component) e.component = "Select a component.";
  if (!Number.isInteger(Number(v.units)) || Number(v.units) < 1)
    e.units = "At least 1.";
  return e;
}

export default function BloodRequestForm() {
  const [values, setValues] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedRecord, setSavedRecord] = useState(null);

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
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document
      .querySelector("[data-invalid='true']")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const payload = {
      ...values,
      units: Number(values.units),
      submittedAt: new Date().toISOString(),
    };
    setSaveError("");
    setSubmitted(payload);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveRequest = async () => {
    if (!submitted || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      // Convert empty optional fields to omission to avoid empty-string Date casting errors.
      const payload = Object.fromEntries(
        Object.entries(submitted).filter(([key, value]) =>
        key !== "submittedAt" && value !== ""
        )
      );
      const response = await fetch(`/api/bloodRequest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Server could not save the request.");
      const result = await response.json();
      setSavedRecord(result.bloodRequest);
    } catch (error) {
      setSaveError(error.message || "Could not connect to the server.");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setValues(INITIAL);
    setErrors({});
    setSubmitted(null);
    setSavedRecord(null);
    setSaveError("");
  };

  if (submitted) {
    const s = submitted;
    return (
      <main className="brf">
      <div className="brf-wrap">
      <div className="brf-confirm-icon" aria-hidden="true">✓</div>
      <div className="brf-eyebrow">REQUEST SUMMARY</div>
      <h1>{savedRecord ? "Request saved successfully" : "Review your request"}</h1>
      <p className="brf-lead">
      {savedRecord
        ? `MongoDB record created. ID: ${savedRecord._id}`
        : "Review these details, then submit to save the request in MongoDB."}
        </p>
        <dl className="brf-summary">
        <dt>Patient</dt>
        <dd>
        {s.lastName}, {s.firstName} {s.middleName}, {s.age}, {s.sex}
        </dd>
        <dt>Location</dt>
        <dd>
        {s.hospital}
        {s.wardRoom && ` · ${s.wardRoom}`}
        </dd>
        <dt>Request</dt>
        <dd>
        {s.units} unit{s.units > 1 ? "s" : ""} of {s.bloodType} {s.component.toLowerCase()}
        </dd>
        <dt>Urgency</dt>
        <dd>{s.urgency === "stat" ? "STAT / Emergency" : "Routine"}</dd>
        </dl>
        {saveError && <p className="brf-error" role="alert">{saveError}</p>}
        <div className="brf-review-actions">
        {!savedRecord && <button
          type="button"
          className="brf-btn brf-btn--quiet"
          onClick={() => {
            setSubmitted(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          >
          <span aria-hidden="true">←</span> Back to form
          </button>}
          {!savedRecord && (
            <button type="button" className="brf-btn" onClick={saveRequest} disabled={saving}>
            {saving ? "Saving..." : "Submit request"}
            </button>
          )}
          <button type="button" className="brf-btn brf-btn--quiet" onClick={reset}>
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
    <Field label="Hospital" error={errors.hospital} invalid={bad("hospital")} grow>
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
    <Field label="Component" error={errors.component} invalid={bad("component")} grow>
    <select name="component" value={values.component} onChange={onChange}>
    <option value="">Select</option>
    {COMPONENTS.map((c) => (
      <option key={c} value={c}>
      {c}
      </option>
    ))}
    </select>
    </Field>
    <Field label="Units" error={errors.units} invalid={bad("units")} width="sm" group>
    <div className="brf-stepper" role="group" aria-label="Number of units">
    <button
    type="button"
    aria-label="Decrease units"
    onClick={() => set("units", Math.max(1, Number(values.units) - 1))}
    >
    −
    </button>
    <input
    name="units"
    type="number"
    min="1"
    inputMode="numeric"
    value={values.units}
    onChange={onChange}
    aria-label="Units"
    />
    <button
    type="button"
    aria-label="Increase units"
    onClick={() => set("units", Number(values.units) + 1)}
    >
    +
    </button>
    </div>
    </Field>
    </div>

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
    <button type="button" className="brf-btn brf-btn--quiet" onClick={reset}>
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
