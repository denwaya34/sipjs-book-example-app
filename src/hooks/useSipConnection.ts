import { useCallback, useRef, useState } from 'react';
import { Web } from 'sip.js';

import type { ConnectionStatus, SimpleUserInstance, SipConfig } from '@/@types/sip.types';

/**
 * SIP接続管理フックの戻り値インターフェース
 */
interface UseSipConnectionReturn {
  connectionStatus: ConnectionStatus;
  connect: (config: SipConfig, audioElement?: HTMLAudioElement | null) => Promise<void>;
  disconnect: () => Promise<void>;
  getSimpleUser: () => SimpleUserInstance | null;
}

/**
 * SIP接続管理のカスタムフック
 * @returns SIP接続管理のためのステートと関数
 */
export const useSipConnection = (): UseSipConnectionReturn => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const simpleUserRef = useRef<SimpleUserInstance | null>(null);

  /**
   * SIP接続を確立
   * @param config - SIP設定
   * @param audioElement - 音声要素
   */
  const connect = useCallback(async (config: SipConfig, audioElement?: HTMLAudioElement | null): Promise<void> => {
    setConnectionStatus('connecting');
    console.log('SIP接続を開始します:', config);

    try {
      // WebSocket URI の構築
      const serverUri = config.url.startsWith('ws://') || config.url.startsWith('wss://')
        ? config.url
        : `wss://${config.url}`;

      // ドメインを抽出（ポート番号を含む場合も対応）
      const domain = config.url.replace(/^(ws|wss):\/\//, '').split('/')[0];

      // SimpleUser オプションの設定
      // 認証情報をaorに含める形式で設定
      const options: Web.SimpleUserOptions = {
        aor: `sip:${config.username}:${config.password}@${domain}`,
        media: {
          constraints: { audio: true, video: false },
          remote: audioElement ? { audio: audioElement } : undefined,
        },
        userAgentOptions: {
          authorizationPassword: config.password,
          authorizationUsername: config.username,
        },
      } as Web.SimpleUserOptions;

      // SimpleUser インスタンスの作成
      const simpleUser = new Web.SimpleUser(serverUri, options);
      simpleUserRef.current = simpleUser;

      // 接続開始
      await simpleUser.connect();

      setConnectionStatus('connected');
      console.log('SIP接続が完了しました');
    }
    catch (error) {
      setConnectionStatus('error');
      console.error('SIP接続に失敗しました:', error);
      simpleUserRef.current = null;
      throw error;
    }
  }, []);

  /**
   * SIP接続を切断
   */
  const disconnect = useCallback(async (): Promise<void> => {
    try {
      if (simpleUserRef.current) {
        await simpleUserRef.current.disconnect();
        simpleUserRef.current = null;
      }
      setConnectionStatus('disconnected');
      console.log('SIP接続を切断しました');
    }
    catch (error) {
      console.error('SIP切断エラー:', error);
      setConnectionStatus('error');
      throw error;
    }
  }, []);

  return {
    connectionStatus,
    connect,
    disconnect,
    getSimpleUser: () => simpleUserRef.current,
  };
};
