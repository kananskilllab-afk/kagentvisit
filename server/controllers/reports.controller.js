const Visit = require('../models/Visit');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

exports.exportXlsx = async (req, res) => {
    try {
        const visits = await Visit.find({}).populate('submittedBy', 'name');

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Visits');

        worksheet.columns = [
            { header: 'Agent/Company Name', key: 'company', width: 25 },
            { header: 'RM Name', key: 'rm', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Submitted By', key: 'user', width: 20 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Establishment Year', key: 'year', width: 10 },
            { header: 'Contact', key: 'contact', width: 15 },
            { header: 'Address', key: 'address', width: 40 }
        ];

        visits.forEach(v => {
            worksheet.addRow({
                company: v.meta.companyName,
                rm: v.meta.rmName,
                status: v.status,
                user: v.submittedBy ? v.submittedBy.name : 'N/A',
                date: v.createdAt.toLocaleDateString(),
                year: v.agencyProfile.establishmentYear,
                contact: v.agencyProfile.contactNumber,
                address: v.agencyProfile.address
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=visits_report.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.exportPdf = async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.id).populate('submittedBy', 'name');
        if (!visit) return res.status(404).json({ message: 'Visit not found' });

        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=visit_${visit._id}.pdf`);

        doc.pipe(res);

        // Header
        doc.fillColor('#1A3C6E').fontSize(20).text('Agent Visit Survey Report', { align: 'center' });
        doc.moveDown();
        doc.fillColor('black').fontSize(12).text(`Agent/Company Name: ${visit.meta.companyName}`);
        doc.text(`RM: ${visit.meta.rmName}`);
        doc.text(`Date: ${visit.createdAt.toLocaleDateString()}`);
        doc.text(`Status: ${visit.status.toUpperCase()}`);
        doc.moveDown();

        doc.strokeColor('#1A3C6E').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        doc.fontSize(14).fillColor('#2E75B6').text('Agency Profile');
        doc.fontSize(10).fillColor('black');
        doc.text(`Establishment Year: ${visit.agencyProfile.establishmentYear}`);
        doc.text(`Address: ${visit.agencyProfile.address}`);
        doc.text(`Contact: ${visit.agencyProfile.contactNumber}`);

        doc.moveDown();
        doc.fontSize(14).fillColor('#2E75B6').text('Post-Visit Summary');
        doc.fontSize(10).fillColor('black');
        doc.text(`Action Points: ${visit.postVisit.actionPoints}`);

        doc.end();
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
