# ScalarDB自動ダウンローダー設計書

## 1. 概要

ScalarDB本体（JARファイル）をMaven Central Repositoryから自動的にダウンロードし、適切な場所に配置する機能を実装する。

## 2. 機能要件

### 2.1 基本機能
- Maven Central APIを使用したバージョン一覧の取得
- 最新安定版の自動検出
- 指定バージョンのダウンロード
- ダウンロード進捗のリアルタイム表示
- チェックサム（SHA-1）検証
- 依存ライブラリの自動解決

### 2.2 UI要件
- バージョン選択ドロップダウン
- 「最新版」をデフォルト選択
- ダウンロード進捗バー
- 成功/失敗の明確な表示

## 3. 技術設計

### 3.1 アーキテクチャ

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   UI (Wizard)   │────▶│  Downloader API  │────▶│  Maven Central  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                         
         ▼                       ▼                         
┌─────────────────┐     ┌──────────────────┐              
│   WebSocket     │     │  File System     │              
└─────────────────┘     └──────────────────┘              
```

### 3.2 コンポーネント設計

#### ScalarDBDownloader クラス
```javascript
class ScalarDBDownloader {
  // Maven Central APIのベースURL
  MAVEN_CENTRAL_API = 'https://search.maven.org/solrsearch/select';
  MAVEN_CENTRAL_DOWNLOAD = 'https://repo1.maven.org/maven2';
  
  // メソッド
  async getAvailableVersions()      // バージョン一覧取得
  async getLatestVersion()          // 最新バージョン取得
  async downloadVersion(version)    // 指定バージョンダウンロード
  async verifyChecksum(file, sha1)  // チェックサム検証
  async resolveDependencies(version) // 依存関係解決
}
```

### 3.3 API設計

#### エンドポイント
```
GET  /api/scalardb/versions      - 利用可能なバージョン一覧
GET  /api/scalardb/latest        - 最新バージョン情報
POST /api/scalardb/download      - ダウンロード実行
GET  /api/scalardb/download/:id  - ダウンロード進捗確認
```

### 3.4 データフロー

1. **バージョン取得**
   ```
   UI → API → Maven Central API → バージョンリスト → UI
   ```

2. **ダウンロード実行**
   ```
   UI → API → ダウンロード開始 → WebSocket進捗通知 → UI更新
   ```

## 4. 実装詳細

### 4.1 Maven Central API呼び出し

```javascript
async getAvailableVersions() {
  const params = {
    q: 'g:com.scalar-labs AND a:scalardb',
    core: 'gav',
    rows: 20,
    wt: 'json'
  };
  
  const response = await axios.get(this.MAVEN_CENTRAL_API, { params });
  return this.parseVersions(response.data);
}
```

### 4.2 ダウンロード処理

```javascript
async downloadVersion(version, progressCallback) {
  const artifactUrl = `${this.MAVEN_CENTRAL_DOWNLOAD}/com/scalar-labs/scalardb/${version}/scalardb-${version}.jar`;
  const sha1Url = `${artifactUrl}.sha1`;
  
  // SHA-1チェックサムを先に取得
  const sha1 = await this.fetchChecksum(sha1Url);
  
  // JARファイルをダウンロード
  const jarPath = await this.downloadFile(artifactUrl, progressCallback);
  
  // チェックサム検証
  const isValid = await this.verifyChecksum(jarPath, sha1);
  if (!isValid) {
    throw new Error('チェックサム検証に失敗しました');
  }
  
  return jarPath;
}
```

### 4.3 進捗通知

```javascript
downloadFile(url, progressCallback) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(tempPath);
    
    https.get(url, (response) => {
      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const progress = (downloadedSize / totalSize) * 100;
        progressCallback(progress);
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve(tempPath);
      });
    });
  });
}
```

## 5. エラーハンドリング

### 5.1 想定されるエラー
- ネットワークエラー
- Maven Centralサーバーエラー
- ディスク容量不足
- 権限エラー
- チェックサム不一致

### 5.2 エラーメッセージ（非技術者向け）
```javascript
const errorMessages = {
  'NETWORK_ERROR': 'インターネット接続を確認してください',
  'SERVER_ERROR': 'サーバーが一時的に利用できません。しばらく待ってから再試行してください',
  'DISK_FULL': 'ディスクの空き容量が不足しています。不要なファイルを削除してください',
  'PERMISSION_DENIED': '保存先フォルダへの書き込み権限がありません',
  'CHECKSUM_MISMATCH': 'ダウンロードしたファイルが破損している可能性があります。再度ダウンロードしてください'
};
```

## 6. テスト計画

### 6.1 単体テスト
- バージョン一覧取得のテスト
- ダウンロード機能のテスト
- チェックサム検証のテスト
- エラーハンドリングのテスト

### 6.2 統合テスト
- 実際のMaven Central APIとの連携テスト
- 大容量ファイルのダウンロードテスト
- ネットワーク障害時のリトライテスト

## 7. セキュリティ考慮事項

- HTTPS通信の使用
- SHA-1チェックサムによる完全性検証
- ダウンロード先ディレクトリの権限チェック
- 悪意のあるファイル名のサニタイズ

## 8. パフォーマンス考慮事項

- 並列ダウンロードの検討（将来）
- キャッシュ機能の実装（同一バージョンの再ダウンロード防止）
- 部分ダウンロード（レジューム機能）の検討

## 9. 将来の拡張

- 依存ライブラリの自動ダウンロード
- プラグインシステムの対応
- ミラーサーバーの選択機能
- オフラインインストール用パッケージ作成