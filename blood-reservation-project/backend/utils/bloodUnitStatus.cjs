function statusTransitionError(current, next) {
    if (next === undefined || next === current) return null;
    if (current === 'Removed') return 'Removed blood units cannot change status.';
    if (current === 'Expired' && next === 'In-stock') {
        return 'Expired blood units cannot return to In-stock.';
    }
    return null;
}

module.exports = { statusTransitionError };
