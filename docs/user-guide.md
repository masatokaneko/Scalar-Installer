# ScalarDB Installer ユーザーガイド

## 目次
1. [はじめに](#はじめに)
2. [システム要件](#システム要件)
3. [インストーラーの起動](#インストーラーの起動)
4. [ステップバイステップガイド](#ステップバイステップガイド)
5. [トラブルシューティング](#トラブルシューティング)
6. [FAQ](#faq)

## はじめに

ScalarDB Installerは、ScalarDBを簡単にセットアップするためのWebベースのツールです。このガイドでは、インストーラーの使い方を詳しく説明します。

## システム要件

### 対応OS
- macOS 10.15以降
- Windows 10/11（一部機能制限あり）
- Linux（Ubuntu 20.04以降、CentOS 7以降）

### 必要なソフトウェア
- Node.js 14以降
- npm 6以降
- Git

### 推奨環境
- メモリ: 4GB以上
- ディスク空き容量: 10GB以上
- インターネット接続

## インストーラーの起動

### 1. リポジトリのクローン
```bash
git clone https://github.com/masatokaneko/Scalar-Installer.git
cd scalardb-installer
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. インストーラーサーバーの起動
```bash
node installer/api/installer-server.js
```

### 4. ブラウザでアクセス
```
http://localhost:3002/installer/ui/installer-wizard.html
```

## ステップバイステップガイド

### ステップ1: ウェルカム画面

![Welcome](./images/step1-welcome.png)

1. **製品の選択**
   - **ScalarDB**: 分散データベース環境でのACIDトランザクション
   - **ScalarDL**: ビザンチン障害検出機能付きミドルウェア

2. **インストールタイプ**
   - **開発環境**: ローカル開発とテスト用（推奨）
   - **本番環境**: 高可用性とパフォーマンス重視

### ステップ2: 環境チェック

![Environment Check](./images/step2-environment.png)

#### Java環境
- **必須**: OpenJDK 8, 11, 17, または 21
- **自動インストール**: 
  - ✅ macOS: Homebrew経由で自動インストール可能
  - ❌ Windows: 未実装（手動インストールが必要）
  - ❌ Linux: 未実装（手動インストールが必要）
- **手動インストール**: 
  ```bash
  # macOS
  brew install openjdk@17
  
  # Ubuntu/Debian
  sudo apt-get install openjdk-17-jdk
  
  # CentOS/RHEL
  sudo yum install java-17-openjdk
  
  # Windows
  # OpenJDKのMSIインストーラーをダウンロードして実行
  ```

#### Docker（オプション）
- **用途**: コンテナ環境でのデプロイメント
- **確認方法**: `docker --version`
- **インストール**: [Docker公式サイト](https://www.docker.com/get-started)

#### ビルドツール（オプション）
- **Maven**: Javaプロジェクトのビルド管理
- **Gradle**: より柔軟なビルドツール

### ステップ3: データベース選択

![Database Selection](./images/step3-database.png)

#### 対応データベース

1. **PostgreSQL**
   - バージョン: 10以降
   - 特徴: ACID準拠、豊富な機能
   - 推奨用途: 一般的なアプリケーション

2. **MySQL**
   - バージョン: 5.7以降
   - 特徴: 高速、広く使用されている
   - 推奨用途: Webアプリケーション

3. **Cassandra**
   - バージョン: 3.11以降
   - 特徴: 高可用性、スケーラブル
   - 推奨用途: 大規模分散システム

4. **DynamoDB**
   - AWSマネージドサービス
   - 特徴: サーバーレス、自動スケーリング
   - 要件: AWSアカウントとアクセスキー

5. **Cosmos DB**
   - Azureマネージドサービス
   - 特徴: マルチモデル、グローバル分散
   - 要件: Azureアカウントと接続文字列

#### デプロイメント方法

- **ローカルインストール**: システムに直接インストール
- **Docker**: コンテナとして実行（推奨）
- **Kubernetes**: 本番環境向け（未実装）

### ステップ4: データベース設定

![Database Configuration](./images/step4-configuration.png)

#### PostgreSQL/MySQL設定

**現在の状況**:
- ⚠️ **重要**: 現在、データベースは事前にインストールされている必要があります
- ❌ 自動インストール機能は未実装（開発中）

**手動セットアップが必要な項目**:
```
ホスト: localhost
ポート: 5432 (PostgreSQL) / 3306 (MySQL)
ユーザー名: your_username
パスワード: your_password
データベース: scalardb
```

**今後実装予定の自動インストール**:
- 「PostgreSQLをインストール」ボタンでDocker経由で自動セットアップ
- データベース、ユーザー、パスワードの自動生成
- 接続情報の自動入力

#### Cassandra設定
```
ホスト: localhost
ポート: 9042
ユーザー名: cassandra
パスワード: cassandra
キースペース: scalardb
```

#### 接続テスト
1. すべての項目を入力
2. 「接続テスト」ボタンをクリック
3. 緑色のチェックマークが表示されれば成功

#### 詳細設定（オプション）
- **分離レベル**: SNAPSHOT（推奨）またはSERIALIZABLE
- **シリアライズ戦略**: EXTRA_READ（推奨）またはEXTRA_WRITE
- **SQLインターフェース**: ScalarDB SQLを有効化
- **メトリクス収集**: パフォーマンス監視用

### ステップ5: インストール実行

![Installation](./images/step5-installation.png)

#### インストールプロセス
1. **Java環境の確認**: インストール済みJavaの検証
2. **ScalarDBのダウンロード**: 最新版の取得
3. **データベース設定の生成**: database.properties作成
4. **インストールの実行**: ファイルの配置と設定
5. **データベース接続の確認**: 設定の検証
6. **スキーマの作成**: 必要なテーブル作成
7. **Dockerコンテナの起動**（Docker選択時）

#### 進捗表示
- リアルタイムの進捗バー
- 各ステップの詳細ログ
- エラー発生時の即座の通知

### ステップ6: 完了

![Completion](./images/step6-complete.png)

#### インストール後の確認
- インストールパス: `/usr/local/scalardb` または指定パス
- 設定ファイル: `database.properties`
- ログファイル: インストールディレクトリ内

#### 次のステップ
1. **ダッシュボードを開く**: 管理UIへアクセス
2. **ドキュメント**: 公式ドキュメントを参照
3. **サンプル実行**: サンプルアプリケーションで動作確認
4. **設定ファイル生成**: 追加の設定ファイル作成

## トラブルシューティング

### よくある問題と解決方法

#### 1. 「次へ」ボタンが反応しない
**原因**: フォームの入力値が正しく保存されていない
**解決方法**: 
- ブラウザをリロード（F5）
- すべての必須フィールドを入力
- ブラウザのコンソールでエラーを確認

#### 2. データベース接続エラー
**原因**: データベースが起動していない、認証情報が間違っている
**解決方法**:
```bash
# PostgreSQL
sudo service postgresql status
sudo service postgresql start

# MySQL
sudo service mysql status
sudo service mysql start

# Docker
docker ps
docker start <container_name>
```

#### 3. Javaが検出されない
**原因**: Javaがインストールされていない、パスが通っていない
**解決方法**:
```bash
# Javaバージョン確認
java --version

# JAVA_HOME設定（macOS/Linux）
export JAVA_HOME=$(/usr/libexec/java_home)
export PATH=$JAVA_HOME/bin:$PATH

# JAVA_HOME設定（Windows）
setx JAVA_HOME "C:\Program Files\Java\jdk-17"
setx PATH "%JAVA_HOME%\bin;%PATH%"
```

#### 4. Dockerエラー
**原因**: Dockerデーモンが起動していない
**解決方法**:
- Docker Desktopを起動
- `docker info`で確認
- 必要に応じて再起動

### ログの確認

#### インストーラーログ
```bash
tail -f installer-server.log
```

#### Dockerログ
```bash
docker logs scalardb-server
```

#### データベースログ
```bash
# PostgreSQL
tail -f /var/log/postgresql/postgresql-*.log

# MySQL
tail -f /var/log/mysql/error.log
```

## FAQ

### Q1: ScalarDBとScalarDLの違いは？
**A**: ScalarDBは分散トランザクション機能を提供し、ScalarDLはそれに加えてビザンチン障害検出機能を持ちます。

### Q2: 本番環境で使用できますか？
**A**: 現在のインストーラーは主に開発環境向けです。本番環境では追加のセキュリティ設定が必要です。

### Q3: 複数のデータベースを同時に使用できますか？
**A**: 現バージョンでは単一データベースのみサポートしています。

### Q4: アンインストール方法は？
**A**: 
```bash
# Dockerの場合
docker stop scalardb-server
docker rm scalardb-server

# ローカルインストールの場合
rm -rf /usr/local/scalardb
```

### Q5: アップグレード方法は？
**A**: 現在は手動でのアップグレードが必要です。将来的に自動アップグレード機能を追加予定です。

### Q6: ライセンスは？
**A**: ScalarDBはApache License 2.0でライセンスされています。商用利用も可能です。

## サポート

### 問題報告
- GitHub Issues: https://github.com/masatokaneko/Scalar-Installer/issues

### ドキュメント
- ScalarDB公式: https://scalar-labs.github.io/scalardb/
- インストーラーWiki: https://github.com/masatokaneko/Scalar-Installer/wiki

### コミュニティ
- Slack: ScalarDB Community
- Discord: 開設予定