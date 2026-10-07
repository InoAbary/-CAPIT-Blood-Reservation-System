export const MOCK_CURRENT_HOSPITAL = {
    _id: '6ab1f013c1737b61e3f4b501',
    facilityName: 'St. Luke’s Medical Center'
};


export const MOCK_CURRENT_BSF = {
    _id: '6ab1f013c1737b61e3f4b4e6',
    facilityName: 'PRC National Blood Center'
};


export const MOCK_CURRENT_USER = {
    firstName: 'Maria',
    lastName: 'Santos'
};


/*
 * TODO:
 * Replace these with actual released/fulfilled blood request
 * records once the Blood Request/Reservation module exists.
 */
export const MOCK_ISSUED_UNITS = [
    {
        bloodRequestID: 'R0000001',
        bloodUnitID: 'BU00000001',

        bsfFacilityID: {
            _id: '6ab1f013c1737b61e3f4b4e6',
            facilityName: 'PRC National Blood Center'
        },

        hospitalFacilityID: MOCK_CURRENT_HOSPITAL,

        bloodType: 'O+',
        component: 'Packed RBC'
    },

    {
        bloodRequestID: 'R0000005',
        bloodUnitID: 'BU00000005',

        bsfFacilityID: {
            _id: '6ab1f013c1737b61e3f4b4e6',
            facilityName: 'PRC National Blood Center'
        },

        hospitalFacilityID: MOCK_CURRENT_HOSPITAL,

        bloodType: 'A+',
        component: 'Platelets'
    },

    {
        bloodRequestID: 'R0000009',
        bloodUnitID: 'BU00000009',

        bsfFacilityID: {
            _id: '6ab1f013c1737b61e3f4b502',
            facilityName: 'PRC Manila Chapter'
        },

        hospitalFacilityID: MOCK_CURRENT_HOSPITAL,

        bloodType: 'B+',
        component: 'Plasma'
    }
];


/*
 * TODO:
 * Remove these simulated records once real hospital-submitted
 * utilization reports are connected to the database.
 */
export const MOCK_REPORTS = [
    {
        _id: 'UR000001',

        bloodRequestID: 'R0000001',
        bloodUnitID: 'BU00000001',

        bsfFacilityID: {
            _id: '6ab1f013c1737b61e3f4b4e6',
            facilityName: 'PRC National Blood Center'
        },

        hospitalFacilityID: {
            _id: '6ab1f013c1737b61e3f4b501',
            facilityName: 'St. Luke’s Medical Center'
        },

        bloodType: 'O+',
        component: 'Packed RBC',
        status: 'Used',

        utilizationDate: '2026-10-01T10:30:00',

        description: 'Blood unit transfused to patient.',

        performedBy: {
            firstName: 'Maria',
            lastName: 'Santos'
        },

        dateCreated: '2026-10-01T13:15:00'
    },

    {
        _id: 'UR000002',

        bloodRequestID: 'R0000002',
        bloodUnitID: 'BU00000002',

        bsfFacilityID: {
            _id: '6ab1f013c1737b61e3f4b4e6',
            facilityName: 'PRC National Blood Center'
        },

        hospitalFacilityID: {
            _id: '6ab1f013c1737b61e3f4b503',
            facilityName: 'Manila Doctors Hospital'
        },

        bloodType: 'A+',
        component: 'Platelets',
        status: 'Wasted',

        utilizationDate: '2026-10-02T14:20:00',

        description:
            'Unit was not used within the required period.',

        performedBy: {
            firstName: 'Carlo',
            lastName: 'Reyes'
        },

        dateCreated: '2026-10-02T16:00:00'
    },

    {
        _id: 'UR000003',

        bloodRequestID: 'R0000003',
        bloodUnitID: 'BU00000003',

        bsfFacilityID: {
            _id: '6ab1f013c1737b61e3f4b502',
            facilityName: 'PRC Manila Chapter'
        },

        hospitalFacilityID: {
            _id: '6ab1f013c1737b61e3f4b504',
            facilityName: 'Philippine General Hospital'
        },

        bloodType: 'B+',
        component: 'Plasma',
        status: 'Expired',

        utilizationDate: '2026-10-03T09:00:00',

        description:
            'Blood component expired before utilization.',

        performedBy: {
            firstName: 'Anna',
            lastName: 'Cruz'
        },

        dateCreated: '2026-10-03T11:45:00'
    },

    {
        _id: 'UR000004',

        bloodRequestID: 'R0000004',
        bloodUnitID: 'BU00000004',

        bsfFacilityID: {
            _id: '6ab1f013c1737b61e3f4b4e6',
            facilityName: 'PRC National Blood Center'
        },

        hospitalFacilityID: {
            _id: '6ab1f013c1737b61e3f4b505',
            facilityName: 'Makati Medical Center'
        },

        bloodType: 'AB+',
        component: 'Whole Blood',
        status: 'Unused',

        utilizationDate: '2026-10-04T12:00:00',

        description:
            'Blood unit remained unused after procurement.',

        performedBy: {
            firstName: 'Luis',
            lastName: 'Garcia'
        },

        dateCreated: '2026-10-04T15:30:00'
    },

    {
        _id: 'UR000005',

        bloodRequestID: 'R0000005',
        bloodUnitID: 'BU00000005',

        bsfFacilityID: MOCK_CURRENT_BSF,
        hospitalFacilityID: MOCK_CURRENT_HOSPITAL,

        bloodType: 'A+',
        component: 'Platelets',
        status: 'Used',

        utilizationDate: '2026-10-05T08:30:00',

        description:
            'Platelets transfused as ordered.',

        performedBy: MOCK_CURRENT_USER,

        dateCreated: '2026-10-05T10:00:00'
    }
];


export const UTILIZATION_STATUSES = [
    'Used',
    'Wasted',
    'Expired',
    'Unused'
];


export const BLOOD_TYPES = [
    'A+',
    'A-',
    'B+',
    'B-',
    'O+',
    'O-',
    'AB+',
    'AB-'
];


export const BLOOD_COMPONENTS = [
    'Packed RBC',
    'Plasma',
    'Platelets',
    'Whole Blood'
];