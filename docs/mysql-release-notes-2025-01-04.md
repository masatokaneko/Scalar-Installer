# MySQL Docker自動インストーラー リリースノート - 2025年1月4日

## 🎉 新機能リリース

ScalarDB InstallerにMySQL Docker自動インストーラーを追加しました。PostgreSQL自動インストーラーに続き、非エンジニアでもワンクリックでMySQLをセットアップできるようになりました。

## 🚀 主な新機能

### MySQL Docker自動インストーラー

- **完全自動セットアップ**: ボタンクリックだけでMySQL 8.0をインストール
- **Docker環境チェック**: Dockerの状態を確認し、適切なガイダンスを提供
- **ポート競合回避**: 使用中のポート（3306）を検出し、自動的に別のポートを選択
- **セキュアな設定**: 暗号学的に安全なパスワードを自動生成（rootとユーザー用）
- **既存環境の検出**: 既存のMySQLコンテナを検出し、再利用オプションを提供
- **MySQL固有の最適化**: UTF-8文字コード設定とmysql_native_password認証
- **ヘルスチェック**: mysqladmin pingを使用した確実な起動確認
- **ユーザーフレンドリーなエラー**: 技術的なエラーを平易な言葉で説明

## 📈 進捗率の向上

- 全体進捗率: 44.6% → **54.3%** (+9.7%)
- 完了機能数: 41 → **50** (+9機能)
- データベース自動インストール: 34.8% → **73.9%**
- MySQL関連機能: 0% → **100%**

## 🔧 技術仕様

### コンテナ設定

```javascript
{
  imageName: 'mysql:8.0',
  containerName: 'scalardb-mysql',
  defaultPort: 3306,
  database: 'scalardb',
  username: 'scalardb',
  characterSet: 'utf8mb4',
  collation: 'utf8mb4_unicode_ci'
}
```

### セキュリティ設定

- **認証プラグイン**: mysql_native_password（ScalarDBとの互換性確保）
- **文字コード**: utf8mb4（絵文字対応）
- **照合順序**: utf8mb4_unicode_ci
- **パスワード**: 16文字の暗号学的に安全なランダム生成

### PostgreSQLとの比較

| 項目 | PostgreSQL | MySQL |
|------|------------|-------|
| デフォルトポート | 5432 | 3306 |
| Dockerイメージ | postgres:15-alpine | mysql:8.0 |
| ヘルスチェック | pg_isready | mysqladmin ping |
| 起動時間 | 比較的高速 | やや時間がかかる場合あり |
| 特別な設定 | 自動UTF-8 | 明示的UTF-8設定が必要 |

## 💡 使用方法

### MySQLの自動インストール

1. Docker Desktopが起動していることを確認
2. データベース設定画面で「MySQL」を選択
3. 「MySQLをインストール」ボタンをクリック
4. 自動生成された接続情報（rootパスワード含む）を確認
5. 「接続テスト」で動作確認

### APIエンドポイント

```
# MySQL関連
POST /api/database/mysql/install    - MySQL自動インストール
GET  /api/database/mysql/status     - MySQL状態確認
POST /api/database/mysql/stop       - MySQL停止
POST /api/database/mysql/remove     - MySQL削除
```

## 🔄 PostgreSQLとの共存

- PostgreSQLとMySQLを同時に動作可能
- 自動ポート割り当てによる競合回避
- 独立したデータボリューム（scalardb-mysql-data）

## 🐛 既知の問題

- Windows/LinuxでのJava自動インストールは未対応
- Cassandra、DynamoDB等の他のデータベースは手動セットアップが必要
- 既存コンテナ再利用時のパスワード情報は表示されない

## 🔜 次のリリース予定

- **Cassandra Docker自動インストーラー**
- **Windows向けJava自動インストーラー**
- **DynamoDB Local自動セットアップ**
- **統合管理ダッシュボード**

## 📝 フィードバック

MySQL自動インストーラーに関するフィードバックは、GitHubのIssuesでお知らせください。

---

これで、非エンジニアでもPostgreSQLとMySQLの両方をワンクリックで自動セットアップできるようになりました！