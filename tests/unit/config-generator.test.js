const { ConfigGenerator } = require('../../installer/core/config-generator');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('ConfigGenerator', () => {
  let configGenerator;
  let tempDir;

  beforeEach(async () => {
    configGenerator = new ConfigGenerator();
    tempDir = path.join(os.tmpdir(), 'config-test-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // エラーを無視
    }
  });

  describe('generateDatabaseProperties', () => {
    it('should generate PostgreSQL database properties', () => {
      const config = {
        database: {
          type: 'postgresql',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'postgres',
          database: 'scalardb'
        },
        transaction: {
          manager: 'consensus-commit',
          isolationLevel: 'SNAPSHOT'
        }
      };

      const properties = configGenerator.generateDatabaseProperties(config);

      expect(properties).toContain('scalar.db.transaction_manager=consensus-commit');
      expect(properties).toContain('scalar.db.storage=jdbc');
      expect(properties).toContain('scalar.db.contact_points=jdbc:postgresql://localhost:5432/scalardb');
      expect(properties).toContain('scalar.db.username=postgres');
      expect(properties).toContain('scalar.db.password=postgres');
      expect(properties).toContain('scalar.db.consensus_commit.isolation_level=SNAPSHOT');
    });

    it('should generate MySQL database properties', () => {
      const config = {
        database: {
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          username: 'root',
          password: 'mysql',
          database: 'scalardb'
        },
        transaction: {
          manager: 'consensus-commit'
        }
      };

      const properties = configGenerator.generateDatabaseProperties(config);

      expect(properties).toContain('scalar.db.storage=jdbc');
      expect(properties).toContain('scalar.db.contact_points=jdbc:mysql://localhost:3306/scalardb');
      expect(properties).toContain('scalar.db.username=root');
      expect(properties).toContain('scalar.db.password=mysql');
    });

    it('should generate Cassandra database properties', () => {
      const config = {
        database: {
          type: 'cassandra',
          hosts: ['localhost'],
          port: 9042,
          username: 'cassandra',
          password: 'cassandra'
        },
        transaction: {
          manager: 'consensus-commit'
        }
      };

      const properties = configGenerator.generateDatabaseProperties(config);

      expect(properties).toContain('scalar.db.storage=cassandra');
      expect(properties).toContain('scalar.db.contact_points=localhost');
      expect(properties).toContain('scalar.db.contact_port=9042');
      expect(properties).toContain('scalar.db.username=cassandra');
      expect(properties).toContain('scalar.db.password=cassandra');
    });

    it('should generate DynamoDB properties', () => {
      const config = {
        database: {
          type: 'dynamodb',
          region: 'us-east-1',
          accessKey: 'ACCESS_KEY',
          secretKey: 'SECRET_KEY',
          endpointOverride: 'http://localhost:8000'
        },
        transaction: {
          manager: 'consensus-commit'
        }
      };

      const properties = configGenerator.generateDatabaseProperties(config);

      expect(properties).toContain('scalar.db.storage=dynamo');
      expect(properties).toContain('scalar.db.contact_points=us-east-1');
      expect(properties).toContain('scalar.db.username=ACCESS_KEY');
      expect(properties).toContain('scalar.db.password=SECRET_KEY');
      expect(properties).toContain('scalar.db.dynamo.endpoint_override=http://localhost:8000');
    });

    it('should include SQL configuration when enabled', () => {
      const config = {
        database: {
          type: 'postgresql',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'postgres',
          database: 'scalardb'
        },
        transaction: {
          manager: 'consensus-commit'
        },
        sql: {
          enabled: true,
          port: 60052
        }
      };

      const properties = configGenerator.generateDatabaseProperties(config);

      expect(properties).toContain('scalar.db.sql.enabled=true');
      expect(properties).toContain('scalar.db.sql.server.port=60052');
    });

    it('should include metrics configuration when enabled', () => {
      const config = {
        database: {
          type: 'postgresql',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'postgres',
          database: 'scalardb'
        },
        transaction: {
          manager: 'consensus-commit'
        },
        metrics: {
          enabled: true,
          port: 8080
        }
      };

      const properties = configGenerator.generateDatabaseProperties(config);

      expect(properties).toContain('scalar.db.metrics.enabled=true');
      expect(properties).toContain('scalar.db.metrics.port=8080');
    });
  });

  describe('generateSchema', () => {
    it('should generate schema for single table', () => {
      const tableConfig = {
        tableName: 'users',
        transactionEnabled: true,
        partitionKeys: ['user_id'],
        clusteringKeys: ['created_at'],
        columns: [
          { name: 'user_id', type: 'TEXT' },
          { name: 'name', type: 'TEXT' },
          { name: 'email', type: 'TEXT' },
          { name: 'created_at', type: 'BIGINT' }
        ],
        secondaryIndexes: ['email']
      };

      const schema = configGenerator.generateSchema(tableConfig);
      const schemaObj = JSON.parse(schema);

      expect(schemaObj.users).toBeDefined();
      expect(schemaObj.users.transaction).toBe(true);
      expect(schemaObj.users['partition-key']).toEqual(['user_id']);
      expect(schemaObj.users['clustering-key']).toEqual(['created_at']);
      expect(schemaObj.users.columns).toEqual({
        user_id: 'TEXT',
        name: 'TEXT',
        email: 'TEXT',
        created_at: 'BIGINT'
      });
      expect(schemaObj.users['secondary-index']).toEqual(['email']);
    });

    it('should generate schema without clustering keys', () => {
      const tableConfig = {
        tableName: 'orders',
        transactionEnabled: false,
        partitionKeys: ['order_id'],
        columns: [
          { name: 'order_id', type: 'TEXT' },
          { name: 'amount', type: 'INT' }
        ]
      };

      const schema = configGenerator.generateSchema(tableConfig);
      const schemaObj = JSON.parse(schema);

      expect(schemaObj.orders['clustering-key']).toBeUndefined();
      expect(schemaObj.orders['secondary-index']).toBeUndefined();
    });
  });

  describe('generateDockerCompose', () => {
    it('should generate Docker Compose for PostgreSQL', () => {
      const config = {
        database: {
          type: 'postgresql',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'postgres',
          database: 'scalardb'
        },
        scalardb: {
          server: true,
          version: '3.16.0',
          serverPort: 60051,
          metricsPort: 8080
        }
      };

      const dockerCompose = configGenerator.generateDockerCompose(config);

      expect(dockerCompose).toContain('postgres:15');
      expect(dockerCompose).toContain('POSTGRES_DB: scalardb');
      expect(dockerCompose).toContain('POSTGRES_USER: postgres');
      expect(dockerCompose).toContain('POSTGRES_PASSWORD: postgres');
      expect(dockerCompose).toContain('scalardb-server:3.16.0');
      expect(dockerCompose).toContain('60051:60051');
    });

    it('should generate Docker Compose for MySQL', () => {
      const config = {
        database: {
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          username: 'root',
          password: 'mysql',
          database: 'scalardb',
          rootPassword: 'rootpass'
        }
      };

      const dockerCompose = configGenerator.generateDockerCompose(config);

      expect(dockerCompose).toContain('mysql:8.0');
      expect(dockerCompose).toContain('MYSQL_DATABASE: scalardb');
      expect(dockerCompose).toContain('MYSQL_ROOT_PASSWORD: rootpass');
    });

    it('should include monitoring services when enabled', () => {
      const config = {
        database: {
          type: 'postgresql',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'postgres',
          database: 'scalardb'
        },
        monitoring: {
          enabled: true,
          grafanaPassword: 'admin123'
        }
      };

      const dockerCompose = configGenerator.generateDockerCompose(config);

      expect(dockerCompose).toContain('prometheus:latest');
      expect(dockerCompose).toContain('grafana:latest');
      expect(dockerCompose).toContain('GF_SECURITY_ADMIN_PASSWORD: admin123');
    });
  });

  describe('saveConfiguration', () => {
    it('should save database properties to file', async () => {
      const config = {
        database: {
          type: 'postgresql',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'postgres',
          database: 'scalardb'
        },
        transaction: {
          manager: 'consensus-commit'
        }
      };

      const outputPath = path.join(tempDir, 'database.properties');
      const result = await configGenerator.saveConfiguration(config, 'database-properties', outputPath);

      expect(result.success).toBe(true);
      expect(result.filePath).toBe(outputPath);

      const content = await fs.readFile(outputPath, 'utf8');
      expect(content).toContain('scalar.db.storage=jdbc');
      expect(content).toContain('scalar.db.username=postgres');
    });

    it('should save schema to file', async () => {
      const tableConfig = {
        tableName: 'users',
        transactionEnabled: true,
        partitionKeys: ['user_id'],
        columns: [
          { name: 'user_id', type: 'TEXT' },
          { name: 'name', type: 'TEXT' }
        ]
      };

      const outputPath = path.join(tempDir, 'schema.json');
      const result = await configGenerator.saveConfiguration(tableConfig, 'schema', outputPath);

      expect(result.success).toBe(true);
      expect(result.filePath).toBe(outputPath);

      const content = await fs.readFile(outputPath, 'utf8');
      const schema = JSON.parse(content);
      expect(schema.users).toBeDefined();
    });

    it('should save Docker Compose to file', async () => {
      const config = {
        database: {
          type: 'postgresql',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'postgres',
          database: 'scalardb'
        }
      };

      const outputPath = path.join(tempDir, 'docker-compose.yml');
      const result = await configGenerator.saveConfiguration(config, 'docker-compose', outputPath);

      expect(result.success).toBe(true);
      expect(result.filePath).toBe(outputPath);

      const content = await fs.readFile(outputPath, 'utf8');
      expect(content).toContain('version:');
      expect(content).toContain('postgres:15');
    });
  });

  describe('validateConfiguration', () => {
    it('should validate valid PostgreSQL configuration', () => {
      const config = {
        database: {
          type: 'postgresql',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'postgres',
          database: 'scalardb'
        },
        transaction: {
          manager: 'consensus-commit'
        }
      };

      const result = configGenerator.validateConfiguration(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect missing required fields', () => {
      const config = {
        database: {
          type: 'postgresql',
          host: 'localhost'
          // missing port, username, password, database
        }
      };

      const result = configGenerator.validateConfiguration(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Database port is required');
      expect(result.errors).toContain('Database username is required');
      expect(result.errors).toContain('Database password is required');
      expect(result.errors).toContain('Database name is required');
    });

    it('should validate port numbers', () => {
      const config = {
        database: {
          type: 'postgresql',
          host: 'localhost',
          port: 'invalid',
          username: 'postgres',
          password: 'postgres',
          database: 'scalardb'
        }
      };

      const result = configGenerator.validateConfiguration(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Database port must be a valid number');
    });
  });
});