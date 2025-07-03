const fs = require('fs').promises;
const path = require('path');
const { DatabaseTester } = require('./database-tester');

class SchemaManager {
  constructor() {
    this.databaseTester = new DatabaseTester();
  }

  /**
   * スキーマJSONファイルからデータベーススキーマを作成
   * @param {Object} database - データベース設定
   * @param {string} schemaPath - スキーマJSONファイルのパス
   * @returns {Object} { success: boolean, message: string, tables?: Array }
   */
  async createSchema(database, schemaPath) {
    try {
      // スキーマファイルを読み込み
      const schemaContent = await fs.readFile(schemaPath, 'utf8');
      const schema = JSON.parse(schemaContent);

      // データベース接続を確認
      const connectionResult = await this.databaseTester.testConnection(database);
      if (!connectionResult.connected) {
        throw new Error(`データベース接続に失敗: ${connectionResult.message}`);
      }

      // データベース種別に応じたスキーマ作成
      switch (database.type) {
        case 'postgresql':
          return await this.createPostgreSQLSchema(database, schema);
        case 'mysql':
          return await this.createMySQLSchema(database, schema);
        case 'cassandra':
          return await this.createCassandraSchema(database, schema);
        case 'dynamodb':
          return await this.createDynamoDBSchema(database, schema);
        case 'cosmos':
          return await this.createCosmosDBSchema(database, schema);
        default:
          throw new Error(`サポートされていないデータベース: ${database.type}`);
      }
    } catch (error) {
      return {
        success: false,
        message: `スキーマ作成エラー: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * PostgreSQL用スキーマ作成
   */
  async createPostgreSQLSchema(database, schema) {
    const { Client } = require('pg');
    const client = new Client({
      host: database.host,
      port: database.port,
      user: database.username,
      password: database.password,
      database: database.database
    });

    try {
      await client.connect();
      const createdTables = [];

      // 名前空間の作成
      for (const namespace of schema.namespaces || []) {
        const createNamespaceSQL = `CREATE SCHEMA IF NOT EXISTS ${namespace}`;
        await client.query(createNamespaceSQL);
        console.log(`名前空間作成: ${namespace}`);
      }

      // テーブルの作成
      for (const table of schema.tables || []) {
        const tableName = table.namespace ? `${table.namespace}.${table.name}` : table.name;
        
        // テーブル作成SQL生成
        const columns = [];
        const primaryKeys = [];

        for (const column of table.columns) {
          const columnDef = `${column.name} ${this.getPostgreSQLDataType(column.dataType)}`;
          columns.push(columnDef);
          
          if (column.partitionKey) {
            primaryKeys.push(column.name);
          }
        }

        // クラスタリングキーもプライマリキーに追加
        for (const column of table.columns) {
          if (column.clusteringKey && !primaryKeys.includes(column.name)) {
            primaryKeys.push(column.name);
          }
        }

        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS ${tableName} (
            ${columns.join(',\n            ')},
            PRIMARY KEY (${primaryKeys.join(', ')})
          )
        `;

        await client.query(createTableSQL);
        createdTables.push(tableName);
        console.log(`テーブル作成: ${tableName}`);

        // セカンダリインデックスの作成
        for (const column of table.columns) {
          if (column.indexType) {
            const indexName = `idx_${table.name}_${column.name}`;
            const createIndexSQL = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${column.name})`;
            await client.query(createIndexSQL);
            console.log(`インデックス作成: ${indexName}`);
          }
        }
      }

      return {
        success: true,
        message: 'PostgreSQLスキーマが正常に作成されました',
        tables: createdTables
      };
    } finally {
      await client.end();
    }
  }

  /**
   * MySQL用スキーマ作成
   */
  async createMySQLSchema(database, schema) {
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: database.host,
      port: database.port,
      user: database.username,
      password: database.password,
      database: database.database
    });

    try {
      const createdTables = [];

      // 名前空間（データベース）の作成
      for (const namespace of schema.namespaces || []) {
        await connection.execute(`CREATE DATABASE IF NOT EXISTS ${namespace}`);
        console.log(`データベース作成: ${namespace}`);
      }

      // テーブルの作成
      for (const table of schema.tables || []) {
        const tableName = table.namespace ? `${table.namespace}.${table.name}` : table.name;
        
        // テーブル作成SQL生成
        const columns = [];
        const primaryKeys = [];

        for (const column of table.columns) {
          const columnDef = `${column.name} ${this.getMySQLDataType(column.dataType)}`;
          columns.push(columnDef);
          
          if (column.partitionKey) {
            primaryKeys.push(column.name);
          }
        }

        // クラスタリングキーもプライマリキーに追加
        for (const column of table.columns) {
          if (column.clusteringKey && !primaryKeys.includes(column.name)) {
            primaryKeys.push(column.name);
          }
        }

        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS ${tableName} (
            ${columns.join(',\n            ')},
            PRIMARY KEY (${primaryKeys.join(', ')})
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `;

        await connection.execute(createTableSQL);
        createdTables.push(tableName);
        console.log(`テーブル作成: ${tableName}`);

        // セカンダリインデックスの作成
        for (const column of table.columns) {
          if (column.indexType) {
            const indexName = `idx_${table.name}_${column.name}`;
            const createIndexSQL = `CREATE INDEX ${indexName} ON ${tableName} (${column.name})`;
            try {
              await connection.execute(createIndexSQL);
              console.log(`インデックス作成: ${indexName}`);
            } catch (error) {
              // インデックスが既に存在する場合は無視
              if (!error.message.includes('Duplicate key name')) {
                throw error;
              }
            }
          }
        }
      }

      return {
        success: true,
        message: 'MySQLスキーマが正常に作成されました',
        tables: createdTables
      };
    } finally {
      await connection.end();
    }
  }

  /**
   * Cassandra用スキーマ作成
   */
  async createCassandraSchema(database, schema) {
    // Cassandraドライバーが必要
    const driverCheck = this.databaseTester.checkRequiredDrivers('cassandra');
    if (!driverCheck.installed) {
      throw new Error(`Cassandraドライバーがインストールされていません。${driverCheck.installCommand}を実行してください。`);
    }

    const cassandra = require('cassandra-driver');
    const client = new cassandra.Client({
      contactPoints: database.hosts ? database.hosts.split(',') : [database.host],
      localDataCenter: database.datacenter || 'datacenter1',
      credentials: {
        username: database.username,
        password: database.password
      }
    });

    try {
      await client.connect();
      const createdTables = [];

      // キースペースの作成
      for (const namespace of schema.namespaces || []) {
        const createKeyspaceSQL = `
          CREATE KEYSPACE IF NOT EXISTS ${namespace}
          WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
        `;
        await client.execute(createKeyspaceSQL);
        console.log(`キースペース作成: ${namespace}`);
      }

      // テーブルの作成
      for (const table of schema.tables || []) {
        const keyspace = table.namespace || database.keyspace || 'scalardb';
        const tableName = `${keyspace}.${table.name}`;
        
        // テーブル作成SQL生成
        const columns = [];
        const partitionKeys = [];
        const clusteringKeys = [];

        for (const column of table.columns) {
          const columnDef = `${column.name} ${this.getCassandraDataType(column.dataType)}`;
          columns.push(columnDef);
          
          if (column.partitionKey) {
            partitionKeys.push(column.name);
          }
          if (column.clusteringKey) {
            clusteringKeys.push(column.name);
          }
        }

        let primaryKey = partitionKeys.join(', ');
        if (clusteringKeys.length > 0) {
          primaryKey = `(${partitionKeys.join(', ')}), ${clusteringKeys.join(', ')}`;
        }

        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS ${tableName} (
            ${columns.join(',\n            ')},
            PRIMARY KEY (${primaryKey})
          )
        `;

        await client.execute(createTableSQL);
        createdTables.push(tableName);
        console.log(`テーブル作成: ${tableName}`);

        // セカンダリインデックスの作成
        for (const column of table.columns) {
          if (column.indexType && !column.partitionKey && !column.clusteringKey) {
            const createIndexSQL = `CREATE INDEX IF NOT EXISTS ON ${tableName} (${column.name})`;
            await client.execute(createIndexSQL);
            console.log(`インデックス作成: ${table.name}.${column.name}`);
          }
        }
      }

      return {
        success: true,
        message: 'Cassandraスキーマが正常に作成されました',
        tables: createdTables
      };
    } finally {
      await client.shutdown();
    }
  }

  /**
   * DynamoDB用スキーマ作成
   */
  async createDynamoDBSchema(database, schema) {
    // AWS SDKが必要
    const driverCheck = this.databaseTester.checkRequiredDrivers('dynamodb');
    if (!driverCheck.installed) {
      throw new Error(`AWS SDKがインストールされていません。${driverCheck.installCommand}を実行してください。`);
    }

    const AWS = require('aws-sdk');
    const config = {
      region: database.region,
      accessKeyId: database.accessKey,
      secretAccessKey: database.secretKey
    };

    if (database.endpointOverride) {
      config.endpoint = database.endpointOverride;
    }

    const dynamodb = new AWS.DynamoDB(config);
    const createdTables = [];

    try {
      // テーブルの作成
      for (const table of schema.tables || []) {
        const attributeDefinitions = [];
        const keySchema = [];
        
        // パーティションキーとソートキーの定義
        for (const column of table.columns) {
          if (column.partitionKey || column.clusteringKey) {
            attributeDefinitions.push({
              AttributeName: column.name,
              AttributeType: this.getDynamoDBAttributeType(column.dataType)
            });
            
            if (column.partitionKey) {
              keySchema.push({
                AttributeName: column.name,
                KeyType: 'HASH'
              });
            } else if (column.clusteringKey) {
              keySchema.push({
                AttributeName: column.name,
                KeyType: 'RANGE'
              });
            }
          }
        }

        const params = {
          TableName: table.name,
          KeySchema: keySchema,
          AttributeDefinitions: attributeDefinitions,
          BillingMode: 'PAY_PER_REQUEST'
        };

        try {
          await dynamodb.createTable(params).promise();
          createdTables.push(table.name);
          console.log(`テーブル作成: ${table.name}`);
          
          // テーブルがアクティブになるまで待機
          await dynamodb.waitFor('tableExists', { TableName: table.name }).promise();
        } catch (error) {
          if (error.code === 'ResourceInUseException') {
            console.log(`テーブル ${table.name} は既に存在します`);
            createdTables.push(table.name);
          } else {
            throw error;
          }
        }

        // グローバルセカンダリインデックスの作成（必要に応じて）
        // 注: 既存テーブルへのGSI追加は別途実装が必要
      }

      return {
        success: true,
        message: 'DynamoDBスキーマが正常に作成されました',
        tables: createdTables
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cosmos DB用スキーマ作成
   */
  async createCosmosDBSchema(database, schema) {
    // Azure Cosmos DBクライアントが必要
    const driverCheck = this.databaseTester.checkRequiredDrivers('cosmos');
    if (!driverCheck.installed) {
      throw new Error(`Azure Cosmos DBクライアントがインストールされていません。${driverCheck.installCommand}を実行してください。`);
    }

    const { CosmosClient } = require('@azure/cosmos');
    const client = new CosmosClient({
      endpoint: database.endpoint,
      key: database.key
    });

    const createdContainers = [];

    try {
      // データベースの作成
      const databaseId = database.database || 'scalardb';
      const { database: cosmosDatabase } = await client.databases.createIfNotExists({ id: databaseId });
      console.log(`データベース作成/確認: ${databaseId}`);

      // コンテナの作成
      for (const table of schema.tables || []) {
        // パーティションキーの特定
        let partitionKeyPath = '/id'; // デフォルト
        for (const column of table.columns) {
          if (column.partitionKey) {
            partitionKeyPath = `/${column.name}`;
            break;
          }
        }

        const containerDef = {
          id: table.name,
          partitionKey: {
            paths: [partitionKeyPath]
          }
        };

        const { container } = await cosmosDatabase.containers.createIfNotExists(containerDef);
        createdContainers.push(table.name);
        console.log(`コンテナ作成: ${table.name}`);
      }

      return {
        success: true,
        message: 'Cosmos DBスキーマが正常に作成されました',
        containers: createdContainers
      };
    } catch (error) {
      throw error;
    }
  }

  // データ型マッピングヘルパー関数
  getPostgreSQLDataType(scalarType) {
    const typeMap = {
      'INT': 'INTEGER',
      'BIGINT': 'BIGINT',
      'FLOAT': 'REAL',
      'DOUBLE': 'DOUBLE PRECISION',
      'TEXT': 'TEXT',
      'BOOLEAN': 'BOOLEAN',
      'BLOB': 'BYTEA'
    };
    return typeMap[scalarType] || 'TEXT';
  }

  getMySQLDataType(scalarType) {
    const typeMap = {
      'INT': 'INT',
      'BIGINT': 'BIGINT',
      'FLOAT': 'FLOAT',
      'DOUBLE': 'DOUBLE',
      'TEXT': 'TEXT',
      'BOOLEAN': 'BOOLEAN',
      'BLOB': 'BLOB'
    };
    return typeMap[scalarType] || 'TEXT';
  }

  getCassandraDataType(scalarType) {
    const typeMap = {
      'INT': 'int',
      'BIGINT': 'bigint',
      'FLOAT': 'float',
      'DOUBLE': 'double',
      'TEXT': 'text',
      'BOOLEAN': 'boolean',
      'BLOB': 'blob'
    };
    return typeMap[scalarType] || 'text';
  }

  getDynamoDBAttributeType(scalarType) {
    const typeMap = {
      'INT': 'N',
      'BIGINT': 'N',
      'FLOAT': 'N',
      'DOUBLE': 'N',
      'TEXT': 'S',
      'BOOLEAN': 'BOOL',
      'BLOB': 'B'
    };
    return typeMap[scalarType] || 'S';
  }

  /**
   * デフォルトのスキーマを生成
   * @param {string} databaseType - データベースタイプ
   * @returns {Object} スキーマオブジェクト
   */
  generateDefaultSchema(databaseType) {
    const schema = {
      namespaces: ['scalardb'],
      tables: [
        {
          namespace: 'scalardb',
          name: 'sample_table',
          columns: [
            {
              name: 'id',
              dataType: 'TEXT',
              partitionKey: true
            },
            {
              name: 'name',
              dataType: 'TEXT'
            },
            {
              name: 'value',
              dataType: 'INT'
            },
            {
              name: 'created_at',
              dataType: 'BIGINT',
              clusteringKey: true
            }
          ]
        }
      ]
    };

    // データベース固有の調整
    if (databaseType === 'dynamodb') {
      // DynamoDBはnamespaceを使用しない
      delete schema.namespaces;
      schema.tables[0].namespace = undefined;
    }

    return schema;
  }
}

module.exports = { SchemaManager };