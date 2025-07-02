const { ScalarDBInstaller } = require('../../installer/core/scalardb-installer');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('ScalarDBInstaller', () => {
  let installer;
  let tempDir;

  beforeEach(async () => {
    installer = new ScalarDBInstaller();
    // テスト用の一時ディレクトリを作成
    tempDir = path.join(os.tmpdir(), 'scalardb-test-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // テスト後のクリーンアップ
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // エラーを無視
    }
  });

  describe('checkScalarDBInstallation', () => {
    it('should detect if ScalarDB is already installed', async () => {
      const result = await installer.checkScalarDBInstallation();
      
      expect(result).toHaveProperty('installed');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('location');
      expect(result).toHaveProperty('type'); // 'maven', 'gradle', 'jar', 'server'
    });

    it('should return installed:false when ScalarDB is not installed', async () => {
      jest.spyOn(installer, '_checkMavenInstallation').mockResolvedValue(null);
      jest.spyOn(installer, '_checkGradleInstallation').mockResolvedValue(null);
      jest.spyOn(installer, '_checkJarInstallation').mockResolvedValue(null);
      
      const result = await installer.checkScalarDBInstallation();
      
      expect(result.installed).toBe(false);
      expect(result.version).toBeNull();
    });
  });

  describe('downloadScalarDB', () => {
    it('should download ScalarDB jar file', async () => {
      jest.spyOn(installer, '_downloadFile').mockResolvedValue(path.join(tempDir, 'scalardb.jar'));
      
      const result = await installer.downloadScalarDB('3.16.0', tempDir);
      
      expect(result.success).toBe(true);
      expect(result.filePath).toContain('scalardb');
      expect(installer._downloadFile).toHaveBeenCalledWith(
        expect.stringContaining('maven'),
        expect.any(String)
      );
    });

    it('should handle download failure', async () => {
      jest.spyOn(installer, '_downloadFile').mockRejectedValue(new Error('Download failed'));
      
      const result = await installer.downloadScalarDB('3.16.0', tempDir);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Download failed');
    });
  });

  describe('installScalarDB', () => {
    it('should install ScalarDB as Maven dependency', async () => {
      const config = {
        installType: 'maven',
        version: '3.16.0',
        projectPath: tempDir
      };
      
      // pom.xmlファイルを作成
      await fs.writeFile(path.join(tempDir, 'pom.xml'), '<project></project>');
      jest.spyOn(installer, '_updateMavenPom').mockResolvedValue(true);
      
      const result = await installer.installScalarDB(config);
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('maven');
    });

    it('should install ScalarDB as Gradle dependency', async () => {
      const config = {
        installType: 'gradle',
        version: '3.16.0',
        projectPath: tempDir
      };
      
      // build.gradleファイルを作成
      await fs.writeFile(path.join(tempDir, 'build.gradle'), 'dependencies {}');
      jest.spyOn(installer, '_updateGradleBuild').mockResolvedValue(true);
      
      const result = await installer.installScalarDB(config);
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('gradle');
    });

    it('should install ScalarDB as standalone JAR', async () => {
      const config = {
        installType: 'jar',
        version: '3.16.0',
        installPath: tempDir
      };
      
      jest.spyOn(installer, 'downloadScalarDB').mockResolvedValue({
        success: true,
        filePath: path.join(tempDir, 'scalardb-3.16.0.jar')
      });
      
      const result = await installer.installScalarDB(config);
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('jar');
      expect(result.jarPath).toContain('scalardb');
    });

    it('should install ScalarDB Server', async () => {
      const config = {
        installType: 'server',
        version: '3.16.0',
        installPath: tempDir
      };
      
      jest.spyOn(installer, '_downloadScalarDBServer').mockResolvedValue({
        success: true,
        installPath: path.join(tempDir, 'scalardb-server')
      });
      
      const result = await installer.installScalarDB(config);
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('server');
      expect(result.serverPath).toContain('scalardb-server');
    });
  });

  describe('installScalarDL', () => {
    it('should install ScalarDL', async () => {
      const config = {
        version: '3.9.0',
        installPath: tempDir
      };
      
      jest.spyOn(installer, '_downloadFile').mockResolvedValue(
        path.join(tempDir, 'scalardl-3.9.0.jar')
      );
      
      const result = await installer.installScalarDL(config);
      
      expect(result.success).toBe(true);
      expect(result.jarPath).toContain('scalardl');
    });
  });

  describe('verifyInstallation', () => {
    it('should verify Maven installation', async () => {
      jest.spyOn(installer, '_executeCommand').mockResolvedValue({
        stdout: 'com.scalar-labs:scalardb:jar:3.16.0'
      });
      
      const result = await installer.verifyInstallation('maven', tempDir);
      
      expect(result.verified).toBe(true);
      expect(result.details).toContain('3.16.0');
    });

    it('should verify JAR installation', async () => {
      const jarPath = path.join(tempDir, 'scalardb-3.16.0.jar');
      await fs.writeFile(jarPath, 'dummy jar content');
      
      const result = await installer.verifyInstallation('jar', jarPath);
      
      expect(result.verified).toBe(true);
    });

    it('should return false for missing JAR', async () => {
      const jarPath = path.join(tempDir, 'nonexistent.jar');
      
      const result = await installer.verifyInstallation('jar', jarPath);
      
      expect(result.verified).toBe(false);
    });
  });

  describe('getMavenCentralUrl', () => {
    it('should generate correct Maven Central URL for ScalarDB', () => {
      const url = installer.getMavenCentralUrl('scalardb', '3.16.0');
      
      expect(url).toContain('repo1.maven.org');
      expect(url).toContain('com/scalar-labs/scalardb');
      expect(url).toContain('3.16.0');
      expect(url).toContain('.jar');
    });

    it('should generate correct Maven Central URL for ScalarDL', () => {
      const url = installer.getMavenCentralUrl('scalardl', '3.9.0');
      
      expect(url).toContain('repo1.maven.org');
      expect(url).toContain('com/scalar-labs/scalardl');
      expect(url).toContain('3.9.0');
      expect(url).toContain('.jar');
    });
  });

  describe('getAvailableVersions', () => {
    it('should fetch available ScalarDB versions from Maven Central', async () => {
      const mockResponse = {
        response: {
          docs: [
            { v: '3.16.0' },
            { v: '3.15.0' },
            { v: '3.14.0' }
          ]
        }
      };
      
      jest.spyOn(installer, '_fetchJson').mockResolvedValue(mockResponse);
      
      const versions = await installer.getAvailableVersions('scalardb');
      
      expect(versions).toContain('3.16.0');
      expect(versions).toContain('3.15.0');
      expect(versions).toContain('3.14.0');
    });

    it('should handle API errors gracefully', async () => {
      jest.spyOn(installer, '_fetchJson').mockRejectedValue(new Error('API Error'));
      
      const versions = await installer.getAvailableVersions('scalardb');
      
      expect(versions).toEqual([]);
    });
  });

  describe('_updateMavenPom', () => {
    it('should add ScalarDB dependency to pom.xml', async () => {
      const pomPath = path.join(tempDir, 'pom.xml');
      const pomContent = `<project>
  <dependencies>
  </dependencies>
</project>`;
      
      await fs.writeFile(pomPath, pomContent);
      
      const result = await installer._updateMavenPom(pomPath, '3.16.0');
      
      expect(result).toBe(true);
      
      const updatedContent = await fs.readFile(pomPath, 'utf8');
      expect(updatedContent).toContain('com.scalar-labs');
      expect(updatedContent).toContain('scalardb');
      expect(updatedContent).toContain('3.16.0');
    });
  });

  describe('_updateGradleBuild', () => {
    it('should add ScalarDB dependency to build.gradle', async () => {
      const gradlePath = path.join(tempDir, 'build.gradle');
      const gradleContent = `dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
}`;
      
      await fs.writeFile(gradlePath, gradleContent);
      
      const result = await installer._updateGradleBuild(gradlePath, '3.16.0');
      
      expect(result).toBe(true);
      
      const updatedContent = await fs.readFile(gradlePath, 'utf8');
      expect(updatedContent).toContain('com.scalar-labs:scalardb:3.16.0');
    });
  });
});