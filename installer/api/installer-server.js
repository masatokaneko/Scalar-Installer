const express = require('express');
const cors = require('cors');
const path = require('path');
const { JavaInstaller } = require('../core/java-installer');
const { ScalarDBInstaller } = require('../core/scalardb-installer');
const { ConfigGenerator } = require('../core/config-generator');
const { PrerequisitesInstaller } = require('../core/prerequisites-installer');

const app = express();
const port = 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../')));

// Initialize installers
const javaInstaller = new JavaInstaller();
const scalardbInstaller = new ScalarDBInstaller();
const configGenerator = new ConfigGenerator();
const prerequisitesInstaller = new PrerequisitesInstaller();

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        message: 'ScalarDB Installer API is running',
        timestamp: new Date().toISOString()
    });
});

// Prerequisites endpoints
app.get('/api/prerequisites/check', async (req, res) => {
    try {
        const results = await prerequisitesInstaller.checkAllPrerequisites();
        res.json({ success: true, results });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/prerequisites/install', async (req, res) => {
    try {
        const { tools } = req.body; // Array of tools to install
        
        if (!tools || !Array.isArray(tools)) {
            return res.status(400).json({
                success: false,
                error: 'Tools array is required'
            });
        }

        const results = await prerequisitesInstaller.installMissingPrerequisites(tools);
        res.json({ success: true, results });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Specific tool endpoints
app.get('/api/prerequisites/homebrew/check', async (req, res) => {
    try {
        const result = await prerequisitesInstaller.checkHomebrew();
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/prerequisites/homebrew/install', async (req, res) => {
    try {
        const result = await prerequisitesInstaller.installHomebrew();
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.get('/api/prerequisites/docker/check', async (req, res) => {
    try {
        const result = await prerequisitesInstaller.checkDocker();
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/prerequisites/docker/install', async (req, res) => {
    try {
        const result = await prerequisitesInstaller.installDocker();
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.get('/api/prerequisites/maven/check', async (req, res) => {
    try {
        const result = await prerequisitesInstaller.checkMaven();
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/prerequisites/maven/install', async (req, res) => {
    try {
        const result = await prerequisitesInstaller.installMaven();
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.get('/api/prerequisites/gradle/check', async (req, res) => {
    try {
        const result = await prerequisitesInstaller.checkGradle();
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/prerequisites/gradle/install', async (req, res) => {
    try {
        const result = await prerequisitesInstaller.installGradle();
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Java endpoints
app.get('/api/java/check', async (req, res) => {
    try {
        const result = await javaInstaller.checkJavaVersion();
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/java/install', async (req, res) => {
    try {
        const { version = 17 } = req.body;
        const result = await javaInstaller.installJava(version);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ScalarDB endpoints
app.get('/api/scalardb/check', async (req, res) => {
    try {
        const result = await scalardbInstaller.checkScalarDBInstallation();
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.get('/api/scalardb/versions', async (req, res) => {
    try {
        const { product = 'scalardb' } = req.query;
        const versions = await scalardbInstaller.getAvailableVersions(product);
        res.json({ success: true, versions });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/scalardb/install', async (req, res) => {
    try {
        const config = req.body;
        const result = await scalardbInstaller.installScalarDB(config);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/scalardb/verify', async (req, res) => {
    try {
        const { type, location } = req.body;
        const result = await scalardbInstaller.verifyInstallation(type, location);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Configuration endpoints
app.post('/api/config/validate', async (req, res) => {
    try {
        const config = req.body;
        const result = configGenerator.validateConfiguration(config);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/config/generate', async (req, res) => {
    try {
        const { config, type } = req.body;
        let content;
        
        switch (type) {
            case 'database-properties':
                content = configGenerator.generateDatabaseProperties(config);
                break;
            case 'schema':
                content = configGenerator.generateSchema(config);
                break;
            case 'docker-compose':
                content = configGenerator.generateDockerCompose(config);
                break;
            default:
                throw new Error(`Unknown configuration type: ${type}`);
        }
        
        res.json({ success: true, content });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/config/save', async (req, res) => {
    try {
        const { config, type, outputPath } = req.body;
        const result = await configGenerator.saveConfiguration(config, type, outputPath);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Database connection test endpoint
app.post('/api/database/test', async (req, res) => {
    try {
        const { database } = req.body;
        
        // Simulate database connection test
        // In real implementation, this would actually test the connection
        const success = Math.random() > 0.3; // 70% success rate for demo
        
        if (success) {
            res.json({ 
                success: true, 
                result: { 
                    connected: true, 
                    message: 'データベース接続に成功しました',
                    responseTime: Math.floor(Math.random() * 100) + 50
                }
            });
        } else {
            res.json({ 
                success: true, 
                result: { 
                    connected: false, 
                    message: '接続に失敗しました。設定を確認してください。'
                }
            });
        }
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Installation progress endpoint (WebSocket would be better for real-time updates)
app.post('/api/install/start', async (req, res) => {
    try {
        const installConfig = req.body;
        
        // Start installation process
        // This should be implemented as a background job
        const installationId = Date.now().toString();
        
        // Store installation progress (in real implementation, use a database or cache)
        global.installationProgress = global.installationProgress || {};
        global.installationProgress[installationId] = {
            status: 'starting',
            progress: 0,
            steps: [],
            startTime: new Date().toISOString()
        };
        
        // Simulate installation process
        setTimeout(() => simulateInstallation(installationId, installConfig), 100);
        
        res.json({ 
            success: true, 
            installationId,
            message: 'インストールを開始しました'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.get('/api/install/progress/:id', (req, res) => {
    try {
        const { id } = req.params;
        const progress = global.installationProgress?.[id];
        
        if (!progress) {
            return res.status(404).json({
                success: false,
                error: 'Installation not found'
            });
        }
        
        res.json({ success: true, progress });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Simulate installation process
async function simulateInstallation(installationId, config) {
    const progress = global.installationProgress[installationId];
    
    const steps = [
        { name: 'Java環境の確認', duration: 1000 },
        { name: 'ScalarDBのダウンロード', duration: 3000 },
        { name: 'データベース設定の生成', duration: 1500 },
        { name: 'インストールの実行', duration: 4000 },
        { name: 'データベース接続の確認', duration: 2000 },
        { name: 'インストール完了', duration: 500 }
    ];
    
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        
        progress.status = 'running';
        progress.currentStep = step.name;
        progress.progress = Math.floor((i / steps.length) * 100);
        progress.steps.push({
            name: step.name,
            status: 'running',
            startTime: new Date().toISOString()
        });
        
        await new Promise(resolve => setTimeout(resolve, step.duration));
        
        progress.steps[i].status = 'completed';
        progress.steps[i].endTime = new Date().toISOString();
    }
    
    progress.status = 'completed';
    progress.progress = 100;
    progress.endTime = new Date().toISOString();
    progress.result = {
        success: true,
        installPath: '/usr/local/scalardb',
        configFiles: ['database.properties', 'schema.json'],
        version: '3.16.0'
    };
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
    });
});

// Start server
app.listen(port, () => {
    console.log(`🚀 ScalarDB Installer API running at http://localhost:${port}`);
    console.log('Available endpoints:');
    console.log('  GET  /api/health                    - API health check');
    console.log('  GET  /api/prerequisites/check       - Check all prerequisites');
    console.log('  POST /api/prerequisites/install     - Install missing prerequisites');
    console.log('  GET  /api/prerequisites/homebrew/check - Check Homebrew');
    console.log('  POST /api/prerequisites/homebrew/install - Install Homebrew');
    console.log('  GET  /api/java/check                - Check Java installation');
    console.log('  POST /api/java/install              - Install Java');
    console.log('  POST /api/database/test             - Test database connection');
    console.log('  POST /api/install/start             - Start installation');
    console.log('');
    console.log('🌐 Web UI available at: http://localhost:3002/installer/ui/installer-wizard.html');
});

module.exports = app;