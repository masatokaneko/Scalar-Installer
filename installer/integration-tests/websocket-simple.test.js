const Client = require('socket.io-client');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('../core/websocket-server');

describe('WebSocket基本機能テスト', () => {
    let httpServer;
    let wsServer;
    let clientSocket;
    let port;
    
    beforeEach((done) => {
        // シンプルなExpressアプリを作成
        const app = express();
        httpServer = http.createServer(app);
        
        // WebSocketサーバーを初期化
        wsServer = new WebSocketServer(httpServer);
        
        // ランダムポートでリッスン
        httpServer.listen(0, () => {
            port = httpServer.address().port;
            done();
        });
    });
    
    afterEach((done) => {
        // クライアントを切断
        if (clientSocket && clientSocket.connected) {
            clientSocket.disconnect();
        }
        
        // サーバーを停止
        httpServer.close(() => {
            wsServer.close();
            done();
        });
    });
    
    it('クライアントが接続してウェルカムメッセージを受信する', (done) => {
        clientSocket = Client(`http://localhost:${port}`);
        
        clientSocket.on('welcome', (data) => {
            expect(data.message).toContain('ScalarDB Installer WebSocket');
            expect(data.timestamp).toBeDefined();
            done();
        });
    });
    
    it('インストールルームに参加できる', (done) => {
        clientSocket = Client(`http://localhost:${port}`);
        const testInstallationId = 'test-123';
        
        clientSocket.on('connect', () => {
            clientSocket.emit('join:installation', { 
                installationId: testInstallationId 
            }, (response) => {
                expect(response.success).toBe(true);
                expect(response.installationId).toBe(testInstallationId);
                done();
            });
        });
    });
    
    it('インストール進捗を送受信できる', (done) => {
        clientSocket = Client(`http://localhost:${port}`);
        const testInstallationId = 'test-456';
        
        clientSocket.on('connect', () => {
            // ルームに参加
            clientSocket.emit('join:installation', { 
                installationId: testInstallationId 
            });
            
            // 進捗イベントをリッスン
            clientSocket.on('installation:progress', (data) => {
                expect(data.installationId).toBe(testInstallationId);
                expect(data.step).toBe('テストステップ');
                expect(data.progress).toBe(50);
                done();
            });
            
            // サーバー側から進捗を送信
            setTimeout(() => {
                wsServer.startInstallation(testInstallationId, { test: true });
                wsServer.updateProgress(testInstallationId, {
                    step: 'テストステップ',
                    progress: 50,
                    status: 'running'
                });
            }, 100);
        });
    });
    
    it('エラーイベントを送受信できる', (done) => {
        clientSocket = Client(`http://localhost:${port}`);
        const testInstallationId = 'test-789';
        
        clientSocket.on('connect', () => {
            clientSocket.emit('join:installation', { 
                installationId: testInstallationId 
            });
            
            clientSocket.on('installation:error', (data) => {
                expect(data.installationId).toBe(testInstallationId);
                expect(data.error).toBe('テストエラー');
                done();
            });
            
            setTimeout(() => {
                wsServer.sendError(testInstallationId, {
                    message: 'テストエラー',
                    step: 'エラーステップ'
                });
            }, 100);
        });
    });
    
    it('インストール完了イベントを送受信できる', (done) => {
        clientSocket = Client(`http://localhost:${port}`);
        const testInstallationId = 'test-999';
        
        clientSocket.on('connect', () => {
            clientSocket.emit('join:installation', { 
                installationId: testInstallationId 
            });
            
            clientSocket.on('installation:completed', (data) => {
                expect(data.installationId).toBe(testInstallationId);
                expect(data.result.success).toBe(true);
                done();
            });
            
            setTimeout(() => {
                wsServer.completeInstallation(testInstallationId, {
                    success: true,
                    message: 'テスト完了'
                });
            }, 100);
        });
    });
});