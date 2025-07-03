const Client = require('socket.io-client');
const request = require('supertest');
const http = require('http');
const fetch = require('node-fetch');
const app = require('../api/installer-server');
const { WebSocketServer } = require('../core/websocket-server');

describe('WebSocketインストールの統合テスト', () => {
    let httpServer;
    let wsServer;
    let clientSocket;
    let apiUrl;
    let port;
    
    beforeAll((done) => {
        // 環境変数を設定してテストモードであることを示す
        process.env.NODE_ENV = 'test';
        
        // HTTPサーバーを作成
        httpServer = http.createServer(app);
        
        // WebSocketサーバーを初期化（installer-server.jsで既に初期化されているものを使用）
        wsServer = new WebSocketServer(httpServer);
        
        // 利用可能なポートを動的に選択
        httpServer.listen(0, () => {
            port = httpServer.address().port;
            apiUrl = `http://localhost:${port}`;
            done();
        });
    });
    
    afterAll((done) => {
        if (clientSocket && clientSocket.connected) {
            clientSocket.disconnect();
        }
        httpServer.close(done);
    });
    
    describe('インストールフロー', () => {
        it('インストールを開始してWebSocketで進捗を受信する', (done) => {
            // WebSocketクライアントを接続
            clientSocket = Client(apiUrl);
            
            const receivedEvents = [];
            
            clientSocket.on('connect', async () => {
                console.log('WebSocketに接続しました');
                
                // インストール開始
                const response = await fetch(`${apiUrl}/api/install/start`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        product: 'scalardb',
                        installType: 'development',
                        database: {
                            type: 'postgresql',
                            host: 'localhost',
                            port: 5432,
                            username: 'test',
                            password: 'test',
                            database: 'testdb'
                        },
                        deployment: 'local'
                    })
                });
                
                const data = await response.json();
                expect(data.success).toBe(true);
                expect(data.installationId).toBeDefined();
                
                const installationId = data.installationId;
                
                // インストールルームに参加
                clientSocket.emit('join:installation', { 
                    installationId 
                }, (response) => {
                    expect(response.success).toBe(true);
                });
                
                // 進捗イベントをリッスン
                clientSocket.on('installation:progress', (data) => {
                    receivedEvents.push({ type: 'progress', data });
                    
                    // Java環境の確認ステップを受信したか確認
                    if (data.step === 'Java環境の確認') {
                        expect(data.progress).toBeGreaterThanOrEqual(10);
                    }
                });
                
                clientSocket.on('installation:error', (data) => {
                    receivedEvents.push({ type: 'error', data });
                });
                
                clientSocket.on('installation:completed', (data) => {
                    receivedEvents.push({ type: 'completed', data });
                    
                    // 完了イベントを受信したらテスト終了
                    expect(data.result).toBeDefined();
                    expect(receivedEvents.length).toBeGreaterThan(0);
                    
                    // 少なくともいくつかの進捗イベントを受信したことを確認
                    const progressEvents = receivedEvents.filter(e => e.type === 'progress');
                    expect(progressEvents.length).toBeGreaterThan(0);
                    
                    done();
                });
            });
        }, 30000); // タイムアウトを30秒に設定
        
        it('複数のクライアントが同じインストールをモニターできる', (done) => {
            const client1 = Client(apiUrl);
            const client2 = Client(apiUrl);
            
            let client1Events = 0;
            let client2Events = 0;
            
            client1.on('connect', async () => {
                client2.on('connect', async () => {
                    // インストール開始
                    const response = await fetch(`${apiUrl}/api/install/start`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            product: 'scalardb',
                            installType: 'development',
                            database: {
                                type: 'mysql',
                                host: 'localhost',
                                port: 3306,
                                username: 'test',
                                password: 'test',
                                database: 'testdb'
                            },
                            deployment: 'docker'
                        })
                    });
                    
                    const data = await response.json();
                    const installationId = data.installationId;
                    
                    // 両方のクライアントが同じルームに参加
                    client1.emit('join:installation', { installationId });
                    client2.emit('join:installation', { installationId });
                    
                    // 両方のクライアントが進捗を受信
                    client1.on('installation:progress', () => {
                        client1Events++;
                    });
                    
                    client2.on('installation:progress', () => {
                        client2Events++;
                    });
                    
                    // 完了時に両方のクライアントがイベントを受信したことを確認
                    client1.on('installation:completed', () => {
                        client2.on('installation:completed', () => {
                            expect(client1Events).toBeGreaterThan(0);
                            expect(client2Events).toBeGreaterThan(0);
                            
                            client1.disconnect();
                            client2.disconnect();
                            done();
                        });
                    });
                });
            });
        }, 30000);
    });
});