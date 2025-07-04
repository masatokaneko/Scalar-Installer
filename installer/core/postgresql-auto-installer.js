const { DockerDeployer } = require('./docker-deployer');
const net = require('net');
const crypto = require('crypto');

class PostgreSQLAutoInstaller {
  constructor() {
    this.dockerDeployer = new DockerDeployer();
    this.CONTAINER_NAME = 'scalardb-postgres';
    this.IMAGE_NAME = 'postgres:15-alpine';
    this.DEFAULT_PORT = 5432;
    this.DATA_VOLUME = 'scalardb-postgres-data';
  }

  /**
   * Docker環境の前提条件を確認
   */
  async checkPrerequisites() {
    const dockerInfo = await this.dockerDeployer.checkDockerInstalled();
    
    if (!dockerInfo.installed) {
      const error = new Error('Dockerがインストールされていません');
      error.userMessage = 'Dockerデスクトップをインストールしてからもう一度お試しください';
      error.actionLink = 'https://www.docker.com/products/docker-desktop';
      throw error;
    }
    
    if (!dockerInfo.running) {
      const error = new Error('Dockerが起動していません');
      error.userMessage = 'Dockerデスクトップを起動してからもう一度お試しください';
      throw error;
    }
    
    return true;
  }

  /**
   * 利用可能なポートを検索
   */
  async findAvailablePort(preferredPort = this.DEFAULT_PORT) {
    const checkPort = (port) => {
      return new Promise((resolve) => {
        const server = net.createServer();
        
        server.once('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            resolve(false);
          } else {
            resolve(false);
          }
        });
        
        server.once('listening', () => {
          server.close();
          resolve(true);
        });
        
        server.listen(port);
      });
    };
    
    // 優先ポートから順に10個のポートを試す
    for (let port = preferredPort; port < preferredPort + 10; port++) {
      if (await checkPort(port)) {
        return port;
      }
    }
    
    throw new Error('利用可能なポートが見つかりません');
  }

  /**
   * セキュアなパスワードを生成
   */
  generateSecurePassword() {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    const charsetLength = charset.length;
    let password = '';
    
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charsetLength];
    }
    
    return password;
  }

  /**
   * 既存のコンテナを確認
   */
  async checkExistingContainer() {
    try {
      const info = await this.dockerDeployer.getContainerInfo(this.CONTAINER_NAME);
      
      if (info.exists) {
        // ポート番号を抽出
        let hostPort = this.DEFAULT_PORT;
        if (info.ports && info.ports['5432/tcp']) {
          const portMapping = info.ports['5432/tcp'][0];
          if (portMapping && portMapping.HostPort) {
            hostPort = parseInt(portMapping.HostPort);
          }
        }
        
        return {
          exists: true,
          running: info.running,
          id: info.id,
          port: hostPort
        };
      }
      
      return { exists: false };
    } catch (error) {
      return { exists: false };
    }
  }

  /**
   * PostgreSQLの起動を待機
   */
  async waitForReady(containerId, maxRetries = 30) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await this.dockerDeployer.execCommand(containerId, [
          'pg_isready',
          '-U', 'scalardb',
          '-d', 'scalardb'
        ]);
        
        if (result.exitCode === 0 && result.stdout.includes('accepting connections')) {
          return true;
        }
      } catch (error) {
        // エラーは無視してリトライ
      }
      
      // 1秒待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('PostgreSQLの起動がタイムアウトしました');
  }

  /**
   * PostgreSQLをインストール
   */
  async install(options = {}) {
    const { progressCallback = () => {}, reuseExisting = false } = options;
    
    try {
      // Step 1: Docker環境確認
      progressCallback({ step: 'docker-check', progress: 10, message: 'Docker環境を確認中...' });
      await this.checkPrerequisites();
      
      // Step 2: 既存コンテナ確認
      progressCallback({ step: 'existing-check', progress: 20, message: '既存のPostgreSQLを確認中...' });
      const existing = await this.checkExistingContainer();
      
      if (existing.exists && reuseExisting) {
        progressCallback({ step: 'reuse', progress: 90, message: '既存のPostgreSQLを使用します' });
        
        // 既存のコンテナが停止していたら起動
        if (!existing.running) {
          await this.dockerDeployer.startContainer(existing.id);
          await this.waitForReady(existing.id);
        }
        
        progressCallback({ step: 'complete', progress: 100, message: 'PostgreSQLの準備が完了しました' });
        
        return {
          success: true,
          reused: true,
          host: 'localhost',
          port: existing.port,
          database: 'scalardb',
          username: 'scalardb',
          password: '既存のパスワードを使用してください',
          containerId: existing.id
        };
      }
      
      // 既存コンテナがあるが再利用しない場合は削除
      if (existing.exists && !reuseExisting) {
        progressCallback({ step: 'remove-existing', progress: 25, message: '既存のコンテナを削除中...' });
        await this.dockerDeployer.removeContainer(this.CONTAINER_NAME, { force: true });
      }
      
      // Step 3: ポート確認
      progressCallback({ step: 'port-check', progress: 30, message: '利用可能なポートを確認中...' });
      const port = await this.findAvailablePort();
      
      // Step 4: パスワード生成
      const password = this.generateSecurePassword();
      
      // Step 5: イメージ取得
      progressCallback({ step: 'pull-image', progress: 40, message: 'PostgreSQLイメージをダウンロード中...' });
      
      const pullProgressCallback = (pullProgress) => {
        const overallProgress = 40 + (pullProgress * 0.3); // 40-70%の範囲
        progressCallback({
          step: 'pull-image',
          progress: overallProgress,
          message: `PostgreSQLイメージをダウンロード中... ${Math.round(pullProgress)}%`
        });
      };
      
      await this.dockerDeployer.pullImage(this.IMAGE_NAME, pullProgressCallback);
      
      // Step 6: コンテナ作成
      progressCallback({ step: 'create-container', progress: 75, message: 'PostgreSQLコンテナを作成中...' });
      
      const containerConfig = {
        Image: this.IMAGE_NAME,
        name: this.CONTAINER_NAME,
        Env: [
          `POSTGRES_USER=scalardb`,
          `POSTGRES_PASSWORD=${password}`,
          `POSTGRES_DB=scalardb`,
          'POSTGRES_INITDB_ARGS=--encoding=UTF-8'
        ],
        HostConfig: {
          PortBindings: {
            '5432/tcp': [{ HostPort: port.toString() }]
          },
          RestartPolicy: {
            Name: 'unless-stopped'
          },
          Binds: [`${this.DATA_VOLUME}:/var/lib/postgresql/data`]
        }
      };
      
      const createResult = await this.dockerDeployer.createContainer(containerConfig);
      const containerId = createResult.containerId;
      
      // Step 7: コンテナ起動
      progressCallback({ step: 'start-container', progress: 85, message: 'PostgreSQLを起動中...' });
      await this.dockerDeployer.startContainer(containerId);
      
      // Step 8: 起動待機
      progressCallback({ step: 'wait-ready', progress: 90, message: 'PostgreSQLの起動を待機中...' });
      await this.waitForReady(containerId);
      
      // Step 9: 完了
      progressCallback({ step: 'complete', progress: 100, message: 'PostgreSQLのインストールが完了しました' });
      
      return {
        success: true,
        host: 'localhost',
        port: port,
        database: 'scalardb',
        username: 'scalardb',
        password: password,
        containerId: containerId,
        containerName: this.CONTAINER_NAME
      };
      
    } catch (error) {
      const userFriendlyError = new Error(this.getUserFriendlyError(error));
      userFriendlyError.originalError = error;
      throw userFriendlyError;
    }
  }

  /**
   * PostgreSQLコンテナを停止
   */
  async stop() {
    try {
      const info = await this.checkExistingContainer();
      if (info.exists && info.running) {
        await this.dockerDeployer.stopContainer(info.id);
        return { success: true, message: 'PostgreSQLを停止しました' };
      }
      return { success: true, message: 'PostgreSQLは既に停止しています' };
    } catch (error) {
      throw new Error(this.getUserFriendlyError(error));
    }
  }

  /**
   * PostgreSQLコンテナを削除
   */
  async remove() {
    try {
      await this.dockerDeployer.removeContainer(this.CONTAINER_NAME, { removeVolumes: true });
      return { success: true, message: 'PostgreSQLを削除しました' };
    } catch (error) {
      throw new Error(this.getUserFriendlyError(error));
    }
  }

  /**
   * 技術的エラーを非技術者向けメッセージに変換
   */
  getUserFriendlyError(error) {
    const errorMessage = error.message || error.toString();
    
    if (errorMessage.includes('Cannot connect to the Docker daemon')) {
      return 'Dockerが起動していません。Docker Desktopを起動してください。';
    }
    
    if (errorMessage.includes('pull access denied') || errorMessage.includes('manifest unknown') || errorMessage.includes('Network error')) {
      return 'PostgreSQLイメージのダウンロードに失敗しました。インターネット接続を確認してください。';
    }
    
    if (errorMessage.includes('port is already allocated')) {
      return 'ポート5432が既に使用されています。別のポートを試します。';
    }
    
    if (errorMessage.includes('No such container')) {
      return 'PostgreSQLコンテナが見つかりません。';
    }
    
    if (errorMessage.includes('disk space') || errorMessage.includes('ENOSPC')) {
      return 'ディスクの空き容量が不足しています。';
    }
    
    if (errorMessage.includes('permission denied')) {
      return 'Dockerの実行権限がありません。管理者権限で実行してください。';
    }
    
    // タイムアウトエラー
    if (errorMessage.includes('タイムアウト')) {
      return errorMessage; // 既にユーザーフレンドリー
    }
    
    // その他のエラー
    return `PostgreSQL設定エラー: ${errorMessage}`;
  }
}

module.exports = { PostgreSQLAutoInstaller };