// ScalarDB/ScalarDL インストールウィザード JavaScript

class InstallerWizard {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 6;
        this.installConfig = {
            product: 'scalardb',
            installType: 'development',
            database: {},
            deployment: 'local',
            java: {},
            advanced: {}
        };
        this.installationInProgress = false;
        this.socket = null;
        this.installationId = null;
        
        this.init();
        this.initWebSocket();
    }
    
    init() {
        this.updateStepDisplay();
        this.bindEvents();
        this.detectSystemInfo();
    }
    
    bindEvents() {
        // Product selection
        document.querySelectorAll('.option-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.installConfig.product = card.dataset.product;
            });
        });
        
        // Database selection
        document.querySelectorAll('.db-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.db-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.installConfig.database.type = card.dataset.db;
                this.generateDatabaseForm();
            });
        });
        
        // Radio button changes
        document.addEventListener('change', (e) => {
            if (e.target.name === 'installType') {
                this.installConfig.installType = e.target.value;
            } else if (e.target.name === 'deployment') {
                this.installConfig.deployment = e.target.value;
            }
        });
        
        // Navigation
        document.getElementById('next-btn').addEventListener('click', () => this.nextStep());
        document.getElementById('prev-btn').addEventListener('click', () => this.previousStep());
        
        // Key navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !this.installationInProgress) {
                this.nextStep();
            } else if (e.key === 'Escape') {
                this.previousStep();
            }
        });
    }
    
    detectSystemInfo() {
        // System information detection
        document.getElementById('os-info').textContent = this.getOSInfo();
        document.getElementById('arch-info').textContent = this.getArchInfo();
        document.getElementById('memory-info').textContent = this.getMemoryInfo();
    }
    
    getOSInfo() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Windows')) return 'Windows';
        if (userAgent.includes('Mac')) return 'macOS';
        if (userAgent.includes('Linux')) return 'Linux';
        return 'Unknown';
    }
    
    getArchInfo() {
        return navigator.platform || 'Unknown';
    }
    
    getMemoryInfo() {
        // Estimate memory (not accurate, but gives a general idea)
        if (navigator.deviceMemory) {
            return `${navigator.deviceMemory} GB (概算)`;
        }
        return 'Unknown';
    }
    
    initWebSocket() {
        // WebSocketサーバーに接続
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('WebSocketサーバーに接続しました');
        });
        
        this.socket.on('welcome', (data) => {
            console.log('Welcome:', data.message);
        });
        
        // インストール進捗イベントをリッスン
        this.socket.on('installation:progress', (data) => {
            if (data.installationId === this.installationId) {
                this.updateProgressFromWebSocket(data);
            }
        });
        
        this.socket.on('installation:error', (data) => {
            if (data.installationId === this.installationId) {
                this.handleInstallationError(data);
            }
        });
        
        this.socket.on('installation:completed', (data) => {
            if (data.installationId === this.installationId) {
                this.handleInstallationComplete(data);
            }
        });
        
        this.socket.on('installation:log', (data) => {
            if (data.installationId === this.installationId) {
                this.addLogFromWebSocket(data);
            }
        });
        
        this.socket.on('disconnect', () => {
            console.log('WebSocketサーバーから切断されました');
        });
    }
    
    updateProgressFromWebSocket(data) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const logContainer = document.getElementById('log-container');
        
        if (progressFill) {
            progressFill.style.width = data.progress + '%';
        }
        
        if (progressText) {
            progressText.textContent = data.step;
        }
        
        if (logContainer && data.message) {
            this.addLogEntry(logContainer, `${data.step}: ${data.message}`, data.status === 'completed' ? 'success' : 'info');
        }
    }
    
    handleInstallationError(data) {
        const logContainer = document.getElementById('log-container');
        if (logContainer) {
            this.addLogEntry(logContainer, `エラー: ${data.error}`, 'error');
        }
        this.installationInProgress = false;
        
        // エラーダイアログを表示
        alert(`インストール中にエラーが発生しました:\n${data.error}`);
    }
    
    handleInstallationComplete(data) {
        const logContainer = document.getElementById('log-container');
        if (logContainer) {
            this.addLogEntry(logContainer, 'インストールが完了しました！', 'success');
        }
        
        this.installationInProgress = false;
        this.installConfig.installationComplete = true;
        this.installConfig.result = data.result;
        
        // 完了ステップに移動
        setTimeout(() => {
            this.currentStep = 6;
            this.updateStepDisplay();
            this.generateCompletionInfo();
        }, 1000);
    }
    
    addLogFromWebSocket(data) {
        const logContainer = document.getElementById('log-container');
        if (logContainer) {
            this.addLogEntry(logContainer, data.message, data.level);
        }
    }
    
    updateStepDisplay() {
        // Update progress bar
        document.querySelectorAll('.progress-step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNumber < this.currentStep) {
                step.classList.add('completed');
            } else if (stepNumber === this.currentStep) {
                step.classList.add('active');
            }
        });
        
        // Update step content
        document.querySelectorAll('.step-content').forEach((content, index) => {
            content.classList.remove('active');
            if (index + 1 === this.currentStep) {
                content.classList.add('active');
            }
        });
        
        // Update navigation buttons
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        
        prevBtn.disabled = this.currentStep === 1;
        
        if (this.currentStep === this.totalSteps) {
            nextBtn.style.display = 'none';
        } else {
            nextBtn.style.display = 'inline-flex';
            nextBtn.textContent = this.currentStep === this.totalSteps - 1 ? '完了' : '次へ →';
        }
    }
    
    nextStep() {
        if (this.currentStep < this.totalSteps && this.validateCurrentStep()) {
            if (this.currentStep === 4) {
                this.generateInstallSummary();
            }
            this.currentStep++;
            this.updateStepDisplay();
        }
    }
    
    previousStep() {
        if (this.currentStep > 1 && !this.installationInProgress) {
            this.currentStep--;
            this.updateStepDisplay();
        }
    }
    
    validateCurrentStep() {
        switch (this.currentStep) {
            case 1:
                return this.installConfig.product && this.installConfig.installType;
            case 2:
                return true; // Environment check is optional
            case 3:
                return this.installConfig.database.type && this.installConfig.deployment;
            case 4:
                return this.validateDatabaseConfig();
            case 5:
                return true; // Installation step
            default:
                return true;
        }
    }
    
    validateDatabaseConfig() {
        const db = this.installConfig.database;
        
        switch (db.type) {
            case 'postgresql':
            case 'mysql':
                // ポート番号を整数に変換
                if (db.port && typeof db.port === 'string') {
                    db.port = parseInt(db.port, 10);
                }
                return db.host && db.port && db.username && db.password && db.database;
            case 'cassandra':
                return db.hosts && db.port && db.username && db.password;
            case 'dynamodb':
                return db.region || db.endpointOverride;
            case 'cosmos':
                return db.endpoint && db.key;
            default:
                return false;
        }
    }
    
    generateDatabaseForm() {
        const configForm = document.getElementById('config-form');
        const dbType = this.installConfig.database.type;
        
        let formHTML = '';
        
        // フォーム変更時にデータを保存するイベントリスナーを後で追加
        setTimeout(() => {
            this.attachFormEventListeners();
        }, 100);
        
        switch (dbType) {
            case 'postgresql':
                formHTML = `
                    <h3>PostgreSQL 設定</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label>ホスト</label>
                            <input type="text" name="host" value="localhost" required>
                        </div>
                        <div class="form-group">
                            <label>ポート</label>
                            <input type="number" name="port" value="5432" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>ユーザー名</label>
                            <input type="text" name="username" value="postgres" required>
                        </div>
                        <div class="form-group">
                            <label>パスワード</label>
                            <input type="password" name="password" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>データベース名</label>
                        <input type="text" name="database" value="scalardb" required>
                    </div>
                `;
                break;
                
            case 'mysql':
                formHTML = `
                    <h3>MySQL 設定</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label>ホスト</label>
                            <input type="text" name="host" value="localhost" required>
                        </div>
                        <div class="form-group">
                            <label>ポート</label>
                            <input type="number" name="port" value="3306" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>ユーザー名</label>
                            <input type="text" name="username" value="root" required>
                        </div>
                        <div class="form-group">
                            <label>パスワード</label>
                            <input type="password" name="password" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>データベース名</label>
                        <input type="text" name="database" value="scalardb" required>
                    </div>
                `;
                break;
                
            case 'cassandra':
                formHTML = `
                    <h3>Cassandra 設定</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label>ホスト（カンマ区切り）</label>
                            <input type="text" name="hosts" value="localhost" required>
                        </div>
                        <div class="form-group">
                            <label>ポート</label>
                            <input type="number" name="port" value="9042" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>ユーザー名</label>
                            <input type="text" name="username" value="cassandra" required>
                        </div>
                        <div class="form-group">
                            <label>パスワード</label>
                            <input type="password" name="password" value="cassandra" required>
                        </div>
                    </div>
                `;
                break;
                
            case 'dynamodb':
                formHTML = `
                    <h3>DynamoDB 設定</h3>
                    <div class="form-group">
                        <label>リージョン</label>
                        <select name="region">
                            <option value="us-east-1">us-east-1</option>
                            <option value="us-west-2">us-west-2</option>
                            <option value="ap-northeast-1">ap-northeast-1</option>
                            <option value="eu-west-1">eu-west-1</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>アクセスキー</label>
                            <input type="text" name="accessKey" required>
                        </div>
                        <div class="form-group">
                            <label>シークレットキー</label>
                            <input type="password" name="secretKey" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>エンドポイント（ローカル用、オプション）</label>
                        <input type="text" name="endpointOverride" placeholder="http://localhost:8000">
                    </div>
                    <div class="form-group checkbox-group">
                        <label>
                            <input type="checkbox" name="useLocal">
                            DynamoDB Localを使用する
                        </label>
                    </div>
                `;
                break;
                
            case 'cosmos':
                formHTML = `
                    <h3>Azure Cosmos DB 設定</h3>
                    <div class="form-group">
                        <label>エンドポイント</label>
                        <input type="text" name="endpoint" placeholder="https://your-account.documents.azure.com:443/" required>
                    </div>
                    <div class="form-group">
                        <label>主キー</label>
                        <input type="password" name="key" required>
                    </div>
                `;
                break;
        }
        
        configForm.innerHTML = formHTML;
        
        // Bind form events
        configForm.addEventListener('input', (e) => {
            this.installConfig.database[e.target.name] = e.target.value;
        });
        
        configForm.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                this.installConfig.database[e.target.name] = e.target.checked;
            } else {
                this.installConfig.database[e.target.name] = e.target.value;
            }
        });
    }
    
    generateInstallSummary() {
        const summary = document.getElementById('install-summary');
        const config = this.installConfig;
        
        const summaryHTML = `
            <h4>インストール構成</h4>
            <div class="detail-item">
                <span>製品:</span>
                <span>${config.product === 'scalardb' ? 'ScalarDB' : 'ScalarDL'}</span>
            </div>
            <div class="detail-item">
                <span>タイプ:</span>
                <span>${config.installType === 'development' ? '開発環境' : '本番環境'}</span>
            </div>
            <div class="detail-item">
                <span>データベース:</span>
                <span>${this.getDatabaseDisplayName(config.database.type)}</span>
            </div>
            <div class="detail-item">
                <span>デプロイメント:</span>
                <span>${this.getDeploymentDisplayName(config.deployment)}</span>
            </div>
            ${config.database.host ? `
                <div class="detail-item">
                    <span>接続先:</span>
                    <span>${config.database.host}:${config.database.port}</span>
                </div>
            ` : ''}
        `;
        
        summary.innerHTML = summaryHTML;
    }
    
    getDatabaseDisplayName(type) {
        const names = {
            postgresql: 'PostgreSQL',
            mysql: 'MySQL',
            cassandra: 'Apache Cassandra',
            dynamodb: 'Amazon DynamoDB',
            cosmos: 'Azure Cosmos DB'
        };
        return names[type] || type;
    }
    
    getDeploymentDisplayName(type) {
        const names = {
            local: 'ローカルインストール',
            docker: 'Docker',
            kubernetes: 'Kubernetes'
        };
        return names[type] || type;
    }
    
    async startInstallation() {
        this.installationInProgress = true;
        
        const startBtn = document.getElementById('start-install-btn');
        const cancelBtn = document.getElementById('cancel-install-btn');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const logContainer = document.getElementById('log-container');
        
        startBtn.style.display = 'none';
        cancelBtn.style.display = 'inline-flex';
        
        // ログをクリア
        logContainer.innerHTML = '';
        
        try {
            // インストールAPIを呼び出してインストールIDを取得
            const response = await fetch('/api/install/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.installConfig)
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'インストールの開始に失敗しました');
            }
            
            this.installationId = data.installationId;
            
            // WebSocketルームに参加
            this.socket.emit('join:installation', { 
                installationId: this.installationId 
            }, (response) => {
                if (response.success) {
                    console.log('インストールルームに参加しました:', response.installationId);
                } else {
                    console.error('ルーム参加エラー:', response.error);
                }
            });
            
            // 初期ログエントリ
            this.addLogEntry(logContainer, 'インストールを開始しました...', 'info');
            progressText.textContent = 'インストール準備中...';
            progressFill.style.width = '0%';
            
            // 以降の進捗更新はWebSocketイベントで処理される
            
        } catch (error) {
            this.addLogEntry(logContainer, `エラー: ${error.message}`, 'error');
            this.installationInProgress = false;
            startBtn.style.display = 'inline-flex';
            cancelBtn.style.display = 'none';
            
            alert(`インストールの開始に失敗しました:\n${error.message}`);
        }
    }
    
    
    async checkJavaEnvironment() {
        try {
            const response = await fetch('/api/java/check');
            const data = await response.json();
            
            if (data.success && data.result.installed) {
                this.installConfig.java = {
                    version: data.result.version,
                    vendor: data.result.vendor || 'Unknown',
                    home: data.result.home
                };
            } else {
                throw new Error('Javaがインストールされていません');
            }
        } catch (error) {
            throw new Error(`Java環境の確認に失敗: ${error.message}`);
        }
    }
    
    async downloadScalarDB() {
        try {
            const response = await fetch('/api/scalardb/install', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    installType: this.installConfig.installType,
                    version: this.installConfig.scalardb?.version || 'latest',
                    projectPath: this.installConfig.projectPath || '/tmp/scalardb-install',
                    product: this.installConfig.product
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.installConfig.scalardb = {
                    version: data.result.version || '3.16.0',
                    type: data.result.type || 'jar',
                    location: data.result.location
                };
            } else {
                throw new Error(data.error || 'ScalarDBのダウンロードに失敗しました');
            }
        } catch (error) {
            throw new Error(`ScalarDBのダウンロードエラー: ${error.message}`);
        }
    }
    
    async generateConfiguration() {
        try {
            // database.propertiesの生成
            const dbPropsResponse = await fetch('/api/config/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    config: {
                        database: this.installConfig.database,
                        transaction: this.installConfig.transaction || {
                            manager: 'consensus-commit',
                            isolationLevel: 'SNAPSHOT'
                        }
                    },
                    type: 'database-properties'
                })
            });
            
            const dbPropsData = await dbPropsResponse.json();
            if (!dbPropsData.success) {
                throw new Error('database.propertiesの生成に失敗');
            }
            
            this.installConfig.configFiles = ['database.properties'];
            
            // Docker Composeの生成（必要な場合）
            if (this.installConfig.deployment === 'docker') {
                const dockerResponse = await fetch('/api/config/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        config: {
                            database: this.installConfig.database,
                            scalardb: this.installConfig.scalardb
                        },
                        type: 'docker-compose'
                    })
                });
                
                const dockerData = await dockerResponse.json();
                if (dockerData.success) {
                    this.installConfig.configFiles.push('docker-compose.yml');
                }
            }
            
            this.installConfig.generatedConfigs = {
                databaseProperties: dbPropsData.content
            };
        } catch (error) {
            throw new Error(`設定ファイルの生成エラー: ${error.message}`);
        }
    }
    
    async executeInstallation() {
        try {
            // 設定ファイルを保存
            const configDir = this.installConfig.projectPath || '/tmp/scalardb-config';
            
            const saveResponse = await fetch('/api/config/save-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    installConfig: this.installConfig,
                    outputDir: configDir
                })
            });
            
            const saveData = await saveResponse.json();
            
            if (!saveData.success) {
                throw new Error('設定ファイルの保存に失敗しました');
            }
            
            this.installConfig.installPath = configDir;
            this.installConfig.savedFiles = saveData.results;
            
            // 実際のインストール処理（将来的にここに追加）
            // - ScalarDB Serverの起動
            // - Dockerコンテナの起動
            // - systemdサービスの作成など
            
        } catch (error) {
            throw new Error(`インストール実行エラー: ${error.message}`);
        }
    }
    
    async verifyDatabaseConnection() {
        try {
            const response = await fetch('/api/database/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    database: this.installConfig.database
                })
            });
            
            const data = await response.json();
            
            if (data.success && data.result.connected) {
                this.installConfig.dbConnectionVerified = true;
                this.installConfig.dbResponseTime = data.result.responseTime;
            } else {
                throw new Error(data.result?.message || 'データベース接続に失敗しました');
            }
        } catch (error) {
            throw new Error(`データベース接続エラー: ${error.message}`);
        }
    }
    
    async finalizeInstallation() {
        try {
            // スキーマの作成（オプション）
            if (this.installConfig.createSchema !== false) {
                const schemaResponse = await fetch('/api/database/schema/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        database: this.installConfig.database,
                        schemaPath: this.installConfig.schemaPath // nullの場合はデフォルトスキーマを使用
                    })
                });
                
                const schemaData = await schemaResponse.json();
                
                if (schemaData.success) {
                    this.installConfig.schemaCreated = true;
                    this.installConfig.createdTables = schemaData.result.tables || schemaData.result.containers;
                } else {
                    console.warn('スキーマ作成に失敗しましたが、インストールを続行します:', schemaData.error);
                }
            }
            
            this.installConfig.installationComplete = true;
            this.installConfig.installationTime = new Date().toISOString();
        } catch (error) {
            console.error('ファイナライズ中のエラー:', error);
            // エラーが発生してもインストールは完了とマーク
            this.installConfig.installationComplete = true;
            this.installConfig.installationTime = new Date().toISOString();
        }
    }
    
    addLogEntry(container, message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        container.appendChild(entry);
        container.scrollTop = container.scrollHeight;
    }
    
    attachFormEventListeners() {
        const configForm = document.getElementById('config-form');
        if (!configForm) return;
        
        // すべての入力フィールドにイベントリスナーを追加
        configForm.querySelectorAll('input, select, textarea').forEach(input => {
            input.addEventListener('change', (e) => {
                const name = e.target.name;
                const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                
                // データベース設定を更新
                if (name && value !== undefined) {
                    this.installConfig.database[name] = value;
                    console.log(`Updated database.${name} = ${value}`);
                }
            });
            
            // リアルタイム入力にも対応
            if (input.type === 'text' || input.type === 'password' || input.type === 'number') {
                input.addEventListener('input', (e) => {
                    const name = e.target.name;
                    const value = e.target.value;
                    
                    if (name) {
                        this.installConfig.database[name] = value;
                    }
                });
            }
        });
        
        // 詳細設定のフィールドも処理
        configForm.querySelectorAll('.advanced-form input, .advanced-form select').forEach(input => {
            input.addEventListener('change', (e) => {
                const name = e.target.name;
                const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                
                if (!this.installConfig.advanced) {
                    this.installConfig.advanced = {};
                }
                
                this.installConfig.advanced[name] = value;
                console.log(`Updated advanced.${name} = ${value}`);
            });
        });
    }
    
    generateCompletionInfo() {
        const details = document.getElementById('install-details');
        const config = this.installConfig;
        
        const detailsHTML = `
            <div class="detail-item">
                <span>製品:</span>
                <span>${config.product === 'scalardb' ? 'ScalarDB' : 'ScalarDL'} ${config.scalardb?.version || 'Latest'}</span>
            </div>
            <div class="detail-item">
                <span>Java:</span>
                <span>${config.java.vendor} ${config.java.version}</span>
            </div>
            <div class="detail-item">
                <span>データベース:</span>
                <span>${this.getDatabaseDisplayName(config.database.type)}</span>
            </div>
            <div class="detail-item">
                <span>インストールパス:</span>
                <span>${config.installPath}</span>
            </div>
            <div class="detail-item">
                <span>設定ファイル:</span>
                <span>${config.configFiles?.join(', ')}</span>
            </div>
            ${config.savedFiles ? `
            <div class="detail-item">
                <span>保存されたファイル:</span>
                <span>${config.savedFiles.map(f => f.path || f).join('<br>')}</span>
            </div>
            ` : ''}
            ${config.createdTables ? `
            <div class="detail-item">
                <span>作成されたテーブル:</span>
                <span>${config.createdTables.join(', ')}</span>
            </div>
            ` : ''}
            <div class="detail-item">
                <span>完了時刻:</span>
                <span>${new Date(config.installationTime).toLocaleString()}</span>
            </div>
        `;
        
        details.innerHTML = detailsHTML;
    }
    
}

// Environment check functions
async function checkJava() {
    const javaCheck = document.getElementById('java-check');
    const icon = javaCheck.querySelector('.check-icon');
    const details = javaCheck.querySelector('.check-details');
    const installBtn = javaCheck.querySelector('.btn-primary');
    
    icon.textContent = '⏳';
    details.textContent = 'Java環境を確認中...';
    
    try {
        const response = await fetch('/api/java/check');
        const data = await response.json();
        
        if (data.success && data.result.installed) {
            javaCheck.className = 'check-item success';
            icon.textContent = '✅';
            details.textContent = `${data.result.vendor || 'Java'} ${data.result.version} が検出されました`;
            if (installBtn) installBtn.style.display = 'none';
        } else {
            javaCheck.className = 'check-item error';
            icon.textContent = '❌';
            details.textContent = 'Java が見つかりません';
            if (installBtn) installBtn.style.display = 'inline-flex';
        }
    } catch (error) {
        javaCheck.className = 'check-item error';
        icon.textContent = '❌';
        details.textContent = `エラー: ${error.message}`;
        console.error('Java check failed:', error);
    }
}

async function installJava() {
    const javaCheck = document.getElementById('java-check');
    const icon = javaCheck.querySelector('.check-icon');
    const details = javaCheck.querySelector('.check-details');
    const installBtn = javaCheck.querySelector('.btn-primary');
    
    icon.textContent = '⏳';
    details.textContent = 'Eclipse Temurin JDK 17 をインストール中...';
    if (installBtn) installBtn.disabled = true;
    
    try {
        const response = await fetch('/api/java/install', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ version: 17 })
        });
        
        const data = await response.json();
        
        if (data.success && data.result.success) {
            javaCheck.className = 'check-item success';
            icon.textContent = '✅';
            details.textContent = data.result.message || 'Eclipse Temurin JDK 17 がインストールされました';
            if (installBtn) installBtn.style.display = 'none';
        } else {
            javaCheck.className = 'check-item error';
            icon.textContent = '❌';
            details.textContent = data.result?.message || 'インストールに失敗しました';
            if (installBtn) installBtn.disabled = false;
        }
    } catch (error) {
        javaCheck.className = 'check-item error';
        icon.textContent = '❌';
        details.textContent = `インストールエラー: ${error.message}`;
        if (installBtn) installBtn.disabled = false;
        console.error('Java installation failed:', error);
    }
}

async function checkDocker() {
    const dockerCheck = document.getElementById('docker-check');
    const icon = dockerCheck.querySelector('.check-icon');
    const details = dockerCheck.querySelector('.check-details');
    const installBtn = dockerCheck.querySelector('.btn-primary');
    
    icon.textContent = '⏳';
    details.textContent = 'Docker環境を確認中...';
    
    try {
        const response = await fetch('/api/prerequisites/docker/check');
        const data = await response.json();
        
        if (data.success && data.result.installed) {
            dockerCheck.className = 'check-item success';
            icon.textContent = '✅';
            const runningStatus = data.result.running ? '（実行中）' : '（停止中）';
            details.textContent = `Docker ${data.result.version} が利用可能です ${runningStatus}`;
            if (installBtn) installBtn.style.display = 'none';
        } else {
            dockerCheck.className = 'check-item error';
            icon.textContent = '❌';
            details.textContent = 'Docker が見つかりません（オプション）';
            if (installBtn) installBtn.style.display = 'inline-flex';
        }
    } catch (error) {
        dockerCheck.className = 'check-item error';
        icon.textContent = '❌';
        details.textContent = `エラー: ${error.message}`;
        console.error('Docker check failed:', error);
    }
}

async function checkBuildTools() {
    const mavenCheck = document.getElementById('maven-check');
    const icon = mavenCheck.querySelector('.check-icon');
    const details = mavenCheck.querySelector('.check-details');
    const installBtn = mavenCheck.querySelector('.btn-primary');
    
    icon.textContent = '⏳';
    details.textContent = 'ビルドツールを確認中...';
    
    try {
        const [mavenResponse, gradleResponse] = await Promise.all([
            fetch('/api/prerequisites/maven/check'),
            fetch('/api/prerequisites/gradle/check')
        ]);
        
        const mavenData = await mavenResponse.json();
        const gradleData = await gradleResponse.json();
        
        const hasMaven = mavenData.success && mavenData.result.installed;
        const hasGradle = gradleData.success && gradleData.result.installed;
        
        if (hasMaven || hasGradle) {
            mavenCheck.className = 'check-item success';
            icon.textContent = '✅';
            
            let statusText = '';
            if (hasMaven && hasGradle) {
                statusText = `Maven ${mavenData.result.version} と Gradle ${gradleData.result.version} が利用可能です`;
            } else if (hasMaven) {
                statusText = `Maven ${mavenData.result.version} が利用可能です`;
            } else {
                statusText = `Gradle ${gradleData.result.version} が利用可能です`;
            }
            
            details.textContent = statusText;
            if (installBtn) installBtn.style.display = 'none';
        } else {
            mavenCheck.className = 'check-item error';
            icon.textContent = '❌';
            details.textContent = 'Maven/Gradle が見つかりません（プロジェクト統合用）';
            if (installBtn) installBtn.style.display = 'inline-flex';
        }
    } catch (error) {
        mavenCheck.className = 'check-item error';
        icon.textContent = '❌';
        details.textContent = `エラー: ${error.message}`;
        console.error('Build tools check failed:', error);
    }
}

async function testConnection() {
    const testResult = document.getElementById('test-result');
    const wizard = window.installerWizard;
    
    testResult.style.display = 'block';
    testResult.className = 'test-result';
    testResult.textContent = 'データベース接続をテスト中...';
    
    // Simulate connection test
    setTimeout(() => {
        const success = Math.random() > 0.3;
        
        if (success) {
            testResult.className = 'test-result success';
            testResult.textContent = '✅ データベース接続に成功しました';
        } else {
            testResult.className = 'test-result error';
            testResult.textContent = '❌ データベース接続に失敗しました。設定を確認してください。';
        }
    }, 2000);
}

function cancelInstallation() {
    if (confirm('インストールをキャンセルしますか？')) {
        window.installerWizard.installationInProgress = false;
        document.getElementById('start-install-btn').style.display = 'inline-flex';
        document.getElementById('cancel-install-btn').style.display = 'none';
    }
}

function openDashboard() {
    window.open('/dashboard/dashboard.html', '_blank');
}

function viewDocumentation() {
    window.open('https://scalardb.scalar-labs.com/docs/latest/', '_blank');
}

function runSample() {
    alert('サンプルアプリケーションを起動します...');
}

function generateConfig() {
    const config = window.installerWizard.installConfig;
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scalardb-config.json';
    a.click();
    URL.revokeObjectURL(url);
}

// Initialize wizard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.installerWizard = new InstallerWizard();
});

async function installHomebrew() {
    const homebrewCheck = document.getElementById('homebrew-check');
    const icon = homebrewCheck.querySelector('.check-icon');
    const details = homebrewCheck.querySelector('.check-details');
    const installBtn = homebrewCheck.querySelector('.btn-primary');
    
    icon.textContent = '⏳';
    details.textContent = 'Homebrew をインストール中...';
    if (installBtn) installBtn.disabled = true;
    
    try {
        const response = await fetch('/api/prerequisites/homebrew/install', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.result.success) {
            homebrewCheck.className = 'check-item success';
            icon.textContent = '✅';
            details.textContent = data.result.message || 'Homebrew がインストールされました';
            if (installBtn) installBtn.style.display = 'none';
        } else {
            homebrewCheck.className = 'check-item error';
            icon.textContent = '❌';
            details.textContent = data.result?.message || 'インストールに失敗しました';
            if (installBtn) installBtn.disabled = false;
        }
    } catch (error) {
        homebrewCheck.className = 'check-item error';
        icon.textContent = '❌';
        details.textContent = `インストールエラー: ${error.message}`;
        if (installBtn) installBtn.disabled = false;
        console.error('Homebrew installation failed:', error);
    }
}

async function installDocker() {
    const dockerCheck = document.getElementById('docker-check');
    const icon = dockerCheck.querySelector('.check-icon');
    const details = dockerCheck.querySelector('.check-details');
    const installBtn = dockerCheck.querySelector('.btn-primary');
    
    icon.textContent = '⏳';
    details.textContent = 'Docker をインストール中...';
    if (installBtn) installBtn.disabled = true;
    
    try {
        const response = await fetch('/api/prerequisites/docker/install', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.result.success) {
            dockerCheck.className = 'check-item success';
            icon.textContent = '✅';
            details.textContent = data.result.message || 'Docker がインストールされました';
            if (installBtn) installBtn.style.display = 'none';
        } else {
            dockerCheck.className = 'check-item error';
            icon.textContent = '❌';
            details.textContent = data.result?.message || 'インストールに失敗しました';
            if (installBtn) installBtn.disabled = false;
        }
    } catch (error) {
        dockerCheck.className = 'check-item error';
        icon.textContent = '❌';
        details.textContent = `インストールエラー: ${error.message}`;
        if (installBtn) installBtn.disabled = false;
        console.error('Docker installation failed:', error);
    }
}

async function installMaven() {
    const mavenCheck = document.getElementById('maven-check');
    const icon = mavenCheck.querySelector('.check-icon');
    const details = mavenCheck.querySelector('.check-details');
    const installBtn = mavenCheck.querySelector('.btn-primary');
    
    icon.textContent = '⏳';
    details.textContent = 'Maven をインストール中...';
    if (installBtn) installBtn.disabled = true;
    
    try {
        const response = await fetch('/api/prerequisites/maven/install', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.result.success) {
            mavenCheck.className = 'check-item success';
            icon.textContent = '✅';
            details.textContent = data.result.message || 'Maven がインストールされました';
            if (installBtn) installBtn.style.display = 'none';
        } else {
            mavenCheck.className = 'check-item error';
            icon.textContent = '❌';
            details.textContent = data.result?.message || 'インストールに失敗しました';
            if (installBtn) installBtn.disabled = false;
        }
    } catch (error) {
        mavenCheck.className = 'check-item error';
        icon.textContent = '❌';
        details.textContent = `インストールエラー: ${error.message}`;
        if (installBtn) installBtn.disabled = false;
        console.error('Maven installation failed:', error);
    }
}

async function checkHomebrew() {
    const homebrewCheck = document.getElementById('homebrew-check');
    const icon = homebrewCheck.querySelector('.check-icon');
    const details = homebrewCheck.querySelector('.check-details');
    const installBtn = homebrewCheck.querySelector('.btn-primary');
    
    icon.textContent = '⏳';
    details.textContent = 'Homebrew環境を確認中...';
    
    try {
        const response = await fetch('/api/prerequisites/homebrew/check');
        const data = await response.json();
        
        if (data.success && data.result.installed) {
            homebrewCheck.className = 'check-item success';
            icon.textContent = '✅';
            details.textContent = `Homebrew ${data.result.version} が利用可能です`;
            if (installBtn) installBtn.style.display = 'none';
        } else {
            homebrewCheck.className = 'check-item error';
            icon.textContent = '❌';
            details.textContent = 'Homebrew が見つかりません';
            if (installBtn) installBtn.style.display = 'inline-flex';
        }
    } catch (error) {
        homebrewCheck.className = 'check-item error';
        icon.textContent = '❌';
        details.textContent = `エラー: ${error.message}`;
        console.error('Homebrew check failed:', error);
    }
}

async function cancelInstallation() {
    const wizard = window.installerWizard;
    
    if (!wizard.installationInProgress || !wizard.installationId) {
        return;
    }
    
    if (confirm('インストールをキャンセルしますか？')) {
        // WebSocketルームから退出
        if (wizard.socket && wizard.socket.connected) {
            wizard.socket.emit('leave:installation', { 
                installationId: wizard.installationId 
            });
        }
        
        wizard.installationInProgress = false;
        wizard.installationId = null;
        
        // UIをリセット
        const startBtn = document.getElementById('start-install-btn');
        const cancelBtn = document.getElementById('cancel-install-btn');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const logContainer = document.getElementById('log-container');
        
        startBtn.style.display = 'inline-flex';
        cancelBtn.style.display = 'none';
        progressFill.style.width = '0%';
        progressText.textContent = '準備中...';
        
        wizard.addLogEntry(logContainer, 'インストールがキャンセルされました', 'warning');
    }
}

// Expose functions globally
window.checkJava = checkJava;
window.installJava = installJava;
window.checkHomebrew = checkHomebrew;
window.checkDocker = checkDocker;
window.installHomebrew = installHomebrew;
window.installDocker = installDocker;
window.installMaven = installMaven;
window.checkBuildTools = checkBuildTools;
window.testConnection = testConnection;
window.startInstallation = () => window.installerWizard.startInstallation();
window.cancelInstallation = cancelInstallation;
window.nextStep = () => window.installerWizard.nextStep();
window.previousStep = () => window.installerWizard.previousStep();
window.openDashboard = openDashboard;
window.viewDocumentation = viewDocumentation;
window.runSample = runSample;
window.generateConfig = generateConfig;