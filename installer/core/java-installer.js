const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec);
const { createWriteStream } = require('fs');
const { pipeline } = require('stream').promises;

class JavaInstaller {
  constructor() {
    this.supportedVersions = [8, 11, 17, 21];
    this.platform = os.platform();
    this.arch = os.arch();
  }

  /**
   * 現在インストールされているJavaのバージョンを確認
   * @returns {Object} { installed: boolean, version: number|null, vendor: string|null, home: string|null }
   */
  async checkJavaVersion() {
    try {
      const { stdout } = await this._executeCommand('java -version');
      const versionOutput = stdout || '';
      
      // バージョン情報の解析
      const versionMatch = versionOutput.match(/version "(\d+)\.(\d+)\.(\d+)(_\d+)?"|version "(\d+)\.(\d+)\.(\d+)"/);
      if (!versionMatch) {
        return { installed: false, version: null, vendor: null, home: null };
      }

      let version;
      if (versionMatch[1] === '1') {
        // Java 8以前の形式 (1.8.0_xxx)
        version = parseInt(versionMatch[2]);
      } else {
        // Java 9以降の形式 (11.0.x)
        version = parseInt(versionMatch[1] || versionMatch[5]);
      }

      // ベンダー情報の取得
      const vendorMatch = versionOutput.match(/(openjdk|oracle|adoptium|temurin|zulu|corretto)/i);
      const vendor = vendorMatch ? vendorMatch[1].toLowerCase() : 'unknown';

      // JAVA_HOMEの取得
      let javaHome = process.env.JAVA_HOME;
      if (!javaHome) {
        try {
          const { stdout: whichJava } = await this._executeCommand('which java');
          if (whichJava) {
            // シンボリックリンクを解決
            const { stdout: realPath } = await this._executeCommand(`readlink -f ${whichJava.trim()}`);
            javaHome = path.dirname(path.dirname(realPath.trim()));
          }
        } catch (e) {
          // Windows の場合
          try {
            const { stdout: whereJava } = await this._executeCommand('where java');
            if (whereJava) {
              javaHome = path.dirname(path.dirname(whereJava.trim().split('\n')[0]));
            }
          } catch (e2) {
            javaHome = null;
          }
        }
      }

      return {
        installed: true,
        version,
        vendor,
        home: javaHome
      };
    } catch (error) {
      return { installed: false, version: null, vendor: null, home: null };
    }
  }

  /**
   * 指定されたバージョンのJavaをインストール
   * @param {number} version - インストールするJavaのバージョン (8, 11, 17, 21)
   * @returns {Object} { success: boolean, javaHome: string, message: string }
   */
  async installJava(version) {
    if (!this.supportedVersions.includes(version)) {
      throw new Error(`Unsupported Java version: ${version}`);
    }

    const platformName = this._getPlatformName();
    if (!platformName) {
      throw new Error(`Unsupported platform: ${this.platform}`);
    }

    try {
      console.log(`Eclipse Temurin JDK ${version} のダウンロードを開始します...`);
      
      // ダウンロードURLの生成
      const downloadUrl = this.getTemurinDownloadUrl(version, platformName, this._getArchitecture());
      
      // インストール先ディレクトリの決定
      const installDir = this._getInstallDirectory(version);
      await fs.mkdir(installDir, { recursive: true });

      // ダウンロード
      const archivePath = await this._downloadFile(downloadUrl, installDir);
      
      // 展開
      console.log('アーカイブを展開しています...');
      await this._extractArchive(archivePath, installDir);
      
      // JAVA_HOMEの特定
      const javaHome = await this._findJavaHome(installDir);
      
      // 環境変数の設定
      await this._setEnvironmentVariables(javaHome);
      
      // インストールの検証
      const verification = await this.verifyJavaInstallation(javaHome);
      if (!verification.verified) {
        throw new Error('Javaのインストール検証に失敗しました');
      }

      return {
        success: true,
        javaHome,
        message: `Java ${version} が正常にインストールされました`
      };
    } catch (error) {
      return {
        success: false,
        javaHome: null,
        message: `インストールエラー: ${error.message}`
      };
    }
  }

  /**
   * 環境変数を設定
   * @param {string} javaHome - JAVA_HOMEのパス
   */
  async setEnvironmentVariables(javaHome) {
    return this._setEnvironmentVariables(javaHome);
  }

  /**
   * Eclipse TemurinのダウンロードURLを生成
   */
  getTemurinDownloadUrl(version, platform, arch) {
    const baseUrl = 'https://api.adoptium.net/v3/binary/latest';
    const jdkVersion = version;
    const releaseType = 'ga';
    const os = platform;
    const architecture = arch;
    const imageType = 'jdk';
    const vendor = 'eclipse';
    
    // プラットフォーム別の拡張子
    const extension = platform === 'windows' ? 'zip' : 'tar.gz';
    
    return `${baseUrl}/${jdkVersion}/${releaseType}/${os}/${architecture}/${imageType}/hotspot/normal/${vendor}?project=jdk`;
  }

  /**
   * Javaインストールの検証
   */
  async verifyJavaInstallation(javaHome) {
    try {
      const javaBin = path.join(javaHome, 'bin', this.platform === 'win32' ? 'java.exe' : 'java');
      const { stdout } = await this._executeCommand(`"${javaBin}" -version`);
      
      const versionMatch = stdout.match(/version "(\d+)\.(\d+)\.(\d+)"|version "(\d+)\.(\d+)\.(\d+)"/);
      if (versionMatch) {
        let version;
        if (versionMatch[1] === '1') {
          version = parseInt(versionMatch[2]);
        } else {
          version = parseInt(versionMatch[1] || versionMatch[5]);
        }
        return { verified: true, version };
      }
      return { verified: false };
    } catch (error) {
      return { verified: false };
    }
  }

  // Private methods
  async _executeCommand(command) {
    return execAsync(command, { 
      shell: true,
      env: { ...process.env }
    });
  }

  _getPlatformName() {
    switch (this.platform) {
      case 'win32': return 'windows';
      case 'darwin': return 'mac';
      case 'linux': return 'linux';
      default: return null;
    }
  }

  _getArchitecture() {
    // arm64 を aarch64 に変換（Adoptium API用）
    if (this.arch === 'arm64') {
      return 'aarch64';
    }
    return this.arch;
  }

  _getInstallDirectory(version) {
    const baseDir = this.platform === 'win32' 
      ? 'C:\\Program Files\\Java'
      : '/usr/local/java';
    return path.join(baseDir, `jdk-${version}`);
  }

  async _downloadFile(url, destDir) {
    const fileName = `temurin-jdk.${url.includes('windows') ? 'zip' : 'tar.gz'}`;
    const destPath = path.join(destDir, fileName);

    return new Promise((resolve, reject) => {
      https.get(url, { 
        headers: { 'User-Agent': 'ScalarDB-Installer/1.0' },
        followRedirect: true 
      }, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // リダイレクトを処理
          return this._downloadFile(response.headers.location, destDir)
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

  async _extractArchive(archivePath, destDir) {
    if (this.platform === 'win32') {
      // Windows: PowerShellを使用して展開
      await this._executeCommand(`powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${destDir}' -Force"`);
    } else {
      // macOS/Linux: tarコマンドを使用
      await this._executeCommand(`tar -xzf "${archivePath}" -C "${destDir}"`);
    }
    
    // アーカイブファイルを削除
    await fs.unlink(archivePath);
  }

  async _findJavaHome(installDir) {
    const files = await fs.readdir(installDir);
    for (const file of files) {
      const fullPath = path.join(installDir, file);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory() && file.includes('jdk')) {
        const binPath = path.join(fullPath, 'bin');
        try {
          await fs.access(binPath);
          return fullPath;
        } catch (e) {
          // binディレクトリが存在しない場合は続行
        }
      }
    }
    throw new Error('JAVA_HOMEディレクトリが見つかりません');
  }

  async _setEnvironmentVariables(javaHome) {
    const binPath = path.join(javaHome, 'bin');

    if (this.platform === 'win32') {
      // Windows: setxコマンドを使用
      await this._executeCommand(`setx JAVA_HOME "${javaHome}"`);
      await this._executeCommand(`setx PATH "%PATH%;${binPath}"`);
    } else {
      // macOS/Linux: シェルプロファイルに追記
      const homeDir = os.homedir();
      const profiles = ['.bashrc', '.zshrc', '.profile'];
      
      const exportCommands = `
# ScalarDB Installer - Java Environment
export JAVA_HOME="${javaHome}"
export PATH="$JAVA_HOME/bin:$PATH"
`;

      for (const profile of profiles) {
        const profilePath = path.join(homeDir, profile);
        try {
          await fs.access(profilePath);
          const content = await fs.readFile(profilePath, 'utf8');
          if (!content.includes('JAVA_HOME')) {
            await fs.appendFile(profilePath, exportCommands);
          }
        } catch (e) {
          // ファイルが存在しない場合はスキップ
        }
      }
    }

    return { success: true };
  }
}

module.exports = { JavaInstaller };