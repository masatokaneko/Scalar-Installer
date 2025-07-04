const { ScalarDBDownloader } = require('./scalardb-downloader');
const axios = require('axios');
const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');

jest.mock('axios');
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    stat: jest.fn(),
    unlink: jest.fn(),
    access: jest.fn(),
    readdir: jest.fn()
  },
  createWriteStream: jest.fn(() => ({
    on: jest.fn(),
    write: jest.fn(),
    end: jest.fn()
  }))
}));
jest.mock('stream/promises', () => ({
  pipeline: jest.fn().mockResolvedValue()
}));

describe('ScalarDBDownloader', () => {
  let downloader;
  
  beforeEach(() => {
    downloader = new ScalarDBDownloader();
    jest.clearAllMocks();
  });
  
  describe('getAvailableVersions', () => {
    it('Maven CentralからScalarDBのバージョン一覧を取得する', async () => {
      const mockResponse = {
        data: {
          response: {
            docs: [
              { v: '3.12.0', timestamp: 1700000000000 },
              { v: '3.11.0', timestamp: 1690000000000 },
              { v: '3.10.1', timestamp: 1680000000000 }
            ]
          }
        }
      };
      
      axios.get.mockResolvedValue(mockResponse);
      
      const versions = await downloader.getAvailableVersions();
      
      expect(axios.get).toHaveBeenCalledWith(
        'https://search.maven.org/solrsearch/select',
        expect.objectContaining({
          params: expect.objectContaining({
            q: 'g:com.scalar-labs AND a:scalardb',
            core: 'gav',
            rows: 20,
            wt: 'json'
          })
        })
      );
      
      expect(versions).toEqual([
        { version: '3.12.0', releaseDate: new Date(1700000000000) },
        { version: '3.11.0', releaseDate: new Date(1690000000000) },
        { version: '3.10.1', releaseDate: new Date(1680000000000) }
      ]);
    });
    
    it('ネットワークエラーを適切に処理する', async () => {
      axios.get.mockRejectedValue(new Error('Network Error'));
      
      await expect(downloader.getAvailableVersions())
        .rejects.toThrow('インターネット接続を確認してください');
    });
  });
  
  describe('getLatestVersion', () => {
    it('最新の安定版バージョンを返す', async () => {
      const mockVersions = [
        { version: '3.13.0-SNAPSHOT', releaseDate: new Date() },
        { version: '3.12.0', releaseDate: new Date() },
        { version: '3.11.0', releaseDate: new Date() }
      ];
      
      jest.spyOn(downloader, 'getAvailableVersions').mockResolvedValue(mockVersions);
      
      const latest = await downloader.getLatestVersion();
      
      expect(latest).toBe('3.12.0'); // SNAPSHOTを除外
    });
  });
  
  describe('downloadVersion', () => {
    it('指定されたバージョンのJARファイルをダウンロードする', async () => {
      const version = '3.12.0';
      const mockSha1 = 'abc123def456';
      const mockJarPath = `/tmp/scalardb-${version}.jar`;
      
      // SHA-1取得のモック
      axios.get.mockResolvedValue({ data: mockSha1 });
      
      // ダウンロード用のaxiosモック
      const mockStream = {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(Buffer.from('test'));
          }
        })
      };
      
      axios.mockResolvedValue({
        data: mockStream,
        headers: { 'content-length': '1000' }
      });
      
      // ファイル書き込みのモック
      fs.mkdir.mockResolvedValue();
      fs.stat.mockResolvedValue({ size: 1000000 });
      
      // チェックサム検証のモック
      jest.spyOn(downloader, 'verifyChecksum').mockResolvedValue(true);
      
      const progressCallback = jest.fn();
      const result = await downloader.downloadVersion(version, progressCallback);
      
      expect(result).toEqual({
        success: true,
        path: expect.stringContaining(`scalardb-${version}.jar`),
        version: version,
        size: expect.any(Number)
      });
    });
    
    it('チェックサムが一致しない場合エラーを投げる', async () => {
      const version = '3.12.0';
      
      axios.get.mockResolvedValue({ data: 'expected-checksum' });
      
      const mockStream = {
        on: jest.fn()
      };
      
      axios.mockResolvedValue({
        data: mockStream,
        headers: { 'content-length': '1000' }
      });
      
      fs.mkdir.mockResolvedValue();
      
      // チェックサム検証を失敗させる
      jest.spyOn(downloader, 'verifyChecksum').mockResolvedValue(false);
      
      await expect(downloader.downloadVersion(version))
        .rejects.toThrow('ダウンロードしたファイルが破損している可能性があります');
    });
  });
  
  describe('verifyChecksum', () => {
    it('ファイルのSHA-1チェックサムを検証する', async () => {
      const filePath = '/tmp/test.jar';
      const expectedSha1 = '356a192b7913b04c54574d18c28d46e6395428ab'; // SHA-1 of '1'
      const fileContent = Buffer.from('1');
      
      fs.readFile.mockResolvedValue(fileContent);
      
      const isValid = await downloader.verifyChecksum(filePath, expectedSha1);
      
      expect(isValid).toBe(true);
    });
    
    it('チェックサムが一致しない場合falseを返す', async () => {
      const filePath = '/tmp/test.jar';
      const wrongSha1 = 'wrong-checksum';
      const fileContent = Buffer.from('test content');
      
      fs.readFile.mockResolvedValue(fileContent);
      
      const isValid = await downloader.verifyChecksum(filePath, wrongSha1);
      
      expect(isValid).toBe(false);
    });
  });
  
  describe('エラーメッセージの変換', () => {
    it('技術的エラーを非技術者向けメッセージに変換する', () => {
      const testCases = [
        { 
          error: new Error('ECONNREFUSED'), 
          expected: 'インターネット接続を確認してください' 
        },
        { 
          error: new Error('ENOSPC'), 
          expected: 'ディスクの空き容量が不足しています' 
        },
        { 
          error: new Error('EACCES'), 
          expected: '保存先フォルダへの書き込み権限がありません' 
        }
      ];
      
      testCases.forEach(({ error, expected }) => {
        const message = downloader.getUserFriendlyError(error);
        expect(message).toBe(expected);
      });
    });
  });
});