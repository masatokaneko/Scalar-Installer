const { Client: PgClient } = require('pg');
const mysql = require('mysql2/promise');

class DatabaseTester {
  constructor() {
    this.testMethods = {
      postgresql: this.testPostgreSQL.bind(this),
      mysql: this.testMySQL.bind(this),
      cassandra: this.testCassandra.bind(this),
      dynamodb: this.testDynamoDB.bind(this),
      cosmos: this.testCosmosDB.bind(this)
    };
  }

  /**
   * データベース接続をテスト
   * @param {Object} database - データベース設定
   * @returns {Object} { connected: boolean, message: string, responseTime?: number, error?: string }
   */
  async testConnection(database) {
    const startTime = Date.now();
    
    try {
      const testMethod = this.testMethods[database.type];
      if (!testMethod) {
        throw new Error(`サポートされていないデータベースタイプ: ${database.type}`);
      }

      await testMethod(database);
      
      const responseTime = Date.now() - startTime;
      
      return {
        connected: true,
        message: 'データベース接続に成功しました',
        responseTime,
        databaseType: database.type,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        connected: false,
        message: `接続に失敗しました: ${error.message}`,
        error: error.message,
        databaseType: database.type,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * PostgreSQL接続テスト
   */
  async testPostgreSQL(database) {
    const client = new PgClient({
      host: database.host,
      port: database.port,
      user: database.username,
      password: database.password,
      database: database.database,
      connectionTimeoutMillis: 5000
    });

    try {
      await client.connect();
      
      // 簡単なクエリを実行して接続を確認
      const result = await client.query('SELECT version()');
      console.log('PostgreSQL version:', result.rows[0].version);
      
      return true;
    } finally {
      await client.end();
    }
  }

  /**
   * MySQL接続テスト
   */
  async testMySQL(database) {
    const connection = await mysql.createConnection({
      host: database.host,
      port: database.port,
      user: database.username,
      password: database.password,
      database: database.database,
      connectTimeout: 5000
    });

    try {
      // 簡単なクエリを実行して接続を確認
      const [rows] = await connection.execute('SELECT VERSION() as version');
      console.log('MySQL version:', rows[0].version);
      
      return true;
    } finally {
      await connection.end();
    }
  }

  /**
   * Cassandra接続テスト
   */
  async testCassandra(database) {
    // Cassandraドライバーがインストールされていない場合のフォールバック
    try {
      const cassandra = require('cassandra-driver');
      
      const client = new cassandra.Client({
        contactPoints: database.hosts ? database.hosts.split(',') : [database.host],
        localDataCenter: database.datacenter || 'datacenter1',
        credentials: {
          username: database.username,
          password: database.password
        },
        socketOptions: {
          connectTimeout: 5000
        }
      });

      await client.connect();
      
      // システムバージョンを取得
      const result = await client.execute('SELECT release_version FROM system.local');
      console.log('Cassandra version:', result.rows[0].release_version);
      
      await client.shutdown();
      return true;
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('Cassandraドライバーがインストールされていません。npm install cassandra-driverを実行してください。');
      }
      throw error;
    }
  }

  /**
   * DynamoDB接続テスト
   */
  async testDynamoDB(database) {
    // AWS SDKがインストールされていない場合のフォールバック
    try {
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
      
      // テーブルリストを取得して接続を確認
      await dynamodb.listTables().promise();
      
      return true;
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('AWS SDKがインストールされていません。npm install aws-sdkを実行してください。');
      }
      throw error;
    }
  }

  /**
   * Cosmos DB接続テスト
   */
  async testCosmosDB(database) {
    // Azure Cosmos DBクライアントがインストールされていない場合のフォールバック
    try {
      const { CosmosClient } = require('@azure/cosmos');
      
      const client = new CosmosClient({
        endpoint: database.endpoint,
        key: database.key
      });

      // データベースリストを取得して接続を確認
      const { databases } = await client.databases.readAll().fetchAll();
      console.log(`Cosmos DBに${databases.length}個のデータベースが見つかりました`);
      
      return true;
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('Azure Cosmos DBクライアントがインストールされていません。npm install @azure/cosmosを実行してください。');
      }
      throw error;
    }
  }

  /**
   * 必要なデータベースドライバーがインストールされているか確認
   */
  checkRequiredDrivers(databaseType) {
    const drivers = {
      postgresql: 'pg',
      mysql: 'mysql2',
      cassandra: 'cassandra-driver',
      dynamodb: 'aws-sdk',
      cosmos: '@azure/cosmos'
    };

    const requiredDriver = drivers[databaseType];
    if (!requiredDriver) {
      return { installed: true };
    }

    try {
      require.resolve(requiredDriver);
      return { installed: true, driver: requiredDriver };
    } catch (error) {
      return { 
        installed: false, 
        driver: requiredDriver,
        installCommand: `npm install ${requiredDriver}`
      };
    }
  }
}

module.exports = { DatabaseTester };