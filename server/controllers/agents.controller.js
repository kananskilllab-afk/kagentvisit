const Agent = require('../models/Agent');
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');

// Helper to validate ObjectId
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// @desc    Get all agents
exports.getAgents = async (req, res) => {
    try {
        const agents = await Agent.find().sort({ name: 1 });
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
                const name = (row.getCell(2).value?.toString() || '').trim();
                if (!name) return;

                const rawDate = row.getCell(14).value;
                const onboardingDate = parseCommonDate(rawDate);

                const agentData = {
                    rank: row.getCell(1).value?.toString() || '',
                    name: name,
                    categoryType: row.getCell(3).value?.toString() || '',
                    agentType: row.getCell(4).value?.toString() || '',
                    emailId: row.getCell(5).value?.toString() || '',
                    mobile: row.getCell(6).value?.toString() || '',
                    city: row.getCell(7).value?.toString() || '',
                    state: row.getCell(8).value?.toString() || '',
                    zone: row.getCell(9).value?.toString() || '',
                    team: row.getCell(10).value?.toString() || '',
                    rmName: row.getCell(11).value?.toString() || '',
                    onboardingDate,
                    bdmName: row.getCell(15).value?.toString() || '',
                    region: row.getCell(16).value?.toString() || '',
                    autoRegionMapping: row.getCell(17).value?.toString() || '',
                    isActive: true,
                    createdBy: req.user._id
                };
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

                const onboardingDate = parseCommonDate(cells[13]);
                
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
                    onboardingDate,
                    bdmName: cells[14] || '',
                    region: cells[15] || '',
                    autoRegionMapping: cells[16] || '',
                    isActive: true,
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
