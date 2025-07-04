const { MySQLAutoInstaller } = require('../core/mysql-auto-installer');

describe('MySQL自動インストーラー統合テスト', () => {
  let installer;
  
  beforeEach(() => {
    installer = new MySQLAutoInstaller();
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
      
      const error2 = new Error('Access denied for user');
      const message2 = installer.getUserFriendlyError(error2);
      expect(message2).toBe('MySQL認証エラーが発生しました。パスワードを確認してください。');
      
      const error3 = new Error('ENOSPC: no space left on device');
      const message3 = installer.getUserFriendlyError(error3);
      expect(message3).toBe('ディスクの空き容量が不足しています。');
    });
    
    it('MySQL固有の設定値が正しい', () => {
      expect(installer.DEFAULT_PORT).toBe(3306);
      expect(installer.CONTAINER_NAME).toBe('scalardb-mysql');
      expect(installer.IMAGE_NAME).toBe('mysql:8.0');
      expect(installer.DATA_VOLUME).toBe('scalardb-mysql-data');
    });
  });
});