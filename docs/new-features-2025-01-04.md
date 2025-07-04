# 新機能リリースノート - 2025年1月4日

## 🎉 本リリースの概要

ScalarDB Installerに大幅な機能追加を実施し、非エンジニアでも簡単にScalarDBをセットアップできるようになりました。

## 🚀 主な新機能

### 1. ScalarDB自動ダウンローダー

- **Maven Central APIとの統合**: 利用可能なバージョン一覧を自動取得
- **ワンクリックダウンロード**: 最新版または任意のバージョンを選択してダウンロード
- **進捗表示**: リアルタイムでダウンロード進捗を表示
- **SHA-1チェックサム検証**: ダウンロードしたファイルの完全性を自動検証
- **エラーハンドリング**: ネットワークエラーやディスク容量不足を分かりやすく通知

### 2. PostgreSQL Docker自動インストーラー

- **完全自動セットアップ**: ボタンクリックだけでPostgreSQLをインストール
- **Docker環境チェック**: Dockerの状態を確認し、適切なガイダンスを提供
- **ポート競合回避**: 使用中のポートを検出し、自動的に別のポートを選択
- **セキュアな設定**: 暗号学的に安全なパスワードを自動生成
- **既存環境の検出**: 既存のPostgreSQLコンテナを検出し、再利用オプションを提供
- **ヘルスチェック**: pg_isreadyを使用した確実な起動確認
- **ユーザーフレンドリーなエラー**: 技術的なエラーを平易な言葉で説明

## 📈 進捗率の向上

- 全体進捗率: 29.3% → **44.6%** (+15.3%)
- 完了機能数: 27 → **41** (+14機能)
- ScalarDB本体の自動化: 0% → **66.7%**
- データベース自動インストール: 0% → **34.8%**

## 🔧 技術的な改善点

### テスト駆動開発（TDD）の採用

すべての新機能は以下のプロセスで実装されています：

1. 設計書の作成
2. テストコードの作成
3. 実装
4. テストの合格確認

### APIエンドポイントの追加

```
# ScalarDB関連
GET  /api/scalardb/versions      - 利用可能なバージョン一覧
GET  /api/scalardb/downloaded    - ダウンロード済みバージョン確認
POST /api/scalardb/download      - ScalarDBダウンロード実行

# PostgreSQL関連
POST /api/database/postgresql/install - PostgreSQL自動インストール
GET  /api/database/postgresql/status  - PostgreSQL状態確認
POST /api/database/postgresql/stop    - PostgreSQL停止
POST /api/database/postgresql/remove  - PostgreSQL削除
```

## 💡 使用方法

### ScalarDBのダウンロード

1. インストーラーを起動
2. 「ScalarDBバージョン選択」画面へ進む
3. ドロップダウンから希望のバージョンを選択（デフォルトは最新版）
4. 「ダウンロード」ボタンをクリック
5. 進捗バーでダウンロード状況を確認

### PostgreSQLの自動インストール

1. Docker Desktopが起動していることを確認
2. データベース設定画面で「PostgreSQL」を選択
3. 「PostgreSQLをインストール」ボタンをクリック
4. 自動生成された接続情報が表示される
5. 「接続テスト」で動作確認

## 🐛 既知の問題

- 依存ライブラリの自動解決は未実装
- Windows/LinuxでのJava自動インストールは未対応
- MySQL、Cassandra等の他のデータベースは手動セットアップが必要

## 🔜 次のリリース予定

- MySQL Docker自動インストーラー
- Windows向けJava自動インストーラー
- DynamoDB Local自動セットアップ
- 統合管理ダッシュボード

## 📝 フィードバック

問題や要望がある場合は、GitHubのIssuesでお知らせください。