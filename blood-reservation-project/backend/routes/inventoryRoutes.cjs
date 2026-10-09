const express = require('express');
const exceljs = require('exceljs');

const {ChartJSNodeCanvas} = require('chartjs-node-canvas')


const mongoose = require ('mongoose');
const Inventories = require('../../db/models/inventories.cjs')
const BloodReport = require('../../db/models/bloodReports.cjs')
const BloodUnits = require('../../db/models/bloodUnits.cjs')
const router = express.Router();



// handle reqs to get /api/inventories


router.get('/', async (req, res) => {
    try {
        const inventories = await Inventories.find({}).lean();
        res.json({ success: true, inventories });
    } catch (err) {
        console.error('Error fetching inventories:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch inventories.' });
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

        const {bloodType, component, status} = req.query;

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

router.get('/reports/:bloodType', async(req, res)=>{
    try {
        const reports = await BloodReport
            .find({})
            .aggregate([
                {
                    $lookup: {
                        from: 'BloodUnits',
                        localField: 'bloodUnitID',
                        foreignField: '_id',
                        as: 'bloodUnitID'
                    }
                },
                {$unwind: '$bloodUnitID'},
                { match: {'bloodUnitID.bloodType': bloodType}},
                {sort: { dateCreated: -1}}

            ])
        res.json({success: true, reports})
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

        const report = await BloodReport.create({
            bloodUnitID,
            status,
            description,
            dateCreate: new Date()
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
            { header: 'Report ID', key: '_id', width: 28 },
            { header: 'Blood Type', key: 'bloodType', width: 12 },
            { header: 'Component', key: 'component', width: 18 },
            { header: 'Status', key: 'status', width: 14 },
            { header: 'Description', key: 'description', width: 40 },
            { header: 'Date Created', key: 'dateCreated', width: 22 }
        ];

        reports.forEach((r) => {
            sheet.addRow({
                _id: r._id.toString(),
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

module.exports = router;