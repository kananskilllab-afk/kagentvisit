const Agent = require('../models/Agent');
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');

// Helper to validate ObjectId
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// @desc    Get all agents (supports ?search=, ?active=true)
exports.getAgents = async (req, res) => {
    try {
        const { search, active } = req.query;
        const filter = {};

        if (active === 'true') filter.isActive = true;
        else if (active === 'false') filter.isActive = false;

        if (search && search.trim()) {
            filter.name = { $regex: search.trim(), $options: 'i' };
        }

        const agents = await Agent.find(filter).select('-__v').sort({ name: 1 });

        // When searching, bubble exact prefix matches to the top
        if (search && search.trim()) {
            const q = search.trim().toLowerCase();
            agents.sort((a, b) => {
                const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
                const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
                if (aStarts !== bStarts) return aStarts - bStarts;
                return a.name.localeCompare(b.name);
            });
        }

        res.json({ success: true, data: agents });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single agent
exports.getAgentById = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid agent ID format' });
        }
        const agent = await Agent.findById(req.params.id);
        if (!agent) {
            return res.status(404).json({ success: false, message: 'Agent not found' });
        }
        res.json({ success: true, data: agent });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create agent
exports.createAgent = async (req, res) => {
    try {
        const { name } = req.body;
        const existing = await Agent.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Agent already registered with this name' });
        }

        const agent = await Agent.create({
            ...req.body,
            createdBy: req.user._id
        });

        res.status(201).json({ success: true, data: agent });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update agent
exports.updateAgent = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid agent ID format' });
        }
        let agent = await Agent.findById(req.params.id);
        if (!agent) {
            return res.status(404).json({ success: false, message: 'Agent not found' });
        }

        agent = await Agent.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.json({ success: true, data: agent });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete agent
exports.deleteAgent = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid agent ID format' });
        }
        const agent = await Agent.findByIdAndDelete(req.params.id);
        if (!agent) {
            return res.status(404).json({ success: false, message: 'Agent not found' });
        }
        res.json({ success: true, message: 'Agent removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete ALL agents
exports.deleteAllAgents = async (req, res) => {
    try {
        const result = await Agent.deleteMany({});
        res.json({ success: true, message: `Successfully deleted ${result.deletedCount} agents` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Import agents from CSV or Excel
exports.importAgents = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload a file' });
        }

        const agents = [];
        const fileName = req.file.originalname;
        const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
        const isCsv = fileName.endsWith('.csv');

        const parseCommonDate = (dateStr) => {
            if (!dateStr || dateStr === 'null' || dateStr === 'undefined') return null;
            let d = new Date(dateStr);
            if (!isNaN(d.getTime())) return d;
            
            // Try DD/MM/YYYY or DD-MM-YYYY
            const match = dateStr.toString().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
            if (match) {
                const [_, day, month, year] = match;
                d = new Date(year, parseInt(month) - 1, day); 
                if (!isNaN(d.getTime())) return d;
            }
            return null;
        };

        if (isExcel) {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(req.file.buffer);
            const worksheet = workbook.getWorksheet(1);
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return; // Skip header
                const agentData = {
                    rank: row.getCell(1).value?.toString() || '',
                    name: (row.getCell(2).value?.toString() || '').trim(),
                    categoryType: row.getCell(3).value?.toString() || '',
                    agentType: row.getCell(4).value?.toString() || '',
                    emailId: row.getCell(5).value?.toString() || '',
                    mobile: row.getCell(6).value?.toString() || '',
                    city: row.getCell(7).value?.toString() || '',
                    state: row.getCell(8).value?.toString() || '',
                    zone: row.getCell(9).value?.toString() || '',
                    team: row.getCell(10).value?.toString() || '',
                    rmName: row.getCell(11).value?.toString() || '',
                    onboardingDate: parseCommonDate(row.getCell(14).value),
                    allowRegistration: row.getCell(16).value === 'false' || row.getCell(16).value === false ? false : true,
                    accountUrl: row.getCell(17).value?.toString() || '',
                    bdmName: row.getCell(18).value?.toString() || '',
                    region: row.getCell(19).value?.toString() || '',
                    createdBy: req.user._id
                };
                agentData.isActive = row.getCell(12).value === 'false' || row.getCell(12).value === false ? false : true;
                agents.push(agentData);
            });
        } else if (isCsv) {
            const csvContent = req.file.buffer.toString('utf-8');
            const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
            
            const parseCsvLine = (line) => {
                const result = [];
                let cell = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        if (inQuotes && line[i+1] === '"') { 
                            cell += '"';
                            i++;
                        } else {
                            inQuotes = !inQuotes;
                        }
                    } else if (char === ',' && !inQuotes) {
                        result.push(cell.trim());
                        cell = '';
                    } else {
                        cell += char;
                    }
                }
                result.push(cell.trim());
                return result.map(c => c.replace(/^"|"$/g, '').trim());
            };

            for (let i = 1; i < lines.length; i++) {
                const cells = parseCsvLine(lines[i]);
                const name = (cells[1] || '').trim();
                if (!name) continue;

                const agentData = {
                    rank: cells[0] || '',
                    name: name,
                    categoryType: cells[2] || '',
                    agentType: cells[3] || '',
                    emailId: cells[4] || '',
                    mobile: cells[5] || '',
                    city: cells[6] || '',
                    state: cells[7] || '',
                    zone: cells[8] || '',
                    team: cells[9] || '',
                    rmName: cells[10] || '',
                    isActive: cells[11] === 'false' || cells[11] === false ? false : true,
                    onboardingDate: parseCommonDate(cells[13]),
                    allowRegistration: cells[15] === 'false' || cells[15] === false ? false : true,
                    accountUrl: cells[16] || '',
                    bdmName: cells[17] || '',
                    region: cells[18] || '',
                    createdBy: req.user._id
                };
                agents.push(agentData);
            }
        } else {
            return res.status(400).json({ success: false, message: 'Unsupported file format.' });
        }

        if (agents.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid agents found in file.' });
        }

        // 1. De-duplicate the incoming agents list (local duplicates in file)
        const localSeen = new Set();
        const localUnique = [];
        for (const a of agents) {
            const lowerName = a.name.toLowerCase();
            if (!localSeen.has(lowerName)) {
                localSeen.add(lowerName);
                localUnique.push(a);
            }
        }

        // 2. Check against database
        const names = localUnique.map(a => a.name);
        const existingAgents = await Agent.find({ 
            name: { $in: names.map(n => new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) } 
        }).select('name');
        
        const existingNames = new Set(existingAgents.map(a => a.name.toLowerCase()));
        const finalToInsert = localUnique.filter(a => !existingNames.has(a.name.toLowerCase()));

        if (finalToInsert.length > 0) {
            // Use ordered: false to skip any that might still fail and continue
            await Agent.insertMany(finalToInsert, { ordered: false }).catch(err => {
                console.warn('Partial insert during import:', err.message);
                // We still want to continue and report the success of the others
            });
        }

        res.json({ 
            success: true, 
            message: `Import complete. ${finalToInsert.length} new records processed, ${agents.length - finalToInsert.length} duplicates skipped.`,
            count: finalToInsert.length
        });
    } catch (error) {
        console.error('Import Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
