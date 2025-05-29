import { useCallback, useRef, useState } from 'react';
import { Invitation, UserAgent } from 'sip.js';

import type { ConnectionStatus, SipConfig } from '@/@types/sip.types';

/**
 * SIP接続管理フックの戻り値インターフェース
 */
interface UseSipConnectionReturn {
  connectionStatus: ConnectionStatus;
  connect: (config: SipConfig, onInvite: (invitation: Invitation) => void) => Promise<void>;
  disconnect: () => Promise<void>;
  getUserAgent: () => UserAgent | null;
}

/**
 * SIP接続管理のカスタムフック
 * @returns SIP接続管理のためのステートと関数
 */
export const useSipConnection = (): UseSipConnectionReturn => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const userAgentRef = useRef<UserAgent | null>(null);

  /**
   * SIP接続を確立
   * @param config - SIP設定
   * @param onInvite - 着信時のコールバック
   */
  const connect = useCallback(async (config: SipConfig, onInvite: (invitation: Invitation) => void): Promise<void> => {
    setConnectionStatus('connecting');
    console.log('SIP接続を開始します:', config);

    try {
      // WebSocket URI の構築
      const serverUri = config.url.startsWith('ws://') || config.url.startsWith('wss://')
        ? config.url
        : `wss://${config.url}`;

      // UserAgent オプションの設定
      const userAgentOptions = {
        authorizationPassword: config.password,
        authorizationUsername: config.username,
        delegate: {
          onInvite,
        },
        transportOptions: {
          server: serverUri,
        },
        uri: UserAgent.makeURI(`sip:${config.username}@${config.url.replace(/^(ws|wss):\/\//, '')}`),
      };

      // UserAgent インスタンスの作成
      const userAgent = new UserAgent(userAgentOptions);
      userAgentRef.current = userAgent;

      // 接続開始
      await userAgent.start();

      setConnectionStatus('connected');
      console.log('SIP接続が完了しました');
    }
    catch (error) {
      setConnectionStatus('error');
      console.error('SIP接続に失敗しました:', error);
      userAgentRef.current = null;
      throw error;
    }
  }, []);

  /**
   * SIP接続を切断
   */
  const disconnect = useCallback(async (): Promise<void> => {
    try {
      if (userAgentRef.current) {
        await userAgentRef.current.stop();
        userAgentRef.current = null;
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
    getUserAgent: () => userAgentRef.current,
  };
};
