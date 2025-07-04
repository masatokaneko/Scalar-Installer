const { MySQLAutoInstaller } = require('./mysql-auto-installer');
const { DockerDeployer } = require('./docker-deployer');
const net = require('net');
const crypto = require('crypto');

jest.mock('./docker-deployer');
jest.mock('net');
jest.mock('crypto');

describe('MySQLAutoInstaller', () => {
  let installer;
  let mockDockerDeployer;
  
  beforeEach(() => {
    mockDockerDeployer = {
      checkDockerInstalled: jest.fn(),
      pullImage: jest.fn(),
      createContainer: jest.fn(),
      startContainer: jest.fn(),
      execCommand: jest.fn(),
      getContainerInfo: jest.fn(),
      removeContainer: jest.fn(),
      stopContainer: jest.fn()
    };
    
    DockerDeployer.mockReturnValue(mockDockerDeployer);
    installer = new MySQLAutoInstaller();
    jest.clearAllMocks();
  });
  
  describe('checkPrerequisites', () => {
    it('Dockerがインストールされ起動している場合は成功する', async () => {
      mockDockerDeployer.checkDockerInstalled.mockResolvedValue({
        installed: true,
        running: true,
        version: '24.0.7'
      });
      
      const result = await installer.checkPrerequisites();
      
      expect(result).toBe(true);
      expect(mockDockerDeployer.checkDockerInstalled).toHaveBeenCalled();
    });
    
    it('Dockerがインストールされていない場合はユーザーフレンドリーなエラーを投げる', async () => {
      mockDockerDeployer.checkDockerInstalled.mockResolvedValue({
        installed: false,
        running: false
      });
      
      await expect(installer.checkPrerequisites())
        .rejects.toThrow('Dockerがインストールされていません');
    });
    
    it('Dockerが起動していない場合はユーザーフレンドリーなエラーを投げる', async () => {
      mockDockerDeployer.checkDockerInstalled.mockResolvedValue({
        installed: true,
        running: false
      });
      
      await expect(installer.checkPrerequisites())
        .rejects.toThrow('Dockerが起動していません');
    });
  });
  
  describe('findAvailablePort', () => {
    it('優先ポート3306が利用可能な場合はそれを返す', async () => {
      const mockServer = {
        once: jest.fn((event, callback) => {
          if (event === 'listening') callback();
        }),
        listen: jest.fn(),
        close: jest.fn()
      };
      
      net.createServer.mockReturnValue(mockServer);
      
      const port = await installer.findAvailablePort(3306);
      
      expect(port).toBe(3306);
      expect(mockServer.listen).toHaveBeenCalledWith(3306);
      expect(mockServer.close).toHaveBeenCalled();
    });
    
    it('優先ポートが使用中の場合は次のポートを試す', async () => {
      const mockServer = {
        once: jest.fn(),
        listen: jest.fn(),
        close: jest.fn()
      };
      
      let callCount = 0;
      mockServer.once.mockImplementation((event, callback) => {
        if (event === 'error' && callCount === 0) {
          callCount++;
          callback(new Error('EADDRINUSE'));
        } else if (event === 'listening') {
          callback();
        }
      });
      
      net.createServer.mockReturnValue(mockServer);
      
      const port = await installer.findAvailablePort(3306);
      
      expect(port).toBe(3307);
    });
    
    it('利用可能なポートが見つからない場合はエラーを投げる', async () => {
      const mockServer = {
        once: jest.fn((event, callback) => {
          if (event === 'error') callback(new Error('EADDRINUSE'));
        }),
        listen: jest.fn(),
        close: jest.fn()
      };
      
      net.createServer.mockReturnValue(mockServer);
      
      await expect(installer.findAvailablePort(3306))
        .rejects.toThrow('利用可能なポートが見つかりません');
    });
  });
  
  describe('generateSecurePassword', () => {
    it('16文字のセキュアなパスワードを生成する', () => {
      const mockBytes = Buffer.from('0123456789abcdef0123456789abcdef', 'hex');
      crypto.randomBytes.mockReturnValue(mockBytes);
      
      const password = installer.generateSecurePassword();
      
      expect(password).toHaveLength(16);
      expect(crypto.randomBytes).toHaveBeenCalledWith(16);
    });
  });
  
  describe('checkExistingContainer', () => {
    it('既存のコンテナが存在する場合は情報を返す', async () => {
      mockDockerDeployer.getContainerInfo.mockResolvedValue({
        exists: true,
        running: true,
        id: 'abc123',
        ports: { '3306/tcp': [{ HostPort: '3306' }] }
      });
      
      const result = await installer.checkExistingContainer();
      
      expect(result.exists).toBe(true);
      expect(result.running).toBe(true);
      expect(mockDockerDeployer.getContainerInfo).toHaveBeenCalledWith('scalardb-mysql');
    });
    
    it('コンテナが存在しない場合はexists: falseを返す', async () => {
      mockDockerDeployer.getContainerInfo.mockResolvedValue({
        exists: false
      });
      
      const result = await installer.checkExistingContainer();
      
      expect(result.exists).toBe(false);
    });
  });
  
  describe('waitForReady', () => {
    it('MySQLが起動したらtrueを返す', async () => {
      mockDockerDeployer.execCommand
        .mockResolvedValueOnce({ exitCode: 1, stdout: 'no response' })
        .mockResolvedValueOnce({ exitCode: 1, stdout: 'no response' })
        .mockResolvedValueOnce({ exitCode: 0, stdout: 'mysqld is alive' });
      
      const result = await installer.waitForReady('container123', 'rootpass123');
      
      expect(result).toBe(true);
      expect(mockDockerDeployer.execCommand).toHaveBeenCalledTimes(3);
      expect(mockDockerDeployer.execCommand).toHaveBeenCalledWith('container123', [
        'mysqladmin',
        'ping',
        '-h', 'localhost',
        '-u', 'root',
        '-prootpass123'
      ]);
    });
    
    it('タイムアウトした場合はエラーを投げる', async () => {
      mockDockerDeployer.execCommand.mockResolvedValue({
        exitCode: 1,
        stdout: 'no response'
      });
      
      await expect(installer.waitForReady('container123', 'rootpass123', 3))
        .rejects.toThrow('MySQLの起動がタイムアウトしました');
    }, 10000);
  });
  
  describe('install', () => {
    it('新規インストールが成功する', async () => {
      // Prerequisites check
      mockDockerDeployer.checkDockerInstalled.mockResolvedValue({
        installed: true,
        running: true
      });
      
      // No existing container
      mockDockerDeployer.getContainerInfo.mockResolvedValue({
        exists: false
      });
      
      // Port available
      const mockServer = {
        once: jest.fn((event, callback) => {
          if (event === 'listening') callback();
        }),
        listen: jest.fn(),
        close: jest.fn()
      };
      net.createServer.mockReturnValue(mockServer);
      
      // Password generation
      crypto.randomBytes.mockReturnValue(Buffer.from('0123456789abcdef0123456789abcdef', 'hex'));
      
      // Pull image
      mockDockerDeployer.pullImage.mockResolvedValue({ success: true });
      
      // Create container
      mockDockerDeployer.createContainer.mockResolvedValue({
        success: true,
        containerId: 'container123'
      });
      
      // Start container
      mockDockerDeployer.startContainer.mockResolvedValue({ success: true });
      
      // Wait for ready
      mockDockerDeployer.execCommand.mockResolvedValue({
        exitCode: 0,
        stdout: 'mysqld is alive'
      });
      
      const progressCallback = jest.fn();
      const result = await installer.install({ progressCallback });
      
      expect(result.success).toBe(true);
      expect(result.host).toBe('localhost');
      expect(result.port).toBe(3306);
      expect(result.database).toBe('scalardb');
      expect(result.username).toBe('scalardb');
      expect(result.password).toBeDefined();
      expect(result.rootPassword).toBeDefined();
      expect(progressCallback).toHaveBeenCalledWith({
        step: 'complete',
        progress: 100,
        message: 'MySQLのインストールが完了しました'
      });
    });
    
    it('既存コンテナを再利用する場合', async () => {
      // Prerequisites check
      mockDockerDeployer.checkDockerInstalled.mockResolvedValue({
        installed: true,
        running: true
      });
      
      // Existing container
      mockDockerDeployer.getContainerInfo.mockResolvedValue({
        exists: true,
        running: true,
        id: 'existing123',
        ports: { '3306/tcp': [{ HostPort: '3307' }] }
      });
      
      const result = await installer.install({ reuseExisting: true });
      
      expect(result.success).toBe(true);
      expect(result.port).toBe(3307);
      expect(result.reused).toBe(true);
      expect(mockDockerDeployer.pullImage).not.toHaveBeenCalled();
      expect(mockDockerDeployer.createContainer).not.toHaveBeenCalled();
    });
    
    it('エラー時は詳細なエラーメッセージを含む', async () => {
      mockDockerDeployer.checkDockerInstalled.mockResolvedValue({
        installed: true,
        running: true
      });
      
      mockDockerDeployer.getContainerInfo.mockResolvedValue({
        exists: false
      });
      
      mockDockerDeployer.pullImage.mockRejectedValue(new Error('Network error'));
      
      await expect(installer.install({}))
        .rejects.toThrow('MySQLイメージのダウンロードに失敗しました');
    });
  });
  
  describe('stop', () => {
    it('コンテナを停止する', async () => {
      mockDockerDeployer.getContainerInfo.mockResolvedValue({
        exists: true,
        running: true,
        id: 'container123'
      });
      
      mockDockerDeployer.stopContainer.mockResolvedValue({ success: true });
      
      const result = await installer.stop();
      
      expect(result.success).toBe(true);
      expect(mockDockerDeployer.stopContainer).toHaveBeenCalledWith('container123');
    });
  });
  
  describe('remove', () => {
    it('コンテナとボリュームを削除する', async () => {
      mockDockerDeployer.removeContainer.mockResolvedValue({ success: true });
      
      const result = await installer.remove();
      
      expect(result.success).toBe(true);
      expect(mockDockerDeployer.removeContainer).toHaveBeenCalledWith(
        'scalardb-mysql',
        { removeVolumes: true }
      );
    });
  });
  
  describe('getUserFriendlyError', () => {
    it('技術的エラーを非技術者向けメッセージに変換する', () => {
      const testCases = [
        {
          error: new Error('Cannot connect to the Docker daemon'),
          expected: 'Dockerが起動していません。Docker Desktopを起動してください。'
        },
        {
          error: new Error('pull access denied'),
          expected: 'MySQLイメージのダウンロードに失敗しました。インターネット接続を確認してください。'
        },
        {
          error: new Error('port is already allocated'),
          expected: 'ポート3306が既に使用されています。別のポートを試します。'
        },
        {
          error: new Error('Access denied for user'),
          expected: 'MySQL認証エラーが発生しました。パスワードを確認してください。'
        }
      ];
      
      testCases.forEach(({ error, expected }) => {
        const message = installer.getUserFriendlyError(error);
        expect(message).toBe(expected);
      });
    });
  });
  
  describe('MySQL固有のテスト', () => {
    it('デフォルトポートが3306である', () => {
      expect(installer.DEFAULT_PORT).toBe(3306);
    });
    
    it('コンテナ名がscalardb-mysqlである', () => {
      expect(installer.CONTAINER_NAME).toBe('scalardb-mysql');
    });
    
    it('イメージ名がmysql:8.0である', () => {
      expect(installer.IMAGE_NAME).toBe('mysql:8.0');
    });
    
    it('データボリューム名がscalardb-mysql-dataである', () => {
      expect(installer.DATA_VOLUME).toBe('scalardb-mysql-data');
    });
  });
});