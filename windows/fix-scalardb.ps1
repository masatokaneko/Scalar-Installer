# Simple ScalarDB Connection Fix Script for Windows
# Save this as: fix-scalardb.ps1

Write-Host "🔧 ScalarDB Connection Fix Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Function to check if port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

# Stop existing processes on ports 3000 and 3001
Write-Host "Stopping existing Node.js processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Stop and remove existing PostgreSQL container
Write-Host "Stopping existing PostgreSQL container..." -ForegroundColor Yellow
docker stop scalardb-postgres 2>$null
docker rm scalardb-postgres 2>$null

# Start fresh PostgreSQL container
Write-Host "Starting PostgreSQL container..." -ForegroundColor Green
docker run -d --name scalardb-postgres -e POSTGRES_DB=scalardb -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start PostgreSQL container" -ForegroundColor Red
    exit 1
}

# Wait for PostgreSQL to be ready
Write-Host "Waiting for PostgreSQL to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Test PostgreSQL connection
Write-Host "Testing PostgreSQL connection..." -ForegroundColor Yellow
$attempts = 0
$maxAttempts = 10

do {
    $pgReady = docker exec scalardb-postgres pg_isready -U postgres 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PostgreSQL is ready!" -ForegroundColor Green
        break
    }
    Start-Sleep -Seconds 2
    $attempts++
    Write-Host "Waiting for PostgreSQL... attempt $attempts/$maxAttempts" -ForegroundColor Yellow
} while ($attempts -lt $maxAttempts)

if ($attempts -eq $maxAttempts) {
    Write-Host "❌ PostgreSQL failed to start properly" -ForegroundColor Red
    exit 1
}

# Create sample tables
Write-Host "Creating sample tables..." -ForegroundColor Green

# Create SQL script as a here-string
$sqlScript = @"
CREATE TABLE IF NOT EXISTS sample_customer (
    customer_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    credit_limit INTEGER DEFAULT 10000,
    credit_total INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sample_order (
    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id INTEGER REFERENCES sample_customer(customer_id),
    timestamp BIGINT DEFAULT EXTRACT(epoch FROM NOW()) * 1000,
    status VARCHAR(50) DEFAULT 'pending',
    total_amount INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sample_item (
    item_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price INTEGER NOT NULL,
    inventory INTEGER DEFAULT 100,
    category VARCHAR(100),
    description TEXT
);

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
VALUES 
    ('Apple', 1000, 'Fruit', 'Fresh red apples'),
    ('Orange', 2000, 'Fruit', 'Juicy oranges'),
    ('Grape', 2500, 'Fruit', 'Sweet grapes'),
    ('Mango', 5000, 'Fruit', 'Tropical mango'),
    ('Melon', 3000, 'Fruit', 'Sweet melon')
ON CONFLICT (name) DO NOTHING;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
"@

# Execute SQL script
$sqlScript | docker exec -i scalardb-postgres psql -U postgres -d scalardb

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Sample tables created successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Some issues creating tables, but continuing..." -ForegroundColor Yellow
}

# Check if package.json exists, create if not
if (-not (Test-Path "package.json")) {
    Write-Host "Creating package.json..." -ForegroundColor Green
    
    $packageJson = @'
{
  "name": "scalardb-dashboard",
  "version": "1.0.0",
  "description": "ScalarDB Test Dashboard",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "cors": "^2.8.5"
  }
}
'@
    
    $packageJson | Out-File -FilePath "package.json" -Encoding UTF8
}

# Install npm dependencies
Write-Host "Installing Node.js dependencies..." -ForegroundColor Green
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install npm dependencies" -ForegroundColor Red
    exit 1
}

# Update server.js with better connection handling
if (Test-Path "server.js") {
    Write-Host "Updating server.js for better database connection..." -ForegroundColor Green
    
    # Create backup
    Copy-Item "server.js" "server.js.backup" -Force
    
    # Add connection retry logic to existing server.js
    $serverContent = Get-Content "server.js" -Raw
    
    # Check if retry logic already exists
    if ($serverContent -notmatch "retries") {
        # Add retry logic at the beginning of server.js
        $retryCode = @'
// Database connection with retry logic
async function connectWithRetry() {
    const maxRetries = 5;
    let retries = 0;
    
    while (retries < maxRetries) {
        try {
            const client = await pool.connect();
            await client.query('SELECT 1');
            client.release();
            console.log('✅ Database connected successfully');
            return true;
        } catch (err) {
            retries++;
            console.log(`❌ Database connection failed (attempt ${retries}/${maxRetries}): ${err.message}`);
            if (retries < maxRetries) {
                console.log('Retrying in 3 seconds...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
    }
    console.log('❌ Failed to connect to database after all retries');
    return false;
}

// Test connection on startup
connectWithRetry();

'@
        
        # Insert retry code after require statements
        $updatedContent = $serverContent -replace "(const app = express\(\);)", "$retryCode`n`$1"
        $updatedContent | Out-File -FilePath "server.js" -Encoding UTF8
    }
}

# Start the dashboard
Write-Host "Starting dashboard server..." -ForegroundColor Green

# Start server in background job
$job = Start-Job -ScriptBlock {
    param($WorkingDir)
    Set-Location $WorkingDir
    node server.js
} -ArgumentList (Get-Location).Path

# Wait a moment for server to start
Start-Sleep -Seconds 5

# Test if dashboard is running
if (Test-Port 3000) {
    Write-Host "✅ Dashboard started successfully on port 3000!" -ForegroundColor Green
} else {
    Write-Host "❌ Dashboard failed to start on port 3000" -ForegroundColor Red
    # Show job output for debugging
    $output = Receive-Job -Job $job
    if ($output) {
        Write-Host "Server output: $output" -ForegroundColor Yellow
    }
}

# Create medical server if it doesn't exist
if (-not (Test-Path "medical-server.js")) {
    Write-Host "Creating medical server..." -ForegroundColor Green
    
    $medicalServer = @'
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3001;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'scalardb',
    password: 'postgres',
    port: 5432,
});

app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ 
            status: 'healthy', 
            message: 'Medical app running successfully',
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
        const result = await pool.query(`
            SELECT 
                customer_id as patient_id,
                name as patient_name,
                'Active' as status
            FROM sample_customer 
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => {
    res.send('<h1>ScalarDB Medical App</h1><p>Medical application is running!</p>');
});

app.listen(port, () => {
    console.log(`🏥 Medical App running at http://localhost:${port}`);
});
'@
    
    $medicalServer | Out-File -FilePath "medical-server.js" -Encoding UTF8
}

# Start medical server
Write-Host "Starting medical server..." -ForegroundColor Green

$medicalJob = Start-Job -ScriptBlock {
    param($WorkingDir)
    Set-Location $WorkingDir
    node medical-server.js
} -ArgumentList (Get-Location).Path

Start-Sleep -Seconds 3

# Test connections
Write-Host "`nTesting all connections..." -ForegroundColor Cyan

# Test PostgreSQL
try {
    docker exec scalardb-postgres pg_isready -U postgres 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PostgreSQL: Connected" -ForegroundColor Green
    } else {
        Write-Host "❌ PostgreSQL: Not connected" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ PostgreSQL: Connection test failed" -ForegroundColor Red
}

# Test Dashboard
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Test Dashboard: Running on port 3000" -ForegroundColor Green
} catch {
    Write-Host "❌ Test Dashboard: Not running on port 3000" -ForegroundColor Red
}

# Test Medical App
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Medical App: Running on port 3001" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Medical App: Not running on port 3001" -ForegroundColor Yellow
}

# Create a simple restart batch file
$batchContent = @'
@echo off
echo Restarting ScalarDB Services...
docker start scalardb-postgres
timeout /t 5 /nobreak >nul
start "Dashboard" cmd /k "node server.js"
start "Medical" cmd /k "node medical-server.js"
echo Services started!
echo Dashboard: http://localhost:3000
echo Medical: http://localhost:3001
pause
'@

$batchContent | Out-File -FilePath "restart-services.bat" -Encoding ASCII

Write-Host "`n🎉 Setup Complete!" -ForegroundColor Green
Write-Host "=================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Dashboard: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🏥 Medical App: http://localhost:3001" -ForegroundColor Cyan
Write-Host "🐘 PostgreSQL: localhost:5432" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 To restart services later, double-click: restart-services.bat" -ForegroundColor Yellow
Write-Host "🔧 Or run this script again: .\fix-scalardb.ps1" -ForegroundColor Yellow