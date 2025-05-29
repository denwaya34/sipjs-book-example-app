import type { ConnectionStatus } from '@/@types/sip.types';

/**
 * 接続ボタン表示内容のインターフェース
 */
export interface ConnectionButtonContent {
  className: string;
  disabled: boolean;
  iconType: 'wifi' | 'wifi-off';
  iconAnimated?: boolean;
  text: string;
}

/**
 * 接続状態に応じた接続ボタンの内容を決定する純粋関数
 * @param connectionStatus - 接続状態
 * @returns ボタン表示内容
 */
export const getConnectionButtonContent = (
  connectionStatus: ConnectionStatus,
): ConnectionButtonContent => {
  switch (connectionStatus) {
    case 'connected':
      return {
        className: 'bg-red-600 hover:bg-red-700',
        disabled: false,
        iconType: 'wifi-off',
        text: '切断',
      };
    case 'connecting':
      return {
        className: 'bg-yellow-600 hover:bg-yellow-700',
        disabled: true,
        iconType: 'wifi',
        iconAnimated: true,
        text: '接続中...',
      };
    case 'error':
      return {
        className: 'bg-orange-600 hover:bg-orange-700',
        disabled: false,
        iconType: 'wifi',
        text: '再接続',
      };
    default:
      return {
        className: 'bg-blue-600 hover:bg-blue-700',
        disabled: false,
        iconType: 'wifi',
        text: '接続',
      };
  }
};
