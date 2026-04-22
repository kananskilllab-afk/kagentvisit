const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
    if (transporter) return transporter;

    // Only create transporter if SMTP config is present
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        return null;
    }

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    return transporter;
};

const sendEmail = async ({ to, subject, html }) => {
    const mailer = getTransporter();
    if (!mailer) {
        console.log(`[Email Skipped] SMTP not configured. Would send to: ${to}, Subject: ${subject}`);
        return false;
    }

    try {
        await mailer.sendMail({
            from: process.env.SMTP_FROM || `"Kanan Expenses" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html
        });
        return true;
    } catch (err) {
        console.error('[Email Error]', err.message);
        return false;
    }
};

// --- Expense Claim Email Templates ---

const claimSubmittedEmail = (claim, submitter) => ({
    subject: `New Expense Claim: ${claim.claimNumber} - ${claim.title}`,
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">New Expense Claim Submitted</h2>
            </div>
            <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
                <p><strong>Claim Number:</strong> ${claim.claimNumber}</p>
                <p><strong>Submitted By:</strong> ${submitter.name} (${submitter.employeeId})</p>
                <p><strong>Title:</strong> ${claim.title}</p>
                <p><strong>Total Amount:</strong> ${claim.currency} ${claim.totalAmount?.toLocaleString('en-IN')}</p>
                <p><strong>Purpose:</strong> ${claim.travelPurpose || 'N/A'}</p>
                <p><strong>Travel:</strong> ${claim.travelFrom?.city || ''} → ${claim.travelTo?.city || ''}</p>
                <p><strong>Claim Location:</strong> ${claim.claimLocation?.city || 'N/A'}, ${claim.claimLocation?.state || ''}</p>
                <p><strong>Expenses Count:</strong> ${claim.expenses?.length || 0}</p>
            </div>
            <div style="padding: 15px; text-align: center; color: #64748b; font-size: 12px;">
                Please review this claim in the Kanan Visit System.
            </div>
        </div>
    `
});

const claimStatusEmail = (claim, status, comment) => {
    const statusLabels = {
        approved: { label: 'Approved', color: '#16a34a', message: 'Your expense claim has been approved.' },
        rejected: { label: 'Rejected', color: '#dc2626', message: 'Your expense claim has been rejected.' },
        needs_justification: { label: 'Needs Justification', color: '#d97706', message: 'Your expense claim requires additional justification.' },
        paid: { label: 'Paid', color: '#059669', message: 'Your expense claim has been paid.' },
        under_review: { label: 'Under Review', color: '#2563eb', message: 'Your expense claim is now under review.' }
    };

    const info = statusLabels[status] || { label: status, color: '#6b7280', message: 'Your claim status has been updated.' };

    return {
        subject: `Expense Claim ${claim.claimNumber} - ${info.label}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: ${info.color}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                    <h2 style="margin: 0;">Claim ${info.label}</h2>
                </div>
                <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
                    <p>${info.message}</p>
                    <p><strong>Claim Number:</strong> ${claim.claimNumber}</p>
                    <p><strong>Title:</strong> ${claim.title}</p>
                    <p><strong>Amount:</strong> ${claim.currency} ${claim.totalAmount?.toLocaleString('en-IN')}</p>
                    ${comment ? `<p><strong>Comment:</strong> ${comment}</p>` : ''}
                </div>
                <div style="padding: 15px; text-align: center; color: #64748b; font-size: 12px;">
                    Log in to the Kanan Visit System for details.
                </div>
            </div>
        `
    };
};

module.exports = {
    sendEmail,
    claimSubmittedEmail,
    claimStatusEmail
};
