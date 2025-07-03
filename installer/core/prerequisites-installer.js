const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec);

class PrerequisitesInstaller {
  constructor() {
    this.platform = os.platform();
    this.arch = os.arch();
  }

  /**
   * Homebrewのインストール状況を確認
   * @returns {Object} { installed: boolean, version: string|null, path: string|null }
   */
  async checkHomebrew() {
    if (this.platform !== 'darwin') {
      return { installed: false, version: null, path: null, error: 'Homebrew is only available on macOS' };
    }

    try {
      const { stdout } = await this._executeCommand('brew --version');
      const versionMatch = stdout.match(/Homebrew (\d+\.\d+\.\d+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';
      
      const { stdout: whereBrew } = await this._executeCommand('which brew');
      const brewPath = whereBrew.trim();

      return {
        installed: true,
        version,
        path: brewPath
      };
    } catch (error) {
      return {
        installed: false,
        version: null,
        path: null,
        error: error.message
      };
    }
  }

  /**
   * Homebrewをインストール
   * @returns {Object} { success: boolean, message: string, error?: string }
   */
  async installHomebrew() {
    if (this.platform !== 'darwin') {
      return {
        success: false,
        message: 'Homebrew is only available on macOS',
        error: 'Unsupported platform'
      };
    }

    try {
      console.log('Homebrewのインストールを開始します...');
      
      // Homebrew公式インストールスクリプトを実行
      const installCommand = '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"';
      
      await this._executeCommand(installCommand, { timeout: 600000 }); // 10分のタイムアウト
      
      // インストール後の確認
      const verification = await this.checkHomebrew();
      
      if (verification.installed) {
        return {
          success: true,
          message: `Homebrew ${verification.version} が正常にインストールされました`,
          version: verification.version,
          path: verification.path
        };
      } else {
        throw new Error('インストール後の確認に失敗しました');
      }
    } catch (error) {
      return {
        success: false,
        message: 'Homebrewのインストールに失敗しました',
        error: error.message
      };
    }
  }

  /**
   * Dockerのインストール状況を確認
   * @returns {Object} { installed: boolean, version: string|null, running: boolean }
   */
  async checkDocker() {
    try {
      const { stdout } = await this._executeCommand('docker --version');
      const versionMatch = stdout.match(/Docker version (\d+\.\d+\.\d+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';

      // Dockerが実行中かチェック
      let running = false;
      try {
        await this._executeCommand('docker info');
        running = true;
      } catch (e) {
        running = false;
      }

      return {
        installed: true,
        version,
        running
      };
    } catch (error) {
      return {
        installed: false,
        version: null,
        running: false,
        error: error.message
      };
    }
  }

  /**
   * Dockerをインストール
   * @returns {Object} { success: boolean, message: string, installMethod: string }
   */
  async installDocker() {
    try {
      let installMethod;
      let command;

      switch (this.platform) {
        case 'darwin':
          // macOS: Homebrew経由でDocker Desktopをインストール
          const homebrewCheck = await this.checkHomebrew();
          if (!homebrewCheck.installed) {
            throw new Error('Homebrewが必要です。先にHomebrewをインストールしてください。');
          }
          
          command = 'brew install --cask docker';
          installMethod = 'Homebrew (Docker Desktop)';
          break;

        case 'linux':
          // Linux: 公式スクリプトを使用
          command = 'curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh';
          installMethod = 'Official Docker script';
          break;

        case 'win32':
          return {
            success: false,
            message: 'Windows版Dockerの自動インストールはサポートされていません。Docker Desktopを手動でダウンロードしてください。',
            installMethod: 'Manual installation required'
          };

        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }

      console.log(`Dockerのインストールを開始します (${installMethod})...`);
      await this._executeCommand(command, { timeout: 600000 });

      // インストール後の確認
      const verification = await this.checkDocker();
      
      if (verification.installed) {
        return {
          success: true,
          message: `Docker ${verification.version} が正常にインストールされました`,
          installMethod,
          version: verification.version,
          running: verification.running
        };
      } else {
        throw new Error('インストール後の確認に失敗しました');
      }
    } catch (error) {
      return {
        success: false,
        message: 'Dockerのインストールに失敗しました',
        error: error.message
      };
    }
  }

  /**
   * Mavenのインストール状況を確認
   * @returns {Object} { installed: boolean, version: string|null }
   */
  async checkMaven() {
    try {
      const { stdout } = await this._executeCommand('mvn --version');
      const versionMatch = stdout.match(/Apache Maven (\d+\.\d+\.\d+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';

      return {
        installed: true,
        version
      };
    } catch (error) {
      return {
        installed: false,
        version: null,
        error: error.message
      };
    }
  }

  /**
   * Mavenをインストール
   * @returns {Object} { success: boolean, message: string }
   */
  async installMaven() {
    try {
      let command;

      switch (this.platform) {
        case 'darwin':
          const homebrewCheck = await this.checkHomebrew();
          if (!homebrewCheck.installed) {
            throw new Error('Homebrewが必要です。先にHomebrewをインストールしてください。');
          }
          command = 'brew install maven';
          break;

        case 'linux':
          // Detect Linux distribution
          const distro = await this._detectLinuxDistro();
          if (distro.includes('ubuntu') || distro.includes('debian')) {
            command = 'sudo apt-get update && sudo apt-get install -y maven';
          } else if (distro.includes('centos') || distro.includes('rhel') || distro.includes('fedora')) {
            command = 'sudo yum install -y maven || sudo dnf install -y maven';
          } else {
            throw new Error('Unsupported Linux distribution for automatic Maven installation');
          }
          break;

        case 'win32':
          return {
            success: false,
            message: 'Windows版Mavenの自動インストールはサポートされていません。手動でインストールしてください。'
          };

        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }

      console.log('Mavenのインストールを開始します...');
      await this._executeCommand(command, { timeout: 300000 });

      const verification = await this.checkMaven();
      
      if (verification.installed) {
        return {
          success: true,
          message: `Maven ${verification.version} が正常にインストールされました`,
          version: verification.version
        };
      } else {
        throw new Error('インストール後の確認に失敗しました');
      }
    } catch (error) {
      return {
        success: false,
        message: 'Mavenのインストールに失敗しました',
        error: error.message
      };
    }
  }

  /**
   * Gradleのインストール状況を確認
   * @returns {Object} { installed: boolean, version: string|null }
   */
  async checkGradle() {
    try {
      const { stdout } = await this._executeCommand('gradle --version');
      const versionMatch = stdout.match(/Gradle (\d+\.\d+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';

      return {
        installed: true,
        version
      };
    } catch (error) {
      return {
        installed: false,
        version: null,
        error: error.message
      };
    }
  }

  /**
   * Gradleをインストール
   * @returns {Object} { success: boolean, message: string }
   */
  async installGradle() {
    try {
      let command;

      switch (this.platform) {
        case 'darwin':
          const homebrewCheck = await this.checkHomebrew();
          if (!homebrewCheck.installed) {
            throw new Error('Homebrewが必要です。先にHomebrewをインストールしてください。');
          }
          command = 'brew install gradle';
          break;

        case 'linux':
          const distro = await this._detectLinuxDistro();
          if (distro.includes('ubuntu') || distro.includes('debian')) {
            command = 'sudo apt-get update && sudo apt-get install -y gradle';
          } else {
            // SDKMAN経由でインストール
            command = 'curl -s "https://get.sdkman.io" | bash && source ~/.sdkman/bin/sdkman-init.sh && sdk install gradle';
          }
          break;

        case 'win32':
          return {
            success: false,
            message: 'Windows版Gradleの自動インストールはサポートされていません。手動でインストールしてください。'
          };

        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }

      console.log('Gradleのインストールを開始します...');
      await this._executeCommand(command, { timeout: 300000 });

      const verification = await this.checkGradle();
      
      if (verification.installed) {
        return {
          success: true,
          message: `Gradle ${verification.version} が正常にインストールされました`,
          version: verification.version
        };
      } else {
        throw new Error('インストール後の確認に失敗しました');
      }
    } catch (error) {
      return {
        success: false,
        message: 'Gradleのインストールに失敗しました',
        error: error.message
      };
    }
  }

  /**
   * すべての前提条件をチェック
   * @returns {Object} 各ツールの状況
   */
  async checkAllPrerequisites() {
    console.log('前提条件をチェック中...');

    const results = {};

    // Java (既存のJavaInstallerを使用)
    const { JavaInstaller } = require('./java-installer');
    const javaInstaller = new JavaInstaller();
    results.java = await javaInstaller.checkJavaVersion();

    // Platform-specific tools
    if (this.platform === 'darwin') {
      results.homebrew = await this.checkHomebrew();
    }

    results.docker = await this.checkDocker();
    results.maven = await this.checkMaven();
    results.gradle = await this.checkGradle();

    return results;
  }

  /**
   * 不足している前提条件を自動インストール
   * @param {Array} tools - インストールするツールのリスト
   * @returns {Object} インストール結果
   */
  async installMissingPrerequisites(tools = []) {
    const results = {};

    for (const tool of tools) {
      console.log(`${tool} をインストール中...`);
      
      switch (tool) {
        case 'homebrew':
          results.homebrew = await this.installHomebrew();
          break;
        case 'docker':
          results.docker = await this.installDocker();
          break;
        case 'maven':
          results.maven = await this.installMaven();
          break;
        case 'gradle':
          results.gradle = await this.installGradle();
          break;
        case 'java':
          const { JavaInstaller } = require('./java-installer');
          const javaInstaller = new JavaInstaller();
          results.java = await javaInstaller.installJava(17);
          break;
        default:
          results[tool] = {
            success: false,
            message: `Unknown tool: ${tool}`
          };
      }
    }

    return results;
  }

  // Private methods

  async _executeCommand(command, options = {}) {
    return execAsync(command, {
      shell: true,
      timeout: options.timeout || 120000,
      ...options
    });
  }

  async _detectLinuxDistro() {
    try {
      const { stdout } = await this._executeCommand('cat /etc/os-release');
      return stdout.toLowerCase();
    } catch (error) {
      return 'unknown';
    }
  }
}

module.exports = { PrerequisitesInstaller };