import type { CallStatus } from '@/@types/sip.types';

/**
 * ボタン表示内容のインターフェース
 */
export interface ButtonContent {
  className: string;
  disabled: boolean;
  iconType: 'phone' | 'phone-call' | 'phone-off';
  iconAnimated?: boolean;
  onClick: () => void | Promise<void>;
  text: string;
}

/**
 * 通話状態に応じた発信/終了ボタンの内容を決定する純粋関数
 * @param callStatus - 通話状態
 * @param dialedNumber - ダイアル番号
 * @param connectionStatus - 接続状態
 * @param handlers - ボタンクリックハンドラー
 * @returns ボタン表示内容
 */
export const getCallButtonContent = (
  callStatus: CallStatus,
  dialedNumber: string,
  connectionStatus: string,
  handlers: {
    handleCall: () => void | Promise<void>;
    hangupCall: () => void | Promise<void>;
    answerCall: () => void | Promise<void>;
  },
): ButtonContent => {
  switch (callStatus) {
    case 'calling':
      return {
        className: 'bg-yellow-600 hover:bg-yellow-700',
        disabled: false,
        iconType: 'phone-call',
        iconAnimated: true,
        onClick: handlers.hangupCall,
        text: '発信中...',
      };
    case 'ending':
      return {
        className: 'bg-gray-600',
        disabled: true,
        iconType: 'phone-off',
        onClick: () => {
          console.log('通話終了処理中...');
        },
        text: '終了中...',
      };
    case 'in-call':
      return {
        className: 'bg-red-600 hover:bg-red-700',
        disabled: false,
        iconType: 'phone-off',
        onClick: handlers.hangupCall,
        text: '通話終了',
      };
    case 'ringing':
      return {
        className: 'bg-blue-600 hover:bg-blue-700',
        disabled: false,
        iconType: 'phone-call',
        iconAnimated: true,
        onClick: handlers.answerCall,
        text: '着信中',
      };
    default:
      return {
        className: 'bg-green-600 hover:bg-green-700',
        disabled: !dialedNumber || connectionStatus !== 'connected',
        iconType: 'phone',
        onClick: handlers.handleCall,
        text: '発信',
      };
  }
};
