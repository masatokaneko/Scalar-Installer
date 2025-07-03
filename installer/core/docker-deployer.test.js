const { DockerDeployer } = require('./docker-deployer');
const { execSync } = require('child_process');

jest.mock('child_process');
jest.mock('fs').promises;

describe('DockerDeployer', () => {
  let deployer;

  beforeEach(() => {
    deployer = new DockerDeployer();
    jest.clearAllMocks();
  });

  describe('checkDockerInstalled', () => {
    it('Dockerがインストールされている場合はtrueを返す', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd === 'docker --version') {
          return 'Docker version 24.0.0, build 1234567';
        }
        if (cmd === 'docker info') {
          return 'Docker info output';
        }
      });

      const result = await deployer.checkDockerInstalled();
      
      expect(result.installed).toBe(true);
      expect(result.version).toContain('Docker version 24.0.0');
      expect(result.running).toBe(true);
    });

    it('Dockerがインストールされていない場合はfalseを返す', async () => {
      execSync.mockImplementation(() => {
        throw new Error('command not found: docker');
      });

      const result = await deployer.checkDockerInstalled();
      
      expect(result.installed).toBe(false);
      expect(result.running).toBe(false);
    });
  });

  describe('generateDockerCompose', () => {
    it('PostgreSQL用のDocker Compose設定を生成する', async () => {
      const config = {
        database: {
          type: 'postgresql',
          host: 'localhost',
          port: 5432,
          username: 'testuser',
          password: 'testpass',
          database: 'testdb'
        },
        deployment: 'docker'
      };

      const compose = await deployer.generateDockerCompose(config);
      
      expect(compose.version).toBe('3.8');
      expect(compose.services.postgresql).toBeDefined();
      expect(compose.services['scalardb-server']).toBeDefined();
      expect(compose.services.postgresql.image).toBe('postgres:15');
      expect(compose.services.postgresql.environment.POSTGRES_USER).toBe('testuser');
      expect(compose.volumes).toBeDefined();
      expect(compose.volumes['postgresql-data']).toEqual({});
    });

    it('MySQL用のDocker Compose設定を生成する', async () => {
      const config = {
        database: {
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          username: 'testuser',
          password: 'testpass',
          database: 'testdb'
        },
        deployment: 'docker'
      };

      const compose = await deployer.generateDockerCompose(config);
      
      expect(compose.services.mysql).toBeDefined();
      expect(compose.services.mysql.image).toBe('mysql:8.0');
      expect(compose.services.mysql.environment.MYSQL_USER).toBe('testuser');
      expect(compose.volumes['mysql-data']).toBeDefined();
    });

    it('Cassandra用のDocker Compose設定を生成する', async () => {
      const config = {
        database: {
          type: 'cassandra',
          hosts: 'localhost',
          port: 9042,
          username: 'testuser',
          password: 'testpass'
        },
        deployment: 'docker'
      };

      const compose = await deployer.generateDockerCompose(config);
      
      expect(compose.services.cassandra).toBeDefined();
      expect(compose.services.cassandra.image).toBe('cassandra:4.1');
      expect(compose.volumes['cassandra-data']).toBeDefined();
    });

    it('ScalarDBサーバーの設定を含む', async () => {
      const config = {
        database: {
          type: 'dynamodb',
          region: 'us-east-1'
        },
        deployment: 'docker'
      };

      const compose = await deployer.generateDockerCompose(config);
      
      expect(compose.services['scalardb-server']).toBeDefined();
      expect(compose.services['scalardb-server'].image).toBe('scalar-labs/scalardb-server:3.16.0');
      expect(compose.services['scalardb-server'].ports).toContain('60051:60051');
      expect(compose.networks['scalardb-network']).toBeDefined();
    });
  });

  describe('deployScalarDBContainer', () => {
    it('ScalarDBコンテナを正常に起動する', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('docker run')) {
          return 'abc123def456'; // Container ID
        }
        return '';
      });

      const config = {
        installPath: '/tmp/scalardb-config'
      };

      const result = await deployer.deployScalarDBContainer(config);
      
      expect(result.success).toBe(true);
      expect(result.containerId).toBe('abc123def456');
      expect(result.containerName).toBe('scalardb-server');
    });

    it('コンテナ起動エラーを処理する', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('docker run')) {
          throw new Error('Docker daemon not running');
        }
        return '';
      });

      const config = {
        installPath: '/tmp/scalardb-config'
      };

      const result = await deployer.deployScalarDBContainer(config);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Docker daemon not running');
    });
  });

  describe('checkContainerHealth', () => {
    it('健全なコンテナを検出する', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('Health.Status')) {
          return 'healthy\n';
        }
        return '';
      });

      const result = await deployer.checkContainerHealth('test-container');
      
      expect(result.healthy).toBe(true);
      expect(result.status).toBe('healthy');
    });

    it('ヘルスチェックがない場合は実行状態を確認する', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('Health.Status')) {
          throw new Error('No health check');
        }
        if (cmd.includes('State.Running')) {
          return 'true\n';
        }
        return '';
      });

      const result = await deployer.checkContainerHealth('test-container');
      
      expect(result.healthy).toBe(true);
      expect(result.status).toBe('running');
    });
  });

  describe('stopAllContainers', () => {
    it('すべてのScalarDB関連コンテナを停止する', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('docker ps')) {
          return 'scalardb-server\nscalardb-postgres\n';
        }
        return '';
      });

      const result = await deployer.stopAllContainers();
      
      expect(result.success).toBe(true);
      expect(result.stopped).toContain('scalardb-server');
      expect(result.stopped).toContain('scalardb-postgres');
      expect(result.stopped.length).toBe(2);
    });

    it('コンテナが存在しない場合も正常に処理する', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('docker ps')) {
          return '';
        }
        return '';
      });

      const result = await deployer.stopAllContainers();
      
      expect(result.success).toBe(true);
      expect(result.stopped.length).toBe(0);
    });
  });

  describe('getContainerLogs', () => {
    it('コンテナのログを取得する', async () => {
      const mockLogs = '2024-01-03 10:00:00 INFO Starting ScalarDB Server...';
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('docker logs')) {
          return mockLogs;
        }
        return '';
      });

      const result = await deployer.getContainerLogs('scalardb-server', 50);
      
      expect(result.success).toBe(true);
      expect(result.logs).toBe(mockLogs);
    });

    it('ログ取得エラーを処理する', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('docker logs')) {
          throw new Error('Container not found');
        }
        return '';
      });

      const result = await deployer.getContainerLogs('non-existent', 50);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Container not found');
    });
  });
});