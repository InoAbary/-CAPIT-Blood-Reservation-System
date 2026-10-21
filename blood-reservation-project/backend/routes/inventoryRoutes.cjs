const express = require('express');
const exceljs = require('exceljs');

const {ChartJSNodeCanvas} = require('chartjs-node-canvas')



const mongoose = require ('mongoose');
const Inventories = require('../../db/models/inventories.cjs')
const BloodReport = require('../../db/models/bloodReports.cjs')
const BloodUnits = require('../../db/models/bloodUnits.cjs')
const Counter = require('../../db/models/counters.cjs');
const router = express.Router();

// Helper function for report IDs
const nextReportID = async () => {
    const counter = await Counter.findOneAndUpdate(
        { _id: 'reportID' },
        { $inc: { sequence: 1 } },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    return `R${String(counter.sequence).padStart(8, '0')}`;
};

//

function getInventoryStatus(quantity) {
    if (quantity === 0) {
        return 'Out of Stock';
    }

    if (quantity <= 5) {
        return 'Limited';
    }

    return 'Available';
}

router.get('/', async (req, res) => {
    try{
        const inventories = await Inventories.find();
        res.json({
            success: true,
            inventories: inventories
        });
    } catch (err) {
        console.error('Error fetching inventories:', err);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch inventories.'});
    }
});


router.get('/bloodUnits', async (req, res) => {
    try {
        const bUnits = await BloodUnits.find({}).lean();
        res.json({ success: true, bUnits });
    } catch (err) {
        console.error('Error fetching blood units:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch blood units.' });
    }
});

router.get('/reports', async(req, res)=>{
    try {

        const {bloodType, component, status, fromDate, toDate} = req.query;

        const matchStage = {}

        if (bloodType && bloodType !== 'all'){
            matchStage['bloodUnitID.bloodType'] = bloodType;
        }
        if (component && component !== 'all') {
            matchStage['bloodUnitID.component'] = component;
        }
        if (status && status !== 'all'){
            matchStage['status'] = status;
        }

        if (fromDate || toDate) {
            matchStage['dateCreated'] = {};
            if (fromDate) matchStage['dateCreated'].$gte = new Date(`${fromDate}T00:00:00`);
            if (toDate) matchStage['dateCreated'].$lte = new Date(`${toDate}T23:59:59.999`);
        }

        const pipeline = [
            {
                $lookup: {
                    from: BloodUnits.collection.name, 
                    localField: 'bloodUnitID',
                    foreignField: '_id',
                    as: 'bloodUnitID'
                }
            },
            { $unwind: '$bloodUnitID' },
        ];

        // Only add $match if there's something to filter on
        if (Object.keys(matchStage).length > 0) {
            pipeline.push({ $match: matchStage });
        }

        pipeline.push({ $sort: { dateCreated: -1 } });

        const reports = await BloodReport.aggregate(pipeline);

        res.json({ success: true, reports });
    } catch (err) {
        console.error('Error fetching reports:', err);
        res.status(500).json({success: false, message: 'Failed to fetch reports.'})
    }
})



router.post('/reports', async(req, res)=>{
    try {
        const {bloodUnitID, status, description } = req.body
        if (!bloodUnitID || !status) {
            return res.status(500).json({
                success: false,
                message: 'Inventory ID and Status are required.'
            })
        }

        const reportID = await nextReportID();

        const report = await BloodReport.create({
            reportID,
            bloodUnitID,
            status,
            description,
            dateCreated: new Date()
        });

        res.status(201).json({success: true, report});
    } catch (err) {
        console.error('Error creating report:', err);
        res.status(500).json({success: false, message: 'Failed to create a report.'})
    }
})

router.post('/create-utilization-report', async (req, res) => {
    try {
        const reports = await BloodReport
            .find({})
            .populate('bloodUnitID')
            .sort({ dateCreated: -1 })
            .lean();

        const workbook = new exceljs.Workbook();
        const sheet = workbook.addWorksheet('Utilization Report');

        sheet.columns = [
            { header: 'Report ID', key: 'reportID', width: 16 },
            { header: 'Blood Type', key: 'bloodType', width: 12 },
            { header: 'Component', key: 'component', width: 18 },
            { header: 'Status', key: 'status', width: 14 },
            { header: 'Description', key: 'description', width: 40 },
            { header: 'Date Created', key: 'dateCreated', width: 22 }
        ];

        reports.forEach((r) => {
            sheet.addRow({
                reportID: r.reportID || 'N/A',
                bloodType: r.bloodUnitID?.bloodType || 'N/A',
                component: r.bloodUnitID?.component || 'N/A',
                status: r.status,
                description: r.description || '',
                dateCreated: new Date(r.dateCreated).toLocaleString()
            });
        });

        sheet.getRow(1).font = { bold: true };

        const statusCounts = reports.reduce((acc, r) => {
            const key = r.status || 'Unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc
        }, {})

        const labels = Object.keys(statusCounts)
        const values = Object.values(statusCounts)

        const width = 600;
        const height = 400;

        const chartJSNodeCanvas = new ChartJSNodeCanvas({width, height})
        
        const chartBuffer = await chartJSNodeCanvas.renderToBuffer({
            type: 'pie',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#4CAF50', '#2196F3', '#F44336',
                        '#FFC107', '#9C27B0', '#795548'
                    ]
                }]
            },
            options: {
                plugins: {
                    title: {display: true, text: 'Blood Unit Status Distribution'},
                    legend: {position: 'right'}
                }
            }
        });

        const imageId = workbook.addImage({
            buffer: chartBuffer,
            extension: 'png'
        })

        const chartSheet = workbook.addWorksheet('Status Distribution');
        chartSheet.addImage(imageId, 'A1:J25')

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=utilization-report.xlsx'
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Error generating report:', err);
        res.status(500).json({ success: false, message: 'Failed to generate report.' });
    }
});

// PATCH /api/inventories for updating inventory records
// updates multiple inventory records in one request
router.patch('/batch', async (req, res) => {
    try {
        const { updates } = req.body;

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one inventory update is required.'
            });
        }

        // validate all updates before changing any records.
        for (const update of updates) {
            const quantity = Number(update.availQuantity);

            if (
                !update.id ||
                !Number.isInteger(quantity) ||
                quantity < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Each update must have a valid ID and a non-negative whole-number quantity.'
                });
            }
        }

        const updatedRecords = [];

        for (const update of updates) {
            const quantity = Number(update.availQuantity);
            const availStatus = getInventoryStatus(quantity);

            const inventory = await Inventories.findByIdAndUpdate(
                update.id,
                {
                    availQuantity: quantity,
                    availStatus: availStatus,
                    lastUpdated: new Date()
                },
                { new: true }
            );

            if (!inventory) {
                return res.status(404).json({
                    success: false,
                    message: `Inventory record ${update.id} was not found.`
                });
            }

            updatedRecords.push(inventory);
        }

        res.json({
            success: true,
            inventories: updatedRecords
        });

    } catch (err) {
        console.error('Error updating inventory batch:', err);

        res.status(500).json({
            success: false,
            message: 'Failed to update inventory.'
        });
    }
});

// PATCH /api/inventories/:id
// Updates one inventory record.
router.patch('/:id', async (req, res) => {
    try {
        const quantity =
            Number(req.body.availQuantity);


        if (
            !Number.isInteger(quantity) ||
            quantity < 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Quantity must be a non-negative whole number.'
            });
        }


        const availStatus =
            getInventoryStatus(quantity);


        const inventory =
            await Inventories.findByIdAndUpdate(
                req.params.id,
                {
                    availQuantity: quantity,
                    availStatus: availStatus,
                    lastUpdated: new Date()
                },
                {
                    returnDocument: 'after'
                }
            );


        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: 'Inventory record was not found.'
            });
        }


        res.json({
            success: true,
            inventory: inventory
        });

    } catch (err) {
        console.error(
            'Error updating inventory:',
            err
        );

        res.status(500).json({
            success: false,
            message: 'Failed to update inventory.'
        });
    }
});



module.exports = router;