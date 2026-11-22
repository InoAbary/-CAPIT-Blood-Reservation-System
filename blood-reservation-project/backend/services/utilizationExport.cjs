const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const REPORT_OUTCOMES = ['Used', 'Wasted', 'Expired', 'Unused'];
const WASTAGE_OUTCOMES = ['Wasted', 'Expired'];
const COVERAGE_OUTCOMES = ['Awaiting report', 'System generated'];
const EXPORT_VIEWS = {
  reports: { title: 'Blood utilization report', name: 'blood-utilization', outcomes: REPORT_OUTCOMES },
  wastage: { title: 'Blood wastage report', name: 'blood-wastage', outcomes: WASTAGE_OUTCOMES },
  coverage: { title: 'Blood reporting coverage', name: 'blood-reporting-coverage', outcomes: COVERAGE_OUTCOMES },
};
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
});
const timeFormatter = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila', timeStyle: 'short',
});

function utilizationOutcome(report) {
  if (!report) return 'Awaiting report';
  if (report.isAssumed) return 'Used';
  if (report.source === 'System') return report.status === 'Used' ? 'Used' : 'Awaiting report';
  return report.status;
}

function matchesExportView(unit, view) {
  const { report } = unit;
  const outcome = utilizationOutcome(report);
  const isSystemUsed = outcome === 'Used' && (report.isAssumed || report.source === 'System');
  return EXPORT_VIEWS[view].outcomes.includes(view === 'coverage' && isSystemUsed ? 'System generated' : outcome);
}

function formatTimestamp(value, formatter) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? formatter.format(date) : '';
}

function exportRows(units, view) {
  return units.map(unit => {
    const { report } = unit;
    const outcome = utilizationOutcome(report);
    const source = report
      ? (report.source === 'System' || report.isAssumed ? 'System generated' : 'Hospital submitted')
      : '';
    const reason = outcome === 'Expired' ? 'Expired' : outcome === 'Wasted' ? report?.wastageReason : '';
    return [
      unit.bloodUnitID, unit.request?.reference, unit.hospitalName, unit.bloodType, unit.component,
      formatTimestamp(unit.releasedAt, dateFormatter), formatTimestamp(unit.releasedAt, timeFormatter),
      outcome, report?.reportID, source,
      formatTimestamp(report?.dateCreated, dateFormatter), formatTimestamp(report?.dateCreated, timeFormatter),
      report?.reportedByName, reason, report?.wastageReasonOther,
      ...(view === 'wastage' ? [] : [report?.description]),
    ].map(value => String(value ?? ''));
  });
}

async function createXlsx(title, columns, rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = columns.map(([header, width]) => ({ header, width }));
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  sheet.getColumn(columns.length).alignment = { vertical: 'top', wrapText: true };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}


function createPdf(title, facilityName, columns, rows) {
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({
        size: 'A3',
        layout: 'landscape',
        margin: 30,
        bufferPages: true,
        info: { Title: title },
      });
  
      const chunks = [];
  
      document.on('data', chunk => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
  
      const pageWidth = document.page.width;
      const pageHeight = document.page.height;
      const margin = 30;
      const tableWidth = pageWidth - margin * 2;
  
      const headerFontSize = 7;
      const cellFontSize = 6.5;
      const cellPadding = 5;
      const minRowHeight = 26;
      const bottomLimit = pageHeight - 45;
  
      const colors = {
        header: '#243B53',
        headerText: '#FFFFFF',
        border: '#CBD5E1',
        alternate: '#F1F5F9',
        white: '#FFFFFF',
        text: '#1F2937',
      };
  
      // Calculate column widths proportionally.
      const totalWeight = columns.reduce(
        (sum, column) => sum + column[1],
        0
      );
  
      const columnWidths = columns.map(
        column => (column[1] / totalWeight) * tableWidth
      );
  
      let currentY = margin;
      let pageNumber = 1;
  
      function drawReportTitle() {
        document
          .font('Helvetica-Bold')
          .fontSize(18)
          .fillColor(colors.text)
          .text(title, margin, currentY);
  
        currentY += 28;
  
        document
          .font('Helvetica')
          .fontSize(10)
          .text(`Facility: ${facilityName || 'N/A'}`, margin, currentY);
  
        currentY += 17;
  
        document
          .fontSize(9)
          .text(`Total records: ${rows.length}`, margin, currentY);
  
        currentY += 25;
      }
  
      function getCellHeight(value, width, isHeader = false) {
        document
          .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isHeader ? headerFontSize : cellFontSize);
  
        return document.heightOfString(String(value ?? ''), {
          width: Math.max(1, width - cellPadding * 2),
        }) + cellPadding * 2;
      }
  
      function drawCell(text, x, y, width, height, options = {}) {
        const {
          background = colors.white,
          textColor = colors.text,
          bold = false,
          fontSize = cellFontSize,
        } = options;
  
        document
          .fillColor(background)
          .rect(x, y, width, height)
          .fill();
  
        document
          .strokeColor(colors.border)
          .lineWidth(0.4)
          .rect(x, y, width, height)
          .stroke();
  
        document
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(fontSize)
          .fillColor(textColor)
          .text(String(text ?? ''), x + cellPadding, y + cellPadding, {
            width: Math.max(1, width - cellPadding * 2),
            height: Math.max(1, height - cellPadding * 2),
            ellipsis: true,
          });
      }
  
      function drawTableHeader() {
        const headerHeight = Math.max(
          30,
          ...columns.map((column, index) =>
            getCellHeight(column[0], columnWidths[index], true)
          )
        );
  
        let x = margin;
  
        columns.forEach((column, index) => {
          drawCell(
            column[0],
            x,
            currentY,
            columnWidths[index],
            headerHeight,
            {
              background: colors.header,
              textColor: colors.headerText,
              bold: true,
              fontSize: headerFontSize,
            }
          );
  
          x += columnWidths[index];
        });
  
        currentY += headerHeight;
      }
  
      function addNewPage() {
        document.addPage();
        pageNumber++;
        currentY = margin;
        drawTableHeader();
      }
  
      // First page
      drawReportTitle();
      drawTableHeader();
  
      // Table data
      rows.forEach((row, rowIndex) => {
        const rowHeight = Math.max(
          minRowHeight,
          ...columns.map((column, index) =>
            getCellHeight(row[index], columnWidths[index])
          )
        );
  
        // Keep the table inside page boundaries.
        if (currentY + rowHeight > bottomLimit) {
          addNewPage();
        }
  
        const background =
          rowIndex % 2 === 0
            ? colors.white
            : colors.alternate;
  
        let x = margin;
  
        columns.forEach((column, index) => {
          drawCell(
            row[index] ?? '',
            x,
            currentY,
            columnWidths[index],
            rowHeight,
            { background }
          );
  
          x += columnWidths[index];
        });
  
        currentY += rowHeight;
      });
  
      // Empty report
      if (rows.length === 0) {
        document
          .font('Helvetica')
          .fontSize(10)
          .fillColor(colors.text)
          .text('No records found.', margin, currentY + 12);
      }
  
      // Page numbers
      const pageRange = document.bufferedPageRange();
  
      for (let i = 0; i < pageRange.count; i++) {
        document.switchToPage(pageRange.start + i);
  
        document
          .font('Helvetica')
          .fontSize(8)
          .fillColor('#64748B')
          .text(
            `Page ${i + 1} of ${pageRange.count}`,
            margin,
            pageHeight - 25,
            {
              width: tableWidth,
              align: 'right',
              lineBreak: false,
            }
          );
      }
  
      document.end();
    });
  }
  

async function createUtilizationExport({ units, view, format, facilityName }) {
  const { title, name } = EXPORT_VIEWS[view];
  const columns = [
    ['Blood unit ID', 17], ['Request ID', 16], ['Hospital', 32], ['Blood type', 13], ['Component', 18],
    ['Release date', 16], ['Release time', 16], ['Outcome', 22], ['Report ID', 16], ['Source', 24],
    ['Report date', 16], ['Report time', 16], ['Reported by', 24], ['Wastage reason', 32], ['Other reason', 36],
    ...(view === 'wastage' ? [] : [['Notes', 42]]),
  ];
  const rows = exportRows(units, view);
  const buffer = format === 'pdf'
    ? await createPdf(title, facilityName, columns, rows)
    : await createXlsx(title, columns, rows);
  return { buffer, filename: `${name}.${format}`, contentType: format === 'pdf' ? 'application/pdf' : XLSX_TYPE };
}

module.exports = { createUtilizationExport, matchesExportView };
