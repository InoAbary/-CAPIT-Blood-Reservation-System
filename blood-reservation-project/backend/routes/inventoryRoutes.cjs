const express = require('express');
const exceljs = require('exceljs');

const mongoose = require ('mongoose');
const Inventories = require('../../db/models/inventories.cjs')
const BloodReport = require('../../db/models/bloodReports.cjs')

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

router.get('/reports', async(req, res)=>{
    try {
        const reports = await BloodReport
            .find({})
            .populate('inventoryId')
            .sort({dateCreated: -1})
            .lean();

        res.json({success: true, reports})
    } catch (err) {
        console.error('Error fetching reports:', err);
        res.status(500).json({success: false, message: 'Failed to fetch reports.'})
    }
})

router.post('/reports', async(req, res)=>{
    try {
        const {inventoryId, status, description } = req.body
        if (!inventoryId || !status) {
            return res.status(500).json({
                success: false,
                message: 'Inventory ID and Status are required.'
            })
        }

        const report = await BloodReport.create({
            inventoryId,
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
            .populate('inventoryId')
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
                bloodType: r.inventoryId?.bloodType || 'N/A',
                component: r.inventoryId?.component || 'N/A',
                status: r.status,
                description: r.description || '',
                dateCreated: new Date(r.dateCreated).toLocaleString()
            });
        });

        sheet.getRow(1).font = { bold: true };

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