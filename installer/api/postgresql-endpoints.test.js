const request = require('supertest');
const app = require('./installer-server');
const { PostgreSQLAutoInstaller } = require('../core/postgresql-auto-installer');

jest.mock('../core/postgresql-auto-installer');
jest.mock('../core/websocket-server');

describe('PostgreSQL自動インストールAPIエンドポイント', () => {
  let mockPostgreSQLAutoInstaller;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPostgreSQLAutoInstaller = {
      install: jest.fn(),
      checkExistingContainer: jest.fn(),
      stop: jest.fn(),
      remove: jest.fn()
    };
    
    PostgreSQLAutoInstaller.mockReturnValue(mockPostgreSQLAutoInstaller);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('POST /api/database/postgresql/install', () => {
    it('PostgreSQLを正常にインストールする', async () => {
      const mockResult = {
        success: true,
        host: 'localhost',
        port: 5432,
        database: 'scalardb',
        username: 'scalardb',
        password: 'securePassword123',
        containerId: 'abc123'
      };
      
      mockPostgreSQLAutoInstaller.install.mockResolvedValue(mockResult);
      
      const response = await request(app)
        .post('/api/database/postgresql/install')
        .send({ reuseExisting: false })
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        result: mockResult
      });
      
      expect(mockPostgreSQLAutoInstaller.install).toHaveBeenCalledWith({
        progressCallback: expect.any(Function),
        reuseExisting: false
      });
    });
    
    it('既存のコンテナを再利用する', async () => {
      const mockResult = {
        success: true,
        reused: true,
        host: 'localhost',
        port: 5432,
        database: 'scalardb',
        username: 'scalardb',
        password: '既存のパスワードを使用してください'
      };
      
      mockPostgreSQLAutoInstaller.install.mockResolvedValue(mockResult);
      
      const response = await request(app)
        .post('/api/database/postgresql/install')
        .send({ reuseExisting: true })
        .expect(200);
      
      expect(response.body.result.reused).toBe(true);
    });
    
    it('エラー時は適切なメッセージを返す', async () => {
      const error = new Error('Dockerがインストールされていません');
      error.userMessage = 'Dockerデスクトップをインストールしてください';
      error.actionLink = 'https://www.docker.com/products/docker-desktop';
      
      mockPostgreSQLAutoInstaller.install.mockRejectedValue(error);
      
      const response = await request(app)
        .post('/api/database/postgresql/install')
        .send({})
        .expect(500);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Dockerがインストールされていません',
        userMessage: 'Dockerデスクトップをインストールしてください',
        actionLink: 'https://www.docker.com/products/docker-desktop'
      });
    });
  });
  
  describe('GET /api/database/postgresql/status', () => {
    it('既存コンテナの状態を返す', async () => {
      const mockStatus = {
        exists: true,
        running: true,
        id: 'container123',
        port: 5432
      };
      
      mockPostgreSQLAutoInstaller.checkExistingContainer.mockResolvedValue(mockStatus);
      
      const response = await request(app)
        .get('/api/database/postgresql/status')
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        status: mockStatus
      });
    });
    
    it('コンテナが存在しない場合', async () => {
      mockPostgreSQLAutoInstaller.checkExistingContainer.mockResolvedValue({
        exists: false
      });
      
      const response = await request(app)
        .get('/api/database/postgresql/status')
        .expect(200);
      
      expect(response.body.status.exists).toBe(false);
    });
  });
  
  describe('POST /api/database/postgresql/stop', () => {
    it('PostgreSQLを停止する', async () => {
      mockPostgreSQLAutoInstaller.stop.mockResolvedValue({
        success: true,
        message: 'PostgreSQLを停止しました'
      });
      
      const response = await request(app)
        .post('/api/database/postgresql/stop')
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        result: {
          success: true,
          message: 'PostgreSQLを停止しました'
        }
      });
    });
  });
  
  describe('POST /api/database/postgresql/remove', () => {
    it('PostgreSQLコンテナを削除する', async () => {
      mockPostgreSQLAutoInstaller.remove.mockResolvedValue({
        success: true,
        message: 'PostgreSQLを削除しました'
      });
      
      const response = await request(app)
        .post('/api/database/postgresql/remove')
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        result: {
          success: true,
          message: 'PostgreSQLを削除しました'
        }
      });
    });
  });
});