const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, './database.db');
const db = new sqlite3.Database(dbPath);
console.log('REST API Database path:', dbPath);

module.exports = db; 