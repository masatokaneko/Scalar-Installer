# データベース自動インストール実装計画

## 概要
PCにデータベースがインストールされていなくても、ボタンクリックだけで自動的にインストール・設定を完了する機能の実装計画。

## 実装ステータス凡例
- ✅ 完了
- 🚧 実装中
- ❌ 未実装
- 📅 計画済み

## 1. PostgreSQL 自動インストール

### 1.1 Docker版（推奨）
| 機能 | ステータス | 詳細 |
|------|----------|------|
| Dockerインストール確認 | ✅ 完了 | `DockerDeployer.checkDockerInstalled()` |
| PostgreSQLイメージのpull | ❌ 未実装 | 自動ダウンロード機能 |
| コンテナ自動起動 | ❌ 未実装 | ポート5432、環境変数設定 |
| 初期DB作成 | ❌ 未実装 | scalardbデータベース作成 |
| ユーザー作成 | ❌ 未実装 | scalardbユーザー、権限設定 |
| パスワード自動生成 | ❌ 未実装 | セキュアなランダムパスワード |
| 接続情報の自動入力 | ❌ 未実装 | UIフォームへの自動反映 |
| ヘルスチェック | ❌ 未実装 | 起動完了待機 |

### 1.2 ネイティブ版（オプション）
| 機能 | ステータス | 詳細 |
|------|----------|------|
| OS判定 | ✅ 完了 | プラットフォーム検出機能 |
| Windowsインストーラー | ❌ 未実装 | MSIダウンロード・実行 |
| macOSインストーラー | ❌ 未実装 | Homebrew経由 |
| Linuxインストーラー | ❌ 未実装 | apt/yum経由 |
| サイレントインストール | ❌ 未実装 | 無人インストール設定 |
| サービス起動 | ❌ 未実装 | systemd/service管理 |
| 初期設定スクリプト | ❌ 未実装 | psql実行 |

## 2. MySQL 自動インストール

### 2.1 Docker版（推奨）
| 機能 | ステータス | 詳細 |
|------|----------|------|
| MySQLイメージのpull | ❌ 未実装 | MySQL 8.0 公式イメージ |
| コンテナ自動起動 | ❌ 未実装 | ポート3306、環境変数設定 |
| 初期DB作成 | ❌ 未実装 | scalardbデータベース作成 |
| ユーザー作成 | ❌ 未実装 | rootとscalardbユーザー |
| 文字コード設定 | ❌ 未実装 | UTF-8設定 |
| 接続情報の自動入力 | ❌ 未実装 | UIフォームへの自動反映 |

### 2.2 ネイティブ版（オプション）
| 機能 | ステータス | 詳細 |
|------|----------|------|
| Windowsインストーラー | ❌ 未実装 | MSIダウンロード・実行 |
| macOSインストーラー | ❌ 未実装 | Homebrew経由 |
| Linuxインストーラー | ❌ 未実装 | apt/yum経由 |
| 初期設定 | ❌ 未実装 | mysql_secure_installation相当 |

## 3. Cassandra 自動インストール

### 3.1 Docker版
| 機能 | ステータス | 詳細 |
|------|----------|------|
| Cassandraイメージのpull | ❌ 未実装 | Cassandra 4.1 公式イメージ |
| クラスター設定 | ❌ 未実装 | 単一ノード設定 |
| キースペース作成 | ❌ 未実装 | scalardbキースペース |
| CQL実行 | ❌ 未実装 | 初期設定コマンド |

## 4. DynamoDB Local 自動インストール

### 4.1 実装計画
| 機能 | ステータス | 詳細 |
|------|----------|------|
| DynamoDB Localダウンロード | ❌ 未実装 | AWS公式サイトから |
| Docker版起動 | ❌ 未実装 | amazon/dynamodb-localイメージ |
| スタンドアロン版起動 | ❌ 未実装 | JARファイル実行 |
| エンドポイント設定 | ❌ 未実装 | http://localhost:8000 |
| アクセスキー生成 | ❌ 未実装 | ダミーキーの自動設定 |
| テーブル作成 | ❌ 未実装 | 初期テーブル設定 |

## 5. Cosmos DB Emulator 自動インストール

### 5.1 実装計画
| 機能 | ステータス | 詳細 |
|------|----------|------|
| エミュレーターダウンロード | ❌ 未実装 | Microsoft公式サイトから |
| Windowsインストール | ❌ 未実装 | MSIインストーラー実行 |
| Linux/macOS対応 | ❌ 未実装 | Dockerイメージ使用 |
| 証明書インストール | ❌ 未実装 | 自己署名証明書の信頼 |
| 接続文字列生成 | ❌ 未実装 | ローカルエンドポイント |
| データベース作成 | ❌ 未実装 | 初期設定 |

## 6. 共通機能

### 6.1 UI/UX改善
| 機能 | ステータス | 詳細 |
|------|----------|------|
| インストールウィザード | ❌ 未実装 | ステップバイステップUI |
| プログレスバー | ✅ 完了 | WebSocket実装済み |
| エラーハンドリング | 🚧 実装中 | 非技術者向けメッセージ |
| ロールバック | ❌ 未実装 | 失敗時の自動クリーンアップ |

### 6.2 設定管理
| 機能 | ステータス | 詳細 |
|------|----------|------|
| 接続情報の暗号化保存 | ❌ 未実装 | パスワード保護 |
| 設定のエクスポート | ❌ 未実装 | JSON形式で保存 |
| 設定のインポート | ❌ 未実装 | 再利用可能な設定 |

## 実装スケジュール

### Week 1（最優先）
1. **PostgreSQL Docker自動インストール**
   - Dockerイメージpull機能
   - コンテナ起動・初期設定
   - 接続情報の自動入力

2. **MySQL Docker自動インストール**
   - 基本的にPostgreSQLと同様の実装

### Week 2
3. **DynamoDB Local実装**
   - Dockerベースの実装
   - ローカルエンドポイント設定

4. **Cosmos DB Emulator実装**
   - プラットフォーム別対応

### Week 3
5. **ネイティブインストーラー対応**
   - Windows向け実装
   - エラーハンドリング強化

### Week 4
6. **テストと最適化**
   - 統合テスト
   - パフォーマンス改善
   - ドキュメント整備

## 技術的実装詳細

### PostgreSQL Docker自動インストールのコード例
```javascript
class PostgreSQLAutoInstaller {
  async install() {
    // 1. Docker確認
    const dockerStatus = await this.checkDocker();
    if (!dockerStatus.running) {
      return { success: false, error: 'Dockerが起動していません' };
    }
    
    // 2. イメージをpull
    await this.pullImage('postgres:15');
    
    // 3. パスワード生成
    const password = this.generateSecurePassword();
    
    // 4. コンテナ起動
    const container = await this.startContainer({
      image: 'postgres:15',
      name: 'scalardb-postgres',
      env: {
        POSTGRES_USER: 'scalardb',
        POSTGRES_PASSWORD: password,
        POSTGRES_DB: 'scalardb'
      },
      ports: { 5432: 5432 }
    });
    
    // 5. ヘルスチェック
    await this.waitForHealthy(container);
    
    // 6. 接続情報返却
    return {
      success: true,
      connection: {
        host: 'localhost',
        port: 5432,
        user: 'scalardb',
        password: password,
        database: 'scalardb'
      }
    };
  }
}
```

## 成功基準
- 技術知識ゼロのユーザーが5分以内にデータベースをセットアップ完了
- エラー発生時も自動リカバリーまたは分かりやすいガイダンス
- 再起動後も設定が保持される
- アンインストールも簡単に実行可能