const { DockerDeployer } = require('./docker-deployer');
const net = require('net');
const crypto = require('crypto');

class MySQLAutoInstaller {
  constructor() {
    this.dockerDeployer = new DockerDeployer();
    this.CONTAINER_NAME = 'scalardb-mysql';
    this.IMAGE_NAME = 'mysql:8.0';
    this.DEFAULT_PORT = 3306;
    this.DATA_VOLUME = 'scalardb-mysql-data';
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
        if (info.ports && info.ports['3306/tcp']) {
          const portMapping = info.ports['3306/tcp'][0];
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
   * MySQLの起動を待機
   */
  async waitForReady(containerId, rootPassword, maxRetries = 30) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await this.dockerDeployer.execCommand(containerId, [
          'mysqladmin',
          'ping',
          '-h', 'localhost',
          '-u', 'root',
          `-p${rootPassword}`
        ]);
        
        if (result.exitCode === 0 && result.stdout.includes('mysqld is alive')) {
          return true;
        }
      } catch (error) {
        // エラーは無視してリトライ
      }
      
      // 2秒待機（MySQLの起動はPostgreSQLより時間がかかる場合がある）
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('MySQLの起動がタイムアウトしました');
  }

  /**
   * MySQLをインストール
   */
  async install(options = {}) {
    const { progressCallback = () => {}, reuseExisting = false } = options;
    
    try {
      // Step 1: Docker環境確認
      progressCallback({ step: 'docker-check', progress: 10, message: 'Docker環境を確認中...' });
      await this.checkPrerequisites();
      
      // Step 2: 既存コンテナ確認
      progressCallback({ step: 'existing-check', progress: 20, message: '既存のMySQLを確認中...' });
      const existing = await this.checkExistingContainer();
      
      if (existing.exists && reuseExisting) {
        progressCallback({ step: 'reuse', progress: 90, message: '既存のMySQLを使用します' });
        
        // 既存のコンテナが停止していたら起動
        if (!existing.running) {
          await this.dockerDeployer.startContainer(existing.id);
          // 既存コンテナの場合はパスワードが不明なため、起動のみ確認
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        progressCallback({ step: 'complete', progress: 100, message: 'MySQLの準備が完了しました' });
        
        return {
          success: true,
          reused: true,
          host: 'localhost',
          port: existing.port,
          database: 'scalardb',
          username: 'scalardb',
          password: '既存のパスワードを使用してください',
          rootPassword: '既存のrootパスワードを使用してください',
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
      const rootPassword = this.generateSecurePassword();
      
      // Step 5: イメージ取得
      progressCallback({ step: 'pull-image', progress: 40, message: 'MySQLイメージをダウンロード中...' });
      
      const pullProgressCallback = (pullProgress) => {
        const overallProgress = 40 + (pullProgress * 0.3); // 40-70%の範囲
        progressCallback({
          step: 'pull-image',
          progress: overallProgress,
          message: `MySQLイメージをダウンロード中... ${Math.round(pullProgress)}%`
        });
      };
      
      await this.dockerDeployer.pullImage(this.IMAGE_NAME, pullProgressCallback);
      
      // Step 6: コンテナ作成
      progressCallback({ step: 'create-container', progress: 75, message: 'MySQLコンテナを作成中...' });
      
      const containerConfig = {
        Image: this.IMAGE_NAME,
        name: this.CONTAINER_NAME,
        Env: [
          `MYSQL_ROOT_PASSWORD=${rootPassword}`,
          `MYSQL_DATABASE=scalardb`,
          `MYSQL_USER=scalardb`,
          `MYSQL_PASSWORD=${password}`,
          'MYSQL_CHARSET=utf8mb4',
          'MYSQL_COLLATION=utf8mb4_unicode_ci'
        ],
        HostConfig: {
          PortBindings: {
            '3306/tcp': [{ HostPort: port.toString() }]
          },
          RestartPolicy: {
            Name: 'unless-stopped'
          },
          Binds: [`${this.DATA_VOLUME}:/var/lib/mysql`]
        },
        Cmd: [
          '--character-set-server=utf8mb4',
          '--collation-server=utf8mb4_unicode_ci',
          '--default-authentication-plugin=mysql_native_password'
        ]
      };
      
      const createResult = await this.dockerDeployer.createContainer(containerConfig);
      const containerId = createResult.containerId;
      
      // Step 7: コンテナ起動
      progressCallback({ step: 'start-container', progress: 85, message: 'MySQLを起動中...' });
      await this.dockerDeployer.startContainer(containerId);
      
      // Step 8: 起動待機
      progressCallback({ step: 'wait-ready', progress: 90, message: 'MySQLの起動を待機中...' });
      await this.waitForReady(containerId, rootPassword);
      
      // Step 9: 完了
      progressCallback({ step: 'complete', progress: 100, message: 'MySQLのインストールが完了しました' });
      
      return {
        success: true,
        host: 'localhost',
        port: port,
        database: 'scalardb',
        username: 'scalardb',
        password: password,
        rootPassword: rootPassword,
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
   * MySQLコンテナを停止
   */
  async stop() {
    try {
      const info = await this.checkExistingContainer();
      if (info.exists && info.running) {
        await this.dockerDeployer.stopContainer(info.id);
        return { success: true, message: 'MySQLを停止しました' };
      }
      return { success: true, message: 'MySQLは既に停止しています' };
    } catch (error) {
      throw new Error(this.getUserFriendlyError(error));
    }
  }

  /**
   * MySQLコンテナを削除
   */
  async remove() {
    try {
      await this.dockerDeployer.removeContainer(this.CONTAINER_NAME, { removeVolumes: true });
      return { success: true, message: 'MySQLを削除しました' };
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
      return 'MySQLイメージのダウンロードに失敗しました。インターネット接続を確認してください。';
    }
    
    if (errorMessage.includes('port is already allocated')) {
      return 'ポート3306が既に使用されています。別のポートを試します。';
    }
    
    if (errorMessage.includes('No such container')) {
      return 'MySQLコンテナが見つかりません。';
    }
    
    if (errorMessage.includes('disk space') || errorMessage.includes('ENOSPC')) {
      return 'ディスクの空き容量が不足しています。';
    }
    
    if (errorMessage.includes('permission denied')) {
      return 'Dockerの実行権限がありません。管理者権限で実行してください。';
    }
    
    if (errorMessage.includes('Access denied for user') || errorMessage.includes('authentication')) {
      return 'MySQL認証エラーが発生しました。パスワードを確認してください。';
    }
    
    // タイムアウトエラー
    if (errorMessage.includes('タイムアウト')) {
      return errorMessage; // 既にユーザーフレンドリー
    }
    
    // その他のエラー
    return `MySQL設定エラー: ${errorMessage}`;
  }
}

module.exports = { MySQLAutoInstaller };