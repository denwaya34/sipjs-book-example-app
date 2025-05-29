import { type Dispatch, type SetStateAction, useCallback, useState } from 'react';

/**
 * ダイアラーフックの戻り値インターフェース
 */
interface UseDialerReturn {
  dialedNumber: string;
  setDialedNumber: Dispatch<SetStateAction<string>>;
  handleDialedNumberChange: (value: string) => void;
  handleDialPadClick: (digit: string) => void;
  clearDialedNumber: () => void;
}

/**
 * ダイアルパッド管理のカスタムフック
 * @returns ダイアル番号の状態と操作関数
 */
export const useDialer = (): UseDialerReturn => {
  const [dialedNumber, setDialedNumber] = useState<string>('');

  /**
   * ダイアル番号入力時の処理（キーボード入力対応）
   * @param value - 入力された値
   */
  const handleDialedNumberChange = useCallback((value: string): void => {
    // 0~9、#、*のみを許可する正規表現
    const validCharactersRegex = /^[0-9#*]*$/;

    if (validCharactersRegex.test(value)) {
      setDialedNumber(value);
    }
  }, []);

  /**
   * ダイアルパッドボタンクリック時の処理
   * @param digit - クリックされた数字または記号
   */
  const handleDialPadClick = useCallback((digit: string): void => {
    setDialedNumber(prev => prev + digit);
  }, []);

  /**
   * ダイアル番号をクリア
   */
  const clearDialedNumber = useCallback((): void => {
    setDialedNumber('');
  }, []);

  return {
    dialedNumber,
    setDialedNumber,
    handleDialedNumberChange,
    handleDialPadClick,
    clearDialedNumber,
  };
};
