const mongoose = require('mongoose');


const changeSchema = new mongoose.Schema(
    {
        field: {
            type: String,
            required: true
        },

        oldValue: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        newValue: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        }
    },
    {
        _id: false
    }
);


const bloodUnitHistorySchema = new mongoose.Schema({

    facilityID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Facilities',
        required: true
    },

    bloodUnitID: {
        type: String,
        required: true
    },

    action: {
        type: String,
        required: true,
        enum: [
            'Created',
            'Updated',
            'Deleted'
        ]
    },

    donorID: {
        type: String
    },

    bloodType: {
        type: String,
        enum: [
            'A+',
            'A-',
            'B+',
            'B-',
            'O+',
            'O-',
            'AB+',
            'AB-'
        ]
    },

    component: {
        type: String,
        enum: [
            'Packed RBC',
            'Plasma',
            'Platelets',
            'Whole Blood'
        ]
    },

    collectionDate: {
        type: Date
    },

    expiryDate: {
        type: Date
    },

    status: {
        type: String,
        enum: [
            'In-stock',
            'Expired',
            'Removed'
        ]
    },

    changes: {
        type: [changeSchema],
        default: []
    },

    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        default: null
    },

    date: {
        type: Date,
        default: Date.now
    }

});


/* Convert either a Mongoose document or a plain object
into a consistent blood-unit snapshot. */
function getSnapshot(unit) {

    const data =
        typeof unit.toObject === 'function'
            ? unit.toObject()
            : unit;

    return {
        bloodUnitID: data.bloodUnitID,
        donorID: data.donorID,
        bloodType: data.bloodType,
        component: data.component,
        collectionDate: data.collectionDate,
        expiryDate: data.expiryDate,
        status: data.status
    };
}


/* Compare values correctly, including Date objects. */
function valuesAreEqual(first, second) {

    if (first instanceof Date || second instanceof Date) {

        const firstTime =
            first ? new Date(first).getTime() : null;

        const secondTime =
            second ? new Date(second).getTime() : null;

        return firstTime === secondTime;
    }

    return first === second;
}


/* Log creation of a blood unit. */
bloodUnitHistorySchema.statics.logCreate =
async function (unit, options = {}) {

    const snapshot = getSnapshot(unit);

    return this.create({
        facilityID: options.facilityID,
        ...snapshot,
        action: 'Created',
        performedBy: options.performedBy || null
    });
};


/* Log only the fields that actually changed. */
bloodUnitHistorySchema.statics.logUpdate =
async function (before, after, options = {}) {

    const beforeSnapshot = getSnapshot(before);
    const afterSnapshot = getSnapshot(after);

    const trackedFields = [
        'donorID',
        'bloodType',
        'component',
        'collectionDate',
        'expiryDate',
        'status'
    ];

    const changes = [];

    trackedFields.forEach((field) => {

        const oldValue = beforeSnapshot[field];
        const newValue = afterSnapshot[field];

        if (!valuesAreEqual(oldValue, newValue)) {

            changes.push({
                field,
                oldValue,
                newValue
            });
        }

    });


    /* Do not create an empty history record if nothing actually changed.*/
    if (changes.length === 0) {
        return null;
    }


    return this.create({
        facilityID: options.facilityID,
        ...afterSnapshot,
        action: 'Updated',
        changes,
        performedBy: options.performedBy || null
    });
};


/* Preserve a snapshot before the actual BloodUnit document is deleted.*/
bloodUnitHistorySchema.statics.logDelete =
async function (unit, options = {}) {

    const snapshot = getSnapshot(unit);

    return this.create({
        facilityID: options.facilityID,
        ...snapshot,
        action: 'Deleted',
        performedBy: options.performedBy || null
    });
};


bloodUnitHistorySchema.index({
    facilityID: 1,
    date: -1
});


bloodUnitHistorySchema.index({
    bloodUnitID: 1,
    date: -1
});


module.exports = mongoose.model(
    'BloodUnitHistory',
    bloodUnitHistorySchema
);