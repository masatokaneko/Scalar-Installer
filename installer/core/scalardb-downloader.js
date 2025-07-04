const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { pipeline } = require('stream/promises');
const { createWriteStream } = require('fs');

class ScalarDBDownloader {
  constructor() {
    this.MAVEN_CENTRAL_API = 'https://search.maven.org/solrsearch/select';
    this.MAVEN_CENTRAL_DOWNLOAD = 'https://repo1.maven.org/maven2';
    this.GROUP_ID = 'com.scalar-labs';
    this.ARTIFACT_ID = 'scalardb';
  }

  /**
   * Maven Centralから利用可能なバージョン一覧を取得
   */
  async getAvailableVersions() {
    try {
      const params = {
        q: `g:${this.GROUP_ID} AND a:${this.ARTIFACT_ID}`,
        core: 'gav',
        rows: 20,
        wt: 'json'
      };

      const response = await axios.get(this.MAVEN_CENTRAL_API, { params });
      
      if (!response.data.response || !response.data.response.docs) {
        throw new Error('予期しないレスポンス形式');
      }

      return response.data.response.docs.map(doc => ({
        version: doc.v,
        releaseDate: new Date(doc.timestamp)
      })).sort((a, b) => b.releaseDate - a.releaseDate);

    } catch (error) {
      throw new Error(this.getUserFriendlyError(error));
    }
  }

  /**
   * 最新の安定版バージョンを取得
   */
  async getLatestVersion() {
    const versions = await this.getAvailableVersions();
    
    // SNAPSHOT版を除外して最新版を取得
    const stableVersions = versions.filter(v => !v.version.includes('SNAPSHOT'));
    
    if (stableVersions.length === 0) {
      throw new Error('安定版が見つかりません');
    }

    return stableVersions[0].version;
  }

  /**
   * 指定バージョンのScalarDBをダウンロード
   */
  async downloadVersion(version, progressCallback = () => {}) {
    try {
      // ダウンロードディレクトリの作成
      const downloadDir = path.join(process.cwd(), 'downloads', 'scalardb');
      await fs.mkdir(downloadDir, { recursive: true });

      const jarFileName = `scalardb-${version}.jar`;
      const jarPath = path.join(downloadDir, jarFileName);
      
      // JARファイルのURL
      const jarUrl = `${this.MAVEN_CENTRAL_DOWNLOAD}/${this.GROUP_ID.replace(/\./g, '/')}/${this.ARTIFACT_ID}/${version}/${jarFileName}`;
      const sha1Url = `${jarUrl}.sha1`;

      // SHA-1チェックサムを取得
      const sha1Response = await axios.get(sha1Url);
      const expectedSha1 = sha1Response.data.trim();

      // JARファイルをダウンロード
      await this.downloadFile(jarUrl, jarPath, progressCallback);

      // チェックサム検証
      const isValid = await this.verifyChecksum(jarPath, expectedSha1);
      if (!isValid) {
        await fs.unlink(jarPath); // 破損ファイルを削除
        throw new Error('ダウンロードしたファイルが破損している可能性があります');
      }

      // ファイルサイズを取得
      const stats = await fs.stat(jarPath);

      return {
        success: true,
        path: jarPath,
        version: version,
        size: stats.size
      };

    } catch (error) {
      if (error.message.includes('破損')) {
        throw error;
      }
      throw new Error(this.getUserFriendlyError(error));
    }
  }

  /**
   * ファイルをダウンロード（プログレス付き）
   */
  async downloadFile(url, destinationPath, progressCallback) {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });

    const totalSize = parseInt(response.headers['content-length'], 10);
    let downloadedSize = 0;

    // プログレス追跡
    response.data.on('data', (chunk) => {
      downloadedSize += chunk.length;
      const progress = (downloadedSize / totalSize) * 100;
      progressCallback(progress);
    });

    // ファイルに書き込み
    const writer = createWriteStream(destinationPath);
    await pipeline(response.data, writer);
  }

  /**
   * SHA-1チェックサムを検証
   */
  async verifyChecksum(filePath, expectedSha1) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const hash = crypto.createHash('sha1');
      hash.update(fileBuffer);
      const actualSha1 = hash.digest('hex');
      
      return actualSha1.toLowerCase() === expectedSha1.toLowerCase();
    } catch (error) {
      console.error('チェックサム検証エラー:', error);
      return false;
    }
  }

  /**
   * 技術的エラーを非技術者向けメッセージに変換
   */
  getUserFriendlyError(error) {
    const errorMessage = error.message || error.toString();

    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND') || errorMessage.includes('Network')) {
      return 'インターネット接続を確認してください';
    }
    
    if (errorMessage.includes('ENOSPC')) {
      return 'ディスクの空き容量が不足しています';
    }
    
    if (errorMessage.includes('EACCES') || errorMessage.includes('EPERM')) {
      return '保存先フォルダへの書き込み権限がありません';
    }
    
    if (errorMessage.includes('404')) {
      return '指定されたバージョンが見つかりません';
    }
    
    if (errorMessage.includes('500') || errorMessage.includes('503')) {
      return 'サーバーが一時的に利用できません。しばらく待ってから再試行してください';
    }

    // その他のエラー
    return `エラーが発生しました: ${errorMessage}`;
  }

  /**
   * ダウンロード済みファイルの確認
   */
  async isVersionDownloaded(version) {
    try {
      const downloadDir = path.join(process.cwd(), 'downloads', 'scalardb');
      const jarPath = path.join(downloadDir, `scalardb-${version}.jar`);
      
      await fs.access(jarPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * ダウンロード済みバージョンの一覧
   */
  async getDownloadedVersions() {
    try {
      const downloadDir = path.join(process.cwd(), 'downloads', 'scalardb');
      const files = await fs.readdir(downloadDir);
      
      const versions = files
        .filter(file => file.startsWith('scalardb-') && file.endsWith('.jar'))
        .map(file => {
          const match = file.match(/scalardb-(.+)\.jar/);
          return match ? match[1] : null;
        })
        .filter(version => version !== null);

      return versions;
    } catch {
      return [];
    }
  }
}

module.exports = { ScalarDBDownloader };