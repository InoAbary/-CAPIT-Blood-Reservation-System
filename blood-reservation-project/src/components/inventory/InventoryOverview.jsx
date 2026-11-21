import React, { useState } from 'react';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const COMPONENTS = ['Packed RBC', 'Plasma', 'Platelets', 'Whole Blood'];

const STOCK_VIEWS = [
    {
        field: 'inStockUnits',
        label: 'In stock',
        description: 'Usable bags currently on hand',
        className: 'inv-summary-total',
    },
    {
        field: 'allocatedUnits',
        label: 'Allocated',
        description: 'Reserved units awaiting release',
        className: 'inv-summary-allocated',
    },
    {
        field: 'availableUnits',
        label: 'Available for new requests',
        description: 'Units hospitals can still request',
        className: 'inv-summary-available',
    },
];

const STOCK_STATUS_CARDS = [
    {
        status: 'Available',
        description: 'Stock records with sufficient units',
        className: 'inv-summary-available',
    },
    {
        status: 'Limited',
        description: 'Stock records running low',
        className: 'inv-summary-limited',
    },
    {
        status: 'Out of Stock',
        description: 'Stock records with zero units',
        className: 'inv-summary-out',
    },
];

const stockKey = (component, bloodType) => `${component}|${bloodType}`;
const formatDate = new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
});

function InventoryOverview({ inventory }) {
    const [stockView, setStockView] = useState('availableUnits');

    const balances = new Map(inventory.map(row => [stockKey(row.component, row.bloodType), row]));
    const matrix = COMPONENTS.map(component => ({
        component,
        cells: BLOOD_TYPES.map(bloodType => balances.get(stockKey(component, bloodType))),
    }));
    const trackedBalances = matrix.flatMap(row => row.cells).filter(Boolean);

    if (trackedBalances.length === 0) {
        return <p className="inv-empty">No inventory records for this facility yet.</p>;
    }

    const hasBreakdown = trackedBalances.every(row =>
        STOCK_VIEWS.every(({ field }) => Number.isFinite(row[field]))
    );
    if (!hasBreakdown) {
        return <p className="inv-empty" role="status">The stock breakdown is unavailable. Refresh inventory after updating the backend.</p>;
    }

    const lastUpdated = Math.max(0, ...trackedBalances.map(({ lastUpdated }) => Date.parse(lastUpdated) || 0));
    const viewLabel = STOCK_VIEWS.find(({ field }) => field === stockView).label;
    const summaryGroups = [
        {
            title: 'Unit totals',
            cards: STOCK_VIEWS.map(({ field, label, description, className }) => ({
                label,
                description,
                className,
                count: trackedBalances.reduce((sum, row) => sum + row[field], 0),
            })),
        },
        {
            title: 'Stock status',
            cards: STOCK_STATUS_CARDS.map(({ status, description, className }) => ({
                label: status,
                description,
                className,
                count: inventory.filter(row => row.availStatus === status).length,
            })),
        },
    ];

    return (
        <>
            {lastUpdated > 0 && (
                <div className="inv-overview-header">
                    <div className="inv-updated">Stock records updated {formatDate.format(lastUpdated)}</div>
                </div>
            )}

            {summaryGroups.map(({ title, cards }) => (
                <section key={title} aria-label={title}>
                    <h3 className="inv-summary-heading">{title}</h3>
                    <div className="inv-summary-grid">
                        {cards.map(({ label, description, className, count }) => (
                            <div key={label} className={`inv-summary-card ${className}`}>
                                <div className="inv-summary-label">{label}</div>
                                <div className="inv-summary-value">{count}</div>
                                <div className="inv-summary-description">{description}</div>
                            </div>
                        ))}
                    </div>
                </section>
            ))}

            <div className="inv-matrix-heading">
                <h3>Stock by blood type and component</h3>
                <label className="inv-stock-filter">
                    Stock view
                    <select value={stockView} onChange={event => setStockView(event.target.value)}>
                        {STOCK_VIEWS.map(({ field, label }) => (
                            <option key={field} value={field}>{label}</option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="inv-matrix-box">
                <table className="inv-table" aria-label={`${viewLabel} by blood type and component`}>
                    <thead>
                        <tr>
                            <th scope="col">Component</th>
                            {BLOOD_TYPES.map(bloodType => <th key={bloodType} scope="col">{bloodType}</th>)}
                            <th scope="col" className="inv-total">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {matrix.map(({ component, cells }) => {
                            const counts = cells.map(cell => cell?.[stockView] ?? 0);
                            const total = counts.reduce((sum, count) => sum + count, 0);

                            return (
                                <tr key={component}>
                                    <th scope="row">{component}</th>
                                    {counts.map((count, index) => (
                                        <td key={BLOOD_TYPES[index]} className={count === 0 ? 'inv-zero' : ''}>
                                            {count}
                                        </td>
                                    ))}
                                    <td className={total === 0 ? 'inv-total inv-zero' : 'inv-total'}>{total}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
}

export default InventoryOverview;
