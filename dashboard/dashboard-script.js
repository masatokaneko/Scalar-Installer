// Database configuration - modify these if your setup is different
const DB_CONFIG = {
    host: 'localhost',
    port: 5432,
    database: 'scalardb',
    user: 'postgres'
    // password is handled server-side for security
};

let selectedTable = null;

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    testConnection();
    loadStats();
    loadTables();
    
    // Auto-refresh every 30 seconds
    setInterval(() => {
        if (document.getElementById('connectionStatus').classList.contains('status success')) {
            loadStats();
        }
    }, 30000);
});

// Database Connection Testing
async function testConnection() {
    const statusElement = document.getElementById('connectionStatus');
    statusElement.innerHTML = '<div class="spinner"></div><span>Testing database connection...</span>';
    statusElement.className = 'status loading';

    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        
        if (response.ok) {
            statusElement.innerHTML = '<span>✓</span><span>Database connection successful! ScalarDB is ready.</span>';
            statusElement.className = 'status success';
        } else {
            statusElement.innerHTML = '<span>✗</span><span>Connection failed: ' + data.message + '</span>';
            statusElement.className = 'status error';
        }
    } catch (error) {
        statusElement.innerHTML = '<span>✗</span><span>Connection failed: ' + error.message + '</span>';
        statusElement.className = 'status error';
    }
}

// Show/hide connection information
function showConnectionInfo() {
    const info = document.getElementById('connectionInfo');
    info.style.display = info.style.display === 'none' ? 'block' : 'none';
}

// Load database statistics
async function loadStats() {
    try {
        const [customersResponse, ordersResponse, tablesResponse] = await Promise.all([
            fetch('/api/stats/customers'),
            fetch('/api/stats/orders'),
            fetch('/api/tables')
        ]);
        
        const customersData = await customersResponse.json();
        const ordersData = await ordersResponse.json();
        const tablesData = await tablesResponse.json();
        
        document.getElementById('customerCount').textContent = customersData.count || '0';
        document.getElementById('orderCount').textContent = ordersData.count || '0';
        document.getElementById('tableCount').textContent = tablesData.length || '0';
    } catch (error) {
        console.error('Failed to load stats:', error);
        document.getElementById('customerCount').textContent = 'Error';
        document.getElementById('orderCount').textContent = 'Error';
        document.getElementById('tableCount').textContent = 'Error';
    }
}

// Load database tables
async function loadTables() {
    const content = document.getElementById('tablesContent');
    content.innerHTML = '<div class="spinner"></div> Loading tables...';
    
    try {
        const response = await fetch('/api/tables');
        const tables = await response.json();
        
        if (tables.length > 0) {
            let tableList = '<div class="table-list">';
            tables.forEach(table => {
                tableList += `
                    <div class="table-item ${selectedTable === table.table_name ? 'selected' : ''}" 
                         onclick="selectTable('${table.table_name}')">
                        <strong>${table.table_name}</strong>
                    </div>
                `;
            });
            tableList += '</div>';
            content.innerHTML = tableList;
        } else {
            content.innerHTML = '<p>No tables found. Make sure ScalarDB schema is loaded.</p>';
        }
    } catch (error) {
        content.innerHTML = '<p style="color: #e53e3e;">Error loading tables: ' + error.message + '</p>';
    }
}

// Select a table
function selectTable(tableName) {
    selectedTable = tableName;
    loadTables(); // Refresh to show selection
}

// Describe selected table
async function describeTable() {
    if (!selectedTable) {
        alert('Please select a table first.');
        return;
    }
    
    const content = document.getElementById('tablesContent');
    content.innerHTML = '<div class="spinner"></div> Loading table structure...';
    
    try {
        const response = await fetch(`/api/describe/${selectedTable}`);
        const columns = await response.json();
        
        if (columns.length > 0) {
            let table = '<table><thead><tr><th>Column</th><th>Type</th><th>Nullable</th><th>Default</th></tr></thead><tbody>';
            columns.forEach(col => {
                table += `<tr>
                    <td><strong>${col.column_name}</strong></td>
                    <td>${col.data_type}</td>
                    <td>${col.is_nullable}</td>
                    <td>${col.column_default || 'NULL'}</td>
                </tr>`;
            });
            table += '</tbody></table>';
            table += `<br><button class="btn btn-outline" onclick="loadTables()">Back to Tables</button>`;
            content.innerHTML = table;
        } else {
            content.innerHTML = '<p>No columns found for this table.</p>';
        }
    } catch (error) {
        content.innerHTML = '<p style="color: #e53e3e;">Error describing table: ' + error.message + '</p>';
    }
}

// Load customers data
async function loadCustomers() {
    const content = document.getElementById('customersContent');
    const limit = document.getElementById('customerLimit').value;
    
    content.innerHTML = '<div class="spinner"></div> Loading customers...';
    
    try {
        const response = await fetch(`/api/customers?limit=${limit}`);
        const customers = await response.json();
        
        if (customers.length > 0) {
            let table = '<table><thead><tr>';
            Object.keys(customers[0]).forEach(key => {
                table += '<th>' + key + '</th>';
            });
            table += '</tr></thead><tbody>';
            
            customers.forEach(customer => {
                table += '<tr>';
                Object.values(customer).forEach(value => {
                    table += '<td>' + (value !== null ? value : 'NULL') + '</td>';
                });
                table += '</tr>';
            });
            table += '</tbody></table>';
            content.innerHTML = table;
        } else {
            content.innerHTML = '<p>No customers found. Run the ScalarDB sample application first to create sample data.</p>';
        }
    } catch (error) {
        content.innerHTML = '<p style="color: #e53e3e;">Error loading customers: ' + error.message + '</p>';
    }
}

// Load orders data
async function loadOrders() {
    const content = document.getElementById('ordersContent');
    const limit = document.getElementById('orderLimit').value;
    
    content.innerHTML = '<div class="spinner"></div> Loading orders...';
    
    try {
        const response = await fetch(`/api/orders?limit=${limit}`);
        const orders = await response.json();
        
        if (orders.length > 0) {
            let table = '<table><thead><tr>';
            Object.keys(orders[0]).forEach(key => {
                table += '<th>' + key + '</th>';
            });
            table += '</tr></thead><tbody>';
            
            orders.forEach(order => {
                table += '<tr>';
                Object.values(order).forEach(value => {
                    table += '<td>' + (value !== null ? value : 'NULL') + '</td>';
                });
                table += '</tr>';
            });
            table += '</tbody></table>';
            content.innerHTML = table;
        } else {
            content.innerHTML = '<p>No orders found. Run the ScalarDB sample application first to create sample data.</p>';
        }
    } catch (error) {
        content.innerHTML = '<p style="color: #e53e3e;">Error loading orders: ' + error.message + '</p>';
    }
}

// Export customers to CSV
async function exportCustomers() {
    try {
        const response = await fetch('/api/customers?limit=1000');
        const customers = await response.json();
        
        if (customers.length > 0) {
            const csv = convertToCSV(customers);
            downloadCSV(csv, 'scalardb_customers.csv');
        } else {
            alert('No customer data to export.');
        }
    } catch (error) {
        alert('Error exporting customers: ' + error.message);
    }
}

// Export orders to CSV
async function exportOrders() {
    try {
        const response = await fetch('/api/orders?limit=1000');
        const orders = await response.json();
        
        if (orders.length > 0) {
            const csv = convertToCSV(orders);
            downloadCSV(csv, 'scalardb_orders.csv');
        } else {
            alert('No order data to export.');
        }
    } catch (error) {
        alert('Error exporting orders: ' + error.message);
    }
}

// Convert JSON to CSV
function convertToCSV(data) {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => {
        return headers.map(header => {
            const value = row[header];
            return value !== null ? `"${String(value).replace(/"/g, '""')}"` : '""';
        }).join(',');
    });
    
    return [csvHeaders, ...csvRows].join('\n');
}

// Download CSV file
function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Execute custom SQL query
async function executeQuery() {
    const query = document.getElementById('sqlQuery').value.trim();
    if (!query) {
        alert('Please enter a SQL query.');
        return;
    }
    
    const resultsDiv = document.getElementById('queryResults');
    resultsDiv.innerHTML = '<div class="spinner"></div> Executing query...';
    
    try {
        const response = await fetch('/api/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: query })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            if (result.rows && result.rows.length > 0) {
                let table = '<table><thead><tr>';
                Object.keys(result.rows[0]).forEach(key => {
                    table += '<th>' + key + '</th>';
                });
                table += '</tr></thead><tbody>';
                
                result.rows.forEach(row => {
                    table += '<tr>';
                    Object.values(row).forEach(value => {
                        table += '<td>' + (value !== null ? value : 'NULL') + '</td>';
                    });
                    table += '</tr>';
                });
                table += '</tbody></table>';
                
                resultsDiv.innerHTML = `
                    <div style="margin-bottom: 1rem; color: #22543d; font-weight: 500;">
                        Query executed successfully. ${result.rows.length} row(s) returned.
                    </div>
                    ${table}
                `;
            } else {
                resultsDiv.innerHTML = '<div style="color: #22543d; font-weight: 500;">Query executed successfully. No rows returned.</div>';
            }
        } else {
            resultsDiv.innerHTML = '<div style="color: #e53e3e; font-weight: 500;">Query error: ' + result.error + '</div>';
        }
    } catch (error) {
        resultsDiv.innerHTML = '<div style="color: #e53e3e; font-weight: 500;">Error executing query: ' + error.message + '</div>';
    }
}

// Clear SQL query
function clearQuery() {
    document.getElementById('sqlQuery').value = '';
    document.getElementById('queryResults').innerHTML = '';
}

// Load sample queries
function loadSampleQueries() {
    const sampleQueries = document.getElementById('sampleQueries');
    sampleQueries.style.display = sampleQueries.style.display === 'none' ? 'block' : 'none';
}

// Load a specific query into the text area
function loadQuery(query) {
    document.getElementById('sqlQuery').value = query;
    document.getElementById('sampleQueries').style.display = 'none';
    
    // Scroll to query section
    document.getElementById('sqlQuery').scrollIntoView({ behavior: 'smooth' });
}

// Show about modal
function showAbout() {
    document.getElementById('aboutModal').style.display = 'flex';
}

// Close about modal
function closeAbout() {
    document.getElementById('aboutModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('aboutModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Add CSS for table list items
const additionalCSS = `
.table-list {
    display: grid;
    gap: 8px;
}

.table-item {
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: white;
}

.table-item:hover {
    border-color: #3182ce;
    background: #ebf8ff;
}

.table-item.selected {
    border-color: #3182ce;
    background: #ebf8ff;
    box-shadow: 0 0 0 2px rgba(49, 130, 206, 0.1);
}
`;

// Inject additional CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalCSS;
document.head.appendChild(styleSheet);