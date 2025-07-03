const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class DockerDeployer {
  constructor() {
    this.containerPrefix = 'scalardb';
  }

  /**
   * Dockerがインストールされているかチェック
   */
  async checkDockerInstalled() {
    try {
      const result = execSync('docker --version', { 
        encoding: 'utf8',
        stdio: 'pipe' 
      });
      
      return {
        installed: true,
        version: result.trim(),
        running: await this.checkDockerRunning()
      };
    } catch (error) {
      return {
        installed: false,
        version: null,
        running: false
      };
    }
  }

  /**
   * Dockerデーモンが実行中かチェック
   */
  async checkDockerRunning() {
    try {
      execSync('docker info', { stdio: 'pipe' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * ScalarDB用のDocker Composeファイルを生成
   */
  async generateDockerCompose(config) {
    const { database, scalardb, deployment } = config;
    
    const services = {
      version: '3.8',
      services: {}
    };

    // データベースサービスを追加
    if (deployment === 'docker' && database.type) {
      const dbService = this.generateDatabaseService(database);
      if (dbService) {
        services.services[database.type] = dbService;
      }
    }

    // ScalarDBサーバーサービスを追加
    services.services['scalardb-server'] = {
      image: 'scalar-labs/scalardb-server:3.16.0',
      container_name: `${this.containerPrefix}-server`,
      ports: ['60051:60051', '60052:60052'],
      environment: {
        SCALARDB_PROPERTIES: '/scalardb/conf/database.properties'
      },
      volumes: [
        './database.properties:/scalardb/conf/database.properties:ro'
      ],
      depends_on: database.type ? [database.type] : [],
      restart: 'unless-stopped',
      networks: ['scalardb-network']
    };

    // ネットワーク定義
    services.networks = {
      'scalardb-network': {
        driver: 'bridge'
      }
    };

    // ボリューム定義（データベース用）
    if (database.type && this.requiresVolume(database.type)) {
      services.volumes = {
        [`${database.type}-data`]: {}
      };
    }

    return services;
  }

  /**
   * データベースサービスの定義を生成
   */
  generateDatabaseService(database) {
    switch (database.type) {
      case 'postgresql':
        return {
          image: 'postgres:15',
          container_name: `${this.containerPrefix}-postgres`,
          environment: {
            POSTGRES_USER: database.username,
            POSTGRES_PASSWORD: database.password,
            POSTGRES_DB: database.database
          },
          ports: [`${database.port}:5432`],
          volumes: ['postgres-data:/var/lib/postgresql/data'],
          networks: ['scalardb-network'],
          restart: 'unless-stopped'
        };

      case 'mysql':
        return {
          image: 'mysql:8.0',
          container_name: `${this.containerPrefix}-mysql`,
          environment: {
            MYSQL_ROOT_PASSWORD: database.password,
            MYSQL_DATABASE: database.database,
            MYSQL_USER: database.username,
            MYSQL_PASSWORD: database.password
          },
          ports: [`${database.port}:3306`],
          volumes: ['mysql-data:/var/lib/mysql'],
          networks: ['scalardb-network'],
          restart: 'unless-stopped'
        };

      case 'cassandra':
        return {
          image: 'cassandra:4.1',
          container_name: `${this.containerPrefix}-cassandra`,
          environment: {
            CASSANDRA_CLUSTER_NAME: 'ScalarDB Cluster',
            CASSANDRA_DC: 'datacenter1',
            CASSANDRA_ENDPOINT_SNITCH: 'GossipingPropertyFileSnitch'
          },
          ports: [`${database.port}:9042`],
          volumes: ['cassandra-data:/var/lib/cassandra'],
          networks: ['scalardb-network'],
          restart: 'unless-stopped'
        };

      default:
        // DynamoDBやCosmos DBなどのクラウドサービスは外部接続
        return null;
    }
  }

  /**
   * データベースタイプがボリュームを必要とするかチェック
   */
  requiresVolume(dbType) {
    return ['postgresql', 'mysql', 'cassandra'].includes(dbType);
  }

  /**
   * Docker Composeを使用してサービスを起動
   */
  async deployWithDockerCompose(projectPath) {
    try {
      // docker-compose.ymlが存在するか確認
      const composePath = path.join(projectPath, 'docker-compose.yml');
      await fs.access(composePath);

      // 既存のコンテナを停止
      try {
        execSync(`docker-compose -f ${composePath} down`, {
          cwd: projectPath,
          stdio: 'pipe'
        });
      } catch (error) {
        // 既存のコンテナがない場合はエラーを無視
      }

      // コンテナを起動
      const result = execSync(`docker-compose -f ${composePath} up -d`, {
        cwd: projectPath,
        encoding: 'utf8'
      });

      // 起動したコンテナの状態を確認
      const status = await this.checkContainerStatus(projectPath);

      return {
        success: true,
        message: 'Dockerコンテナが正常に起動しました',
        output: result,
        containers: status
      };
    } catch (error) {
      return {
        success: false,
        message: 'Dockerデプロイメントに失敗しました',
        error: error.message
      };
    }
  }

  /**
   * コンテナの状態を確認
   */
  async checkContainerStatus(projectPath) {
    try {
      const result = execSync(`docker-compose -f ${path.join(projectPath, 'docker-compose.yml')} ps --format json`, {
        cwd: projectPath,
        encoding: 'utf8'
      });

      const containers = result.trim().split('\n')
        .filter(line => line)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch (e) {
            return null;
          }
        })
        .filter(container => container !== null);

      return containers;
    } catch (error) {
      // JSONフォーマットがサポートされていない場合は従来の形式を使用
      try {
        const result = execSync(`docker-compose -f ${path.join(projectPath, 'docker-compose.yml')} ps`, {
          cwd: projectPath,
          encoding: 'utf8'
        });

        return {
          raw: result,
          parsed: false
        };
      } catch (err) {
        return [];
      }
    }
  }

  /**
   * 単一のDockerコンテナとしてScalarDBを起動
   */
  async deployScalarDBContainer(config) {
    try {
      const containerName = `${this.containerPrefix}-server`;
      
      // 既存のコンテナを停止・削除
      try {
        execSync(`docker stop ${containerName}`, { stdio: 'pipe' });
        execSync(`docker rm ${containerName}`, { stdio: 'pipe' });
      } catch (error) {
        // コンテナが存在しない場合はエラーを無視
      }

      // database.propertiesファイルのパスを取得
      const configPath = path.join(config.installPath || '/tmp/scalardb-config', 'database.properties');

      // Dockerコマンドを構築
      const dockerCmd = [
        'docker run -d',
        `--name ${containerName}`,
        '-p 60051:60051',
        '-p 60052:60052',
        `-v ${configPath}:/scalardb/conf/database.properties:ro`,
        '--restart unless-stopped',
        'scalar-labs/scalardb-server:3.16.0'
      ].join(' ');

      const result = execSync(dockerCmd, { encoding: 'utf8' });

      return {
        success: true,
        containerId: result.trim(),
        containerName,
        message: 'ScalarDBサーバーコンテナが起動しました'
      };
    } catch (error) {
      return {
        success: false,
        message: 'コンテナの起動に失敗しました',
        error: error.message
      };
    }
  }

  /**
   * コンテナのログを取得
   */
  async getContainerLogs(containerName, lines = 100) {
    try {
      const result = execSync(`docker logs --tail ${lines} ${containerName}`, {
        encoding: 'utf8'
      });

      return {
        success: true,
        logs: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * すべてのScalarDB関連コンテナを停止
   */
  async stopAllContainers() {
    try {
      // ScalarDBプレフィックスを持つコンテナを検索
      const containers = execSync(`docker ps -a --filter "name=${this.containerPrefix}" --format "{{.Names}}"`, {
        encoding: 'utf8'
      }).trim().split('\n').filter(name => name);

      const stopped = [];
      for (const container of containers) {
        try {
          execSync(`docker stop ${container}`, { stdio: 'pipe' });
          execSync(`docker rm ${container}`, { stdio: 'pipe' });
          stopped.push(container);
        } catch (error) {
          // エラーを無視して続行
        }
      }

      return {
        success: true,
        stopped,
        message: `${stopped.length}個のコンテナを停止しました`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * コンテナの健全性をチェック
   */
  async checkContainerHealth(containerName) {
    try {
      const result = execSync(`docker inspect ${containerName} --format='{{.State.Health.Status}}'`, {
        encoding: 'utf8'
      }).trim();

      return {
        healthy: result === 'healthy',
        status: result
      };
    } catch (error) {
      // ヘルスチェックが設定されていない場合は実行状態を確認
      try {
        const running = execSync(`docker inspect ${containerName} --format='{{.State.Running}}'`, {
          encoding: 'utf8'
        }).trim();

        return {
          healthy: running === 'true',
          status: running === 'true' ? 'running' : 'stopped'
        };
      } catch (err) {
        return {
          healthy: false,
          status: 'unknown'
        };
      }
    }
  }
}

module.exports = { DockerDeployer };