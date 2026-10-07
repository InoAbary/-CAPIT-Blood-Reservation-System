import React from 'react';


function UtilizationSummary({
    reports = []
}) {

    const total = reports.length;

    const usedCount =
        reports.filter(
            (report) =>
                report.status === 'Used'
        ).length;

    const wastedCount =
        reports.filter(
            (report) =>
                report.status === 'Wasted'
        ).length;

    const expiredCount =
        reports.filter(
            (report) =>
                report.status === 'Expired'
        ).length;

    const unusedCount =
        reports.filter(
            (report) =>
                report.status === 'Unused'
        ).length;


    /*
     * TODO:
     * Confirm the final formula for "wastage rate"
     * with your capstone adviser/panel if you want to
     * display this as an official metric.
     *
     * For now:
     * Wastage = Wasted + Expired
     */
    const wastageRate =
        total > 0
            ? (
                (
                    (
                        wastedCount +
                        expiredCount
                    ) /
                    total
                ) *
                100
            ).toFixed(1)
            : '0.0';


    const cards = [
        {
            label: 'Total Reports',
            value: total
        },
        {
            label: 'Used',
            value: usedCount
        },
        {
            label: 'Wasted',
            value: wastedCount
        },
        {
            label: 'Expired',
            value: expiredCount
        },
        {
            label: 'Unused',
            value: unusedCount
        },
        {
            label: 'Wastage Rate',
            value: `${wastageRate}%`
        }
    ];


    return (
        <div className="util-summary-grid">

            {cards.map((card) => (

                <div
                    className="util-summary-card"
                    key={card.label}
                >

                    <span className="util-summary-label">
                        {card.label}
                    </span>

                    <strong className="util-summary-value">
                        {card.value}
                    </strong>

                </div>

            ))}

        </div>
    );
}


export default UtilizationSummary;