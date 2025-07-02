const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');
const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec);
const { createWriteStream } = require('fs');

class ScalarDBInstaller {
  constructor() {
    this.mavenRepoUrl = 'https://repo1.maven.org/maven2';
    this.mavenSearchUrl = 'https://search.maven.org/solrsearch/select';
    this.scalardbGroupId = 'com.scalar-labs';
    this.scalardbArtifactId = 'scalardb';
    this.scalardlArtifactId = 'scalardl';
  }

  /**
   * ScalarDBのインストール状況を確認
   * @returns {Object} { installed: boolean, version: string|null, location: string|null, type: string|null }
   */
  async checkScalarDBInstallation() {
    // Maven依存関係の確認
    const mavenCheck = await this._checkMavenInstallation();
    if (mavenCheck) {
      return {
        installed: true,
        version: mavenCheck.version,
        location: mavenCheck.location,
        type: 'maven'
      };
    }

    // Gradle依存関係の確認
    const gradleCheck = await this._checkGradleInstallation();
    if (gradleCheck) {
      return {
        installed: true,
        version: gradleCheck.version,
        location: gradleCheck.location,
        type: 'gradle'
      };
    }

    // スタンドアロンJARの確認
    const jarCheck = await this._checkJarInstallation();
    if (jarCheck) {
      return {
        installed: true,
        version: jarCheck.version,
        location: jarCheck.location,
        type: 'jar'
      };
    }

    return {
      installed: false,
      version: null,
      location: null,
      type: null
    };
  }

  /**
   * ScalarDBをダウンロード
   * @param {string} version - バージョン
   * @param {string} downloadPath - ダウンロード先パス
   * @returns {Object} { success: boolean, filePath: string|null, error: string|null }
   */
  async downloadScalarDB(version, downloadPath) {
    try {
      const url = this.getMavenCentralUrl('scalardb', version);
      const fileName = `scalardb-${version}.jar`;
      const filePath = path.join(downloadPath, fileName);

      console.log(`ScalarDB ${version} をダウンロードしています...`);
      await this._downloadFile(url, filePath);

      return {
        success: true,
        filePath,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        filePath: null,
        error: error.message
      };
    }
  }

  /**
   * ScalarDBをインストール
   * @param {Object} config - インストール設定
   * @returns {Object} インストール結果
   */
  async installScalarDB(config) {
    const { installType, version, projectPath, installPath } = config;

    switch (installType) {
      case 'maven':
        return await this._installMavenDependency(version, projectPath);
      
      case 'gradle':
        return await this._installGradleDependency(version, projectPath);
      
      case 'jar':
        return await this._installStandaloneJar(version, installPath);
      
      case 'server':
        return await this._installScalarDBServer(version, installPath);
      
      default:
        return {
          success: false,
          error: `Unsupported install type: ${installType}`
        };
    }
  }

  /**
   * ScalarDLをインストール
   * @param {Object} config - インストール設定
   * @returns {Object} インストール結果
   */
  async installScalarDL(config) {
    const { version, installPath } = config;
    
    try {
      const url = this.getMavenCentralUrl('scalardl', version);
      const fileName = `scalardl-${version}.jar`;
      const filePath = path.join(installPath, fileName);

      console.log(`ScalarDL ${version} をダウンロードしています...`);
      await this._downloadFile(url, filePath);

      return {
        success: true,
        jarPath: filePath,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        jarPath: null,
        error: error.message
      };
    }
  }

  /**
   * インストールを検証
   * @param {string} type - インストールタイプ
   * @param {string} location - インストール場所
   * @returns {Object} { verified: boolean, details: string|null }
   */
  async verifyInstallation(type, location) {
    switch (type) {
      case 'maven':
        return await this._verifyMavenInstallation(location);
      
      case 'gradle':
        return await this._verifyGradleInstallation(location);
      
      case 'jar':
        return await this._verifyJarInstallation(location);
      
      case 'server':
        return await this._verifyServerInstallation(location);
      
      default:
        return { verified: false, details: null };
    }
  }

  /**
   * Maven Central URLを生成
   */
  getMavenCentralUrl(artifact, version) {
    const artifactId = artifact === 'scalardb' ? this.scalardbArtifactId : this.scalardlArtifactId;
    const groupPath = this.scalardbGroupId.replace(/\./g, '/');
    return `${this.mavenRepoUrl}/${groupPath}/${artifactId}/${version}/${artifactId}-${version}.jar`;
  }

  /**
   * 利用可能なバージョンを取得
   */
  async getAvailableVersions(artifact) {
    try {
      const artifactId = artifact === 'scalardb' ? this.scalardbArtifactId : this.scalardlArtifactId;
      const url = `${this.mavenSearchUrl}?q=g:${this.scalardbGroupId}+AND+a:${artifactId}&rows=20&wt=json`;
      
      const data = await this._fetchJson(url);
      const versions = data.response.docs.map(doc => doc.v);
      
      return versions.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    } catch (error) {
      console.error(`バージョン一覧の取得に失敗しました: ${error.message}`);
      return [];
    }
  }

  // Private methods

  async _checkMavenInstallation() {
    try {
      const { stdout } = await this._executeCommand('mvn dependency:tree | grep scalardb');
      if (stdout.includes('com.scalar-labs:scalardb')) {
        const versionMatch = stdout.match(/scalardb:jar:(\d+\.\d+\.\d+)/);
        return {
          version: versionMatch ? versionMatch[1] : 'unknown',
          location: process.cwd()
        };
      }
    } catch (error) {
      // Mavenが見つからないか、依存関係がない
    }
    return null;
  }

  async _checkGradleInstallation() {
    try {
      const { stdout } = await this._executeCommand('gradle dependencies | grep scalardb');
      if (stdout.includes('com.scalar-labs:scalardb')) {
        const versionMatch = stdout.match(/scalardb:(\d+\.\d+\.\d+)/);
        return {
          version: versionMatch ? versionMatch[1] : 'unknown',
          location: process.cwd()
        };
      }
    } catch (error) {
      // Gradleが見つからないか、依存関係がない
    }
    return null;
  }

  async _checkJarInstallation() {
    const searchPaths = [
      path.join(os.homedir(), '.scalardb'),
      '/usr/local/lib/scalardb',
      '/opt/scalardb',
      process.cwd()
    ];

    for (const searchPath of searchPaths) {
      try {
        const files = await fs.readdir(searchPath);
        const scalardbJar = files.find(f => f.match(/scalardb-(\d+\.\d+\.\d+)\.jar/));
        if (scalardbJar) {
          const versionMatch = scalardbJar.match(/scalardb-(\d+\.\d+\.\d+)\.jar/);
          return {
            version: versionMatch[1],
            location: path.join(searchPath, scalardbJar)
          };
        }
      } catch (error) {
        // ディレクトリが存在しない
      }
    }
    return null;
  }

  async _installMavenDependency(version, projectPath) {
    try {
      const pomPath = path.join(projectPath, 'pom.xml');
      await this._updateMavenPom(pomPath, version);
      
      // 依存関係をダウンロード
      await this._executeCommand('mvn dependency:resolve', { cwd: projectPath });
      
      return {
        success: true,
        type: 'maven',
        message: `ScalarDB ${version} がMaven依存関係として追加されました`
      };
    } catch (error) {
      return {
        success: false,
        type: 'maven',
        error: error.message
      };
    }
  }

  async _installGradleDependency(version, projectPath) {
    try {
      const gradlePath = path.join(projectPath, 'build.gradle');
      await this._updateGradleBuild(gradlePath, version);
      
      // 依存関係をダウンロード
      await this._executeCommand('gradle dependencies', { cwd: projectPath });
      
      return {
        success: true,
        type: 'gradle',
        message: `ScalarDB ${version} がGradle依存関係として追加されました`
      };
    } catch (error) {
      return {
        success: false,
        type: 'gradle',
        error: error.message
      };
    }
  }

  async _installStandaloneJar(version, installPath) {
    const downloadResult = await this.downloadScalarDB(version, installPath);
    
    if (downloadResult.success) {
      return {
        success: true,
        type: 'jar',
        jarPath: downloadResult.filePath,
        message: `ScalarDB ${version} がダウンロードされました`
      };
    } else {
      return {
        success: false,
        type: 'jar',
        error: downloadResult.error
      };
    }
  }

  async _installScalarDBServer(version, installPath) {
    try {
      const serverResult = await this._downloadScalarDBServer(version, installPath);
      
      if (serverResult.success) {
        return {
          success: true,
          type: 'server',
          serverPath: serverResult.installPath,
          message: `ScalarDB Server ${version} がインストールされました`
        };
      } else {
        return {
          success: false,
          type: 'server',
          error: serverResult.error
        };
      }
    } catch (error) {
      return {
        success: false,
        type: 'server',
        error: error.message
      };
    }
  }

  async _downloadScalarDBServer(version, installPath) {
    // ScalarDB Server用のダウンロードロジック
    // 実際のサーバー配布形式に応じて実装
    const serverDir = path.join(installPath, 'scalardb-server');
    await fs.mkdir(serverDir, { recursive: true });
    
    // サーバー関連ファイルのダウンロード
    const jarResult = await this.downloadScalarDB(version, serverDir);
    
    if (jarResult.success) {
      // 起動スクリプトの作成
      await this._createServerStartScript(serverDir, version);
      
      return {
        success: true,
        installPath: serverDir
      };
    }
    
    return jarResult;
  }

  async _createServerStartScript(serverDir, version) {
    const scriptContent = `#!/bin/bash
# ScalarDB Server Start Script
JAVA_OPTS="-Xmx2g -Xms2g"
JAR_FILE="scalardb-${version}.jar"
CONFIG_FILE="scalardb-server.properties"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "Error: $CONFIG_FILE not found!"
  exit 1
fi

java $JAVA_OPTS -jar "$JAR_FILE" --config "$CONFIG_FILE"
`;
    
    const scriptPath = path.join(serverDir, 'start-server.sh');
    await fs.writeFile(scriptPath, scriptContent);
    await fs.chmod(scriptPath, '755');
  }

  async _updateMavenPom(pomPath, version) {
    const pomContent = await fs.readFile(pomPath, 'utf8');
    
    // 既存の依存関係を確認
    if (pomContent.includes('scalardb')) {
      console.log('ScalarDBの依存関係は既に存在します');
      return true;
    }
    
    const dependency = `
    <dependency>
      <groupId>${this.scalardbGroupId}</groupId>
      <artifactId>${this.scalardbArtifactId}</artifactId>
      <version>${version}</version>
    </dependency>`;
    
    // </dependencies>タグの前に追加
    const updatedPom = pomContent.replace(
      '</dependencies>',
      `${dependency}\n  </dependencies>`
    );
    
    await fs.writeFile(pomPath, updatedPom);
    return true;
  }

  async _updateGradleBuild(gradlePath, version) {
    const gradleContent = await fs.readFile(gradlePath, 'utf8');
    
    // 既存の依存関係を確認
    if (gradleContent.includes('scalardb')) {
      console.log('ScalarDBの依存関係は既に存在します');
      return true;
    }
    
    const dependency = `    implementation 'com.scalar-labs:scalardb:${version}'`;
    
    // dependencies ブロック内に追加
    const updatedGradle = gradleContent.replace(
      /dependencies\s*{/,
      `dependencies {\n${dependency}`
    );
    
    await fs.writeFile(gradlePath, updatedGradle);
    return true;
  }

  async _verifyMavenInstallation(projectPath) {
    try {
      const { stdout } = await this._executeCommand(
        'mvn dependency:tree | grep scalardb',
        { cwd: projectPath }
      );
      
      if (stdout.includes('com.scalar-labs:scalardb')) {
        return {
          verified: true,
          details: stdout.trim()
        };
      }
    } catch (error) {
      // エラーは無視
    }
    
    return { verified: false, details: null };
  }

  async _verifyGradleInstallation(projectPath) {
    try {
      const { stdout } = await this._executeCommand(
        'gradle dependencies | grep scalardb',
        { cwd: projectPath }
      );
      
      if (stdout.includes('com.scalar-labs:scalardb')) {
        return {
          verified: true,
          details: stdout.trim()
        };
      }
    } catch (error) {
      // エラーは無視
    }
    
    return { verified: false, details: null };
  }

  async _verifyJarInstallation(jarPath) {
    try {
      await fs.access(jarPath);
      return { verified: true, details: `JAR file exists at ${jarPath}` };
    } catch (error) {
      return { verified: false, details: null };
    }
  }

  async _verifyServerInstallation(serverPath) {
    try {
      const startScript = path.join(serverPath, 'start-server.sh');
      await fs.access(startScript);
      return { verified: true, details: `Server installed at ${serverPath}` };
    } catch (error) {
      return { verified: false, details: null };
    }
  }

  async _downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      
      protocol.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // リダイレクトを処理
          return this._downloadFile(response.headers.location, destPath)
            .then(resolve)
            .catch(reject);
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`ダウンロードに失敗しました: ${response.statusCode}`));
          return;
        }
        
        const fileStream = createWriteStream(destPath);
        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(destPath);
        });
        
        fileStream.on('error', (err) => {
          fs.unlink(destPath).catch(() => {});
          reject(err);
        });
      }).on('error', reject);
    });
  }

  async _fetchJson(url) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      
      protocol.get(url, (response) => {
        let data = '';
        
        response.on('data', chunk => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      }).on('error', reject);
    });
  }

  async _executeCommand(command, options = {}) {
    return execAsync(command, {
      shell: true,
      ...options
    });
  }
}

module.exports = { ScalarDBInstaller };