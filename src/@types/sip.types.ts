import type { Web } from 'sip.js';

/**
 * 通話状態の型定義
 */
export type CallStatus = 'calling' | 'ending' | 'idle' | 'in-call' | 'ringing';

/**
 * SIP接続状態の型定義
 */
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

/**
 * SIP設定のインターフェース定義
 */
export interface SipConfig {
  password: string;
  url: string;
  username: string;
}

/**
 * ダイアルパッドのボタン配列の型
 */
export const DIAL_PAD_BUTTONS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
] as const;

/**
 * SimpleUserインスタンスの型
 */
export type SimpleUserInstance = Web.SimpleUser;

/**
 * SimpleUserオプションの型
 */
export type SimpleUserOptions = Web.SimpleUserOptions;
