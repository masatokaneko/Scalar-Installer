const { PostgreSQLAutoInstaller } = require('./postgresql-auto-installer');
const { DockerDeployer } = require('./docker-deployer');
const net = require('net');
const crypto = require('crypto');

jest.mock('./docker-deployer');
jest.mock('net');
jest.mock('crypto');

describe('PostgreSQLAutoInstaller', () => {
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
      removeContainer: jest.fn()
    };
    
    DockerDeployer.mockImplementation(() => mockDockerDeployer);
    installer = new PostgreSQLAutoInstaller();
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
    it('優先ポートが利用可能な場合はそれを返す', async () => {
      const mockServer = {
        once: jest.fn((event, callback) => {
          if (event === 'listening') callback();
        }),
        listen: jest.fn(),
        close: jest.fn()
      };
      
      net.createServer.mockReturnValue(mockServer);
      
      const port = await installer.findAvailablePort(5432);
      
      expect(port).toBe(5432);
      expect(mockServer.listen).toHaveBeenCalledWith(5432);
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
      
      const port = await installer.findAvailablePort(5432);
      
      expect(port).toBe(5433);
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
      
      await expect(installer.findAvailablePort(5432))
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
        ports: { '5432/tcp': [{ HostPort: '5432' }] }
      });
      
      const result = await installer.checkExistingContainer();
      
      expect(result.exists).toBe(true);
      expect(result.running).toBe(true);
      expect(mockDockerDeployer.getContainerInfo).toHaveBeenCalledWith('scalardb-postgres');
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
    it('PostgreSQLが起動したらtrueを返す', async () => {
      mockDockerDeployer.execCommand
        .mockResolvedValueOnce({ exitCode: 1, stdout: 'no response' })
        .mockResolvedValueOnce({ exitCode: 1, stdout: 'no response' })
        .mockResolvedValueOnce({ exitCode: 0, stdout: 'accepting connections' });
      
      const result = await installer.waitForReady('container123');
      
      expect(result).toBe(true);
      expect(mockDockerDeployer.execCommand).toHaveBeenCalledTimes(3);
      expect(mockDockerDeployer.execCommand).toHaveBeenCalledWith('container123', [
        'pg_isready',
        '-U', 'scalardb',
        '-d', 'scalardb'
      ]);
    });
    
    it('タイムアウトした場合はエラーを投げる', async () => {
      mockDockerDeployer.execCommand.mockResolvedValue({
        exitCode: 1,
        stdout: 'no response'
      });
      
      await expect(installer.waitForReady('container123', 3))
        .rejects.toThrow('PostgreSQLの起動がタイムアウトしました');
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
        stdout: 'accepting connections'
      });
      
      const progressCallback = jest.fn();
      const result = await installer.install({ progressCallback });
      
      expect(result.success).toBe(true);
      expect(result.host).toBe('localhost');
      expect(result.port).toBe(5432);
      expect(result.database).toBe('scalardb');
      expect(result.username).toBe('scalardb');
      expect(result.password).toBeDefined();
      expect(progressCallback).toHaveBeenCalledWith({
        step: 'complete',
        progress: 100,
        message: 'PostgreSQLのインストールが完了しました'
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
        ports: { '5432/tcp': [{ HostPort: '5433' }] }
      });
      
      const result = await installer.install({ reuseExisting: true });
      
      expect(result.success).toBe(true);
      expect(result.port).toBe(5433);
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
        .rejects.toThrow('PostgreSQLイメージのダウンロードに失敗しました');
    });
  });
  
  describe('remove', () => {
    it('コンテナとボリュームを削除する', async () => {
      mockDockerDeployer.removeContainer.mockResolvedValue({ success: true });
      
      const result = await installer.remove();
      
      expect(result.success).toBe(true);
      expect(mockDockerDeployer.removeContainer).toHaveBeenCalledWith(
        'scalardb-postgres',
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
          expected: 'PostgreSQLイメージのダウンロードに失敗しました。インターネット接続を確認してください。'
        },
        {
          error: new Error('port is already allocated'),
          expected: 'ポート5432が既に使用されています。別のポートを試します。'
        }
      ];
      
      testCases.forEach(({ error, expected }) => {
        const message = installer.getUserFriendlyError(error);
        expect(message).toBe(expected);
      });
    });
  });
});