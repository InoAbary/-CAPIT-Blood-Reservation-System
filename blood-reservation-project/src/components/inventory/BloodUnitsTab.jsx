import React, { useState, useEffect, useMemo } from 'react';

const API_URL =
(typeof process !== 'undefined' &&
process.env &&
process.env.REACT_APP_API_URL) ||
(typeof import.meta !== 'undefined' &&
import.meta.env &&
import.meta.env.VITE_API_URL) ||
'http://localhost:3000';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const COMPONENTS = ['Packed RBC', 'Plasma', 'Platelets', 'Whole Blood'];
const STATUSES = ['In-stock', 'Expired', 'Removed'];
const PAGE_SIZE = 8;


/* ---------- Helpers ---------- */

const toISODate = (date) => {
    const d = new Date(date);

    if (Number.isNaN(d.getTime())) return '';

    const pad = (n) => String(n).padStart(2, '0');

    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatDate = (date) => {
    if (!date) return '—';

    const iso = toISODate(date);

    if (!iso) return '—';

    return new Date(`${iso}T00:00:00`).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const statusClass = (status) =>
`bu-pill bu-pill-${status.toLowerCase().replace(/[^a-z]/g, '')}`;


/* ---------- Icons ---------- */

const Icon = ({ children, size = 16 }) => (
    <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    >
    {children}
    </svg>
);

const SearchIcon = () => (
    <Icon>
    <circle cx="11" cy="11" r="7" />
    <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </Icon>
);

const PlusIcon = () => (
    <Icon>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
    </Icon>
);

const PencilIcon = () => (
    <Icon size={14}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Icon>
);

const ChevronDownIcon = () => (
    <Icon size={14}>
    <polyline points="5 9 12 16 19 9" />
    </Icon>
);

const ChevronLeftIcon = () => (
    <Icon size={14}>
    <polyline points="15 5 8 12 15 19" />
    </Icon>
);

const ChevronRightIcon = () => (
    <Icon size={14}>
    <polyline points="9 5 16 12 9 19" />
    </Icon>
);


/* ---------- Add / Edit Dialog ---------- */

function Field({ label, htmlFor, error, children }) {
    return (
        <div className="bu-field">
        <label htmlFor={htmlFor}>{label}</label>

        {children}

        {error && (
            <p className="bu-field-error" role="alert">
            {error}
            </p>
        )}
        </div>
    );
}


function UnitModal({
    mode,
    unitId,
    initial,
    onSave,
    onDelete,
    onClose,
    saving,
    deleting,
    apiError
}) {
    const [form, setForm] = useState(initial);
    const [errors, setErrors] = useState({});
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== 'Escape') return;

            if (confirmingDelete) {
                setConfirmingDelete(false);
            } else {
                onClose();
            }
        };

        document.addEventListener('keydown', onKey);

        return () => document.removeEventListener('keydown', onKey);
    }, [onClose, confirmingDelete]);

    const set = (field) => (e) => {
        setForm((current) => ({
            ...current,
            [field]: e.target.value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const next = {};

        if (!form.donorID.trim()) {
            next.donorID = 'Donor ID is required.';
        }

        if (!form.bloodType) {
            next.bloodType = 'Select a blood type.';
        }

        if (!form.component) {
            next.component = 'Select a component.';
        }

        if (!form.collectionDate) {
            next.collectionDate = 'Collection date is required.';
        }

        if (!form.expiryDate) {
            next.expiryDate = 'Expiry date is required.';
        } else if (
            form.collectionDate &&
                form.expiryDate <= form.collectionDate
        ) {
            next.expiryDate = 'Expiry must be after the collection date.';
        }

        setErrors(next);

        if (Object.keys(next).length === 0) {
            onSave({
                ...form,
                donorID: form.donorID.trim()
            });
        }
    };

    return (
        <div
        className="bu-overlay"
        onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving && !deleting) {
                onClose();
            }
        }}
        >
        <div
        className="bu-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bu-modal-title"
        >
        <h3 id="bu-modal-title" className="bu-modal-title">
        {mode === 'add'
            ? 'Add blood unit'
    : 'Edit blood unit'}
    </h3>

    {apiError && (
        <p className="bu-api-error" role="alert">
        {apiError}
        </p>
    )}

    <form onSubmit={handleSubmit} noValidate>
    <div className="bu-grid">

    <Field label="Unit ID" htmlFor="bu-id">
    <input
    id="bu-id"
    value={unitId || 'Generated after saving'}
    readOnly
    className="bu-readonly"
    />
    </Field>

    <Field
    label="Donor ID"
    htmlFor="bu-donor"
    error={errors.donorID}
    >
    <input
    id="bu-donor"
    value={form.donorID}
    onChange={set('donorID')}
    aria-invalid={!!errors.donorID}
    autoFocus
    disabled={saving || deleting}
    />
    </Field>

    <Field
    label="Blood type"
    htmlFor="bu-type"
    error={errors.bloodType}
    >
    <select
    id="bu-type"
    value={form.bloodType}
    onChange={set('bloodType')}
    aria-invalid={!!errors.bloodType}
    disabled={saving || deleting}
    >
    <option value="">Select…</option>

    {BLOOD_TYPES.map((type) => (
        <option key={type} value={type}>
        {type}
        </option>
    ))}
    </select>
    </Field>

    <Field
    label="Component"
    htmlFor="bu-component"
    error={errors.component}
    >
    <select
    id="bu-component"
    value={form.component}
    onChange={set('component')}
    aria-invalid={!!errors.component}
    disabled={saving || deleting}
    >
    <option value="">Select…</option>

    {COMPONENTS.map((component) => (
        <option
        key={component}
        value={component}
        >
        {component}
        </option>
    ))}
    </select>
    </Field>

    <Field
    label="Collection date"
    htmlFor="bu-collected"
    error={errors.collectionDate}
    >
    <input
    id="bu-collected"
    type="date"
    value={form.collectionDate}
    onChange={set('collectionDate')}
    aria-invalid={!!errors.collectionDate}
    disabled={saving || deleting}
    />
    </Field>

    <Field
    label="Expiry date"
    htmlFor="bu-expiry"
    error={errors.expiryDate}
    >
    <input
    id="bu-expiry"
    type="date"
    value={form.expiryDate}
    onChange={set('expiryDate')}
    aria-invalid={!!errors.expiryDate}
    disabled={saving || deleting}
    />
    </Field>

    <Field label="Status" htmlFor="bu-status">
    <select
    id="bu-status"
    value={form.status}
    onChange={set('status')}
    disabled={saving || deleting}
    >
    {STATUSES.map((status) => (
        <option key={status} value={status}>
        {status}
        </option>
    ))}
    </select>
    </Field>
    </div>

    {confirmingDelete ? (
        <div className="bu-confirm" role="alert">
        <p>
        Delete unit {unitId}? This can&apos;t be
        undone.
        </p>

        <div className="bu-modal-actions">
        <button
        type="button"
        className="bu-btn-ghost"
        onClick={() =>
            setConfirmingDelete(false)
        }
        disabled={deleting}
        >
        Keep unit
        </button>

        <button
        type="button"
        className="bu-btn-danger"
        onClick={onDelete}
        disabled={deleting}
        >
        {deleting
            ? 'Deleting…'
    : 'Yes, delete'}
    </button>
    </div>
    </div>
    ) : (
        <div className="bu-modal-actions">

        {mode === 'edit' && (
            <button
            type="button"
            className="bu-btn-danger-soft bu-actions-left"
            onClick={() =>
                setConfirmingDelete(true)
            }
            disabled={saving || deleting}
            >
            Delete unit
            </button>
        )}

        <button
        type="button"
        className="bu-btn-ghost"
        onClick={onClose}
        disabled={saving || deleting}
        >
        Cancel
        </button>

        <button
        type="submit"
        className="bu-btn-primary"
        disabled={saving || deleting}
        >
        {saving
            ? mode === 'add'
    ? 'Adding…'
    : 'Saving…'
    : mode === 'add'
    ? 'Add unit'
    : 'Save changes'}
    </button>
    </div>
    )}
    </form>
    </div>
    </div>
    );
}


/* ---------- Filter ---------- */

function FilterSelect({
    label,
    value,
    onChange,
    allLabel,
    options
}) {
    return (
        <div className="bu-select-wrap">
        <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        >
        <option value="all">{allLabel}</option>

        {options.map((option) => (
            <option key={option} value={option}>
            {option}
            </option>
        ))}
        </select>

        <ChevronDownIcon />
        </div>
    );
}


/* ---------- Tab ---------- */

function BloodUnitsTab({ facilityID }) {

    const [units, setUnits] = useState([]);

    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [componentFilter, setComponentFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');

    const [page, setPage] = useState(1);

    const [modal, setModal] = useState(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [error, setError] = useState('');

    /*
     * Load blood units whenever the selected facility changes.
     */
    useEffect(() => {

        if (!facilityID) {
            setUnits([]);
            setLoading(false);
            return;
        }

        const controller = new AbortController();

        const loadUnits = async () => {

            setLoading(true);
            setError('');

            try {
                const response = await fetch(
                    `${API_URL}/api/facilities/${facilityID}/blood-units`,
                    {
                        signal: controller.signal
                    }
                );

                const body = await response.json();

                if (!response.ok) {
                    throw new Error(
                        body.message || 'Could not load blood units.'
                    );
                }

                setUnits(body);
                setPage(1);

            } catch (err) {

                if (err.name !== 'AbortError') {
                    setError(err.message);
                }

            } finally {
                setLoading(false);
            }
        };

        loadUnits();

        return () => controller.abort();

    }, [facilityID]);


    /* ---------- Filtering ---------- */

    const filtered = useMemo(() => {

        const q = query.trim().toLowerCase();

        return units.filter((unit) => {

            if (
                statusFilter !== 'all' &&
                unit.status !== statusFilter
            ) {
                return false;
            }

            if (
                componentFilter !== 'all' &&
                unit.component !== componentFilter
            ) {
                return false;
            }

            if (
                typeFilter !== 'all' &&
                unit.bloodType !== typeFilter
            ) {
                return false;
            }

            if (!q) return true;

            return [
                unit.bloodUnitID,
                unit.donorID,
                unit.bloodType,
                unit.component
            ].some((value) =>
            String(value || '')
            .toLowerCase()
            .includes(q)
            );
        });

    }, [
        units,
        query,
        statusFilter,
        componentFilter,
        typeFilter
    ]);


    /* ---------- Pagination ---------- */

    const total = filtered.length;

    const totalPages = Math.max(
        1,
        Math.ceil(total / PAGE_SIZE)
    );

    const safePage = Math.min(page, totalPages);

    const pageRows = filtered.slice(
        (safePage - 1) * PAGE_SIZE,
                                    safePage * PAGE_SIZE
    );

    const rangeStart =
    total === 0
    ? 0
    : (safePage - 1) * PAGE_SIZE + 1;

    const rangeEnd = Math.min(
        safePage * PAGE_SIZE,
        total
    );


    const onFilter = (setter) => (value) => {
        setter(value);
        setPage(1);
    };


    /* ---------- Add ---------- */

    const emptyForm = {
        donorID: '',
        bloodType: '',
        component: '',
        collectionDate: toISODate(new Date()),
        expiryDate: '',
        status: 'In-stock'
    };


    const handleAdd = async (values) => {

        setSaving(true);

        try {

            const response = await fetch(
                `${API_URL}/api/facilities/${facilityID}/blood-units`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(values)
                }
            );

            const body = await response.json();

            if (!response.ok) {
                throw new Error(
                    body.message || 'Could not create blood unit.'
                );
            }

            setUnits((current) => [
                body,
                ...current
            ]);

            setPage(1);
            setModal(null);

        } catch (err) {

            /*
             * Let the modal display the API error.
             */
            setModal((current) =>
            current
            ? {
                ...current,
                apiError: err.message
            }
            : current
            );

        } finally {
            setSaving(false);
        }
    };


    /* ---------- Edit ---------- */

    const handleEdit = async (values) => {

        const bloodUnitID = modal.unit.bloodUnitID;

        setSaving(true);

        try {

            const response = await fetch(
                `${API_URL}/api/facilities/${facilityID}/blood-units/${encodeURIComponent(
                    bloodUnitID
                )}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(values)
                }
            );

            const body = await response.json();

            if (!response.ok) {
                throw new Error(
                    body.message || 'Could not update blood unit.'
                );
            }

            setUnits((current) =>
            current.map((unit) =>
            unit.bloodUnitID === bloodUnitID
            ? body
            : unit
            )
            );

            setModal(null);

        } catch (err) {

            setModal((current) =>
            current
            ? {
                ...current,
                apiError: err.message
            }
            : current
            );

        } finally {
            setSaving(false);
        }
    };


    /* ---------- Save ---------- */

    const handleSave = (values) => {

        if (!modal) return;

        if (modal.mode === 'edit') {
            handleEdit(values);
        } else {
            handleAdd(values);
        }
    };


    /* ---------- Delete ---------- */

    const handleDelete = async () => {

        if (!modal?.unit?.bloodUnitID) return;

        const bloodUnitID = modal.unit.bloodUnitID;

        setDeleting(true);

        try {

            const response = await fetch(
                `${API_URL}/api/facilities/${facilityID}/blood-units/${encodeURIComponent(
                    bloodUnitID
                )}`,
                {
                    method: 'DELETE'
                }
            );

            const body = await response.json();

            if (!response.ok) {
                throw new Error(
                    body.message || 'Could not delete blood unit.'
                );
            }

            setUnits((current) =>
            current.filter(
                (unit) =>
                unit.bloodUnitID !== bloodUnitID
            )
            );

            setModal(null);

            /*
             * If deleting the last item on the current page,
             * move back to a valid page.
             */
            setPage((currentPage) => {
                const newTotal = total - 1;
                const newTotalPages = Math.max(
                    1,
                    Math.ceil(newTotal / PAGE_SIZE)
                );

                return Math.min(
                    currentPage,
                    newTotalPages
                );
            });

        } catch (err) {

            setModal((current) =>
            current
            ? {
                ...current,
                apiError: err.message
            }
            : current
            );

        } finally {
            setDeleting(false);
        }
    };


    /* ---------- Render ---------- */

    return (
        <div className="bu">

        <style>{`
            .bu-toolbar {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 12px;
            }

            .bu-search {
                position: relative;
                flex: 1 1 240px;
                max-width: 360px;
                color: var(--muted);
            }

            .bu-search svg {
                position: absolute;
                left: 14px;
                top: 50%;
                transform: translateY(-50%);
                pointer-events: none;
            }

            .bu-search input,
            .bu-select-wrap select {
                box-sizing: border-box;
                height: 42px;
                width: 100%;
                border: none;
                border-radius: 10px;
                background: var(--accent-faint);
                font: inherit;
                font-size: 14px;
                color: var(--ink);
            }

            .bu-search input {
                padding: 0 14px 0 40px;
            }

            .bu-search input::placeholder {
                color: var(--muted);
            }

            .bu-select-wrap {
                position: relative;
                flex: 0 0 170px;
                color: var(--accent);
            }

            .bu-select-wrap select {
                appearance: none;
                -webkit-appearance: none;
                padding: 0 36px 0 14px;
                font-weight: 600;
                cursor: pointer;
            }

            .bu-select-wrap svg {
                position: absolute;
                right: 14px;
                top: 50%;
                transform: translateY(-50%);
                pointer-events: none;
            }

            .bu-add {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                margin-left: auto;
                height: 42px;
                padding: 0 18px;
            }

            .bu-btn-primary,
            .bu-add {
                border: none;
                border-radius: 10px;
                background: var(--accent);
                font: inherit;
                font-size: 14px;
                font-weight: 700;
                color: #fff;
                cursor: pointer;
                transition: background 0.15s ease;
            }

            .bu-btn-primary {
                padding: 11px 22px;
            }

            .bu-btn-primary:hover:not(:disabled),
            .bu-add:hover:not(:disabled) {
                background: #b52d36;
            }

            .bu-btn-primary:disabled,
            .bu-add:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .bu-btn-ghost {
                padding: 11px 18px;
                border: none;
                border-radius: 10px;
                background: transparent;
                font: inherit;
                font-size: 14px;
                font-weight: 600;
                color: var(--muted);
                cursor: pointer;
            }

            .bu-btn-ghost:hover:not(:disabled) {
                background: var(--accent-faint);
            }

            .bu-btn-danger-soft,
            .bu-btn-danger {
                border: none;
                border-radius: 10px;
                font: inherit;
                font-size: 14px;
                cursor: pointer;
                transition: background 0.15s ease;
            }

            .bu-btn-danger-soft {
                padding: 11px 18px;
                background: #fdecea;
                font-weight: 600;
                color: #b3261e;
            }

            .bu-btn-danger-soft:hover:not(:disabled) {
                background: #f9d6d2;
            }

            .bu-btn-danger {
                padding: 11px 22px;
                background: #b3261e;
                font-weight: 700;
                color: #fff;
            }

            .bu-btn-danger:hover:not(:disabled) {
                background: #8f1e18;
            }

            .bu-btn-danger:disabled,
            .bu-btn-danger-soft:disabled,
            .bu-btn-ghost:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .bu-actions-left {
                margin-right: auto;
            }

            .bu-confirm {
                margin-top: 24px;
                padding: 14px 16px;
                border-radius: 10px;
                background: #fdecea;
            }

            .bu-confirm p {
                margin: 0 0 12px;
                font-size: 14px;
                font-weight: 600;
                color: #7a1f19;
            }

            .bu-confirm .bu-modal-actions {
                margin-top: 0;
            }

            .bu-api-error {
                margin: 0 0 18px;
                padding: 10px 12px;
                border-radius: 8px;
                background: #fdecea;
                color: #b3261e;
                font-size: 13px;
                font-weight: 600;
            }

            .bu input:focus-visible,
            .bu select:focus-visible,
            .bu button:focus-visible {
                outline: 2px solid var(--accent);
                outline-offset: 2px;
            }

            .bu-table-wrap {
                margin-top: 16px;
                border-radius: 10px;
                overflow-x: auto;
            }

            .bu-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
            }

            .bu-table th,
            .bu-table td {
                padding: 14px 12px;
                border-bottom: 1px solid var(--line);
                text-align: left;
                white-space: nowrap;
            }

            .bu-table thead th {
                background: #f8f1f1;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.03em;
                color: var(--muted);
            }

            .bu-table tbody tr:hover {
                background: var(--accent-faint);
            }

            .bu-table .bu-strong {
                font-weight: 700;
            }

            .bu-table .bu-actions {
                width: 1%;
                text-align: right;
            }

            .bu-pill {
                display: inline-block;
                padding: 3px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
            }

            .bu-pill-instock {
                background: #e3f4e8;
                color: #1f6b3a;
            }

            .bu-pill-expired {
                background: #fdf0d5;
                color: #8a5a00;
            }

            .bu-pill-removed {
                background: #ececf0;
                color: #55555f;
            }

            .bu-icon-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 30px;
                height: 30px;
                border: none;
                border-radius: 8px;
                background: var(--accent-faint);
                color: var(--accent);
                cursor: pointer;
                transition: background 0.15s ease;
            }

            .bu-icon-btn:hover {
                background: var(--accent-soft);
            }

            .bu-empty {
                padding: 48px 16px;
                text-align: center;
                font-size: 14px;
                font-weight: 600;
                color: var(--muted);
            }

            .bu-error {
                padding: 20px;
                border-radius: 10px;
                background: #fdecea;
                color: #b3261e;
                font-size: 14px;
                font-weight: 600;
            }

            .bu-loading {
                padding: 48px 16px;
                text-align: center;
                font-size: 14px;
                font-weight: 600;
                color: var(--muted);
            }

            .bu-footer {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                margin-top: 16px;
                font-size: 12px;
                color: var(--muted);
            }

            .bu-pager {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .bu-pager button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 30px;
                height: 30px;
                border: none;
                border-radius: 8px;
                background: var(--accent-faint);
                color: var(--accent);
                cursor: pointer;
            }

            .bu-pager button:hover:not(:disabled) {
                background: var(--accent-soft);
            }

            .bu-pager button:disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }

            /* ---------- Dialog ---------- */

            .bu-overlay {
                position: fixed;
                inset: 0;
                z-index: 50;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
                background: rgba(42, 42, 53, 0.35);
            }

            .bu-modal {
                box-sizing: border-box;
                width: min(520px, 100%);
                max-height: 100%;
                overflow-y: auto;
                padding: 24px;
                border-radius: 14px;
                background: #fff;
                box-shadow: 0 12px 40px rgba(60, 20, 20, 0.2);
            }

            .bu-modal-title {
                margin: 0 0 20px;
                font-size: 18px;
                font-weight: 800;
            }

            .bu-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
            }

            .bu-field label {
                display: block;
                margin-bottom: 6px;
                font-size: 12px;
                font-weight: 600;
                color: var(--muted);
            }

            .bu-field input,
            .bu-field select {
                box-sizing: border-box;
                width: 100%;
                height: 40px;
                padding: 0 12px;
                border: none;
                border-radius: 10px;
                background: var(--accent-faint);
                font: inherit;
                font-size: 14px;
                color: var(--ink);
            }

            .bu-field input[aria-invalid='true'],
            .bu-field select[aria-invalid='true'] {
                box-shadow: inset 0 0 0 1.5px #d9534f;
            }

            .bu-field .bu-readonly {
                background: #f3eeee;
                color: var(--muted);
                cursor: default;
            }

            .bu-field-error {
                margin: 6px 0 0;
                font-size: 12px;
                font-weight: 600;
                color: #b3261e;
            }

            .bu-modal-actions {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                margin-top: 24px;
            }

            @media (max-width: 480px) {
                .bu-grid {
                    grid-template-columns: 1fr;
                }
            }
            `}</style>


            {/* Toolbar */}

            <div className="bu-toolbar">

            <div className="bu-search">
            <SearchIcon />

            <input
            type="search"
            placeholder="Search blood units…"
            aria-label="Search blood units"
            value={query}
            onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
            }}
            />
            </div>


            <FilterSelect
            label="Filter by status"
            value={statusFilter}
            onChange={onFilter(setStatusFilter)}
            allLabel="All statuses"
            options={STATUSES}
            />

            <FilterSelect
            label="Filter by component"
            value={componentFilter}
            onChange={onFilter(setComponentFilter)}
            allLabel="All components"
            options={COMPONENTS}
            />

            <FilterSelect
            label="Filter by blood type"
            value={typeFilter}
            onChange={onFilter(setTypeFilter)}
            allLabel="All blood types"
            options={BLOOD_TYPES}
            />

            <button
            type="button"
            className="bu-add"
            onClick={() =>
                setModal({
                    mode: 'add',
                    apiError: ''
                })
            }
            disabled={!facilityID}
            >
            <PlusIcon />
            Add blood unit
            </button>

            </div>


            {/* Error */}

            {error && (
                <p className="bu-error" role="alert">
                {error}
                </p>
            )}


            {/* Table */}

            <div className="bu-table-wrap">

            {loading ? (
                <p className="bu-loading">
                Loading blood units…
                </p>

            ) : pageRows.length === 0 ? (
                <p className="bu-empty">
                No blood units match your search.
                </p>

            ) : (
                <table className="bu-table">

                <thead>
                <tr>
                <th scope="col">Unit ID</th>
                <th scope="col">Donor ID</th>
                <th scope="col">Blood type</th>
                <th scope="col">Component</th>
                <th scope="col">Collected</th>
                <th scope="col">Expires</th>
                <th scope="col">Status</th>
                <th scope="col" className="bu-actions">
                Actions
                </th>
                </tr>
                </thead>

                <tbody>

                {pageRows.map((unit) => (
                    <tr key={unit.bloodUnitID}>

                    <td className="bu-strong">
                    {unit.bloodUnitID}
                    </td>

                    <td>
                    {unit.donorID}
                    </td>

                    <td className="bu-strong">
                    {unit.bloodType}
                    </td>

                    <td>
                    {unit.component}
                    </td>

                    <td>
                    {formatDate(
                        unit.collectionDate
                    )}
                    </td>

                    <td>
                    {formatDate(
                        unit.expiryDate
                    )}
                    </td>

                    <td>
                    <span
                    className={statusClass(
                        unit.status
                    )}
                    >
                    {unit.status}
                    </span>
                    </td>

                    <td className="bu-actions">

                    <button
                    type="button"
                    className="bu-icon-btn"
                    aria-label={`Edit unit ${unit.bloodUnitID}`}
                    onClick={() =>
                        setModal({
                            mode: 'edit',
                            unit,
                            apiError: ''
                        })
                    }
                    >
                    <PencilIcon />
                    </button>

                    </td>

                    </tr>
                ))}

                </tbody>

                </table>
            )}

            </div>


            {/* Footer / Pagination */}

            <div className="bu-footer">

            <span>
            {rangeStart}–{rangeEnd} of {total}
            </span>

            <div className="bu-pager">

            <button
            type="button"
            aria-label="Previous page"
            disabled={safePage <= 1}
            onClick={() =>
                setPage(safePage - 1)
            }
            >
            <ChevronLeftIcon />
            </button>

            <button
            type="button"
            aria-label="Next page"
            disabled={safePage >= totalPages}
            onClick={() =>
                setPage(safePage + 1)
            }
            >
            <ChevronRightIcon />
            </button>

            </div>

            </div>


            {/* Modal */}

            {modal && (
                <UnitModal
                mode={modal.mode}
                unitId={
                    modal.mode === 'edit'
            ? modal.unit.bloodUnitID
            : null
                }
                initial={
                    modal.mode === 'edit'
            ? {
                donorID:
                modal.unit.donorID || '',

                bloodType:
                modal.unit.bloodType || '',

                component:
                modal.unit.component || '',

                collectionDate:
                toISODate(
                    modal.unit.collectionDate
                ),

                expiryDate:
                toISODate(
                    modal.unit.expiryDate
                ),

                status:
                modal.unit.status ||
                'In-stock'
            }
            : emptyForm
                }
                onSave={handleSave}
                onDelete={handleDelete}
                onClose={() => {
                    if (!saving && !deleting) {
                        setModal(null);
                    }
                }}
                saving={saving}
                deleting={deleting}
                apiError={modal.apiError}
                />
            )}

            </div>
    );
}

export default BloodUnitsTab;
