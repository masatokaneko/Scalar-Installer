const { JavaInstaller } = require('../../installer/core/java-installer');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

describe('JavaInstaller', () => {
  let javaInstaller;
  
  beforeEach(() => {
    javaInstaller = new JavaInstaller();
  });

  describe('checkJavaVersion', () => {
    it('should detect installed Java version', async () => {
      const result = await javaInstaller.checkJavaVersion();
      
      expect(result).toHaveProperty('installed');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('vendor');
      expect(result).toHaveProperty('home');
    });

    it('should return installed:false when Java is not installed', async () => {
      // Mock exec to simulate Java not found
      jest.spyOn(javaInstaller, '_executeCommand').mockRejectedValue(new Error('java not found'));
      
      const result = await javaInstaller.checkJavaVersion();
      
      expect(result.installed).toBe(false);
      expect(result.version).toBeNull();
    });

    it('should detect Java 8', async () => {
      const mockOutput = 'openjdk version "1.8.0_382"';
      jest.spyOn(javaInstaller, '_executeCommand').mockResolvedValue({ stdout: mockOutput });
      
      const result = await javaInstaller.checkJavaVersion();
      
      expect(result.installed).toBe(true);
      expect(result.version).toBe(8);
    });

    it('should detect Java 11', async () => {
      const mockOutput = 'openjdk version "11.0.20"';
      jest.spyOn(javaInstaller, '_executeCommand').mockResolvedValue({ stdout: mockOutput });
      
      const result = await javaInstaller.checkJavaVersion();
      
      expect(result.installed).toBe(true);
      expect(result.version).toBe(11);
    });

    it('should detect Java 17', async () => {
      const mockOutput = 'openjdk version "17.0.8"';
      jest.spyOn(javaInstaller, '_executeCommand').mockResolvedValue({ stdout: mockOutput });
      
      const result = await javaInstaller.checkJavaVersion();
      
      expect(result.installed).toBe(true);
      expect(result.version).toBe(17);
    });

    it('should detect Java 21', async () => {
      const mockOutput = 'openjdk version "21.0.1"';
      jest.spyOn(javaInstaller, '_executeCommand').mockResolvedValue({ stdout: mockOutput });
      
      const result = await javaInstaller.checkJavaVersion();
      
      expect(result.installed).toBe(true);
      expect(result.version).toBe(21);
    });
  });

  describe('installJava', () => {
    it('should download and install Java for Windows', async () => {
      jest.spyOn(os, 'platform').mockReturnValue('win32');
      jest.spyOn(javaInstaller, '_downloadFile').mockResolvedValue('/tmp/java.zip');
      jest.spyOn(javaInstaller, '_extractArchive').mockResolvedValue(true);
      jest.spyOn(javaInstaller, '_setEnvironmentVariables').mockResolvedValue(true);
      
      const result = await javaInstaller.installJava(17);
      
      expect(result.success).toBe(true);
      expect(result.javaHome).toContain('jdk-17');
    });

    it('should download and install Java for macOS', async () => {
      jest.spyOn(os, 'platform').mockReturnValue('darwin');
      jest.spyOn(os, 'arch').mockReturnValue('x64');
      jest.spyOn(javaInstaller, '_downloadFile').mockResolvedValue('/tmp/java.tar.gz');
      jest.spyOn(javaInstaller, '_extractArchive').mockResolvedValue(true);
      jest.spyOn(javaInstaller, '_setEnvironmentVariables').mockResolvedValue(true);
      
      const result = await javaInstaller.installJava(17);
      
      expect(result.success).toBe(true);
      expect(result.javaHome).toContain('jdk-17');
    });

    it('should download and install Java for Linux', async () => {
      jest.spyOn(os, 'platform').mockReturnValue('linux');
      jest.spyOn(javaInstaller, '_downloadFile').mockResolvedValue('/tmp/java.tar.gz');
      jest.spyOn(javaInstaller, '_extractArchive').mockResolvedValue(true);
      jest.spyOn(javaInstaller, '_setEnvironmentVariables').mockResolvedValue(true);
      
      const result = await javaInstaller.installJava(17);
      
      expect(result.success).toBe(true);
      expect(result.javaHome).toContain('jdk-17');
    });

    it('should throw error for unsupported Java version', async () => {
      await expect(javaInstaller.installJava(7)).rejects.toThrow('Unsupported Java version: 7');
    });

    it('should throw error for unsupported platform', async () => {
      jest.spyOn(os, 'platform').mockReturnValue('unsupported');
      
      await expect(javaInstaller.installJava(17)).rejects.toThrow('Unsupported platform: unsupported');
    });
  });

  describe('setEnvironmentVariables', () => {
    it('should set JAVA_HOME and PATH on Windows', async () => {
      jest.spyOn(os, 'platform').mockReturnValue('win32');
      jest.spyOn(javaInstaller, '_executeCommand').mockResolvedValue({ stdout: '' });
      
      const result = await javaInstaller.setEnvironmentVariables('C:\\Java\\jdk-17');
      
      expect(result.success).toBe(true);
      expect(javaInstaller._executeCommand).toHaveBeenCalledWith(
        expect.stringContaining('setx JAVA_HOME')
      );
    });

    it('should update shell profile on macOS', async () => {
      jest.spyOn(os, 'platform').mockReturnValue('darwin');
      jest.spyOn(os, 'homedir').mockReturnValue('/Users/test');
      jest.spyOn(fs, 'appendFile').mockResolvedValue();
      
      const result = await javaInstaller.setEnvironmentVariables('/usr/local/java/jdk-17');
      
      expect(result.success).toBe(true);
      expect(fs.appendFile).toHaveBeenCalled();
    });

    it('should update shell profile on Linux', async () => {
      jest.spyOn(os, 'platform').mockReturnValue('linux');
      jest.spyOn(os, 'homedir').mockReturnValue('/home/test');
      jest.spyOn(fs, 'appendFile').mockResolvedValue();
      
      const result = await javaInstaller.setEnvironmentVariables('/usr/local/java/jdk-17');
      
      expect(result.success).toBe(true);
      expect(fs.appendFile).toHaveBeenCalled();
    });
  });

  describe('getTemurinDownloadUrl', () => {
    it('should generate correct URL for Windows x64', () => {
      const url = javaInstaller.getTemurinDownloadUrl(17, 'windows', 'x64');
      
      expect(url).toContain('adoptium');
      expect(url).toContain('17');
      expect(url).toContain('windows');
      expect(url).toContain('x64');
      expect(url).toContain('jdk');
    });

    it('should generate correct URL for macOS x64', () => {
      const url = javaInstaller.getTemurinDownloadUrl(17, 'mac', 'x64');
      
      expect(url).toContain('adoptium');
      expect(url).toContain('17');
      expect(url).toContain('mac');
      expect(url).toContain('x64');
      expect(url).toContain('jdk');
    });

    it('should generate correct URL for macOS aarch64', () => {
      const url = javaInstaller.getTemurinDownloadUrl(17, 'mac', 'aarch64');
      
      expect(url).toContain('adoptium');
      expect(url).toContain('17');
      expect(url).toContain('mac');
      expect(url).toContain('aarch64');
      expect(url).toContain('jdk');
    });

    it('should generate correct URL for Linux x64', () => {
      const url = javaInstaller.getTemurinDownloadUrl(17, 'linux', 'x64');
      
      expect(url).toContain('adoptium');
      expect(url).toContain('17');
      expect(url).toContain('linux');
      expect(url).toContain('x64');
      expect(url).toContain('jdk');
    });
  });

  describe('verifyJavaInstallation', () => {
    it('should verify successful installation', async () => {
      jest.spyOn(javaInstaller, '_executeCommand').mockResolvedValue({ 
        stdout: 'openjdk version "17.0.8"' 
      });
      
      const result = await javaInstaller.verifyJavaInstallation('/usr/local/java/jdk-17');
      
      expect(result.verified).toBe(true);
      expect(result.version).toBe(17);
    });

    it('should return false for failed verification', async () => {
      jest.spyOn(javaInstaller, '_executeCommand').mockRejectedValue(new Error('java not found'));
      
      const result = await javaInstaller.verifyJavaInstallation('/invalid/path');
      
      expect(result.verified).toBe(false);
    });
  });
});