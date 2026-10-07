const express = require('express');
const exceljs = require('exceljs');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const BloodReport = require('../../db/models/bloodReports.cjs');

const router = express.Router();


router.get('/reports', async (req, res) => {
    try {
        const reports = await BloodReport
            .find({})
            .populate(
                'bsfFacilityID',
                'facilityName facilityType'
            )
            .populate(
                'hospitalFacilityID',
                'facilityName facilityType'
            )
            .populate(
                'performedBy',
                'firstName lastName email role'
            )
            .sort({
                utilizationDate: -1,
                dateCreated: -1
            })
            .lean();

        res.json({
            success: true,
            reports
        });

    } catch (err) {
        console.error(
            'Error fetching utilization reports:',
            err
        );

        res.status(500).json({
            success: false,
            message:
                'Failed to fetch utilization reports.'
        });
    }
});

router.post('/reports', async (req, res) => {
    try {
        const {
            bsfFacilityID,
            hospitalFacilityID,
            bloodRequestID,
            bloodUnitID,
            bloodType,
            component,
            status,
            utilizationDate,
            description
        } = req.body;

        if (
            !bsfFacilityID ||
            !hospitalFacilityID ||
            !bloodUnitID ||
            !bloodType ||
            !component ||
            !status
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'BSF, hospital, blood unit, blood type, component, and status are required.'
            });
        }

        const report = await BloodReport.create({
            bsfFacilityID,
            hospitalFacilityID,
            bloodRequestID: bloodRequestID || null,
            bloodUnitID,
            bloodType,
            component,
            status,
            utilizationDate: utilizationDate || new Date(),
            description: description || '',

            // TODO: Replace with authenticated hospital user.
            performedBy: null
        });

        res.status(201).json({
            success: true,
            report
        });

    } catch (err) {
        console.error(
            'Error creating utilization report:',
            err
        );

        res.status(500).json({
            success: false,
            message:
                'Failed to create utilization report.'
        });
    }
});

router.post('/create-utilization-report', async (req, res) => {
    try {
        const reports = await BloodReport
            .find({})
            .populate(
                'bsfFacilityID',
                'facilityName'
            )
            .populate(
                'hospitalFacilityID',
                'facilityName'
            )
            .sort({
                utilizationDate: -1
            })
            .lean();

        const workbook = new exceljs.Workbook();

        const sheet = workbook.addWorksheet(
            'Utilization Report'
        );

        sheet.columns = [
            {
                header: 'Report ID',
                key: 'reportID',
                width: 28
            },
            {
                header: 'Blood Unit ID',
                key: 'bloodUnitID',
                width: 18
            },
            {
                header: 'Blood Request ID',
                key: 'bloodRequestID',
                width: 18
            },
            {
                header: 'Blood Type',
                key: 'bloodType',
                width: 12
            },
            {
                header: 'Component',
                key: 'component',
                width: 20
            },
            {
                header: 'Status',
                key: 'status',
                width: 14
            },
            {
                header: 'Supplying BSF',
                key: 'bsf',
                width: 30
            },
            {
                header: 'Hospital',
                key: 'hospital',
                width: 30
            },
            {
                header: 'Utilization Date',
                key: 'utilizationDate',
                width: 22
            },
            {
                header: 'Description',
                key: 'description',
                width: 40
            },
            {
                header: 'Date Submitted',
                key: 'dateCreated',
                width: 22
            }
        ];

        reports.forEach((report) => {
            sheet.addRow({
                reportID:
                    report._id.toString(),

                bloodUnitID:
                    report.bloodUnitID,

                bloodRequestID:
                    report.bloodRequestID || 'N/A',

                bloodType:
                    report.bloodType,

                component:
                    report.component,

                status:
                    report.status,

                bsf:
                    report.bsfFacilityID?.facilityName ||
                    'N/A',

                hospital:
                    report.hospitalFacilityID?.facilityName ||
                    'N/A',

                utilizationDate:
                    report.utilizationDate
                        ? new Date(
                            report.utilizationDate
                        ).toLocaleString('en-PH')
                        : 'N/A',

                description:
                    report.description || '',

                dateCreated:
                    report.dateCreated
                        ? new Date(
                            report.dateCreated
                        ).toLocaleString('en-PH')
                        : 'N/A'
            });
        });

        sheet.getRow(1).font = {
            bold: true
        };


        const statusCounts = reports.reduce(
            (counts, report) => {
                const status =
                    report.status || 'Unknown';

                counts[status] =
                    (counts[status] || 0) + 1;

                return counts;
            },
            {}
        );

        const labels =
            Object.keys(statusCounts);

        const values =
            Object.values(statusCounts);


        if (labels.length > 0) {
            const chartJSNodeCanvas =
                new ChartJSNodeCanvas({
                    width: 600,
                    height: 400
                });

            const chartBuffer =
                await chartJSNodeCanvas.renderToBuffer({
                    type: 'pie',

                    data: {
                        labels,

                        datasets: [
                            {
                                data: values,

                                backgroundColor: [
                                    '#4CAF50',
                                    '#F44336',
                                    '#FFC107',
                                    '#9E9E9E'
                                ]
                            }
                        ]
                    },

                    options: {
                        plugins: {
                            title: {
                                display: true,
                                text:
                                    'Blood Utilization Status Distribution'
                            },

                            legend: {
                                position: 'right'
                            }
                        }
                    }
                });

            const imageId =
                workbook.addImage({
                    buffer: chartBuffer,
                    extension: 'png'
                });

            const chartSheet =
                workbook.addWorksheet(
                    'Status Distribution'
                );

            chartSheet.addImage(
                imageId,
                'A1:J25'
            );
        }


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
        console.error(
            'Error generating utilization report:',
            err
        );

        res.status(500).json({
            success: false,
            message:
                'Failed to generate utilization report.'
        });
    }
});

module.exports = router;