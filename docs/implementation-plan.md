# ScalarDB Installer 実装計画書

## 1. ツールの概要

ScalarDB Installerは、ScalarDBおよびScalarDLを簡単にセットアップするためのWebベースのインストールウィザードです。複雑な設定やコマンドライン操作を必要とせず、GUIを通じて直感的にインストールと設定を行うことができます。

## 2. 主な機能

### 2.1 インストールウィザード
- **製品選択**: ScalarDB または ScalarDL の選択
- **環境タイプ**: 開発環境 または 本番環境の選択
- **ステップバイステップ**: 6段階のウィザード形式でインストールを案内

### 2.2 環境チェックと自動インストール
- **Java環境**: OpenJDK 8, 11, 17, 21 の検出とインストール
- **Docker**: Dockerのインストール状態確認
- **ビルドツール**: Maven/Gradleの検出
- **Homebrew**: macOS環境でのパッケージ管理

### 2.3 データベースサポート
- PostgreSQL
- MySQL
- Apache Cassandra
- Amazon DynamoDB
- Azure Cosmos DB

### 2.4 デプロイメントオプション
- **ローカルインストール**: システムに直接インストール
- **Docker**: コンテナ環境での実行
- **Kubernetes**: クラスターでの実行（計画中）

### 2.5 リアルタイム進捗管理
- WebSocketによるリアルタイム進捗更新
- インストールログの表示
- エラー通知とトラブルシューティング

## 3. 現在の実装状況

### ✅ 完了済み機能（更新: 2025/01/04）

#### 3.1 基本インフラ
- ✅ Express.jsベースのAPIサーバー
- ✅ WebベースのUIウィザード
- ✅ Socket.IOによるWebSocket通信
- ✅ 設定ファイルの生成と保存

#### 3.2 環境チェック機能
- ✅ Java環境の検出（バージョン、ベンダー、JAVA_HOME）
- ✅ Dockerの検出と実行状態確認
- ✅ Maven/Gradleの検出
- ✅ Homebrewの検出（macOS）

#### 3.3 データベース機能
- ✅ PostgreSQL接続テスト
- ✅ MySQL接続テスト
- ✅ Cassandra接続テスト（基本実装）
- ✅ DynamoDB接続テスト（AWS SDK使用）
- ✅ Cosmos DB接続テスト（Azure SDK使用）
- ✅ スキーマ自動作成機能

#### 3.4 設定管理
- ✅ database.properties生成
- ✅ Docker Compose設定生成
- ✅ 設定ファイルの検証
- ✅ 設定ファイルの保存

#### 3.5 Docker統合
- ✅ Dockerコンテナとしてのデプロイ
- ✅ Docker Compose設定の自動生成
- ✅ コンテナ健全性チェック
- ✅ コンテナログ取得

#### 3.7 ScalarDB自動ダウンローダー（新機能）
- ✅ Maven Central API連携
- ✅ 利用可能バージョン一覧取得
- ✅ 最新バージョン自動検出
- ✅ JARファイルの自動ダウンロード
- ✅ ダウンロード進捗表示
- ✅ SHA-1チェックサム検証
- ✅ ユーザーフレンドリーエラーメッセージ

#### 3.8 PostgreSQL Docker自動インストーラー（新機能）
- ✅ Docker環境チェックとエラーガイダンス
- ✅ PostgreSQLイメージの自動pull
- ✅ コンテナの自動作成・起動
- ✅ ポート競合の自動検出と回避
- ✅ セキュアなパスワード自動生成
- ✅ 初期データベース・ユーザー作成
- ✅ 既存コンテナの検出と再利用
- ✅ ヘルスチェック（pg_isready使用）
- ✅ ユーザーフレンドリーエラーメッセージ

#### 3.6 UI/UX基本機能
- ✅ 6ステップウィザード
- ✅ リアルタイム進捗表示（WebSocket）
- ✅ エラー通知機能
- ✅ 接続テスト結果表示

### 🚧 実装中の機能

#### 3.9 Java自動インストール
- ✅ macOS: Homebrew経由実装済み
- 🚧 Windows: 開発中
- ❌ Linux: 未実装

#### 3.9 MySQL Docker自動インストーラー（新機能）
- ✅ Docker環境チェックとエラーガイダンス
- ✅ MySQLイメージの自動pull
- ✅ コンテナの自動作成・起動
- ✅ ポート競合の自動検出と回避
- ✅ セキュアなパスワード自動生成（rootとユーザー）
- ✅ 初期データベース・ユーザー作成
- ✅ 既存コンテナの検出と再利用
- ✅ ヘルスチェック（mysqladmin ping使用）
- ✅ MySQL固有の文字コード設定（UTF-8）
- ✅ ユーザーフレンドリーエラーメッセージ

#### 3.10 Cassandra Docker自動インストーラー
- 🚧 開発予定（次の優先項目）

### ❌ 未実装機能

#### 3.11 ScalarDB拡張機能
- ❌ 依存ライブラリの自動解決
- ❌ CLIツールのセットアップ
- ❌ 実行権限の自動設定

#### 3.12 その他のデータベース自動インストール
- ❌ MySQL自動インストール（Docker/ネイティブ）
- ❌ Cassandra自動インストール（Docker）
- ❌ DynamoDB Local自動セットアップ
- ❌ Cosmos DB Emulator自動インストール

#### 3.13 環境設定の完全自動化
- ❌ JAVA_HOME自動設定（Windows/Linux）
- ❌ PATH自動設定（Windows/Linux）
- ❌ Docker Desktop自動インストールガイド
- ❌ 環境変数の永続化

#### 3.14 エラーハンドリング改善
- ✅ 非技術者向けエラーメッセージ（PostgreSQL関連）
- ❌ 自動リトライ機能
- ❌ ロールバック機能
- ❌ トラブルシューティングウィザード

#### 3.15 統合管理機能（Phase 2）
- ❌ 統合ダッシュボード
- ❌ ワンクリック起動/停止
- ❌ リソースモニタリング
- ❌ ログビューアー

## 4. インストール可能なコンポーネント

### 4.1 現在インストール可能
1. **Java環境**（macOSのみ）
   - Eclipse Temurin JDK 17
   - Homebrew経由でのインストール

2. **ScalarDB本体**（新機能）
   - Maven Centralからの自動ダウンロード
   - バージョン選択機能
   - SHA-1チェックサム検証

3. **PostgreSQLデータベース**（新機能）
   - Docker経由での完全自動インストール
   - 初期データベース・ユーザー作成
   - セキュアなパスワード自動生成

4. **設定ファイル**
   - database.properties
   - docker-compose.yml

5. **データベーススキーマ**
   - PostgreSQL、MySQL、Cassandra用のテーブル作成

6. **Dockerコンテナ**
   - ScalarDBサーバーコンテナ
   - データベースコンテナ（PostgreSQL、MySQL、Cassandra）

### 4.2 将来的にインストール予定
1. **Java環境**（全プラットフォーム）
   - Windows: Chocolatey経由
   - Linux: apt/yum経由

2. **MySQL/Cassandraデータベース**
   - Docker経由での自動インストール
   - 初期設定の完全自動化

3. **関連ツール**
   - ScalarDB Schema Loader
   - ScalarDB SQL CLI
   - ScalarDB GraphQL

4. **本番環境ツール**
   - Kubernetes Operator
   - Helm Charts
   - Terraform モジュール

## 5. 実装優先順位（非エンジニア向け完全自動化）

### Phase 1（最優先）- 即時実装
1. **ScalarDB本体の自動化**
   - Maven CentralからのJARファイル自動ダウンロード
   - バージョン選択UI（最新版デフォルト）
   - 依存ライブラリの自動解決
   - CLIツールの自動セットアップ

2. **データベース自動インストール**
   - PostgreSQL/MySQLのDockerワンクリックインストール
   - データベース・ユーザーの自動作成
   - 接続情報の自動設定
   - サンプルデータの投入オプション

3. **環境設定の完全自動化**
   - Windows/Linux環境でのJava自動インストール
   - 環境変数の自動設定（JAVA_HOME等）
   - Dockerデスクトップの自動インストール案内
   - すべての設定をGUIで完結

4. **エラーハンドリングの徹底**
   - 非技術者向けエラーメッセージ
   - 図解付きトラブルシューティング
   - 自動リトライとリカバリー機能

### Phase 2（利便性向上）- 2週間以内
1. **統合管理ダッシュボード**
   - すべてのコンポーネントの一元管理
   - ワンクリック起動/停止/再起動
   - ヘルスチェックとステータス表示
   - ログビューアー（フィルタリング機能付き）

2. **ローカルインストールオプション**
   - PostgreSQL/MySQLネイティブインストーラー統合
   - サイレントインストール対応
   - 初期設定の完全自動化

3. **サンプルアプリケーション**
   - デモアプリの自動デプロイ
   - 動作確認用のテストデータ
   - 使い方チュートリアル統合

### Phase 3（運用支援）- 1ヶ月以内
1. **メンテナンス機能**
   - ワンクリックバックアップ/リストア
   - 自動アップデート通知
   - データベース最適化ツール

2. **ユーザー支援**
   - インタラクティブなヘルプシステム
   - 動画チュートリアル統合
   - FAQ自動表示

注: Phase 2（Kubernetes等）は非エンジニア向けには不要のため削除

## 6. 技術スタック

### フロントエンド
- HTML5/CSS3/JavaScript（Vanilla）
- Socket.IO Client
- 今後: React/Vue.jsへの移行を検討

### バックエンド
- Node.js + Express.js
- Socket.IO Server
- 各種データベースドライバー

### インフラ
- Docker/Docker Compose
- 将来: Kubernetes、Terraform

## 7. 制限事項と注意点

### 7.1 現在の制限
1. **プラットフォーム依存**
   - Java自動インストールはmacOSのみ
   - 一部のコマンドはUnix系OSを前提

2. **データベース要件**
   - PostgreSQLは完全自動インストール可能
   - MySQL、Cassandra等は引き続き手動セットアップが必要
   - クラウドサービス（DynamoDB、Cosmos DB）は認証情報が必要

3. **ネットワーク要件**
   - インターネット接続が必須
   - プロキシ環境では追加設定が必要

### 7.2 セキュリティ考慮事項
1. データベースパスワードは平文で保存される
2. HTTPS未対応（ローカル使用を前提）
3. 認証機能なし

## 8. 今後の展開

### 8.1 エンタープライズ対応
- Active Directory/LDAP統合
- 監査ログ機能
- ロールベースアクセス制御

### 8.2 クラウドネイティブ対応
- AWS/Azure/GCP専用テンプレート
- マネージドサービスとの統合
- サーバーレスデプロイメント

### 8.3 開発者体験の向上
- CLI版の提供
- IDE統合（VSCode、IntelliJ）
- CI/CDパイプライン統合

## 9. サポートとドキュメント

### 9.1 現在提供中
- インストールウィザードUI
- 基本的なREADME
- APIドキュメント（コード内）

### 9.2 今後提供予定
- 詳細なユーザーマニュアル
- トラブルシューティングガイド
- ビデオチュートリアル
- コミュニティフォーラム

## 10. まとめ

ScalarDB Installerは、ScalarDBの導入障壁を大幅に下げることを目的としたツールです。現在は基本的なインストール機能とDocker統合が実装されており、今後は本番環境対応とエンタープライズ機能の追加を予定しています。

継続的な改善により、あらゆる規模の組織がScalarDBを簡単に導入・運用できるようになることを目指します。