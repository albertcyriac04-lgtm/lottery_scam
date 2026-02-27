const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'lottery.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create registrations table
db.exec(`
  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    aadhar TEXT NOT NULL UNIQUE,
    is_winner INTEGER DEFAULT 0,
    prize_amount INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Prepared statements
const insertRegistration = db.prepare(`
  INSERT INTO registrations (name, phone, aadhar, is_winner, prize_amount)
  VALUES (@name, @phone, @aadhar, @is_winner, @prize_amount)
`);

const getWinnerCount = db.prepare(`
  SELECT COUNT(*) as count FROM registrations WHERE is_winner = 1
`);

const getAllRegistrations = db.prepare(`
  SELECT * FROM registrations ORDER BY created_at DESC
`);

const getRegistrationByPhone = db.prepare(`
  SELECT * FROM registrations WHERE phone = ?
`);

const getRegistrationByAadhar = db.prepare(`
  SELECT * FROM registrations WHERE aadhar = ?
`);

const getTotalCount = db.prepare(`
  SELECT COUNT(*) as count FROM registrations
`);

const getWinners = db.prepare(`
  SELECT * FROM registrations WHERE is_winner = 1 ORDER BY created_at ASC
`);

const getStats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN is_winner = 1 THEN 1 ELSE 0 END) as winners,
    SUM(CASE WHEN is_winner = 0 THEN 1 ELSE 0 END) as non_winners
  FROM registrations
`);

// Prize tiers for the 10 winners
const PRIZE_TIERS = [
  50000,  // 1st winner: ₹50,000
  25000,  // 2nd winner: ₹25,000
  15000,  // 3rd winner: ₹15,000
  10000,  // 4th winner
  10000,  // 5th winner
  5000,   // 6th winner
  5000,   // 7th winner
  5000,   // 8th winner
  3000,   // 9th winner
  2000    // 10th winner: ₹2,000
];

module.exports = {
  db,
  insertRegistration,
  getWinnerCount,
  getAllRegistrations,
  getRegistrationByPhone,
  getRegistrationByAadhar,
  getTotalCount,
  getWinners,
  getStats,
  PRIZE_TIERS
};
