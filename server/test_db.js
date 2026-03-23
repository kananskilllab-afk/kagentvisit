const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const testConn = async () => {
    try {
        console.log('Testing connection to:', process.env.MONGODB_URI?.substring(0, 30) + '...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('SUCCESS: Database is connected.');
        const count = await mongoose.connection.db.collection('users').countDocuments();
        console.log('USERS FOUND:', count);
        process.exit(0);
    } catch (err) {
        console.error('ERROR: Database is NOT connected.');
        console.error(err.message);
        process.exit(1);
    }
};

testConn();
