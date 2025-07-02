#!/bin/bash

# ScalarDB Service Reconnection and Diagnostic Script
# This script will diagnose and fix connection issues with ScalarDB services

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        print_warning "Killing process on port $port (PID: $pid)"
        kill -9 $pid
        sleep 2
    fi
}

# Function to check Docker containers
check_docker_containers() {
    print_status "Checking Docker containers..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Check PostgreSQL container
    if docker ps | grep -q "scalardb-postgres"; then
        print_success "PostgreSQL container is running"
    else
        print_warning "PostgreSQL container is not running"
        return 1
    fi
    
    # Check if we can connect to PostgreSQL
    if docker exec scalardb-postgres pg_isready -U postgres >/dev/null 2>&1; then
        print_success "PostgreSQL is accepting connections"
    else
        print_error "PostgreSQL is not accepting connections"
        return 1
    fi
    
    return 0
}

# Function to start PostgreSQL with Docker
start_postgresql() {
    print_status "Starting PostgreSQL with Docker..."
    
    # Stop existing container if running
    if docker ps -a | grep -q "scalardb-postgres"; then
        print_warning "Removing existing PostgreSQL container..."
        docker stop scalardb-postgres 2>/dev/null || true
        docker rm scalardb-postgres 2>/dev/null || true
    fi
    
    # Create Docker network if it doesn't exist
    docker network create scalardb-network 2>/dev/null || true
    
    # Start PostgreSQL container
    docker run -d \
        --name scalardb-postgres \
        --network scalardb-network \
        -e POSTGRES_DB=scalardb \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=postgres \
        -p 5432:5432 \
        -v postgres_data:/var/lib/postgresql/data \
        postgres:15
    
    # Wait for PostgreSQL to be ready
    print_status "Waiting for PostgreSQL to be ready..."
    local attempts=0
    while [ $attempts -lt 30 ]; do
        if docker exec scalardb-postgres pg_isready -U postgres >/dev/null 2>&1; then
            print_success "PostgreSQL is ready!"
            break
        fi
        sleep 2
        attempts=$((attempts + 1))
    done
    
    if [ $attempts -eq 30 ]; then
        print_error "PostgreSQL failed to start after 60 seconds"
        return 1
    fi
    
    # Create tables if they don't exist
    create_sample_tables
}

# Function to create sample tables
create_sample_tables() {
    print_status "Creating sample tables..."
    
    docker exec -i scalardb-postgres psql -U postgres -d scalardb << 'EOF'
-- Create sample_customer table
CREATE TABLE IF NOT EXISTS sample_customer (
    customer_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    credit_limit INTEGER DEFAULT 10000,
    credit_total INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sample_order table  
CREATE TABLE IF NOT EXISTS sample_order (
    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id INTEGER REFERENCES sample_customer(customer_id),
    timestamp BIGINT DEFAULT EXTRACT(epoch FROM NOW()) * 1000,
    status VARCHAR(50) DEFAULT 'pending',
    total_amount INTEGER DEFAULT 0
);

-- Create sample_item table
CREATE TABLE IF NOT EXISTS sample_item (
    item_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price INTEGER NOT NULL,
    inventory INTEGER DEFAULT 100,
    category VARCHAR(100),
    description TEXT
);

-- Insert sample data if tables are empty
INSERT INTO sample_customer (name, credit_limit, credit_total) 
SELECT 'Yamada Taro', 10000, 0
WHERE NOT EXISTS (SELECT 1 FROM sample_customer WHERE name = 'Yamada Taro');

INSERT INTO sample_customer (name, credit_limit, credit_total)
SELECT 'Yamada Hanako', 10000, 0  
WHERE NOT EXISTS (SELECT 1 FROM sample_customer WHERE name = 'Yamada Hanako');

INSERT INTO sample_customer (name, credit_limit, credit_total)
SELECT 'Suzuki Ichiro', 10000, 0
WHERE NOT EXISTS (SELECT 1 FROM sample_customer WHERE name = 'Suzuki Ichiro');

INSERT INTO sample_item (name, price, category, description)
SELECT 'Apple', 1000, 'Fruit', 'Fresh red apples'
WHERE NOT EXISTS (SELECT 1 FROM sample_item WHERE name = 'Apple');

INSERT INTO sample_item (name, price, category, description)
SELECT 'Orange', 2000, 'Fruit', 'Juicy oranges'
WHERE NOT EXISTS (SELECT 1 FROM sample_item WHERE name = 'Orange');

INSERT INTO sample_item (name, price, category, description)
SELECT 'Grape', 2500, 'Fruit', 'Sweet grapes'
WHERE NOT EXISTS (SELECT 1 FROM sample_item WHERE name = 'Grape');

INSERT INTO sample_item (name, price, category, description)
SELECT 'Mango', 5000, 'Fruit', 'Tropical mango'
WHERE NOT EXISTS (SELECT 1 FROM sample_item WHERE name = 'Mango');

INSERT INTO sample_item (name, price, category, description)
SELECT 'Melon', 3000, 'Fruit', 'Sweet melon'
WHERE NOT EXISTS (SELECT 1 FROM sample_item WHERE name = 'Melon');

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
EOF

    print_success "Sample tables created and populated!"
}

# Function to fix Node.js applications
fix_nodejs_apps() {
    print_status "Setting up Node.js applications..."
    
    # Check if Node.js is installed
    if ! command -v node >/dev/null 2>&1; then
        print_error "Node.js is not installed. Please install Node.js and try again."
        return 1
    fi
    
    # Kill any existing processes on ports 3000 and 3001
    if check_port 3000; then
        print_warning "Port 3000 is in use, killing existing process..."
        kill_port 3000
    fi
    
    if check_port 3001; then
        print_warning "Port 3001 is in use, killing existing process..."
        kill_port 3001
    fi
    
    # Install dependencies for dashboard
    if [ -f "server.js" ] && [ -f "package.json" ]; then
        print_status "Installing dashboard dependencies..."
        npm install
    elif [ -f "server.js" ]; then
        print_status "Creating package.json and installing dependencies..."
        create_package_json
        npm install
    fi
    
    return 0
}

# Function to create package.json if missing
create_package_json() {
    cat > package.json << 'EOF'
{
  "name": "scalardb-dashboard",
  "version": "1.0.0",
  "description": "ScalarDB Test Dashboard",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
EOF
}

# Function to update server.js with correct database connection
update_server_config() {
    print_status "Updating server configuration..."
    
    if [ -f "server.js" ]; then
        # Create backup
        cp server.js server.js.backup
        
        # Update database configuration
        cat > temp_server.js << 'EOF'
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Database configuration with retry logic
const pool = new Pool({
    user: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'scalardb',
    password: 'postgres',
    port: 5432,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test database connection on startup
async function testConnection() {
    let retries = 5;
    while (retries > 0) {
        try {
            const client = await pool.connect();
            await client.query('SELECT 1');
            client.release();
            console.log('✅ Database connected successfully');
            return true;
        } catch (err) {
            console.log(`❌ Database connection failed, retries left: ${retries - 1}`);
            console.log(`Error: ${err.message}`);
            retries--;
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
    console.log('❌ Failed to connect to database after 5 attempts');
    return false;
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT version(), current_database(), current_user');
        res.json({ 
            status: 'healthy', 
            message: 'Database connection successful',
            timestamp: new Date().toISOString(),
            database_info: result.rows[0]
        });
    } catch (err) {
        console.error('Health check failed:', err);
        res.status(500).json({ 
            status: 'unhealthy', 
            message: 'Database connection failed: ' + err.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Get all tables
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

// Get customers
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

// Get orders
app.get('/api/orders', async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    
    try {
        const result = await pool.query(`
            SELECT * FROM sample_order 
            ORDER BY timestamp DESC 
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
    
    // Basic security check
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

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await pool.end();
    process.exit(0);
});

// Start server
async function startServer() {
    const dbConnected = await testConnection();
    if (!dbConnected) {
        console.log('⚠️  Starting server anyway, but database operations will fail');
    }
    
    app.listen(port, '0.0.0.0', () => {
        console.log(`🚀 ScalarDB Test Dashboard running at http://localhost:${port}`);
        console.log('📊 Available endpoints:');
        console.log('  GET  /              - Dashboard interface');
        console.log('  GET  /api/health    - Database health check');
        console.log('  GET  /api/tables    - List all tables');
        console.log('  GET  /api/customers - Get customer data');
        console.log('  GET  /api/orders    - Get order data');
        console.log('  POST /api/query     - Execute custom SQL');
        console.log('');
        console.log('💡 Make sure PostgreSQL is running on port 5432');
        console.log('🔧 Database: scalardb, User: postgres, Password: postgres');
    });
}

startServer();
EOF
        
        mv temp_server.js server.js
        print_success "Server configuration updated!"
    fi
}

# Function to start services
start_services() {
    print_status "Starting services..."
    
    # Start dashboard
    if [ -f "server.js" ]; then
        print_status "Starting dashboard on port 3000..."
        nohup node server.js > dashboard.log 2>&1 &
        sleep 3
        
        if check_port 3000; then
            print_success "Dashboard started successfully on port 3000"
        else
            print_error "Failed to start dashboard on port 3000"
            print_status "Check dashboard.log for errors"
        fi
    fi
    
    # Start medical app if it exists
    if [ -f "medical-server.js" ]; then
        print_status "Starting medical app on port 3001..."
        nohup node medical-server.js > medical.log 2>&1 &
        sleep 3
        
        if check_port 3001; then
            print_success "Medical app started successfully on port 3001"
        else
            print_error "Failed to start medical app on port 3001"
            print_status "Check medical.log for errors"
        fi
    fi
}

# Function to test connections
test_connections() {
    print_status "Testing connections..."
    
    # Test PostgreSQL
    if docker exec scalardb-postgres pg_isready -U postgres >/dev/null 2>&1; then
        print_success "✅ PostgreSQL: Connected"
    else
        print_error "❌ PostgreSQL: Not connected"
    fi
    
    # Test dashboard
    if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
        print_success "✅ Test Dashboard: Running on port 3000"
    else
        print_error "❌ Test Dashboard: Not running on port 3000"
    fi
    
    # Test medical app
    if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
        print_success "✅ Medical App: Running on port 3001"
    else
        print_warning "⚠️  Medical App: Not running on port 3001 (optional)"
    fi
}

# Function to show logs
show_logs() {
    print_status "Recent log entries:"
    
    if [ -f "dashboard.log" ]; then
        echo -e "\n${BLUE}Dashboard Log:${NC}"
        tail -10 dashboard.log
    fi
    
    if [ -f "medical.log" ]; then
        echo -e "\n${BLUE}Medical App Log:${NC}"
        tail -10 medical.log
    fi
}

# Function to create a simple medical server if it doesn't exist
create_medical_server() {
    if [ ! -f "medical-server.js" ]; then
        print_status "Creating medical server..."
        
        cat > medical-server.js << 'EOF'
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

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ 
            status: 'healthy', 
            message: 'Medical app database connection successful',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ 
            status: 'unhealthy', 
            message: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Simple medical endpoints
app.get('/api/patients', async (req, res) => {
    try {
        // Create a simple patients view from customers
        const result = await pool.query(`
            SELECT 
                customer_id as patient_id,
                name as patient_name,
                'Active' as status,
                created_at
            FROM sample_customer 
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`🏥 Medical App running at http://localhost:${port}`);
});
EOF
        
        print_success "Medical server created!"
    fi
}

# Main execution
main() {
    echo "🔧 ScalarDB Service Reconnection Script"
    echo "======================================="
    
    # Step 1: Check and start PostgreSQL
    if ! check_docker_containers; then
        print_warning "PostgreSQL issues detected, attempting to fix..."
        start_postgresql
    else
        print_success "PostgreSQL is running correctly"
    fi
    
    # Step 2: Fix Node.js applications
    fix_nodejs_apps
    
    # Step 3: Update server configuration
    update_server_config
    
    # Step 4: Create medical server if needed
    create_medical_server
    
    # Step 5: Start services
    start_services
    
    # Step 6: Wait a moment for services to start
    sleep 5
    
    # Step 7: Test connections
    test_connections
    
    # Step 8: Show logs if there are issues
    echo ""
    show_logs
    
    echo ""
    echo "🎉 Setup complete!"
    echo ""
    echo "📊 Dashboard: http://localhost:3000"
    echo "🏥 Medical App: http://localhost:3001"
    echo "🐘 PostgreSQL: localhost:5432"
    echo ""
    echo "📝 To view logs:"
    echo "   Dashboard: tail -f dashboard.log"
    echo "   Medical:   tail -f medical.log"
    echo ""
    echo "🔧 To restart services:"
    echo "   ./reconnect.sh"
}

# Check if running as script or sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi