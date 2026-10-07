import React, {
    useMemo,
    useState
} from 'react';

import {
    UTILIZATION_STATUSES
} from './mockUtilizationData';

import {
    getFacilityName,
    getTodayValue
} from './utilizationUtils';


function SubmitUtilizationModal({
    issuedUnits = [],
    onClose,
    onSubmit,
    submitting = false
}) {

    const [formData, setFormData] =
        useState({
            bloodUnitID: '',
            status: 'Used',
            utilizationDate:
                getTodayValue(),
            description: ''
        });


    const selectedUnit =
        useMemo(
            () =>
                issuedUnits.find(
                    (unit) =>
                        unit.bloodUnitID ===
                        formData.bloodUnitID
                ),
            [
                issuedUnits,
                formData.bloodUnitID
            ]
        );


    const handleChange = (
        field,
        value
    ) => {

        setFormData(
            (current) => ({
                ...current,
                [field]: value
            })
        );
    };


    const handleSubmit = (event) => {

        event.preventDefault();

        if (!selectedUnit) {
            return;
        }


        onSubmit({
            bsfFacilityID:
                selectedUnit
                    .bsfFacilityID?._id ||
                selectedUnit
                    .bsfFacilityID ||
                '',

            hospitalFacilityID:
                selectedUnit
                    .hospitalFacilityID?._id ||
                selectedUnit
                    .hospitalFacilityID ||
                '',

            bloodRequestID:
                selectedUnit
                    .bloodRequestID ||
                null,

            bloodUnitID:
                selectedUnit
                    .bloodUnitID,

            bloodType:
                selectedUnit
                    .bloodType,

            component:
                selectedUnit
                    .component,

            status:
                formData.status,

            utilizationDate:
                formData
                    .utilizationDate,

            description:
                formData
                    .description
                    .trim()
        });
    };


    const handleOverlayMouseDown =
        (event) => {

            if (
                event.target ===
                    event.currentTarget &&
                !submitting
            ) {
                onClose();
            }
        };


    return (
        <div
            className="util-modal-overlay"
            onMouseDown={
                handleOverlayMouseDown
            }
        >

            <div
                className="util-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="util-modal-title"
            >

                <div className="util-modal-header">

                    <div>

                        <h3
                            id="util-modal-title"
                        >
                            Submit Utilization Report
                        </h3>

                        <p>
                            Record what happened
                            to an issued blood unit.
                        </p>

                    </div>


                    <button
                        type="button"
                        className="util-modal-close"
                        onClick={onClose}
                        disabled={submitting}
                        aria-label="Close"
                    >
                        ×
                    </button>

                </div>


                <form
                    className="util-form"
                    onSubmit={handleSubmit}
                >

                    <div className="util-form-group">

                        <label
                            htmlFor="util-blood-unit"
                        >
                            Issued Blood Unit
                        </label>


                        <select
                            id="util-blood-unit"
                            value={
                                formData
                                    .bloodUnitID
                            }
                            onChange={(
                                event
                            ) =>
                                handleChange(
                                    'bloodUnitID',
                                    event.target
                                        .value
                                )
                            }
                            required
                        >

                            <option value="">
                                Select issued
                                blood unit
                            </option>


                            {issuedUnits.map(
                                (unit) => (

                                    <option
                                        key={
                                            unit
                                                .bloodUnitID
                                        }
                                        value={
                                            unit
                                                .bloodUnitID
                                        }
                                    >
                                        {
                                            unit
                                                .bloodUnitID
                                        }
                                        {' — '}
                                        {
                                            unit
                                                .bloodType
                                        }
                                        {' — '}
                                        {
                                            unit
                                                .component
                                        }
                                    </option>

                                )
                            )}

                        </select>

                    </div>


                    {issuedUnits.length ===
                        0 && (

                        <div className="util-form-message">

                            No issued blood
                            units are currently
                            available for
                            reporting.

                        </div>

                    )}


                    {selectedUnit && (

                        <div className="util-unit-preview">

                            <div className="util-unit-detail">

                                <span>
                                    Request ID
                                </span>

                                <strong>
                                    {
                                        selectedUnit
                                            .bloodRequestID ||
                                        '—'
                                    }
                                </strong>

                            </div>


                            <div className="util-unit-detail">

                                <span>
                                    Supplying BSF
                                </span>

                                <strong>
                                    {getFacilityName(
                                        selectedUnit
                                            .bsfFacilityID
                                    )}
                                </strong>

                            </div>


                            <div className="util-unit-detail">

                                <span>
                                    Blood Type
                                </span>

                                <strong>
                                    {
                                        selectedUnit
                                            .bloodType
                                    }
                                </strong>

                            </div>


                            <div className="util-unit-detail">

                                <span>
                                    Component
                                </span>

                                <strong>
                                    {
                                        selectedUnit
                                            .component
                                    }
                                </strong>

                            </div>

                        </div>

                    )}


                    <div className="util-form-group">

                        <label
                            htmlFor="util-status"
                        >
                            Disposition
                        </label>


                        <select
                            id="util-status"
                            value={
                                formData.status
                            }
                            onChange={(
                                event
                            ) =>
                                handleChange(
                                    'status',
                                    event.target
                                        .value
                                )
                            }
                            required
                        >

                            {UTILIZATION_STATUSES.map(
                                (status) => (

                                    <option
                                        key={
                                            status
                                        }
                                        value={
                                            status
                                        }
                                    >
                                        {status}
                                    </option>

                                )
                            )}

                        </select>

                    </div>


                    <div className="util-form-group">

                        <label
                            htmlFor="util-date"
                        >
                            Utilization Date
                        </label>


                        <input
                            id="util-date"
                            type="date"
                            value={
                                formData
                                    .utilizationDate
                            }
                            onChange={(
                                event
                            ) =>
                                handleChange(
                                    'utilizationDate',
                                    event.target
                                        .value
                                )
                            }
                            required
                        />

                    </div>


                    <div className="util-form-group">

                        <label
                            htmlFor="util-description"
                        >
                            Description
                        </label>


                        <textarea
                            id="util-description"
                            rows="4"
                            value={
                                formData
                                    .description
                            }
                            onChange={(
                                event
                            ) =>
                                handleChange(
                                    'description',
                                    event.target
                                        .value
                                )
                            }
                            placeholder="Optional notes about the blood unit..."
                        />

                    </div>


                    <div className="util-modal-actions">

                        <button
                            type="button"
                            className="util-btn-secondary"
                            onClick={onClose}
                            disabled={
                                submitting
                            }
                        >
                            Cancel
                        </button>


                        <button
                            type="submit"
                            className="util-btn-primary"
                            disabled={
                                submitting ||
                                !selectedUnit
                            }
                        >
                            {submitting
                                ? 'Submitting...'
                                : 'Submit Report'}
                        </button>

                    </div>

                </form>

            </div>

        </div>
    );
}


export default SubmitUtilizationModal;