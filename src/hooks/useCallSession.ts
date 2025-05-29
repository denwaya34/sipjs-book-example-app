import { useCallback, useRef, useState } from 'react';

import type { CallStatus, SimpleUserInstance } from '@/@types/sip.types';

/**
 * 通話セッションフックの戻り値インターフェース
 */
interface UseCallSessionReturn {
  callStatus: CallStatus;
  incomingCallNumber: string;
  makeCall: (dialedNumber: string, simpleUser: SimpleUserInstance | null) => Promise<void>;
  answerCall: (simpleUser: SimpleUserInstance | null) => Promise<void>;
  hangupCall: (simpleUser: SimpleUserInstance | null) => Promise<void>;
  handleIncomingCall: (simpleUser: SimpleUserInstance | null) => void;
}

/**
 * 通話セッション管理のカスタムフック
 * @returns 通話セッション管理のためのステートと関数
 */
export const useCallSession = (): UseCallSessionReturn => {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [incomingCallNumber, setIncomingCallNumber] = useState<string>('');
  const isInCallRef = useRef<boolean>(false);

  /**
   * 発信処理
   */
  const makeCall = useCallback(async (
    dialedNumber: string,
    simpleUser: SimpleUserInstance | null,
  ): Promise<void> => {
    if (!simpleUser || !dialedNumber) {
      console.error('発信できません: SimpleUserまたは番号が未設定');
      return;
    }

    try {
      setCallStatus('calling');
      console.log('発信開始:', dialedNumber);

      // 発信先URIの構築（既存のドメインを使用）
      const targetUri = dialedNumber.includes('@')
        ? dialedNumber
        : `sip:${dialedNumber}`;

      // 発信実行
      await simpleUser.call(targetUri);

      isInCallRef.current = true;
      setCallStatus('in-call');
    }
    catch (error) {
      console.error('発信に失敗しました:', error);
      setCallStatus('idle');
      isInCallRef.current = false;
    }
  }, []);

  /**
   * 着信応答処理
   */
  const answerCall = useCallback(async (simpleUser: SimpleUserInstance | null): Promise<void> => {
    if (!simpleUser) {
      return;
    }

    try {
      await simpleUser.answer();
      setCallStatus('in-call');
      isInCallRef.current = true;
      console.log('着信に応答しました');
    }
    catch (error) {
      console.error('着信応答に失敗しました:', error);
      setCallStatus('idle');
    }
  }, []);

  /**
   * 通話終了処理
   */
  const hangupCall = useCallback(async (simpleUser: SimpleUserInstance | null): Promise<void> => {
    if (!simpleUser) {
      return;
    }

    try {
      setCallStatus('ending');

      await simpleUser.hangup();

      isInCallRef.current = false;
      setCallStatus('idle');
      setIncomingCallNumber('');
      console.log('通話を終了しました');
    }
    catch (error) {
      console.error('通話終了に失敗しました:', error);
      setCallStatus('idle');
    }
  }, []);

  /**
   * 着信処理のセットアップ
   */
  const handleIncomingCall = useCallback((simpleUser: SimpleUserInstance | null): void => {
    if (!simpleUser) {
      return;
    }

    // SimpleUserのデリゲートで着信イベントを処理
    simpleUser.delegate = {
      onCallReceived: () => {
        console.log('着信を受信しました');
        setCallStatus('ringing');
        // SimpleUserでは着信番号の取得が限定的なため、"不明"と表示
        setIncomingCallNumber('着信');
      },
      onCallAnswered: () => {
        setCallStatus('in-call');
        isInCallRef.current = true;
      },
      onCallHangup: () => {
        setCallStatus('idle');
        isInCallRef.current = false;
        setIncomingCallNumber('');
      },
    };
  }, []);

  return {
    callStatus,
    incomingCallNumber,
    makeCall,
    answerCall,
    hangupCall,
    handleIncomingCall,
  };
};
