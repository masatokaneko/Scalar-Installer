const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3001;

// Database configuration
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'scalardb',
    password: 'postgres',
    port: 5432,
});

// Middleware FIRST
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// API routes BEFORE catch-all routes
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ 
            status: 'healthy', 
            message: 'Medical database connection successful',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ 
            status: 'unhealthy', 
            message: err.message 
        });
    }
});

app.get('/api/patients', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM patients ORDER BY patient_id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/doctors', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM doctors ORDER BY doctor_id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/appointments', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.*, 
                   p.first_name || ' ' || p.last_name as patient_name,
                   d.first_name || ' ' || d.last_name as doctor_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.patient_id
            JOIN doctors d ON a.doctor_id = d.doctor_id
            ORDER BY a.appointment_date DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/records', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*,
                   p.first_name || ' ' || p.last_name as patient_name,
                   d.first_name || ' ' || d.last_name as doctor_name
            FROM medical_records r
            JOIN patients p ON r.patient_id = p.patient_id
            JOIN doctors d ON r.doctor_id = d.doctor_id
            ORDER BY r.visit_date DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const [patients, doctors, appointments, records] = await Promise.all([
            pool.query('SELECT COUNT(*) as count FROM patients'),
            pool.query('SELECT COUNT(*) as count FROM doctors'),
            pool.query('SELECT COUNT(*) as count FROM appointments'),
            pool.query('SELECT COUNT(*) as count FROM medical_records')
        ]);
        
        res.json({
            patients: patients.rows[0].count,
            doctors: doctors.rows[0].count,
            appointments: appointments.rows[0].count,
            records: records.rows[0].count
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Serve HTML LAST
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'medical-app.html'));
});

app.listen(port, () => {
    console.log(`🏥 Medical App running at http://localhost:${port}`);
});
