const mysql = require('mysql');
require('dotenv').config();

const db = mysql.createConnection({
    host: 'bolhzfiks8mfe9ten8b5-mysql.services.clever-cloud.com',
    user: 'umthr4mwkiysdfsd',
    password: 'MfpfE0nTBiQedP351nF1',
    database: 'bolhzfiks8mfe9ten8b5',
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    }
    console.log('MySQL Connected...');
});

module.exports = db;
