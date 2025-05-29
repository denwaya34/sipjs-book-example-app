import { useCallback, useRef, useState } from 'react';
import { Invitation, Inviter, UserAgent } from 'sip.js';
import { SessionState } from 'sip.js/lib/api/session-state';

import type { CallStatus, SipConfig } from '@/@types/sip.types';

/**
 * 通話セッションフックの戻り値インターフェース
 */
interface UseCallSessionReturn {
  callStatus: CallStatus;
  incomingCallNumber: string;
  currentSession: React.RefObject<Invitation | Inviter | null>;
  makeCall: (dialedNumber: string, userAgent: UserAgent | null, sipConfig: SipConfig) => Promise<void>;
  answerCall: () => Promise<void>;
  hangupCall: () => Promise<void>;
  handleIncomingCall: (invitation: Invitation) => void;
}

/**
 * 通話セッション管理のカスタムフック
 * @param setupAudioSession - 音声セッションセットアップ関数
 * @returns 通話セッション管理のためのステートと関数
 */
export const useCallSession = (
  setupAudioSession: (session: Invitation | Inviter) => void,
): UseCallSessionReturn => {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [incomingCallNumber, setIncomingCallNumber] = useState<string>('');
  const currentSessionRef = useRef<Invitation | Inviter | null>(null);

  /**
   * セッション状態変更のハンドラー
   */
  const handleSessionStateChange = useCallback((state: SessionState, session: Invitation | Inviter): void => {
    console.log('通話状態変更:', state);
    switch (state) {
      case SessionState.Established:
        setCallStatus('in-call');
        setupAudioSession(session);
        break;
      case SessionState.Establishing:
        setCallStatus('calling');
        break;
      case SessionState.Terminated:
        setCallStatus('idle');
        currentSessionRef.current = null;
        setIncomingCallNumber('');
        break;
    }
  }, [setupAudioSession]);

  /**
   * 発信処理
   */
  const makeCall = useCallback(async (
    dialedNumber: string,
    userAgent: UserAgent | null,
    sipConfig: SipConfig,
  ): Promise<void> => {
    if (!userAgent || !dialedNumber) {
      console.error('発信できません: UserAgentまたは番号が未設定');
      return;
    }

    try {
      setCallStatus('calling');
      console.log('発信開始:', { dialedNumber, sipConfig });

      // 発信先URIの構築
      const targetUri = UserAgent.makeURI(`sip:${dialedNumber}@${sipConfig.url.replace(/^(ws|wss):\/\//, '')}`);
      if (!targetUri) {
        throw new Error('無効な発信先URI');
      }

      // Inviterインスタンスの作成と発信
      const inviter = new Inviter(userAgent, targetUri);
      currentSessionRef.current = inviter;

      // セッション状態の監視
      inviter.stateChange.addListener((state) => {
        handleSessionStateChange(state, inviter);
      });

      // 発信実行
      await inviter.invite();
    }
    catch (error) {
      console.error('発信に失敗しました:', error);
      setCallStatus('idle');
      currentSessionRef.current = null;
    }
  }, [handleSessionStateChange]);

  /**
   * 着信応答処理
   */
  const answerCall = useCallback(async (): Promise<void> => {
    if (!currentSessionRef.current || !(currentSessionRef.current instanceof Invitation)) {
      return;
    }

    try {
      await currentSessionRef.current.accept();
      setCallStatus('in-call');
      setupAudioSession(currentSessionRef.current);
      console.log('着信に応答しました');
    }
    catch (error) {
      console.error('着信応答に失敗しました:', error);
      setCallStatus('idle');
    }
  }, [setupAudioSession]);

  /**
   * 通話終了処理
   */
  const hangupCall = useCallback(async (): Promise<void> => {
    if (!currentSessionRef.current) {
      return;
    }

    try {
      setCallStatus('ending');

      if (currentSessionRef.current instanceof Inviter) {
        await currentSessionRef.current.bye();
      }
      else if (currentSessionRef.current instanceof Invitation) {
        await currentSessionRef.current.bye();
      }

      currentSessionRef.current = null;
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
   * 着信処理
   */
  const handleIncomingCall = useCallback((invitation: Invitation): void => {
    console.log('着信を受信しました:', invitation.remoteIdentity.uri.user);
    setIncomingCallNumber(invitation.remoteIdentity.uri.user ?? '不明');
    setCallStatus('ringing');
    currentSessionRef.current = invitation;

    // セッション状態の監視
    invitation.stateChange.addListener((state) => {
      handleSessionStateChange(state, invitation);
    });
  }, [handleSessionStateChange]);

  return {
    callStatus,
    incomingCallNumber,
    currentSession: currentSessionRef,
    makeCall,
    answerCall,
    hangupCall,
    handleIncomingCall,
  };
};
