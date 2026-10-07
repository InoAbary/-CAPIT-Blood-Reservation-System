export const MOCK_INVENTORY_HISTORY = [
    {
        _id: 'HIST000001',
        date: '2026-10-08T06:45:00',
        bloodUnitID: 'BU000001',
        action: 'Created',
        bloodType: 'O+',
        component: 'Packed RBC',
        changes: [],
        performedBy: {
            firstName: 'Maria',
            lastName: 'Santos'
        }
    },

    {
        _id: 'HIST000002',
        date: '2026-10-08T06:32:00',
        bloodUnitID: 'BU000002',
        action: 'Created',
        bloodType: 'A+',
        component: 'Platelets',
        changes: [],
        performedBy: {
            firstName: 'Carlo',
            lastName: 'Reyes'
        }
    },

    {
        _id: 'HIST000003',
        date: '2026-10-07T15:20:00',
        bloodUnitID: 'BU000014',
        action: 'Updated',
        bloodType: 'B+',
        component: 'Platelets',
        changes: [
            {
                field: 'status',
                oldValue: 'In-stock',
                newValue: 'Expired'
            }
        ],
        performedBy: {
            firstName: 'Anna',
            lastName: 'Cruz'
        }
    },

    {
        _id: 'HIST000004',
        date: '2026-10-07T14:05:00',
        bloodUnitID: 'BU000015',
        action: 'Updated',
        bloodType: 'O-',
        component: 'Packed RBC',
        changes: [
            {
                field: 'status',
                oldValue: 'In-stock',
                newValue: 'Removed'
            }
        ],
        performedBy: {
            firstName: 'Luis',
            lastName: 'Garcia'
        }
    },

    {
        _id: 'HIST000006',
        date: '2026-10-06T16:30:00',
        bloodUnitID: 'BU000017',
        action: 'Updated',
        bloodType: 'A-',
        component: 'Packed RBC',
        changes: [
            {
                field: 'status',
                oldValue: 'In-stock',
                newValue: 'Removed'
            }
        ],
        performedBy: {
            firstName: 'Carlo',
            lastName: 'Reyes'
        }
    },

    {
        _id: 'HIST000007',
        date: '2026-10-06T13:15:00',
        bloodUnitID: 'BU000018',
        action: 'Created',
        bloodType: 'B-',
        component: 'Plasma',
        changes: [],
        performedBy: {
            firstName: 'Anna',
            lastName: 'Cruz'
        }
    },

    {
        _id: 'HIST000009',
        date: '2026-10-05T16:50:00',
        bloodUnitID: 'BU000020',
        action: 'Created',
        bloodType: 'AB-',
        component: 'Plasma',
        changes: [],
        performedBy: {
            firstName: 'Maria',
            lastName: 'Santos'
        }
    },

    {
        _id: 'HIST000010',
        date: '2026-10-05T14:25:00',
        bloodUnitID: 'BU000021',
        action: 'Updated',
        bloodType: 'A+',
        component: 'Platelets',
        changes: [
            {
                field: 'status',
                oldValue: 'In-stock',
                newValue: 'Expired'
            }
        ],
        performedBy: {
            firstName: 'Carlo',
            lastName: 'Reyes'
        }
    },

    {
        _id: 'HIST000012',
        date: '2026-10-04T08:40:00',
        bloodUnitID: 'BU000023',
        action: 'Created',
        bloodType: 'O+',
        component: 'Whole Blood',
        changes: [],
        performedBy: {
            firstName: 'Luis',
            lastName: 'Garcia'
        }
    }
];