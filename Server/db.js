const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'data', 'leads.db');

let db;

async function initDB() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS leads (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name   TEXT    NOT NULL,
      company     TEXT,
      email       TEXT    NOT NULL,
      ip_address  TEXT,
      sent_at     DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  saveDB();
  return db;
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
  }
  fs.writeFileSync(DB_PATH, buffer);
}

function getDB() { return db; }

module.exports = { initDB, saveDB, getDB };