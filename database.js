const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("focusai.db", (err) => {

if(err){
console.error("Database error:", err.message);
}else{
console.log("FocusAI SQLite database connected.");
}

});

// Create table
db.run(`
CREATE TABLE IF NOT EXISTS students (
id INTEGER PRIMARY KEY AUTOINCREMENT,
school TEXT,
name TEXT,
roll TEXT
)
`);

module.exports = db;