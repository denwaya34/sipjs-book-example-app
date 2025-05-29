import { useRef } from 'react';

/**
 * 音声ストリーム管理フックの戻り値インターフェース
 */
interface UseAudioStreamReturn {
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

/**
 * 音声ストリーム管理のカスタムフック
 * SimpleUserでは内部で音声の管理を行うため、audioRefのみを提供
 * @returns 音声要素の参照
 */
export const useAudioStream = (): UseAudioStreamReturn => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // SimpleUserは内部で音声ストリームを自動的に管理するため、
  // audioRefを渡すだけで音声の再生が可能

  return {
    audioRef,
  };
};
