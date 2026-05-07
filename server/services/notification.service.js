const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendEmail, claimSubmittedEmail, claimStatusEmail } = require('./email.service');

/**
 * Find the admin(s) responsible for a given user
 * (admins who have this user in their assignedEmployees, or all admins if none assigned)
 */
const findAdminsForUser = async (userId) => {
    // First check if any admin has this user explicitly assigned
    const assignedAdmins = await User.find({
        role: 'admin',
        isActive: true,
        assignedEmployees: userId
    }).select('_id name email');

    if (assignedAdmins.length > 0) return assignedAdmins;

    // Fallback: return all active admins
    return User.find({ role: 'admin', isActive: true }).select('_id name email');
};

/**
 * Find all accounts department users
 */
const findAccountsUsers = async () => {
    return User.find({ role: 'accounts', isActive: true }).select('_id name email');
};

/**
 * Create a notification record and optionally send email
 */
const createNotification = async ({ recipient, type, title, message, claimRef, visitRef, sendEmailFlag = true }) => {
    const notification = await Notification.create({
        recipient: recipient._id || recipient,
        type,
        title,
        message,
        ...(claimRef ? { claimRef } : {}),
        ...(visitRef ? { visitRef } : {})
    });

    if (sendEmailFlag && recipient.email) {
        const sent = await sendEmail({
            to: recipient.email,
            subject: title,
            html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
                <h3>${title}</h3>
                <p>${message}</p>
                <p style="color: #64748b; font-size: 12px; margin-top: 20px;">Log in to the Kanan Visit System for details.</p>
            </div>`
        });
        if (sent) {
            notification.emailSent = true;
            await notification.save();
        }
    }

    return notification;
};

/**
 * Notify accounts and admins when a claim is submitted
 */
const notifyClaimSubmitted = async (claim, submitter) => {
    const [accountsUsers, admins, superAdmins] = await Promise.all([
        findAccountsUsers(),
        findAdminsForUser(submitter._id),
        User.find({ role: 'superadmin', isActive: true }).select('_id name email')
    ]);

    const emailTemplate = claimSubmittedEmail(claim, submitter);
    const recipients = [...accountsUsers, ...admins, ...superAdmins];

    // Deduplicate by _id
    const seen = new Set();
    const uniqueRecipients = recipients.filter(r => {
        const id = r._id.toString();
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
    });

    const promises = uniqueRecipients.map(async (recipient) => {
        await createNotification({
            recipient,
            type: 'claim_submitted',
            title: `New Claim: ${claim.claimNumber}`,
            message: `${submitter.name} submitted expense claim "${claim.title}" for ${claim.currency} ${claim.totalAmount?.toLocaleString('en-IN')}`,
            claimRef: claim._id
        });

        // Also send the formatted email
        await sendEmail({ to: recipient.email, ...emailTemplate });
    });

    await Promise.allSettled(promises);
};

/**
 * Notify the claim submitter when status changes
 */
const notifyClaimStatusChange = async (claim, newStatus, changedBy, comment) => {
    const statusLabels = {
        approved: 'Approved',
        rejected: 'Rejected',
        needs_justification: 'Needs Justification',
        paid: 'Paid',
        under_review: 'Under Review'
    };

    const notifTypeMap = {
        approved: 'claim_approved',
        rejected: 'claim_rejected',
        needs_justification: 'claim_needs_justification',
        paid: 'claim_paid',
        under_review: 'claim_under_review'
    };

    const submitter = await User.findById(claim.submittedBy).select('_id name email');
    if (!submitter) return;

    const label = statusLabels[newStatus] || newStatus;
    const emailTemplate = claimStatusEmail(claim, newStatus, comment);

    await createNotification({
        recipient: submitter,
        type: notifTypeMap[newStatus] || 'claim_submitted',
        title: `Claim ${claim.claimNumber}: ${label}`,
        message: `Your expense claim "${claim.title}" has been ${label.toLowerCase()}.${comment ? ` Comment: ${comment}` : ''}`,
        claimRef: claim._id
    });

    await sendEmail({ to: submitter.email, ...emailTemplate });
};

/**
 * Notify a user when an action item is assigned to them
 */
const notifyActionItemAssigned = async (actionItem, visitId, assigner, assigneeId) => {
    try {
        const assigneeUser = await User.findById(assigneeId).select('_id name email');
        if (!assigneeUser) return;
        if (String(assigneeUser._id) === String(assigner._id)) return;

        const duePart = actionItem.dueDate
            ? ` · Due ${new Date(actionItem.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
            : '';

        await createNotification({
            recipient: assigneeUser,
            type: 'action_item_assigned',
            title: `Action item assigned by ${assigner.name}`,
            message: `"${actionItem.text}"${duePart}`,
            visitRef: visitId,
            sendEmailFlag: false
        });
    } catch (err) {
        console.error('[NotificationService] notifyActionItemAssigned failed:', err.message);
    }
};

module.exports = {
    findAdminsForUser,
    findAccountsUsers,
    createNotification,
    notifyClaimSubmitted,
    notifyClaimStatusChange,
    notifyActionItemAssigned
};
