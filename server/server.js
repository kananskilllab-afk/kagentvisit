const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const dotenv = require('dotenv');
const { globalLimiter } = require('./middleware/rateLimiter');
const auditLogger = require('./middleware/auditLogger');

// Load environment variables
dotenv.config();

const app = express();

// Trust proxy for express-rate-limit behind Vercel/proxies
app.set('trust proxy', 1);

// Database connection singleton for Serverless
let isConnected = false;

const connectDB = async () => {
    if (isConnected && mongoose.connection.readyState === 1) {
        return;
    }

    if (!process.env.MONGODB_URI) {
        console.error('CRITICAL: MONGODB_URI is missing from environment variables!');
        throw new Error('MONGODB_URI_MISSING');
    }

    try {
        console.log('Connecting to MongoDB Atlas...');
        const db = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10
        });
        isConnected = !!db.connections[0].readyState;
        console.log('Successfully connected to MongoDB Atlas');
    } catch (error) {
        console.error('CRITICAL: MongoDB Connection Error!', error.message);
        throw error;
    }
};

// Define form field configurations
const genericFields = [
    // Step 1 – Visit Meta
    { id: 'meta.companyName', group: 'Visit Meta', label: 'Agent/Company Name', type: 'text', required: true },
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
    { id: 'promoterTeam.countriesPromoted', group: 'Promoter & Team', label: 'Countries Promoted', type: 'multi-select', required: true, options: ['Canada', 'USA', 'UK', 'Australia', 'New Zealand', 'Europe', 'Other'] },
    { id: 'promoterTeam.coachingPromoted', group: 'Promoter & Team', label: 'Coaching Courses Promoted', type: 'multi-select', required: false, options: ['IELTS', 'PTE', 'TOEFL', 'GRE', 'GMAT', 'SAT', 'Duolingo', 'Other'] },
    { id: 'promoterTeam.vas', group: 'Promoter & Team', label: 'Value Added Services (VAS)', type: 'multi-select', required: false, options: ['Forex', 'Insurance', 'Accommodation', 'SIM Cards', 'Education Loan', 'Other'] },

    // Step 5 – Marketing & Operations
    { id: 'marketingOps.marketingActivities', group: 'Marketing & Ops', label: 'What type of marketing activities they perform?', type: 'textarea', required: false },
    { id: 'marketingOps.avgDailyWalkins', group: 'Marketing & Ops', label: 'Avg. Daily Walk-ins', type: 'number', required: true },
    { id: 'marketingOps.walkinRatio', group: 'Marketing & Ops', label: 'Walk-in to Registration Ratio', type: 'text', required: false },
    { id: 'marketingOps.useBrochures', group: 'Marketing & Ops', label: 'Using Brochures for Counselling?', type: 'toggle', required: false },
    { id: 'marketingOps.totalVisaYear', group: 'Marketing & Ops', label: 'Total Visa (In a Year)', type: 'number', required: false },
    { id: 'marketingOps.totalCoachingYear', group: 'Marketing & Ops', label: 'Total Coaching Enrollment (In a Year)', type: 'number', required: false },
    { id: 'marketingOps.officeMediaLink', group: 'Marketing & Ops', label: 'Office Photos/Video link', type: 'text', required: false },
    { id: 'marketingOps.totalBranches', group: 'Marketing & Ops', label: 'Total Number of Branches', type: 'number', required: true },

    // Step 6 – Kanan Status & Enrollment
    { id: 'kananSpecific.prepcomAcademy', group: 'Kanan Status', label: 'Is it a PREPCOM or an Academy Partner?', type: 'dropdown', required: false, options: ['PREPCOM', 'Academy Partner', 'Both', 'None'] },
    { id: 'kananSpecific.onboardingDate', group: 'Kanan Status', label: 'Date of Onboarding (If Partner)', type: 'date', required: false },
    { id: 'kananSpecific.isAppcom', group: 'Kanan Status', label: 'Is this an APPCOM?', type: 'toggle', required: false },
    { id: 'kananSpecific.appcomOnboardingDate', group: 'Kanan Status', label: 'Date of Onboarding (If APPCOM)', type: 'date', required: false },
    { id: 'enquiryStats.avgAdmissions', group: 'Kanan Status', label: 'Monthly Enquiries (3m avg) [Admissions]', type: 'number', required: false },
    { id: 'enquiryStats.avgCoaching', group: 'Kanan Status', label: 'Monthly Enquiries (3m avg) [Coaching]', type: 'number', required: false },
    { id: 'enquiryStats.avgCanada', group: 'Kanan Status', label: 'Monthly Enquiries (3m avg) [Canada]', type: 'number', required: false },
    { id: 'enquiryStats.avgIELTS', group: 'Kanan Status', label: 'Monthly Enquiries (3m avg) [IELTS]', type: 'number', required: false },

    // Step 7 – Partnership & Student Counts
    { id: 'partnership.workingCountries', group: 'Partnership', label: 'Working with Kanan for which Countries?', type: 'multi-select', required: false, options: ['Canada', 'USA', 'UK', 'Australia', 'Other'] },
    { id: 'partnership.onshoreReferral', group: 'Partnership', label: 'Has substantial students onshore for the referral model?', type: 'toggle', required: false },
    { id: 'studentCounts.canada', group: 'Partnership', label: 'Number of Students in Canada (from 2020)', type: 'number', required: false },
    { id: 'studentCounts.usa', group: 'Partnership', label: 'Number of Students in USA (from 2020)', type: 'number', required: false },
    { id: 'studentCounts.uk', group: 'Partnership', label: 'Number of Students in UK (from 2020)', type: 'number', required: false },
    { id: 'partnership.feedback', group: 'Partnership', label: 'Feedback about Kanan Countries/Services', type: 'textarea', required: false },

    // Step 8 – Kanan Tools & Academy
    { id: 'kananTools.useAcademyPortal', group: 'Kanan Tools', label: 'Is using Kanan Academy Portal?', type: 'toggle', required: false },
    { id: 'kananTools.portalCourses', group: 'Kanan Tools', label: 'Courses for which Portal used (If Yes)', type: 'multi-select', required: false, options: ['IELTS', 'PTE', 'Digital Marketing', 'Other'] },
    { id: 'kananTools.useBooks', group: 'Kanan Tools', label: 'Is using Kanan Books?', type: 'toggle', required: false },
    { id: 'kananTools.bookCourses', group: 'Kanan Tools', label: 'Courses for which Books used (If Yes)', type: 'multi-select', required: false, options: ['IELTS', 'PTE', 'Other'] },
    { id: 'kananTools.useClassroomContent', group: 'Kanan Tools', label: 'Is using Kanan Classroom Content?', type: 'toggle', required: false },
    { id: 'kananTools.trainerRating', group: 'Kanan Tools', label: 'Trainer Knowledge Rating about Kanan Products', type: 'star-rating', required: false },
    { id: 'kananTools.counsellorRating', group: 'Kanan Tools', label: 'Counsellor Knowledge Rating about Countries\' process', type: 'star-rating', required: false },

    // Step 9 – Technology & Budget
    { id: 'opsTech.techPlatforms', group: 'Tech & Budget', label: 'Which Technologies/Platforms currently used?', type: 'textarea', required: false },
    { id: 'opsTech.techWillingness', group: 'Tech & Budget', label: 'Willingness to adopt new Technologies?', type: 'star-rating', required: false },
    { id: 'budget.marketing2026', group: 'Tech & Budget', label: 'Tentative Marketing Budget for 2026', type: 'number', required: false },
    { id: 'budget.coaching2026', group: 'Tech & Budget', label: 'Likely budget for Coaching Products 2026', type: 'number', required: false },
    { id: 'competency.pricingRating', group: 'Tech & Budget', label: 'Pricing Competitiveness (1-5 Scale)', type: 'star-rating', required: false },

    // Step 10 – Challenges & Support
    { id: 'support.biggestChallenge', group: 'Support Needs', label: 'Biggest challenge in current operations?', type: 'textarea', required: false },
    { id: 'support.interestedServices', group: 'Support Needs', label: 'SERVICES INTERESTED WITH KANAN.CO', type: 'multi-select', required: false, options: ['Study Abroad', 'Coaching', 'VAS', 'B2B Portal', 'Other'] },
    { id: 'support.needTraining', group: 'Support Needs', label: 'Need Support: Counsellor Training', type: 'toggle', required: false },
    { id: 'support.needMarketing', group: 'Support Needs', label: 'Need Support: Marketing & Lead Gen', type: 'toggle', required: false },
    { id: 'support.needTech', group: 'Support Needs', label: 'Need Support: Technology Adoption', type: 'toggle', required: false },
    { id: 'support.needPartners', group: 'Support Needs', label: 'Need Support: Institutional Partners', type: 'toggle', required: false },
    { id: 'support.needVAS', group: 'Support Needs', label: 'Need Support: Improving VAS offerings', type: 'toggle', required: false },
    { id: 'support.painPoints', group: 'Support Needs', label: 'Agent Pain Points', type: 'textarea', required: true },
    { id: 'support.solutions', group: 'Support Needs', label: 'Solutions Provided', type: 'textarea', required: true },

    // Step 11 – Final Summary
    { id: 'postVisit.actionPoints', group: 'Final Summary', label: 'Action Points', type: 'textarea', required: true },
    { id: 'postVisit.remarks', group: 'Final Summary', label: 'Your Remarks', type: 'textarea', required: false }
];

const b2cFields = [
    // Step 1: Visit Details
    { id: 'visitInfo.visitDate', group: 'Visit Details', label: 'Visit Date', type: 'date', required: true },
    { id: 'visitInfo.teamSize', group: 'Visit Details', label: 'Total Team Members', type: 'dropdown', required: true, options: ['1', '2', '3', '4', '5'] },
    { id: 'visitInfo.officer', group: 'Visit Details', label: 'Counsellor Name', type: 'text', required: true },

    // New: Profile Classification
    { id: 'studentInfo.classification', group: 'Student Information', label: 'Classification', type: 'dropdown', required: true, options: ['Onshore', 'Offshore'] },
    // New: Lead Source
    { id: 'studentInfo.leadSource', group: 'Student Information', label: 'Lead Source', type: 'dropdown', required: true, options: ['Band Data', 'Non-Band Data', 'Onshore Data', 'Reference Case'] },

    // Step 2: Student Information
    { id: 'studentInfo.crmId', group: 'Student Information', label: 'CRM ID', type: 'text', required: true },
    { id: 'studentInfo.name', group: 'Student Information', label: 'Student Name', type: 'text', required: true },
    { id: 'studentInfo.email', group: 'Student Information', label: 'Email ID', type: 'text', required: true },
    { id: 'studentInfo.phoneNumber', group: 'Student Information', label: 'Student Mobile No.', type: 'text', required: true },
    { id: 'studentInfo.qualification', group: 'Student Information', label: 'Current Qualification', type: 'dropdown', required: true, options: ['10th', '12th', 'Bachelors', 'Masters', 'Diploma', 'Other'] },
    { id: 'studentInfo.program', group: 'Student Information', label: 'Program Interested', type: 'dropdown', required: true, options: ['UG', 'PG', 'Diploma', 'Certificate', 'Other'] },
    { id: 'studentInfo.intake', group: 'Student Information', label: 'Intake Interested', type: 'dropdown', required: true, options: ['Jan/Feb', 'May/June', 'Sept/Oct', 'Other'] },
    { id: 'studentInfo.testScore', group: 'Student Information', label: 'English Test Score (IELTS/PTE)', type: 'text', required: false },
    { id: 'studentInfo.interest', group: 'Student Information', label: 'Countries of Interest', type: 'multi-select', required: true, options: ['Canada', 'USA', 'UK', 'Australia', 'Other'] },
    
    // New: Inquiry Types (This will be handled in frontend by showing relevant list based on classification)
    { id: 'studentInfo.inquiryTypes', group: 'Student Information', label: 'Inquiry Types', type: 'multi-select', required: false, options: [
        'PR Process', 'Kanan Coaching', 'Canada Visitor Visa', 'Study Permit Extension', 'PGWP', 'Super Visa', 'USA Visitor Visa', 'ECA – WES', 'Spousal PR', 'All Immigration Services',
        'Country Counselling', 'My Career Mentor'
    ] },

    // Step 3: Contact Details
    { id: 'contactDetails.indiaNo', group: 'Contact Details', label: 'India No.', type: 'text', required: true },
    { id: 'contactDetails.canadaNo', group: 'Contact Details', label: 'Canada No. (if any)', type: 'text', required: false },
    { id: 'contactDetails.parentsNo', group: 'Contact Details', label: 'Parents No.', type: 'text', required: true },

    // Step 4: Location Details
    { id: 'location.pinCode', group: 'Location Details', label: 'PIN Code', type: 'text', required: true },
    { id: 'location.address', group: 'Location Details', label: 'Address', type: 'textarea', required: true },
    { id: 'location.nearestLandmark', group: 'Location Details', label: 'Nearest Landmark', type: 'text', required: false },
    { id: 'location.city', group: 'Location Details', label: 'City', type: 'text', required: true },
    { id: 'location.state', group: 'Location Details', label: 'State', type: 'text', required: true },

    // Step 5: Academic Details
    { id: 'academic.college', group: 'Academic Details', label: 'College', type: 'text', required: true },

    // Step 6: Checklist
    { id: 'checklist.waGroup', group: 'Checklist', label: 'WA Group Created (Y/N)', type: 'toggle', required: true },
    { id: 'checklist.parentsMet', group: 'Checklist', label: 'Parents Met?', type: 'toggle', required: false },
    { id: 'checklist.docsCollected', group: 'Checklist', label: 'Documents Collected?', type: 'toggle', required: false },
    { id: 'checklist.appLogged', group: 'Checklist', label: 'Application Successfully Logged?', type: 'toggle', required: false },
    { id: 'checklist.momDone', group: 'Checklist', label: 'MOM Done (Y/N)', type: 'toggle', required: true },

    // Step 7: Final Outcome
    {
        id: 'outcome.status', group: 'Final Outcome', label: 'Visit Outcome / Status', type: 'dropdown', required: true, options: [
            'Pending', 'Completed', 'Cancelled', 'HOUSE LOCKED', 'ADDRESS NOT FOUND', 'VISIT DONE',
            'REVISIT REQUIRED', 'ENROLLED', 'NOT INTRESTED', 'OUT OF VADODARAA', 'IN PROGRESS',
            'WRONG ADDRESS DETAILS', 'NOT RESPONDING', 'HO INVITE', 'FOLLOW UP REQUIRED',
            'SHIFTED OTHER CITY', 'NOT FOUND',
            'Process Done', 'Already PR in Canada', 'Married with PR Holder', 'Country Change', 'Already French Start In Canada'
        ]
    },
    { id: 'outcome.remarks', group: 'Final Outcome', label: 'Remarks / Notes', type: 'textarea', required: true }
];

// Seeding logic (only once per instance)
let isSeeded = false;
const FormConfig = require('./models/FormConfig'); // Ensure FormConfig is imported
const seedData = async () => {
    if (isSeeded) return;
    try {
        // Auto-seed FormConfigs if missing
        const activeB2B = await FormConfig.findOne({ formType: 'generic', isActive: true });
        const hasB2C = await FormConfig.findOne({ formType: 'home_visit', isActive: true });
        
        const shouldReseedB2B = process.env.RESEED_DB === 'true';

        if (!activeB2B || shouldReseedB2B) {
            console.log('Seeding/Updating B2B form configuration...');
            if (activeB2B && shouldReseedB2B) {
                await FormConfig.updateMany({ formType: 'generic' }, { isActive: false });
            }
            await FormConfig.create({
                version: `5.0-B2B-${Date.now()}`,
                isActive: true,
                formType: 'generic',
                description: 'Standard B2B agency visit form',
                fields: genericFields
            });
            console.log('B2B Form configuration seeded.');
        } else {
            // Patch: ensure onboarding date fields are never required in the active B2B config
            const NEVER_REQUIRED = ['kananSpecific.onboardingDate', 'kananSpecific.appcomOnboardingDate'];
            const needsPatch = activeB2B.fields.some(
                f => NEVER_REQUIRED.includes(f.id) && f.required === true
            );
            if (needsPatch) {
                activeB2B.fields = activeB2B.fields.map(f =>
                    NEVER_REQUIRED.includes(f.id) ? { ...f.toObject(), required: false } : f
                );
                await activeB2B.save();
                console.log('Patched onboarding date fields to required: false in active B2B config.');
            }
        }

        if (!hasB2C || hasB2C.fields.length < 17) {
            console.log('Seeding B2C form configuration...');
            if (hasB2C) {
                await FormConfig.updateMany({ formType: 'home_visit' }, { isActive: false });
            }
            await FormConfig.create({
                version: `3.0-B2C-${Date.now()}`,
                isActive: true,
                formType: 'home_visit',
                description: 'Standard B2C home visit form',
                fields: b2cFields
            });
            console.log('B2C Form configuration seeded.');
        }
        isSeeded = true;
    } catch (err) {
        console.error('Seeding Error:', err.message);
    }
};

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
    origin: process.env.CLIENT_URL ? [process.env.CLIENT_URL, 'http://127.0.0.1:5173', 'http://localhost:5173'] : ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(globalLimiter); // Rate limiting
app.use(auditLogger); // Audit tracking
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Base Route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to AVS Application API' });
});

// Database Readiness Middleware
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error('Database Middleware Error:', err.message);
        return res.status(503).json({ 
            success: false, 
            message: 'Database connection failed. Please try again in 5 seconds.' 
        });
    }
});

// Import Routes
const authRoutes = require('./routes/auth.routes');
const visitRoutes = require('./routes/visits.routes');
const userRoutes = require('./routes/users.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const reportRoutes = require('./routes/reports.routes');
const formConfigRoutes = require('./routes/formConfig.routes');
const auditLogRoutes = require('./routes/auditLogs.routes');
const pincodeRoutes = require('./routes/pincode.routes');
const uploadRoutes = require('./routes/upload.routes');
const agentRoutes = require('./routes/agents.routes');
const aiRoutes = require('./routes/ai.routes');
const expenseRoutes = require('./routes/expenses.routes');
const notificationRoutes = require('./routes/notifications.routes');
const calendarRoutes = require('./routes/calendar.routes');
const googleCalendarRoutes = require('./routes/googleCalendar.routes');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/form-config', formConfigRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/pincodes', pincodeRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/visits/:id/ai', aiRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/google-calendar', googleCalendarRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

if (process.env.NODE_ENV !== 'production' || require.main === module) {
    const PORT = process.env.PORT || 5000;
    
    // Auto-connect to MongoDB when server starts
    connectDB()
        .then(() => {
            console.log('MongoDB auto-connected successfully on startup.');
            return seedData(); // Ensure B2B/B2C configurations are synced
        })
        .then(() => {
            app.listen(PORT, () => {
                console.log(`Server running on port ${PORT}`);
            });
        })
        .catch(err => {
            console.error('Initial startup Database Connection Error:', err);
            // Start server even if initial DB connection fails (fallback to lazy connect)
            app.listen(PORT, () => {
                console.log(`Server running on port ${PORT} (Notice: DB connection pending)`);
            });
        });
}

module.exports = app;
