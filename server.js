const express = require('express');
const sql = require('mssql');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,      // e.g. myserver.database.windows.net
  database: process.env.DB_NAME,
  options: {
    encrypt: true,                    // required for Azure SQL
    trustServerCertificate: false
  }
};

let poolPromise;
function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(dbConfig);
  }
  return poolPromise;
}

// Create the table on first run if it doesn't exist
async function initDb() {
  const pool = await getPool();
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Submissions' AND xtype='U')
    CREATE TABLE Submissions (
      id INT IDENTITY(1,1) PRIMARY KEY,
      name NVARCHAR(100),
      email NVARCHAR(200),
      message NVARCHAR(1000),
      created_at DATETIME2 DEFAULT SYSUTCDATETIME()
    );
  `);
}

app.post('/api/submit', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email) {
      return res.status(400).json({ ok: false, error: 'name and email are required' });
    }
    const pool = await getPool();
    await pool.request()
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('message', sql.NVarChar, message || '')
      .query('INSERT INTO Submissions (name, email, message) VALUES (@name, @email, @message)');
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/submissions', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT TOP 50 * FROM Submissions ORDER BY created_at DESC');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, async () => {
  try {
    await initDb();
    console.log('DB ready');
  } catch (e) {
    console.error('DB init failed (app still running):', e.message);
  }
  console.log(`Listening on port ${port}`);
});