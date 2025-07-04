const { PostgreSQLAutoInstaller } = require('../core/postgresql-auto-installer');

describe('PostgreSQL自動インストーラー統合テスト', () => {
  let installer;
  
  beforeEach(() => {
    installer = new PostgreSQLAutoInstaller();
  });
  
  describe('基本機能の動作確認', () => {
    it('セキュアなパスワードを生成できる', () => {
      const password = installer.generateSecurePassword();
      
      expect(password).toHaveLength(16);
      expect(password).toMatch(/^[a-zA-Z0-9!@#$%^&*]+$/);
    });
    
    it('ユーザーフレンドリーなエラーメッセージを生成できる', () => {
      const error1 = new Error('Cannot connect to the Docker daemon');
      const message1 = installer.getUserFriendlyError(error1);
      expect(message1).toBe('Dockerが起動していません。Docker Desktopを起動してください。');
      
      const error2 = new Error('ENOSPC: no space left on device');
      const message2 = installer.getUserFriendlyError(error2);
      expect(message2).toBe('ディスクの空き容量が不足しています。');
    });
  });
});