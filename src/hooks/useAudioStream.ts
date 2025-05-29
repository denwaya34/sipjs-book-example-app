import { useCallback, useRef } from 'react';
import { Invitation, Inviter } from 'sip.js';

import type { SessionDescriptionHandlerWithPeerConnection } from '@/@types/sip.types';

/**
 * 音声ストリーム管理フックの戻り値インターフェース
 */
interface UseAudioStreamReturn {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  setupAudioSession: (session: Invitation | Inviter) => void;
}

/**
 * 音声ストリーム管理のカスタムフック
 * @returns 音声要素の参照とセットアップ関数
 */
export const useAudioStream = (): UseAudioStreamReturn => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /**
   * 音声セッションのセットアップ
   * @param session - SIPセッション
   */
  const setupAudioSession = useCallback((session: Invitation | Inviter): void => {
    try {
      // WebRTC PeerConnectionから音声ストリームを取得
      const sessionDescriptionHandler = session.sessionDescriptionHandler as SessionDescriptionHandlerWithPeerConnection | undefined;
      const peerConnection = sessionDescriptionHandler?.peerConnection;

      if (peerConnection && audioRef.current) {
        // 新しいMediaStreamを作成してリモートトラックを追加
        const remoteStream = new MediaStream();
        const receivers = peerConnection.getReceivers();

        receivers.forEach((receiver) => {
          const track = receiver.track;
          remoteStream.addTrack(track);
        });

        if (remoteStream.getTracks().length > 0) {
          audioRef.current.srcObject = remoteStream;
          void audioRef.current.play().catch(console.error);
        }
      }
    }
    catch (error) {
      console.error('音声セッションのセットアップに失敗しました:', error);
    }
  }, []);

  return {
    audioRef,
    setupAudioSession,
  };
};
