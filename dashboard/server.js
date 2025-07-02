const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

// Database configuration - modify these values based on your setup
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'scalardb',
    password: 'postgres', // Change this to match your password
    port: 5432,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Serve the main dashboard page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT version(), current_database(), current_user');
        res.json({ 
            status: 'healthy', 
            message: 'Database connection successful',
            database_info: result.rows[0]
        });
    } catch (err) {
        console.error('Health check failed:', err);
        res.status(500).json({ 
            status: 'unhealthy', 
            message: 'Database connection failed: ' + err.message 
        });
    }
});

// Get all tables in the public schema
app.get('/api/tables', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT table_name, 
                   (SELECT COUNT(*) FROM information_schema.columns 
                    WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
            FROM information_schema.tables t
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching tables:', err);
        res.status(500).json({ error: 'Failed to fetch tables: ' + err.message });
    }
});

// Describe table structure
app.get('/api/describe/:tableName', async (req, res) => {
    const { tableName } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
        `, [tableName]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error describing table:', err);
        res.status(500).json({ error: 'Failed to describe table: ' + err.message });
    }
});

// Get customers with optional limit
app.get('/api/customers', async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    
    try {
        const result = await pool.query(`
            SELECT * FROM sample_customer 
            ORDER BY customer_id 
            LIMIT $1
        `, [limit]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching customers:', err);
        res.status(500).json({ error: 'Failed to fetch customers: ' + err.message });
    }
});

// Get orders with optional limit
app.get('/api/orders', async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    
    try {
        const result = await pool.query(`
            SELECT * FROM sample_order 
            ORDER BY order_id 
            LIMIT $1
        `, [limit]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ error: 'Failed to fetch orders: ' + err.message });
    }
});

// Get customer statistics
app.get('/api/stats/customers', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as count FROM sample_customer');
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error getting customer count:', err);
        res.status(500).json({ error: 'Failed to get customer count: ' + err.message });
    }
});

// Get order statistics
app.get('/api/stats/orders', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as count FROM sample_order');
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error getting order count:', err);
        res.status(500).json({ error: 'Failed to get order count: ' + err.message });
    }
});

// Execute custom SQL query
app.post('/api/query', async (req, res) => {
    const { query } = req.body;
    
    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }
    
    // Basic security check - only allow SELECT statements
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery.startsWith('select') && !trimmedQuery.startsWith('with')) {
        return res.status(400).json({ 
            error: 'Only SELECT and WITH queries are allowed for security reasons' 
        });
    }
    
    try {
        const result = await pool.query(query);
        res.json({
            success: true,
            rows: result.rows,
            rowCount: result.rowCount,
            command: result.command
        });
    } catch (err) {
        console.error('Error executing query:', err);
        res.status(400).json({ 
            error: 'Query execution failed: ' + err.message 
        });
    }
});

// Get database schema information
app.get('/api/schema', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                t.table_name,
                c.column_name,
                c.data_type,
                c.is_nullable,
                c.column_default,
                c.ordinal_position
            FROM information_schema.tables t
            JOIN information_schema.columns c ON t.table_name = c.table_name
            WHERE t.table_schema = 'public' AND c.table_schema = 'public'
            ORDER BY t.table_name, c.ordinal_position
        `);
        
        // Group columns by table
        const schema = {};
        result.rows.forEach(row => {
            if (!schema[row.table_name]) {
                schema[row.table_name] = [];
            }
            schema[row.table_name].push({
                name: row.column_name,
                type: row.data_type,
                nullable: row.is_nullable === 'YES',
                default: row.column_default,
                position: row.ordinal_position
            });
        });
        
        res.json(schema);
    } catch (err) {
        console.error('Error fetching schema:', err);
        res.status(500).json({ error: 'Failed to fetch schema: ' + err.message });
    }
});

// Get recent activity (if audit tables exist)
app.get('/api/activity', async (req, res) => {
    try {
        // This is a placeholder - adjust based on your actual audit/log tables
        const result = await pool.query(`
            SELECT 
                'sample_customer' as table_name,
                'INSERT' as operation,
                current_timestamp as timestamp,
                'System' as user_name
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching activity:', err);
        res.status(500).json({ error: 'Failed to fetch activity: ' + err.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await pool.end();
    process.exit(0);
});

// Start server
app.listen(port, () => {
    console.log(`ScalarDB Test Dashboard running at http://localhost:${port}`);
    console.log('Available endpoints:');
    console.log('  GET  /              - Dashboard interface');
    console.log('  GET  /api/health    - Database health check');
    console.log('  GET  /api/tables    - List all tables');
    console.log('  GET  /api/customers - Get customer data');
    console.log('  GET  /api/orders    - Get order data');
    console.log('  POST /api/query     - Execute custom SQL');
    console.log('');
    console.log('Make sure your PostgreSQL database is running and accessible.');
    console.log('Update the database configuration in this file if needed.');
});