import React, { useMemo, useState } from 'react';


function InventoryEdit({
    inventory,
    onCancel,
    onReview,
}) {

    const [editedValues, setEditedValues] = useState(() => {

        const initialValues = {};

        inventory.forEach((item) => {
            initialValues[item._id] =
                String(Number(item.availQuantity) || 0);
        });

        return initialValues;
    });


    const changes = useMemo(() => {

        return inventory
            .filter((item) => {

                const newValue = editedValues[item._id];

                if (
                    newValue === undefined ||
                    newValue === ''
                ) {
                    return false;
                }

                return (
                    Number(newValue) !==
                    Number(item.availQuantity)
                );
            })
            .map((item) => {

                const oldQuantity =
                    Number(item.availQuantity) || 0;

                const newQuantity =
                    Number(editedValues[item._id]);

                return {
                    ...item,
                    oldQuantity,
                    newQuantity,
                    difference:
                        newQuantity - oldQuantity,
                };
            });

    }, [inventory, editedValues]);


    const changedIds = useMemo(
        () =>
            new Set(
                changes.map((item) => item._id)
            ),
        [changes]
    );


    const handleQuantityChange = (id, value) => {

        if (
            value !== '' &&
            !/^\d+$/.test(value)
        ) {
            return;
        }

        setEditedValues((current) => ({
            ...current,
            [id]: value,
        }));
    };


    const hasInvalidValues = inventory.some(
        (item) => {

            const value = editedValues[item._id];

            if (
                value === undefined ||
                value === ''
            ) {
                return true;
            }

            const numberValue = Number(value);

            return (
                !Number.isInteger(numberValue) ||
                numberValue < 0
            );
        }
    );


    const handleReview = () => {

        if (
            hasInvalidValues ||
            changes.length === 0
        ) {
            return;
        }

        onReview(changes);
    };


    return (
        <div className="w-full">

            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                <div className="text-left">

                <h2 className="m-0 !text-lg !font-bold !text-gray-900">
                    Update Inventory
                </h2>

                    <p className="mt-1 text-sm text-gray-500">
                        Enter the latest quantity for each
                        inventory record.
                    </p>

                </div>


                <div className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-[#c9363f]">
                    {changes.length}{' '}
                    {changes.length === 1
                        ? 'change'
                        : 'changes'}
                </div>

            </div>


            <div className="mb-4 rounded-lg border border-red-100 bg-red-50/60 px-4 py-3 text-left">

                <p className="m-0 text-xs leading-5 text-gray-600">
                    Edit the quantities that need to be
                    updated. Changed records will be
                    highlighted before you review and save
                    them.
                </p>

            </div>


            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">

                <table className="w-full min-w-[650px] border-collapse text-sm">

                    <thead className="bg-[#f8f1f1]">

                        <tr>

                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">
                                Component
                            </th>

                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">
                                Blood Type
                            </th>

                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">
                                Current
                            </th>

                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">
                                New Quantity
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        {inventory.map((item) => {

                            const changed =
                                changedIds.has(item._id);

                            return (

                                <tr
                                    key={item._id}
                                    className={
                                        changed
                                            ? 'border-t border-red-100 bg-red-50/60'
                                            : 'border-t border-gray-100'
                                    }
                                >

                                    <td className="px-4 py-3 text-left font-medium text-gray-800">
                                        {item.component}
                                    </td>


                                    <td className="px-4 py-3 text-left">

                                        <span className="inline-flex min-w-9 justify-center rounded-md border border-red-100 bg-red-50 px-2 py-1 text-xs font-bold text-[#b52d36]">
                                            {item.bloodType}
                                        </span>

                                    </td>


                                    <td className="px-4 py-3 text-left font-semibold text-gray-700">
                                        {item.availQuantity}
                                    </td>


                                    <td className="px-4 py-3 text-left">

                                        <div className="flex items-center gap-2">

                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={
                                                    editedValues[
                                                        item._id
                                                    ] ?? ''
                                                }
                                                onChange={(e) =>
                                                    handleQuantityChange(
                                                        item._id,
                                                        e.target.value
                                                    )
                                                }
                                                className="w-24 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-[#c9363f] focus:ring-2 focus:ring-red-100"
                                                aria-label={`New quantity for ${item.component} ${item.bloodType}`}
                                            />


                                            {changed && (

                                                <span className="text-xs font-semibold text-[#c9363f]">
                                                    {Number(
                                                        editedValues[
                                                            item._id
                                                        ]
                                                    ) >
                                                    Number(
                                                        item.availQuantity
                                                    )
                                                        ? '+'
                                                        : ''}
                                                    {Number(
                                                        editedValues[
                                                            item._id
                                                        ]
                                                    ) -
                                                        Number(
                                                            item.availQuantity
                                                        )}
                                                </span>

                                            )}

                                        </div>

                                    </td>

                                </tr>

                            );
                        })}

                    </tbody>

                </table>

            </div>


            {hasInvalidValues && (

                <p className="mt-3 text-left text-xs font-medium text-[#c9363f]">
                    All quantities must be whole numbers
                    greater than or equal to 0.
                </p>

            )}


            <div className="mt-5 flex justify-end gap-2">

                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                    Cancel
                </button>


                <button
                    type="button"
                    onClick={handleReview}
                    disabled={
                        changes.length === 0 ||
                        hasInvalidValues
                    }
                    className="rounded-lg border border-[#c9363f] bg-[#c9363f] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#b52d36] disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Review Changes
                    {changes.length > 0 &&
                        ` (${changes.length})`}
                </button>

            </div>

        </div>
    );
}


export default InventoryEdit;