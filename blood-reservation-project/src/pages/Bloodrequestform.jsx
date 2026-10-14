import { useState } from "react";
import "./BloodRequestForm.css";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const COMPONENTS = [
  "Whole blood",
  "Packed red blood cells",
  "Platelet concentrate",
  "Fresh frozen plasma",
  "Cryoprecipitate",
];

const GENDERS = ["Female", "Male", "Other"];

const INITIAL = {
  lastName: "",
  firstName: "",
  middleName: "",
  age: "",
  gender: "",
  hospital: "",
  wardRoom: "",
  diagnosis: "",
  hemoglobin: "",
  platelets: "",
  priorTransfusion: "",
  priorTransfusionNotes: "",
  bloodType: "",
  component: "",
  units: 1,
  urgency: "routine",
};

function validate(v) {
  const e = {};
  if (!v.lastName.trim()) e.lastName = "Enter the last name.";
  if (!v.firstName.trim()) e.firstName = "Enter the first name.";
  if (v.age === "" || Number(v.age) < 0 || Number(v.age) > 120)
    e.age = "Enter 0 to 120.";
  if (!v.gender) e.gender = "Select a gender.";
  if (!v.hospital.trim()) e.hospital = "Enter the hospital.";
  if (!v.diagnosis.trim()) e.diagnosis = "Enter the reason for transfusion.";
  if (v.hemoglobin === "" && v.platelets === "")
    e.counts = "Enter a hemoglobin or platelet count.";
  if (!v.priorTransfusion) e.priorTransfusion = "Select an option.";
  if (v.priorTransfusion === "yes" && !v.priorTransfusionNotes.trim())
    e.priorTransfusionNotes = "Add when it happened and any reaction.";
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
    // TODO: POST payload to the backend (e.g. http://localhost:3000/api/blood-requests) once it exists.
    console.log("Blood request payload:", payload);
    setSubmitted(payload);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = () => {
    setValues(INITIAL);
    setErrors({});
    setSubmitted(null);
  };

  if (submitted) {
    const s = submitted;
    return (
      <main className="brf">
        <div className="brf-wrap">
          <h1>Request ready to send</h1>
          <p className="brf-lead">
            Nothing has been sent yet. The form is not connected to a backend.
          </p>
          <dl className="brf-summary">
            <dt>Patient</dt>
            <dd>
              {s.lastName}, {s.firstName} {s.middleName}, {s.age}, {s.gender}
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
          <button type="button" className="brf-btn" onClick={reset}>
            Start a new request
          </button>
        </div>
      </main>
    );
  }

  const bad = (name) => (errors[name] ? "true" : undefined);

  return (
    <main className="brf">
      <div className="brf-wrap">
        <header className="brf-header">
          <h1>Blood request</h1>
          <p className="brf-lead">
            Reserve blood units for a patient. Completed by the attending physician or nurse.
          </p>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          {/* ---------- Patient ---------- */}
          <fieldset className="brf-section">
            <legend>Patient</legend>

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

            <div className="brf-row">
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
              <Field label="Gender" error={errors.gender} invalid={bad("gender")} width="sm">
                <select name="gender" value={values.gender} onChange={onChange}>
                  <option value="">Select</option>
                  {GENDERS.map((g) => (
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

            <div className="brf-row" data-invalid={bad("counts")}>
              <Field label="Hemoglobin" width="xs">
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
                  <span>g/dL</span>
                </div>
              </Field>
              <Field label="Platelets" width="sm">
                <div className="brf-suffix">
                  <input
                    name="platelets"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={values.platelets}
                    onChange={onChange}
                  />
                  <span>×10³/µL</span>
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
              <Field
                label="When, and any reaction"
                error={errors.priorTransfusionNotes}
                invalid={bad("priorTransfusionNotes")}
              >
                <textarea
                  name="priorTransfusionNotes"
                  rows={2}
                  value={values.priorTransfusionNotes}
                  onChange={onChange}
                />
              </Field>
            )}
          </fieldset>

          {/* ---------- Request ---------- */}
          <fieldset className="brf-section">
            <legend>Request</legend>

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
            <button type="button" className="brf-btn brf-btn--quiet" onClick={reset}>
              Clear form
            </button>
            <button type="submit" className="brf-btn">
              Submit request
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