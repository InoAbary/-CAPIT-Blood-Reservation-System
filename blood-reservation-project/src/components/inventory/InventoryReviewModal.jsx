import React from 'react';


function InventoryReviewModal({
    changes,
    onBack,
    onConfirm,
    saving = false,
    error = '',
}) {

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">

            <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-xl">

                {/* Header */}
                <div className="border-b border-gray-200 px-6 py-5 text-left">

                    <h2 className="m-0 text-lg font-bold text-gray-900">
                        Review Inventory Changes
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                        Review the updated quantities before saving them.
                    </p>

                </div>


                {/* Content */}
                <div className="max-h-[60vh] overflow-y-auto px-6 py-5">

                    <div className="mb-4 text-left text-sm text-gray-600">
                        <span className="font-semibold text-gray-900">
                            {changes.length}
                        </span>{' '}
                        {changes.length === 1
                            ? 'record has'
                            : 'records have'}{' '}
                        been changed.
                    </div>


                    <div className="overflow-x-auto rounded-lg border border-gray-200">

                        <table className="w-full min-w-[600px] border-collapse text-sm">

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
                                        New
                                    </th>

                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">
                                        Change
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {changes.map((item) => (

                                    <tr
                                        key={item._id}
                                        className="border-t border-gray-100"
                                    >

                                        <td className="px-4 py-3 text-left font-medium text-gray-800">
                                            {item.component}
                                        </td>


                                        <td className="px-4 py-3 text-left">

                                            <span className="inline-flex min-w-9 justify-center rounded-md border border-red-100 bg-red-50 px-2 py-1 text-xs font-bold text-[#b52d36]">
                                                {item.bloodType}
                                            </span>

                                        </td>


                                        <td className="px-4 py-3 text-left text-gray-600">
                                            {item.oldQuantity}
                                        </td>


                                        <td className="px-4 py-3 text-left font-bold text-gray-900">
                                            {item.newQuantity}
                                        </td>


                                        <td className="px-4 py-3 text-left">

                                            <span
                                                className={
                                                    item.difference > 0
                                                        ? 'font-bold text-green-600'
                                                        : 'font-bold text-[#c9363f]'
                                                }
                                            >
                                                {item.difference > 0
                                                    ? '+'
                                                    : ''}
                                                {item.difference}
                                            </span>

                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>

                    </div>

                </div>


                {/* Footer */}
                <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">

                {error && (
                    <div
                        role="alert"
                        className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700"
                    >
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-2">

                    <button
                        type="button"
                        onClick={onBack}
                        disabled={saving}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Back to Editing
                    </button>


                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={saving}
                        className="rounded-lg border border-[#c9363f] bg-[#c9363f] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#b52d36] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                                {saving
                            ? 'Saving...'
                            : 'Confirm & Save'}
                    </button>

                    </div>

                </div>

            </div>

        </div>
    );
}


export default InventoryReviewModal;