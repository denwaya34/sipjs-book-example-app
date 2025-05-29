import { useCallback, useState } from 'react';

import type { SipConfig } from '@/@types/sip.types';

/**
 * SIP設定フックの戻り値インターフェース
 */
interface UseSipConfigReturn {
  sipConfig: SipConfig;
  updateSipConfig: (field: keyof SipConfig, value: string) => void;
  isSipConfigValid: () => boolean;
}

/**
 * SIP設定管理のカスタムフック
 * @returns SIP設定の状態と操作関数
 */
export const useSipConfig = (): UseSipConfigReturn => {
  const [sipConfig, setSipConfig] = useState<SipConfig>({
    password: '',
    url: '',
    username: '',
  });

  /**
   * SIP設定フィールドの更新
   * @param field - 更新対象のフィールド名
   * @param value - 新しい値
   */
  const updateSipConfig = useCallback((field: keyof SipConfig, value: string): void => {
    setSipConfig(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /**
   * SIP設定が有効かチェック
   * @returns 設定が有効な場合true
   */
  const isSipConfigValid = useCallback((): boolean => {
    return !!(sipConfig.url && sipConfig.username && sipConfig.password);
  }, [sipConfig]);

  return {
    sipConfig,
    updateSipConfig,
    isSipConfigValid,
  };
};
