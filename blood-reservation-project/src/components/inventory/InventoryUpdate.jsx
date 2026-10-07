import React, { useMemo, useState } from 'react';
import InventoryEdit from './InventoryEdit';
import InventoryReviewModal from './InventoryReviewModal';


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
    'Whole Blood',
    'Cryoprecipitate',
];


const STATUSES = [
    'Available',
    'Limited',
    'Out of Stock',
];


function formatDate(date) {
    if (!date) return '—';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return '—';
    }

    return new Intl.DateTimeFormat('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(parsedDate);
}


function InventoryUpdate({
    inventory,
    onInventoryUpdated,
}) {

    const [isEditing, setIsEditing] = useState(false);
    const [reviewChanges, setReviewChanges] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    const [search, setSearch] = useState('');

    const [componentFilter, setComponentFilter] =
        useState('All');

    const [bloodTypeFilter, setBloodTypeFilter] =
        useState('All');

    const [statusFilter, setStatusFilter] =
        useState('All');

    const [sortConfig, setSortConfig] = useState({
        key: 'component',
        direction: 'asc',
    });


    const filteredInventory = useMemo(() => {

        const searchValue =
            search.trim().toLowerCase();


        const filtered = inventory.filter((item) => {

            const matchesSearch =
                searchValue === '' ||
                item.component
                    ?.toLowerCase()
                    .includes(searchValue) ||
                item.bloodType
                    ?.toLowerCase()
                    .includes(searchValue) ||
                item.availStatus
                    ?.toLowerCase()
                    .includes(searchValue);


            const matchesComponent =
                componentFilter === 'All' ||
                item.component === componentFilter;


            const matchesBloodType =
                bloodTypeFilter === 'All' ||
                item.bloodType === bloodTypeFilter;


            const matchesStatus =
                statusFilter === 'All' ||
                item.availStatus === statusFilter;


            return (
                matchesSearch &&
                matchesComponent &&
                matchesBloodType &&
                matchesStatus
            );
        });


        return [...filtered].sort((a, b) => {

            let first;
            let second;


            if (sortConfig.key === 'availQuantity') {

                first = Number(a.availQuantity) || 0;
                second = Number(b.availQuantity) || 0;

            } else if (sortConfig.key === 'lastUpdated') {

                first =
                    new Date(a.lastUpdated || 0).getTime();

                second =
                    new Date(b.lastUpdated || 0).getTime();

            } else {

                first = String(
                    a[sortConfig.key] || ''
                ).toLowerCase();

                second = String(
                    b[sortConfig.key] || ''
                ).toLowerCase();
            }


            if (first < second) {
                return sortConfig.direction === 'asc'
                    ? -1
                    : 1;
            }


            if (first > second) {
                return sortConfig.direction === 'asc'
                    ? 1
                    : -1;
            }


            return 0;
        });

    }, [
        inventory,
        search,
        componentFilter,
        bloodTypeFilter,
        statusFilter,
        sortConfig,
    ]);


    const handleSort = (key) => {

        setSortConfig((current) => {

            if (current.key === key) {

                return {
                    key,
                    direction:
                        current.direction === 'asc'
                            ? 'desc'
                            : 'asc',
                };
            }


            return {
                key,
                direction: 'asc',
            };
        });
    };


    const getSortIndicator = (key) => {

        if (sortConfig.key !== key) {
            return '↕';
        }

        return sortConfig.direction === 'asc'
            ? '↑'
            : '↓';
    };


    const clearFilters = () => {

        setSearch('');

        setComponentFilter('All');

        setBloodTypeFilter('All');

        setStatusFilter('All');
    };


    const hasActiveFilters =
        search.trim() !== '' ||
        componentFilter !== 'All' ||
        bloodTypeFilter !== 'All' ||
        statusFilter !== 'All';

        const handleReviewChanges = (changes) => {

            setReviewChanges(changes);
        
        };

        const handleConfirmSave = async () => {

            if (!reviewChanges || reviewChanges.length === 0) {
                return;
            }
        
            setSaving(true);
            setSaveError('');
        
            try {
        
                const updates = reviewChanges.map((item) => ({
                    id: item._id,
                    availQuantity: item.newQuantity,
                }));
        
                const response = await fetch(
                    '/api/inventories/batch',
                    {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            updates: updates,
                        }),
                    }
                );
        
                const data = await response.json();
        
                if (!response.ok) {
                    throw new Error(
                        data.message ||
                        'Failed to update inventory.'
                    );
                }
        
                onInventoryUpdated(data.inventories);
        
                setReviewChanges(null);
                setIsEditing(false);
        
            } catch (error) {
        
                console.error(
                    'Failed to update inventory:',
                    error
                );
        
                setSaveError(
                    error.message ||
                    'Failed to update inventory. Please try again.'
                );
        
            } finally {
        
                setSaving(false);
        
            }
        
        };

        if (isEditing) {

            return (
                <>
                    <InventoryEdit
                        inventory={inventory}
                        onCancel={() => {
                            setReviewChanges(null);
                            setIsEditing(false);
                        }}
                        onReview={handleReviewChanges}
                    />
        
                    {reviewChanges && (
                       <InventoryReviewModal
                       changes={reviewChanges}
                       onBack={() => {
                           setSaveError('');
                           setReviewChanges(null);
                       }}
                       onConfirm={handleConfirmSave}
                       saving={saving}
                       error={saveError}
                   />

                        
                    )} 
                </>
            );
        
        }

    return (
        <div className="inv-update">


            <div className="inv-update-header">

                <div>


                </div>


                <button
                    type="button"
                    className="inv-update-button"
                    onClick={() => setIsEditing(true)}
                    disabled={inventory.length === 0}
                >
                    Update Inventory
                </button>

            </div>


            <div className="inv-update-tools">


                <div className="inv-update-search">

                    <label htmlFor="inventory-search">
                        Search
                    </label>

                    <input
                        id="inventory-search"
                        type="search"
                        placeholder="Search inventory..."
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                    />

                </div>


                <div className="inv-update-filter">

                    <label htmlFor="component-filter">
                        Component
                    </label>

                    <select
                        id="component-filter"
                        value={componentFilter}
                        onChange={(e) =>
                            setComponentFilter(
                                e.target.value
                            )
                        }
                    >

                        <option value="All">
                            All components
                        </option>

                        {COMPONENTS.map((component) => (
                            <option
                                key={component}
                                value={component}
                            >
                                {component}
                            </option>
                        ))}

                    </select>

                </div>


                <div className="inv-update-filter">

                    <label htmlFor="blood-type-filter">
                        Blood Type
                    </label>

                    <select
                        id="blood-type-filter"
                        value={bloodTypeFilter}
                        onChange={(e) =>
                            setBloodTypeFilter(
                                e.target.value
                            )
                        }
                    >

                        <option value="All">
                            All blood types
                        </option>

                        {BLOOD_TYPES.map((bloodType) => (
                            <option
                                key={bloodType}
                                value={bloodType}
                            >
                                {bloodType}
                            </option>
                        ))}

                    </select>

                </div>


                <div className="inv-update-filter">

                    <label htmlFor="status-filter">
                        Status
                    </label>

                    <select
                        id="status-filter"
                        value={statusFilter}
                        onChange={(e) =>
                            setStatusFilter(
                                e.target.value
                            )
                        }
                    >

                        <option value="All">
                            All statuses
                        </option>

                        {STATUSES.map((status) => (
                            <option
                                key={status}
                                value={status}
                            >
                                {status}
                            </option>
                        ))}

                    </select>

                </div>


                {hasActiveFilters && (

                    <button
                        type="button"
                        className="inv-clear-filters"
                        onClick={clearFilters}
                    >
                        Clear filters
                    </button>

                )}

            </div>


            <div className="inv-results-row">

                <span>
                    {filteredInventory.length}{' '}
                    {filteredInventory.length === 1
                        ? 'record'
                        : 'records'}
                </span>


                {hasActiveFilters && (
                    <span>
                        of {inventory.length}
                    </span>
                )}

            </div>


            <div className="inv-update-table-wrap">

                {inventory.length === 0 ? (

                    <p className="inv-empty">
                        No inventory records
                        for this facility yet.
                    </p>

                ) : filteredInventory.length === 0 ? (

                    <div className="inv-update-no-results">

                        <strong>
                            No inventory records found
                        </strong>

                        <p>
                            Try changing or clearing
                            your search and filters.
                        </p>

                        <button
                            type="button"
                            onClick={clearFilters}
                        >
                            Clear filters
                        </button>

                    </div>

                ) : (

                    <table className="inv-update-table">

                        <thead>

                            <tr>

                                <th scope="col">

                                    <button
                                        type="button"
                                        className="inv-sort"
                                        onClick={() =>
                                            handleSort('component')
                                        }
                                    >
                                        Component

                                        <span>
                                            {getSortIndicator(
                                                'component'
                                            )}
                                        </span>
                                    </button>

                                </th>


                                <th scope="col">

                                    <button
                                        type="button"
                                        className="inv-sort"
                                        onClick={() =>
                                            handleSort('bloodType')
                                        }
                                    >
                                        Blood Type

                                        <span>
                                            {getSortIndicator(
                                                'bloodType'
                                            )}
                                        </span>
                                    </button>

                                </th>


                                <th scope="col">

                                    <button
                                        type="button"
                                        className="inv-sort"
                                        onClick={() =>
                                            handleSort(
                                                'availQuantity'
                                            )
                                        }
                                    >
                                        Quantity

                                        <span>
                                            {getSortIndicator(
                                                'availQuantity'
                                            )}
                                        </span>
                                    </button>

                                </th>


                                <th scope="col">

                                    <button
                                        type="button"
                                        className="inv-sort"
                                        onClick={() =>
                                            handleSort(
                                                'availStatus'
                                            )
                                        }
                                    >
                                        Status

                                        <span>
                                            {getSortIndicator(
                                                'availStatus'
                                            )}
                                        </span>
                                    </button>

                                </th>


                                <th scope="col">

                                    <button
                                        type="button"
                                        className="inv-sort"
                                        onClick={() =>
                                            handleSort(
                                                'lastUpdated'
                                            )
                                        }
                                    >
                                        Last Updated

                                        <span>
                                            {getSortIndicator(
                                                'lastUpdated'
                                            )}
                                        </span>
                                    </button>

                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {filteredInventory.map((item) => (

                                <tr key={item._id}>

                                    <td className="inv-update-component">
                                        {item.component}
                                    </td>


                                    <td>

                                        <span className="inv-blood-type">
                                            {item.bloodType}
                                        </span>

                                    </td>


                                    <td>

                                        <span className="inv-quantity-value">
                                            {item.availQuantity}
                                        </span>

                                    </td>


                                    <td>

                                        <span
                                            className={`inv-status inv-status-${String(
                                                item.availStatus || ''
                                            )
                                                .toLowerCase()
                                                .replaceAll(
                                                    ' ',
                                                    '-'
                                                )}`}
                                        >
                                            {item.availStatus}
                                        </span>

                                    </td>


                                    <td className="inv-update-date">
                                        {formatDate(
                                            item.lastUpdated
                                        )}
                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                )}

            </div>


        </div>
    );
}


export default InventoryUpdate;