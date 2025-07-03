const { Server } = require('socket.io');

class WebSocketServer {
  constructor(httpServer, options = {}) {
    this.io = new Server(httpServer, {
      cors: {
        origin: options.origin || '*',
        methods: ['GET', 'POST']
      }
    });

    this.installations = new Map(); // インストールIDごとの状態管理
    this.setupEventHandlers();
  }

  /**
   * WebSocketイベントハンドラーの設定
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`新しいクライアントが接続しました: ${socket.id}`);

      // ウェルカムメッセージ送信
      socket.emit('welcome', {
        message: 'ScalarDB Installer WebSocketサーバーに接続しました',
        timestamp: new Date().toISOString()
      });

      // インストールルームへの参加
      socket.on('join:installation', (data, callback) => {
        const { installationId } = data;
        if (installationId) {
          socket.join(`installation:${installationId}`);
          console.log(`Socket ${socket.id} がインストール ${installationId} のルームに参加しました`);
          
          if (callback) {
            callback({
              success: true,
              installationId,
              message: 'インストールルームに参加しました'
            });
          }

          // 現在の状態を送信
          const currentState = this.installations.get(installationId);
          if (currentState) {
            socket.emit('installation:state', currentState);
          }
        }
      });

      // インストールルームからの退出
      socket.on('leave:installation', (data) => {
        const { installationId } = data;
        if (installationId) {
          socket.leave(`installation:${installationId}`);
          console.log(`Socket ${socket.id} がインストール ${installationId} のルームから退出しました`);
        }
      });

      // 切断処理
      socket.on('disconnect', () => {
        console.log(`クライアントが切断しました: ${socket.id}`);
      });
    });
  }

  /**
   * インストール開始を通知
   */
  startInstallation(installationId, config) {
    const installationState = {
      installationId,
      status: 'started',
      config,
      startTime: new Date().toISOString(),
      steps: [],
      currentStep: null,
      progress: 0
    };

    this.installations.set(installationId, installationState);

    // インストール開始を通知（ルームに参加しているクライアントに送信）
    this.io.to(`installation:${installationId}`).emit('installation:started', {
      installationId,
      status: 'started',
      config,
      timestamp: installationState.startTime
    });
  }

  /**
   * 進捗更新を送信
   */
  updateProgress(installationId, progressData) {
    const installationState = this.installations.get(installationId);
    if (!installationState) {
      console.warn(`Installation ${installationId} not found`);
      return;
    }

    // 状態を更新
    installationState.currentStep = progressData.step;
    installationState.progress = progressData.progress;
    installationState.status = progressData.status || 'running';

    // ステップ履歴に追加
    installationState.steps.push({
      step: progressData.step,
      progress: progressData.progress,
      status: progressData.status,
      timestamp: new Date().toISOString(),
      message: progressData.message
    });

    // 進捗を送信（ルームにのみ送信）
    const progressEvent = {
      installationId,
      step: progressData.step,
      progress: progressData.progress,
      status: progressData.status,
      message: progressData.message,
      timestamp: new Date().toISOString()
    };

    // ルームに参加しているクライアントにのみ送信
    this.io.to(`installation:${installationId}`).emit('installation:progress', progressEvent);
  }

  /**
   * エラーを送信
   */
  sendError(installationId, errorData) {
    const installationState = this.installations.get(installationId);
    if (installationState) {
      installationState.status = 'error';
      installationState.error = errorData.message;
    }

    const errorEvent = {
      installationId,
      error: errorData.message,
      step: errorData.step,
      details: errorData.details,
      timestamp: new Date().toISOString()
    };

    // ルームに参加しているクライアントにのみ送信
    this.io.to(`installation:${installationId}`).emit('installation:error', errorEvent);
  }

  /**
   * インストール完了を通知
   */
  completeInstallation(installationId, result) {
    const installationState = this.installations.get(installationId);
    if (installationState) {
      installationState.status = 'completed';
      installationState.result = result;
      installationState.endTime = new Date().toISOString();
    }

    const completionEvent = {
      installationId,
      result,
      timestamp: new Date().toISOString()
    };

    // ルームに参加しているクライアントにのみ送信
    this.io.to(`installation:${installationId}`).emit('installation:completed', completionEvent);
  }

  /**
   * ログメッセージを送信
   */
  sendLog(installationId, logData) {
    const logEvent = {
      installationId,
      level: logData.level || 'info',
      message: logData.message,
      timestamp: new Date().toISOString()
    };

    this.io.to(`installation:${installationId}`).emit('installation:log', logEvent);
  }

  /**
   * 特定のインストールの状態を取得
   */
  getInstallationState(installationId) {
    return this.installations.get(installationId);
  }

  /**
   * 接続中のクライアント数を取得
   */
  getConnectedClients() {
    return this.io.sockets.sockets.size;
  }

  /**
   * サーバーを停止
   */
  close() {
    this.io.close();
  }
}

module.exports = { WebSocketServer };