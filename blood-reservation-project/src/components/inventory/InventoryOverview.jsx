import React from 'react';


const BLOOD_TYPES = [
    'A+',
    'A-',
    'B+',
    'B-',
    'O+',
    'O-',
    'AB+',
    'AB-',
];


const COMPONENTS = [
    'Packed RBC',
    'Plasma',
    'Platelets',
    'Whole Blood'
];


function buildMatrix(rows) {
    const matrix = {};

    COMPONENTS.forEach((component) => {
        matrix[component] = {};

        BLOOD_TYPES.forEach((bloodType) => {
            matrix[component][bloodType] = 0;
        });
    });

    rows.forEach((item) => {
        if (
            matrix[item.component] &&
            Object.prototype.hasOwnProperty.call(
                matrix[item.component],
                item.bloodType
            )
        ) {
            matrix[item.component][item.bloodType] +=
                Number(item.availQuantity) || 0;
        }
    });

    return matrix;
}


function cell(quantity) {
    return quantity > 0 ? quantity : '—';
}


function formatDate(date) {
    return new Intl.DateTimeFormat('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}


function InventoryOverview({ inventory }) {

    const matrix = buildMatrix(inventory);


    const totalUnits = inventory.reduce(
        (sum, item) =>
            sum + (Number(item.availQuantity) || 0),
        0
    );


    const availableCount = inventory.filter(
        (item) => item.availStatus === 'Available'
    ).length;


    const limitedCount = inventory.filter(
        (item) => item.availStatus === 'Limited'
    ).length;


    const outOfStockCount = inventory.filter(
        (item) => item.availStatus === 'Out of Stock'
    ).length;


    const updateTimes = inventory
        .map((item) => new Date(item.lastUpdated).getTime())
        .filter((time) => !Number.isNaN(time));


    const lastUpdated =
        updateTimes.length > 0
            ? new Date(Math.max(...updateTimes))
            : null;


    return (
        <>
            <div className="inv-overview-header">

                <div>

                </div>

                <div className="inv-updated">
                    Last updated:{' '}
                    {lastUpdated
                        ? formatDate(lastUpdated)
                        : '—'}
                </div>

            </div>


            <div className="inv-summary-grid">

                <div className="inv-summary-card inv-summary-total">
                    <div className="inv-summary-label">
                        Total Units
                    </div>

                    <div className="inv-summary-value">
                        {totalUnits}
                    </div>

                    <div className="inv-summary-description">
                        Units currently recorded
                    </div>
                </div>


                <div className="inv-summary-card inv-summary-available">
                    <div className="inv-summary-label">
                        Available
                    </div>

                    <div className="inv-summary-value">
                        {availableCount}
                    </div>

                    <div className="inv-summary-description">
                        Stock records available
                    </div>
                </div>


                <div className="inv-summary-card inv-summary-limited">
                    <div className="inv-summary-label">
                        Limited
                    </div>

                    <div className="inv-summary-value">
                        {limitedCount}
                    </div>

                    <div className="inv-summary-description">
                        Stock records running low
                    </div>
                </div>


                <div className="inv-summary-card inv-summary-out">
                    <div className="inv-summary-label">
                        Out of Stock
                    </div>

                    <div className="inv-summary-value">
                        {outOfStockCount}
                    </div>

                    <div className="inv-summary-description">
                        Stock records unavailable
                    </div>
                </div>

            </div>

            <div className="inv-matrix-box">

                {inventory.length === 0 ? (

                    <p className="inv-empty">
                        No inventory records for this facility yet.
                    </p>

                ) : (

                    <table className="inv-table">

                        <thead>
                            <tr>

                                <th
                                    scope="col"
                                    aria-label="Component"
                                />

                                {BLOOD_TYPES.map((bloodType) => (
                                    <th
                                        key={bloodType}
                                        scope="col"
                                    >
                                        {bloodType}
                                    </th>
                                ))}

                                <th
                                    scope="col"
                                    className="inv-total"
                                >
                                    TOTAL
                                </th>

                            </tr>
                        </thead>


                        <tbody>

                            {COMPONENTS.map((component) => {

                                const total =
                                    BLOOD_TYPES.reduce(
                                        (sum, bloodType) =>
                                            sum +
                                            matrix[component][bloodType],
                                        0
                                    );

                                return (
                                    <tr key={component}>

                                        <th scope="row">
                                            {component}
                                        </th>


                                        {BLOOD_TYPES.map(
                                            (bloodType) => (
                                                <td
                                                    key={bloodType}
                                                    className={
                                                        matrix[component][bloodType] === 0
                                                            ? 'inv-zero'
                                                            : ''
                                                    }
                                                >
                                                    {cell(
                                                        matrix[component][bloodType]
                                                    )}
                                                </td>
                                            )
                                        )}


                                        <td
                                            className={`inv-total ${
                                                total === 0
                                                    ? 'inv-zero'
                                                    : ''
                                            }`}
                                        >
                                            {cell(total)}
                                        </td>

                                    </tr>
                                );
                            })}

                        </tbody>

                    </table>
                )}

            </div>
        </>
    );
}


export default InventoryOverview;