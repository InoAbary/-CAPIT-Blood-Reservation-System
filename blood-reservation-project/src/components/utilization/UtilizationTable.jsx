import React from 'react';

import {
    formatDateTime,
    getFacilityName,
    getPerformerName,
    getStatusClass
} from './utilizationUtils';


function UtilizationTable({
    reports,
    role
}) {

    const isBSF = role === 'bsf';


    if (reports.length === 0) {
        return (
            <div className="util-empty-state">

                <strong>
                    No utilization reports found.
                </strong>

                <p>
                    {isBSF
                        ? 'Hospital-submitted utilization reports will appear here.'
                        : 'Your submitted utilization reports will appear here.'}
                </p>

            </div>
        );
    }


    return (
        <div className="util-table-wrapper">

            <table className="util-table">

                <thead>
                    <tr>

                        <th>
                            Report ID
                        </th>

                        {isBSF && (
                            <th>
                                Hospital
                            </th>
                        )}

                        <th>
                            Request ID
                        </th>

                        <th>
                            Blood Unit
                        </th>

                        {!isBSF && (
                            <th>
                                Supplying BSF
                            </th>
                        )}

                        <th>
                            Blood Type
                        </th>

                        <th>
                            Component
                        </th>

                        <th>
                            Disposition
                        </th>

                        <th>
                            Utilization Date
                        </th>

                        {isBSF && (
                            <th>
                                Submitted By
                            </th>
                        )}

                        <th>
                            Date Submitted
                        </th>

                    </tr>
                </thead>


                <tbody>

                    {reports.map((report) => (

                        <tr key={report._id}>

                            <td className="util-table-id">
                                {report._id}
                            </td>


                            {isBSF && (
                                <td>
                                    {getFacilityName(
                                        report.hospitalFacilityID
                                    )}
                                </td>
                            )}


                            <td>
                                {report.bloodRequestID || '—'}
                            </td>


                            <td className="util-table-id">
                                {report.bloodUnitID}
                            </td>


                            {!isBSF && (
                                <td>
                                    {getFacilityName(
                                        report.bsfFacilityID
                                    )}
                                </td>
                            )}


                            <td>
                                <span className="util-blood-type">
                                    {report.bloodType}
                                </span>
                            </td>


                            <td>
                                {report.component}
                            </td>


                            <td>
                                <span
                                    className={
                                        getStatusClass(
                                            report.status
                                        )
                                    }
                                >
                                    {report.status}
                                </span>
                            </td>


                            <td>
                                {formatDateTime(
                                    report.utilizationDate
                                )}
                            </td>


                            {isBSF && (
                                <td>
                                    {getPerformerName(
                                        report.performedBy
                                    )}
                                </td>
                            )}


                            <td>
                                {formatDateTime(
                                    report.dateCreated
                                )}
                            </td>

                        </tr>

                    ))}

                </tbody>

            </table>

        </div>
    );
}


export default UtilizationTable;