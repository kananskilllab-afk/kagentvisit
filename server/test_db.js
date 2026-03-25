const mongoose = require('mongoose');
const uri = "mongodb://kananskilllab_db_user:Admin32q@ac-2jeussb-shard-00-00.zn7hq8q.mongodb.net:27017,ac-2jeussb-shard-00-01.zn7hq8q.mongodb.net:27017,ac-2jeussb-shard-00-02.zn7hq8q.mongodb.net:27017/avs_app?ssl=true&replicaSet=atlas-dvr0mw-shard-0&authSource=admin&appName=Cluster0";

console.log("Testing connection to:", uri.split('@')[1]);

mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
        console.log("SUCCESS: Connected to database!");
        process.exit(0);
    })
    .catch(err => {
        console.error("FAILURE: Could not connect!");
        console.error(err.message);
        process.exit(1);
    });
