function BSFUtilizationFilters({
    search,
    onSearchChange,
    hospitalFilter,
    onHospitalChange,
    statusFilter,
    onStatusChange,
    bloodTypeFilter,
    onBloodTypeChange,
    componentFilter,
    onComponentChange,
    sourceFilter,
    onSourceChange,
    hospitals,
    bloodTypes,
    components,
    hasFilters,
    onClear
}) {
    return (
        <div className="bu-filter-area">
            <div className="bu-search-field">
                <input
                    type="search"
                    value={search}
                    onChange={(event) =>
                        onSearchChange(event.target.value)
                    }
                    placeholder="Search report, blood unit, request, or hospital..."
                    className="bu-search-input"
                />
            </div>

            <div className="bu-filter-grid">
                <Filter
                    label="Hospital"
                    value={hospitalFilter}
                    onChange={onHospitalChange}
                    options={hospitals}
                />

                <Filter
                    label="Status"
                    value={statusFilter}
                    onChange={onStatusChange}
                    options={[
                        'Used',
                        'Wasted',
                        'Expired',
                        'Unused'
                    ]}
                />

                <Filter
                    label="Blood Type"
                    value={bloodTypeFilter}
                    onChange={onBloodTypeChange}
                    options={bloodTypes}
                />

                <Filter
                    label="Component"
                    value={componentFilter}
                    onChange={onComponentChange}
                    options={components}
                />

                <Filter
                    label="Source"
                    value={sourceFilter}
                    onChange={onSourceChange}
                    options={[
                        'Hospital',
                        'System'
                    ]}
                />
            </div>

            {hasFilters && (
                <button
                    type="button"
                    className="bu-clear-filters"
                    onClick={onClear}
                >
                    Clear filters
                </button>
            )}
        </div>
    );
}

function Filter({
    label,
    value,
    onChange,
    options
}) {
    return (
        <label className="bu-filter-field">
            <span className="bu-filter-label">
                {label}
            </span>

            <select
                className="bu-filter-select"
                value={value}
                onChange={(event) =>
                    onChange(event.target.value)
                }
            >
                <option value="All">
                    All
                </option>

                {options.map((option) => (
                    <option
                        key={option}
                        value={option}
                    >
                        {option}
                    </option>
                ))}
            </select>
        </label>
    );
}

export default BSFUtilizationFilters;