const request = require('supertest');

// テスト環境を設定
process.env.NODE_ENV = 'test';

const app = require('./installer-server');

// モジュールのモック
jest.mock('../core/java-installer');
jest.mock('../core/scalardb-installer');
jest.mock('../core/config-generator');
jest.mock('../core/prerequisites-installer');

const { JavaInstaller } = require('../core/java-installer');
const { PrerequisitesInstaller } = require('../core/prerequisites-installer');

describe('Installer Server API - Basic Tests', () => {
    let mockJavaInstaller;
    let mockPrerequisitesInstaller;

    beforeEach(() => {
        // モックインスタンスの設定
        mockJavaInstaller = {
            checkJavaVersion: jest.fn(),
            installJava: jest.fn()
        };
        mockPrerequisitesInstaller = {
            checkHomebrew: jest.fn(),
            installHomebrew: jest.fn(),
            checkDocker: jest.fn(),
            checkMaven: jest.fn()
        };

        // コンストラクタのモック
        JavaInstaller.mockImplementation(() => mockJavaInstaller);
        PrerequisitesInstaller.mockImplementation(() => mockPrerequisitesInstaller);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/health', () => {
        it('ヘルスチェックが正常に動作する', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.body).toHaveProperty('status', 'healthy');
            expect(response.body).toHaveProperty('message', 'ScalarDB Installer API is running');
            expect(response.body).toHaveProperty('timestamp');
        });
    });

    describe('Prerequisites API', () => {
        describe('GET /api/prerequisites/homebrew/check', () => {
            it('Homebrewのステータスを返す', async () => {
                const mockResult = {
                    installed: true,
                    version: '4.5.8',
                    path: '/opt/homebrew/bin/brew'
                };
                mockPrerequisitesInstaller.checkHomebrew.mockResolvedValue(mockResult);

                const response = await request(app)
                    .get('/api/prerequisites/homebrew/check')
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body).toHaveProperty('result');
            });
        });

        describe('POST /api/prerequisites/homebrew/install', () => {
            it('Homebrewをインストールする', async () => {
                const mockResult = {
                    success: true,
                    message: 'Homebrew 4.5.8 が正常にインストールされました',
                    version: '4.5.8',
                    path: '/opt/homebrew/bin/brew'
                };
                mockPrerequisitesInstaller.installHomebrew.mockResolvedValue(mockResult);

                const response = await request(app)
                    .post('/api/prerequisites/homebrew/install')
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body).toHaveProperty('result');
            });
        });
    });

    describe('Java API', () => {
        describe('GET /api/java/check', () => {
            it('Javaのインストール状態を確認する', async () => {
                const mockResult = {
                    installed: true,
                    version: '17.0.8',
                    vendor: 'Eclipse Temurin'
                };
                mockJavaInstaller.checkJavaVersion.mockResolvedValue(mockResult);

                const response = await request(app)
                    .get('/api/java/check')
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body).toHaveProperty('result');
            });
        });

        describe('POST /api/java/install', () => {
            it('Javaをインストールする', async () => {
                const mockResult = {
                    success: true,
                    message: 'Java 17 installed successfully',
                    javaHome: '/usr/local/java'
                };
                mockJavaInstaller.installJava.mockResolvedValue(mockResult);

                const response = await request(app)
                    .post('/api/java/install')
                    .send({ version: 17 })
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body).toHaveProperty('result');
                expect(mockJavaInstaller.installJava).toHaveBeenCalledWith(17);
            });
        });
    });

    describe('Database API', () => {
        describe('POST /api/database/test', () => {
            it('データベース接続をテストする', async () => {
                const response = await request(app)
                    .post('/api/database/test')
                    .send({ database: { type: 'postgresql' } })
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.result).toHaveProperty('connected');
                expect(response.body.result).toHaveProperty('message');
            });
        });
    });
});