const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { JavaInstaller } = require('../core/java-installer');
const { ScalarDBInstaller } = require('../core/scalardb-installer');
const { ConfigGenerator } = require('../core/config-generator');
const { PrerequisitesInstaller } = require('../core/prerequisites-installer');
const { SchemaManager } = require('../core/schema-manager');
const { WebSocketServer } = require('../core/websocket-server');
const { DockerDeployer } = require('../core/docker-deployer');
const { ScalarDBDownloader } = require('../core/scalardb-downloader');

const app = express();
const port = 3002;

// HTTPサーバーを作成
const httpServer = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../')));

// Initialize installers
const javaInstaller = new JavaInstaller();
const scalardbInstaller = new ScalarDBInstaller();
const configGenerator = new ConfigGenerator();
const prerequisitesInstaller = new PrerequisitesInstaller();
const schemaManager = new SchemaManager();
const dockerDeployer = new DockerDeployer();
const scalardbDownloader = new ScalarDBDownloader();

// WebSocketサーバーを初期化
const wsServer = new WebSocketServer(httpServer);

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

// 新しいエンドポイント: 実際のバージョン一覧取得
app.get('/api/scalardb/versions', async (req, res) => {
    try {
        const versions = await scalardbDownloader.getAvailableVersions();
        const latest = await scalardbDownloader.getLatestVersion();
        res.json({ 
            success: true, 
            versions,
            latest 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 新しいエンドポイント: ダウンロード済みバージョン確認
app.get('/api/scalardb/downloaded', async (req, res) => {
    try {
        const versions = await scalardbDownloader.getDownloadedVersions();
        res.json({ success: true, versions });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 新しいエンドポイント: ScalarDBダウンロード
app.post('/api/scalardb/download', async (req, res) => {
    try {
        const { version } = req.body;
        
        if (!version) {
            return res.status(400).json({
                success: false,
                error: 'バージョンが指定されていません'
            });
        }
        
        // 既にダウンロード済みか確認
        const isDownloaded = await scalardbDownloader.isVersionDownloaded(version);
        if (isDownloaded) {
            return res.json({
                success: true,
                message: '既にダウンロード済みです',
                version,
                downloaded: true
            });
        }
        
        // WebSocketで進捗を送信するコールバック
        const progressCallback = (progress) => {
            wsServer.sendLog('scalardb-download', {
                level: 'info',
                message: `ダウンロード進捗: ${Math.round(progress)}%`
            });
        };
        
        const result = await scalardbDownloader.downloadVersion(version, progressCallback);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 既存のinstallエンドポイント（モック）は残す
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

// Save all generated configurations
app.post('/api/config/save-all', async (req, res) => {
    try {
        const { installConfig, outputDir } = req.body;
        const results = [];
        
        // Save database.properties
        if (installConfig.generatedConfigs?.databaseProperties) {
            const dbResult = await configGenerator.saveConfiguration(
                installConfig,
                'database-properties',
                path.join(outputDir || '/tmp/scalardb-config', 'database.properties')
            );
            results.push(dbResult);
        }
        
        // Save docker-compose.yml if needed
        if (installConfig.deployment === 'docker' && installConfig.generatedConfigs?.dockerCompose) {
            const dockerResult = await configGenerator.saveConfiguration(
                installConfig,
                'docker-compose',
                path.join(outputDir || '/tmp/scalardb-config', 'docker-compose.yml')
            );
            results.push(dockerResult);
        }
        
        res.json({ success: true, results });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Database schema endpoints
app.post('/api/database/schema/create', async (req, res) => {
    try {
        const { database, schemaPath } = req.body;
        
        // スキーマパスが指定されていない場合はデフォルトスキーマを生成
        let actualSchemaPath = schemaPath;
        if (!schemaPath) {
            const defaultSchema = schemaManager.generateDefaultSchema(database.type);
            const tempPath = path.join('/tmp', 'default-schema.json');
            await require('fs').promises.writeFile(tempPath, JSON.stringify(defaultSchema, null, 2));
            actualSchemaPath = tempPath;
        }
        
        const result = await schemaManager.createSchema(database, actualSchemaPath);
        
        res.json({ 
            success: result.success, 
            result 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/database/schema/generate-default', async (req, res) => {
    try {
        const { databaseType } = req.body;
        const schema = schemaManager.generateDefaultSchema(databaseType);
        
        res.json({ 
            success: true, 
            schema 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Database connection test endpoint with actual implementation
app.post('/api/database/test', async (req, res) => {
    try {
        const { database } = req.body;
        
        // Create a database tester module
        const { DatabaseTester } = require('../core/database-tester');
        const tester = new DatabaseTester();
        
        const result = await tester.testConnection(database);
        
        res.json({ 
            success: true, 
            result 
        });
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
        
        // Execute real installation process
        setTimeout(() => executeRealInstallation(installationId, installConfig), 100);
        
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

// Docker関連エンドポイント
app.post('/api/docker/deploy', async (req, res) => {
    try {
        const { config, useCompose = true } = req.body;
        
        // Dockerが利用可能か確認
        const dockerCheck = await dockerDeployer.checkDockerInstalled();
        if (!dockerCheck.installed) {
            return res.status(400).json({
                success: false,
                error: 'Dockerがインストールされていません'
            });
        }
        
        if (!dockerCheck.running) {
            return res.status(400).json({
                success: false,
                error: 'Dockerデーモンが実行されていません'
            });
        }
        
        let result;
        
        if (useCompose && config.deployment === 'docker') {
            // Docker Compose設定を生成
            const compose = await dockerDeployer.generateDockerCompose(config);
            const outputPath = config.projectPath || '/tmp/scalardb-docker';
            
            // Docker Composeファイルを保存
            await configGenerator.saveConfiguration(
                compose,
                'docker-compose',
                path.join(outputPath, 'docker-compose.yml')
            );
            
            // Docker Composeでデプロイ
            result = await dockerDeployer.deployWithDockerCompose(outputPath);
        } else {
            // 単一コンテナとしてデプロイ
            result = await dockerDeployer.deployScalarDBContainer(config);
        }
        
        res.json({ success: result.success, result });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.get('/api/docker/status/:containerName', async (req, res) => {
    try {
        const { containerName } = req.params;
        const health = await dockerDeployer.checkContainerHealth(containerName);
        
        res.json({ success: true, health });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.get('/api/docker/logs/:containerName', async (req, res) => {
    try {
        const { containerName } = req.params;
        const { lines = 100 } = req.query;
        
        const result = await dockerDeployer.getContainerLogs(containerName, parseInt(lines));
        
        if (result.success) {
            res.json({ success: true, logs: result.logs });
        } else {
            res.status(500).json({ 
                success: false, 
                error: result.error 
            });
        }
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/docker/stop-all', async (req, res) => {
    try {
        const result = await dockerDeployer.stopAllContainers();
        
        res.json({ success: result.success, result });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Real installation process with WebSocket notifications
async function executeRealInstallation(installationId, config) {
    const progress = global.installationProgress[installationId];
    
    try {
        // WebSocketでインストール開始を通知
        wsServer.startInstallation(installationId, config);
        
        // Step 1: Java環境の確認
        wsServer.updateProgress(installationId, {
            step: 'Java環境の確認',
            progress: 10,
            status: 'running'
        });
        
        const javaCheck = await javaInstaller.checkJavaVersion();
        if (!javaCheck.installed) {
            throw new Error('Javaがインストールされていません');
        }
        
        wsServer.updateProgress(installationId, {
            step: 'Java環境の確認',
            progress: 15,
            status: 'completed',
            message: `${javaCheck.vendor} ${javaCheck.version} を検出`
        });
        
        // Step 2: ScalarDBのインストール
        wsServer.updateProgress(installationId, {
            step: 'ScalarDBのダウンロード',
            progress: 25,
            status: 'running'
        });
        
        const installResult = await scalardbInstaller.installScalarDB(config);
        
        wsServer.updateProgress(installationId, {
            step: 'ScalarDBのダウンロード',
            progress: 40,
            status: 'completed',
            message: 'ScalarDBのダウンロードが完了しました'
        });
        
        // Step 3: 設定ファイルの生成
        wsServer.updateProgress(installationId, {
            step: 'データベース設定の生成',
            progress: 50,
            status: 'running'
        });
        
        const dbConfig = configGenerator.generateDatabaseProperties(config);
        
        wsServer.updateProgress(installationId, {
            step: 'データベース設定の生成',
            progress: 60,
            status: 'completed',
            message: '設定ファイルを生成しました'
        });
        
        // Step 4: データベース接続確認
        wsServer.updateProgress(installationId, {
            step: 'データベース接続の確認',
            progress: 70,
            status: 'running'
        });
        
        const { DatabaseTester } = require('../core/database-tester');
        const tester = new DatabaseTester();
        const connectionResult = await tester.testConnection(config.database);
        
        if (!connectionResult.connected) {
            throw new Error(`データベース接続に失敗: ${connectionResult.message}`);
        }
        
        wsServer.updateProgress(installationId, {
            step: 'データベース接続の確認',
            progress: 85,
            status: 'completed',
            message: 'データベース接続を確認しました'
        });
        
        // Step 5: スキーマ作成（オプション）
        if (config.createSchema !== false) {
            wsServer.updateProgress(installationId, {
                step: 'スキーマの作成',
                progress: 90,
                status: 'running'
            });
            
            try {
                const schemaResult = await schemaManager.createSchema(
                    config.database,
                    config.schemaPath || null
                );
                
                wsServer.updateProgress(installationId, {
                    step: 'スキーマの作成',
                    progress: 95,
                    status: 'completed',
                    message: 'スキーマを作成しました'
                });
            } catch (error) {
                wsServer.sendLog(installationId, {
                    level: 'warning',
                    message: `スキーマ作成をスキップ: ${error.message}`
                });
            }
        }
        
        // Step 6: Dockerデプロイメント（オプション）
        if (config.deployment === 'docker') {
            wsServer.updateProgress(installationId, {
                step: 'Dockerコンテナの起動',
                progress: 98,
                status: 'running'
            });
            
            try {
                const dockerResult = await dockerDeployer.deployScalarDBContainer(config);
                
                if (dockerResult.success) {
                    wsServer.updateProgress(installationId, {
                        step: 'Dockerコンテナの起動',
                        progress: 99,
                        status: 'completed',
                        message: 'ScalarDBコンテナが起動しました'
                    });
                } else {
                    wsServer.sendLog(installationId, {
                        level: 'warning',
                        message: `Docker起動をスキップ: ${dockerResult.message}`
                    });
                }
            } catch (error) {
                wsServer.sendLog(installationId, {
                    level: 'warning',
                    message: `Docker起動エラー: ${error.message}`
                });
            }
        }
        
        // インストール完了
        const result = {
            success: true,
            installPath: config.installPath || '/usr/local/scalardb',
            configFiles: ['database.properties'],
            version: installResult.version || '3.16.0',
            deployment: config.deployment
        };
        
        progress.status = 'completed';
        progress.progress = 100;
        progress.endTime = new Date().toISOString();
        progress.result = result;
        
        wsServer.completeInstallation(installationId, result);
        
    } catch (error) {
        progress.status = 'error';
        progress.error = error.message;
        
        wsServer.sendError(installationId, {
            step: progress.currentStep || 'インストール',
            message: error.message,
            details: error.stack
        });
    }
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
    });
});

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test' && require.main === module) {
    httpServer.listen(port, () => {
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
        console.log('🔌 WebSocket server is running on the same port');
    });
}

module.exports = app;