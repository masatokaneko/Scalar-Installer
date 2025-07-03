const { PrerequisitesInstaller } = require('./prerequisites-installer');
const { exec } = require('child_process');
const os = require('os');

// child_processのモック
jest.mock('child_process');
jest.mock('os');

describe('PrerequisitesInstaller - Basic Tests', () => {
    let installer;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // execのモック化
        exec.mockImplementation((cmd, options, callback) => {
            if (typeof options === 'function') {
                callback = options;
                options = {};
            }
            callback(new Error(`Command not found: ${cmd}`));
        });
        
        // デフォルトのOSをmacOSに設定
        os.platform.mockReturnValue('darwin');
        os.arch.mockReturnValue('arm64');
        
        installer = new PrerequisitesInstaller();
    });

    describe('checkHomebrew', () => {
        it('macOSでHomebrewがインストールされている場合', async () => {
            exec.mockImplementation((cmd, options, callback) => {
                if (typeof options === 'function') {
                    callback = options;
                    options = {};
                }
                
                if (cmd === 'brew --version') {
                    callback(null, { stdout: 'Homebrew 4.5.8\nHomebrew/homebrew-core (git revision abc123)' });
                } else if (cmd === 'which brew') {
                    callback(null, { stdout: '/opt/homebrew/bin/brew\n' });
                }
            });

            const result = await installer.checkHomebrew();

            expect(result).toEqual({
                installed: true,
                version: '4.5.8',
                path: '/opt/homebrew/bin/brew'
            });
        });

        it('macOS以外のプラットフォームの場合', async () => {
            os.platform.mockReturnValue('linux');
            
            // 新しいインスタンスを作成してplatformを更新
            installer = new PrerequisitesInstaller();

            const result = await installer.checkHomebrew();

            expect(result).toEqual({
                installed: false,
                version: null,
                path: null,
                error: 'Homebrew is only available on macOS'
            });
        });
    });

    describe('checkDocker', () => {
        it('Dockerがインストールされていて実行中の場合', async () => {
            exec.mockImplementation((cmd, options, callback) => {
                if (typeof options === 'function') {
                    callback = options;
                    options = {};
                }
                
                if (cmd === 'docker --version') {
                    callback(null, { stdout: 'Docker version 24.0.5, build 1234567' });
                } else if (cmd === 'docker info') {
                    callback(null, { stdout: 'Server Version: 24.0.5' });
                }
            });

            const result = await installer.checkDocker();

            expect(result).toEqual({
                installed: true,
                version: '24.0.5',
                running: true
            });
        });
    });

    describe('checkMaven', () => {
        it('Mavenがインストールされている場合', async () => {
            exec.mockImplementation((cmd, options, callback) => {
                if (typeof options === 'function') {
                    callback = options;
                    options = {};
                }
                
                callback(null, { stdout: 'Apache Maven 3.9.4 (1234567890)\nMaven home: /usr/local/maven' });
            });

            const result = await installer.checkMaven();

            expect(result).toEqual({
                installed: true,
                version: '3.9.4'
            });
        });
    });
});