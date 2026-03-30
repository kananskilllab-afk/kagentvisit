const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const FormConfig = require('./models/FormConfig');

// ── B2B Form Fields (9 Steps) ─────────────────────────────────────────────────
const b2bFields = [
    // Step 1 – Visit Meta
    { id: 'meta.companyName', group: 'Visit Meta', label: 'Agent/Company Name', type: 'autocomplete-agent', required: true },
    { id: 'meta.email', group: 'Visit Meta', label: 'Email Address', type: 'text', required: false },
    { id: 'meta.bdmName', group: 'Visit Meta', label: 'BDM Name', type: 'text', required: true },
    { id: 'meta.rmName', group: 'Visit Meta', label: 'RM Name', type: 'text', required: true },
    { id: 'meta.meetingStart', group: 'Visit Meta', label: 'Meeting Start', type: 'datetime', required: true },
    { id: 'meta.meetingEnd', group: 'Visit Meta', label: 'Meeting End', type: 'datetime', required: true },

    // Step 2 – Agency Profile
    { id: 'agencyProfile.address', group: 'Agency Profile', label: 'Office Address', type: 'textarea', required: true },
    { id: 'agencyProfile.nearestLandmark', group: 'Agency Profile', label: 'Nearest Landmark', type: 'text', required: false },
    { id: 'agencyProfile.pinCode', group: 'Agency Profile', label: 'PIN Code', type: 'text', required: true },
    { id: 'agencyProfile.contactNumber', group: 'Agency Profile', label: 'Contact Number', type: 'text', required: true },
    { id: 'agencyProfile.emailId', group: 'Agency Profile', label: 'Agency Email ID', type: 'text', required: false },
    { id: 'agencyProfile.website', group: 'Agency Profile', label: 'Website', type: 'text', required: false },
    { id: 'agencyProfile.gmbLink', group: 'Agency Profile', label: 'GMB Page Link', type: 'text', required: false },
    { id: 'agencyProfile.establishmentYear', group: 'Agency Profile', label: 'Establishment Year', type: 'number', required: true },

    // Step 3 – Business Model & Infrastructure
    { id: 'agencyProfile.businessModel', group: 'Business & Infra', label: 'Primary Business Model', type: 'multi-select', required: true, options: ['Hybrid', 'Only IELTS/Coaching', 'Only Study Visa', 'Immigration', 'Other'] },
    { id: 'agencyProfile.officeArea', group: 'Business & Infra', label: 'Office Space Area (sq.ft)', type: 'number', required: false },
    { id: 'agencyProfile.infraRating', group: 'Business & Infra', label: 'Infrastructure Rating', type: 'star-rating', required: true },
    { id: 'agencyProfile.hasComputerLab', group: 'Business & Infra', label: 'Computer Lab?', type: 'toggle', required: false },
    { id: 'agencyProfile.numComputers', group: 'Business & Infra', label: 'Number of Computers (If Yes)', type: 'number', required: false },
    { id: 'agencyProfile.googleReviews', group: 'Business & Infra', label: 'Google / SM Review Rating', type: 'star-rating', required: false },

    // Step 4 – Promoter & Team
    { id: 'promoterTeam.name', group: 'Promoter & Team', label: 'Promoter Name', type: 'text', required: true },
    { id: 'promoterTeam.designation', group: 'Promoter & Team', label: 'Designation', type: 'text', required: true },
    { id: 'promoterTeam.mobileNumber', group: 'Promoter & Team', label: 'Promoters Mobile Number', type: 'text', required: false },
    { id: 'promoterTeam.emailId', group: 'Promoter & Team', label: 'Promoters Email ID', type: 'text', required: false },
    { id: 'promoterTeam.totalStaff', group: 'Promoter & Team', label: 'Total Staff Size', type: 'number', required: true },
    { id: 'promoterTeam.coachingTeamSize', group: 'Promoter & Team', label: 'Coaching Team Size', type: 'number', required: false },
    { id: 'promoterTeam.countryTeamSize', group: 'Promoter & Team', label: 'Country Team Size', type: 'number', required: false },
    { id: 'promoterTeam.countriesPromoted', group: 'Promoter & Team', label: 'Countries Promoted', type: 'multi-select', required: true, options: ['Canada', 'USA', 'UK', 'Australia', 'New Zealand', 'Europe', 'Dubai', 'Ireland', 'N/A', 'Other'] },
    { id: 'promoterTeam.coachingPromoted', group: 'Promoter & Team', label: 'Coaching Courses Promoted', type: 'multi-select', required: false, options: ['IELTS', 'PTE', 'TOEFL', 'GRE', 'GMAT', 'SAT', 'Duolingo', 'N/A', 'Other'] },
    { id: 'promoterTeam.vas', group: 'Promoter & Team', label: 'Value Added Services (VAS)', type: 'multi-select', required: false, options: ['Forex', 'Insurance', 'Accommodation', 'SIM Cards', 'Education Loan', 'N/A', 'Other'] },

    // Step 5 – Marketing & Operations
    { id: 'marketingOps.marketingActivities', group: 'Marketing & Ops', label: 'What type of marketing activities they perform?', type: 'textarea', required: false },
    { id: 'marketingOps.avgDailyWalkins', group: 'Marketing & Ops', label: 'Avg. Daily Walk-ins', type: 'number', required: true },
    { id: 'marketingOps.walkinRatio', group: 'Marketing & Ops', label: 'Walk-in to Registration Ratio', type: 'text', required: false },
    { id: 'marketingOps.useBrochures', group: 'Marketing & Ops', label: 'Using Brochures for Counselling?', type: 'toggle', required: false },
    { id: 'marketingOps.totalVisaYear', group: 'Marketing & Ops', label: 'Total Visa (In a Year)', type: 'number', required: false },
    { id: 'marketingOps.totalCoachingYear', group: 'Marketing & Ops', label: 'Total Coaching Enrollment (In a Year)', type: 'number', required: false },
    { id: 'marketingOps.officeMediaLink', group: 'Marketing & Ops', label: 'Office Photos/Video link', type: 'text', required: false },
    { id: 'marketingOps.totalBranches', group: 'Marketing & Ops', label: 'Total Number of Branches', type: 'number', required: true },

    // Step 6 – Kanan Status & Tools
    { id: 'kananSpecific.prepcomAcademy', group: 'Kanan Status & Tools', label: 'Is it a PREPCOM or an Academy Partner?', type: 'dropdown', required: false, options: ['Appcom', 'Prepcom', 'Both', 'None'] },
    { id: 'kananSpecific.onboardingDate', group: 'Kanan Status & Tools', label: 'Date of Onboarding (If Partner)', type: 'date', required: false },
    { id: 'kananSpecific.appcomOnboardingDate', group: 'Kanan Status & Tools', label: 'Date of Onboarding (If APPCOM)', type: 'date', required: false },
    { id: 'enquiryStats.avgAdmissions', group: 'Kanan Status & Tools', label: 'Monthly Enquiries (3m avg) [Admissions]', type: 'number', required: false },
    { id: 'enquiryStats.avgCoaching', group: 'Kanan Status & Tools', label: 'Monthly Enquiries (3m avg) [Coaching]', type: 'number', required: false },
    { id: 'enquiryStats.avgCanada', group: 'Kanan Status & Tools', label: 'Monthly Enquiries (3m avg) [Canada]', type: 'number', required: false },
    { id: 'enquiryStats.avgIELTS', group: 'Kanan Status & Tools', label: 'Monthly Enquiries (3m avg) [IELTS]', type: 'number', required: false },

    // Kanan Tools (Merged into Step 6)
    { id: 'kananTools.useAcademyPortal', group: 'Kanan Status & Tools', label: 'Is using Kanan Academy Portal?', type: 'toggle', required: false },
    { id: 'kananTools.portalCourses', group: 'Kanan Status & Tools', label: 'Courses for which Portal used (If Yes)', type: 'multi-select', required: false, options: ['IELTS', 'PTE', 'SAT', 'GRE', 'French', 'My Career Mentor', 'German', 'Duolingo', 'TOEFL', 'N/A', 'Other'] },
    { id: 'kananTools.useBooks', group: 'Kanan Status & Tools', label: 'Is using Kanan Books?', type: 'toggle', required: false },
    { id: 'kananTools.bookCourses', group: 'Kanan Status & Tools', label: 'Courses for which Books used (If Yes)', type: 'multi-select', required: false, options: ['IELTS', 'PTE', 'SAT', 'GRE', 'French', 'My Career Mentor', 'German', 'Duolingo', 'TOEFL', 'N/A', 'Other'] },
    { id: 'kananTools.useClassroomContent', group: 'Kanan Status & Tools', label: 'Is using Kanan Classroom Content?', type: 'toggle', required: false },
    { id: 'kananTools.trainerRating', group: 'Kanan Status & Tools', label: 'Trainer Knowledge Rating about Kanan Products', type: 'star-rating', required: false },
    { id: 'kananTools.counsellorRating', group: 'Kanan Status & Tools', label: 'Counsellor Knowledge Rating about Countries\' process', type: 'star-rating', required: false },

    // Step 7 – Partnership & Student Counts
    { id: 'partnership.workingCountries', group: 'Partnership', label: 'Working with Kanan for which Countries?', type: 'multi-select', required: false, options: ['Canada', 'USA', 'UK', 'Australia', 'Not Interested', 'Other'] },
    { id: 'partnership.onshoreReferral', group: 'Partnership', label: 'Has substantial students onshore for the referral model?', type: 'toggle', required: false },
    { id: 'studentCounts.canada', group: 'Partnership', label: 'Number of Students in Canada (from 2020)', type: 'number', required: false },
    { id: 'studentCounts.usa', group: 'Partnership', label: 'Number of Students in USA (from 2020)', type: 'number', required: false },
    { id: 'studentCounts.uk', group: 'Partnership', label: 'Number of Students in UK (from 2020)', type: 'number', required: false },
    { id: 'partnership.feedback', group: 'Partnership', label: 'Feedback about Kanan Countries/Services', type: 'textarea', required: false },

    // Step 8 – Technology & Budget
    { id: 'opsTech.techPlatforms', group: 'Tech & Budget', label: 'Which Technologies/Platforms currently used?', type: 'textarea', required: false },
    { id: 'opsTech.techWillingness', group: 'Tech & Budget', label: 'Willingness to adopt new Technologies?', type: 'star-rating', required: false },
    { id: 'budget.marketing2026', group: 'Tech & Budget', label: 'Tentative Marketing Budget for 2026', type: 'number', required: false },
    { id: 'budget.coaching2026', group: 'Tech & Budget', label: 'Likely budget for Coaching Products 2026', type: 'number', required: false },
    { id: 'competency.pricingRating', group: 'Tech & Budget', label: 'Pricing Competitiveness (1-5 Scale)', type: 'star-rating', required: false },

    // Step 9 – Challenges & Support
    { id: 'support.biggestChallenge', group: 'Support Needs', label: 'Biggest challenge in current operations?', type: 'textarea', required: false },
    { id: 'support.interestedServices', group: 'Support Needs', label: 'SERVICES INTERESTED WITH KANAN.CO', type: 'multi-select', required: false, options: ['Study Abroad', 'Coaching', 'VAS', 'B2B Portal', 'Other'] },
    { id: 'support.needTraining', group: 'Support Needs', label: 'Need Support: Counsellor Training', type: 'toggle', required: false },
    { id: 'support.needMarketing', group: 'Support Needs', label: 'Need Support: Marketing & Lead Gen', type: 'toggle', required: false },
    { id: 'support.needTech', group: 'Support Needs', label: 'Need Support: Technology Adoption', type: 'toggle', required: false },
    { id: 'support.needPartners', group: 'Support Needs', label: 'Need Support: Institutional Partners', type: 'toggle', required: false },
    { id: 'support.needVAS', group: 'Support Needs', label: 'Need Support: Improving VAS offerings', type: 'toggle', required: false },
    { id: 'support.painPoints', group: 'Support Needs', label: 'Agent Pain Points', type: 'textarea', required: true },
    { id: 'support.solutions', group: 'Support Needs', label: 'Solutions Provided', type: 'textarea', required: true },

    // Step 10 – Final Summary
    { id: 'postVisit.actionPoints', group: 'Final Summary', label: 'Action Points', type: 'textarea', required: true },
    { id: 'postVisit.remarks', group: 'Final Summary', label: 'Your Remarks', type: 'textarea', required: false }
];

// ── B2C Form Fields ───────────────────────────────────────────────────────────
const b2cFields = [
    { id: 'visitInfo.visitDate', group: 'Visit Details',      label: 'Visit Date',                type: 'date',     required: true },
    { id: 'visitInfo.officer',   group: 'Visit Details',      label: 'Visit Officer (Who Went)',  type: 'text',     required: true },

    { id: 'studentInfo.crmId',   group: 'Student Information', label: 'CRM ID',        type: 'text', required: true },
    { id: 'studentInfo.name',    group: 'Student Information', label: 'Student Name',  type: 'text', required: true },
    { id: 'studentInfo.email',   group: 'Student Information', label: 'Email ID',      type: 'text', required: true },

    { id: 'contactDetails.indiaNo',   group: 'Contact Details', label: 'India No.',    type: 'text', required: true },
    { id: 'contactDetails.canadaNo',  group: 'Contact Details', label: 'Canada No.',   type: 'text', required: true },
    { id: 'contactDetails.parentsNo', group: 'Contact Details', label: 'Parents No.',  type: 'text', required: true },

    { id: 'location.address', group: 'Location Details', label: 'Address', type: 'textarea', required: true },
    { id: 'location.city',    group: 'Location Details', label: 'City',    type: 'text',     required: true },

    { id: 'academic.college', group: 'Academic Details', label: 'College', type: 'text', required: true },

    { id: 'checklist.waGroup', group: 'Checklist', label: 'WA Group Created (Y/N)', type: 'toggle', required: true },
    { id: 'checklist.momDone', group: 'Checklist', label: 'MOM Done (Y/N)',          type: 'toggle', required: true },

    { id: 'outcome.status',  group: 'Final Outcome', label: 'Visit Outcome / Status', type: 'dropdown', required: true, options: [
        'Pending', 
        'Completed', 
        'Cancelled',
        'HOUSE LOCKED',
        'ADDRESS NOT FOUND',
        'VISIT DONE',
        'REVISIT REQUIRED',
        'ENROLLED',
        'NOT INTRESTED',
        'OUT OF VADODARAA',
        'IN PROGRESS',
        'WRONG ADDRESS DETAILS',
        'NOT RESPONDING',
        'HO INVITE',
        'FOLLOW UP REQUIRED',
        'SHIFTED OTHER CITY',
        'NOT FOUND'
    ] },
    { id: 'outcome.remarks', group: 'Final Outcome', label: 'Remarks / Notes',        type: 'textarea',     required: true },
    { id: 'outcome.photo',   group: 'Final Outcome', label: 'Visit Verification Photo', type: 'photo-upload', required: false }
];

async function seed() {
    try {
        console.log('Connecting to:', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Seed B2B form
        const existingB2B = await FormConfig.findOne({ formType: 'generic', isActive: true });
        if (!existingB2B) {
            await FormConfig.create({
                version: `3.0-B2B-seed`,
                isActive: true,
                formType: 'generic',
                description: 'Standard B2B agency visit form',
                fields: b2bFields
            });
            console.log('B2B form configuration seeded.');
        } else {
            existingB2B.fields = b2bFields;
            existingB2B.version = `${existingB2B.version}-upd-${Date.now().toString().slice(-4)}`;
            await existingB2B.save();
            console.log('Active B2B form updated with new fields.');
        }

        // Seed B2C form
        const existingB2C = await FormConfig.findOne({ formType: 'home_visit', isActive: true });
        if (!existingB2C) {
            await FormConfig.create({
                version: `1.0-B2C-seed`,
                isActive: true,
                formType: 'home_visit',
                description: 'Standard B2C home visit form',
                fields: b2cFields
            });
            console.log('B2C form configuration seeded.');
        } else {
            console.log('Active B2C form already exists at version:', existingB2C.version);
        }

        process.exit(0);
    } catch (err) {
        console.error('SEED ERROR:', err);
        process.exit(1);
    }
}

seed();
