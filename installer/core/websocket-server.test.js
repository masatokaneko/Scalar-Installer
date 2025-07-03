const { WebSocketServer } = require('./websocket-server');
const http = require('http');
const Client = require('socket.io-client');

describe('WebSocketServer', () => {
    let server;
    let httpServer;
    let wsServer;
    let clientSocket;
    const port = 3003;

    beforeEach((done) => {
        // HTTPサーバーとWebSocketサーバーを起動
        httpServer = http.createServer();
        wsServer = new WebSocketServer(httpServer);
        
        httpServer.listen(port, () => {
            done();
        });
    });

    afterEach((done) => {
        // クライアントソケットを切断
        if (clientSocket && clientSocket.connected) {
            clientSocket.disconnect();
        }
        
        // サーバーを停止
        httpServer.close(() => {
            done();
        });
    });

    describe('接続管理', () => {
        it('クライアントが接続できる', (done) => {
            clientSocket = Client(`http://localhost:${port}`);
            
            clientSocket.on('connect', () => {
                expect(clientSocket.connected).toBe(true);
                done();
            });
        });

        it('接続時にwelcomeメッセージを受信する', (done) => {
            clientSocket = Client(`http://localhost:${port}`);
            
            clientSocket.on('welcome', (data) => {
                expect(data).toHaveProperty('message');
                expect(data.message).toContain('ScalarDB Installer WebSocket');
                done();
            });
        });
    });

    describe('インストール進捗管理', () => {
        beforeEach((done) => {
            clientSocket = Client(`http://localhost:${port}`);
            clientSocket.on('connect', () => done());
        });

        it('インストール開始イベントを送信できる', (done) => {
            const installationId = 'test-install-123';
            
            clientSocket.on('installation:started', (data) => {
                expect(data.installationId).toBe(installationId);
                expect(data.status).toBe('started');
                done();
            });

            wsServer.startInstallation(installationId, {
                product: 'scalardb',
                database: 'postgresql'
            });
        });

        it('進捗更新を送信できる', (done) => {
            const installationId = 'test-install-123';
            const progress = {
                step: 'Java環境の確認',
                progress: 20,
                status: 'running'
            };

            // まずインストールを開始してから進捗更新
            wsServer.startInstallation(installationId, { product: 'scalardb' });

            clientSocket.on('installation:progress', (data) => {
                expect(data.installationId).toBe(installationId);
                expect(data.step).toBe(progress.step);
                expect(data.progress).toBe(progress.progress);
                done();
            });

            // 少し待ってから進捗更新を送信
            setTimeout(() => {
                wsServer.updateProgress(installationId, progress);
            }, 100);
        });

        it('エラーイベントを送信できる', (done) => {
            const installationId = 'test-install-123';
            const error = {
                step: 'データベース接続',
                message: '接続に失敗しました'
            };

            clientSocket.on('installation:error', (data) => {
                expect(data.installationId).toBe(installationId);
                expect(data.error).toBe(error.message);
                expect(data.step).toBe(error.step);
                done();
            });

            wsServer.sendError(installationId, error);
        });

        it('完了イベントを送信できる', (done) => {
            const installationId = 'test-install-123';
            const result = {
                success: true,
                installPath: '/usr/local/scalardb'
            };

            clientSocket.on('installation:completed', (data) => {
                expect(data.installationId).toBe(installationId);
                expect(data.result).toEqual(result);
                done();
            });

            wsServer.completeInstallation(installationId, result);
        });
    });

    describe('ルーム管理', () => {
        beforeEach((done) => {
            clientSocket = Client(`http://localhost:${port}`);
            clientSocket.on('connect', () => done());
        });
        
        it('特定のインストールIDのルームに参加できる', (done) => {
            const installationId = 'test-install-123';
            
            clientSocket.emit('join:installation', { installationId }, (response) => {
                expect(response.success).toBe(true);
                expect(response.installationId).toBe(installationId);
                done();
            });
        });
    });
});