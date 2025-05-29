import { Phone, PhoneCall, PhoneOff, Wifi, WifiOff } from 'lucide-react';
import { type ReactElement, useEffect } from 'react';

import { DIAL_PAD_BUTTONS } from '@/@types/sip.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAudioStream } from '@/hooks/useAudioStream';
import { useCallSession } from '@/hooks/useCallSession';
import { useDialer } from '@/hooks/useDialer';
import { useSipConfig } from '@/hooks/useSipConfig';
import { useSipConnection } from '@/hooks/useSipConnection';
import { getCallButtonContent } from '@/lib/call-button-utils';
import { getConnectionButtonContent } from '@/lib/connection-button-utils';

/**
 * アイコンコンポーネントを取得するヘルパー関数
 * @param iconType - アイコンタイプ
 * @param className - CSSクラス名
 * @param animated - アニメーション有無
 * @returns React要素
 */
const getIconComponent = (
  iconType: string,
  className: string,
  animated?: boolean,
): ReactElement => {
  const animatedClass = animated ? 'animate-pulse' : '';
  const fullClassName = `${className} ${animatedClass}`.trim();

  switch (iconType) {
    case 'phone':
      return <Phone className={fullClassName} />;
    case 'phone-call':
      return <PhoneCall className={fullClassName} />;
    case 'phone-off':
      return <PhoneOff className={fullClassName} />;
    case 'wifi':
      return <Wifi className={fullClassName} />;
    case 'wifi-off':
      return <WifiOff className={fullClassName} />;
    default:
      return <Phone className={fullClassName} />;
  }
};

/**
 * メインアプリケーションコンポーネント
 */
function App() {
  // カスタムフックの使用
  const { sipConfig, updateSipConfig, isSipConfigValid } = useSipConfig();
  const { dialedNumber, handleDialedNumberChange, handleDialPadClick, clearDialedNumber } = useDialer();
  const { connectionStatus, connect, disconnect, getSimpleUser } = useSipConnection();
  const { audioRef } = useAudioStream();
  const {
    callStatus,
    incomingCallNumber,
    makeCall,
    answerCall,
    hangupCall,
    handleIncomingCall,
  } = useCallSession();

  // 接続時の着信ハンドラーセットアップ
  useEffect(() => {
    const simpleUser = getSimpleUser();
    if (simpleUser && connectionStatus === 'connected') {
      handleIncomingCall(simpleUser);
    }
  }, [connectionStatus, getSimpleUser, handleIncomingCall]);

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      const simpleUser = getSimpleUser();
      if (simpleUser) {
        void simpleUser.disconnect();
      }
    };
  }, [getSimpleUser]);

  /**
   * SIP接続/切断処理
   */
  const handleConnect = async (): Promise<void> => {
    if (connectionStatus === 'connected') {
      await disconnect();
      return;
    }

    try {
      await connect(sipConfig, audioRef.current);
    }
    catch (error) {
      console.error('接続エラー:', error);
    }
  };

  /**
   * 発信処理のラッパー
   */
  const handleCall = async (): Promise<void> => {
    const simpleUser = getSimpleUser();
    await makeCall(dialedNumber, simpleUser);
  };

  /**
   * 着信通話の自動応答（デモ用）
   */
  useEffect(() => {
    if (callStatus === 'ringing') {
      // 実際のアプリケーションでは手動応答を実装
      const timer = setTimeout(() => {
        const simpleUser = getSimpleUser();
        void answerCall(simpleUser);
      }, 1000);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [callStatus, answerCall, getSimpleUser]);

  /**
   * 通話終了処理のラッパー
   */
  const handleHangup = async (): Promise<void> => {
    const simpleUser = getSimpleUser();
    await hangupCall(simpleUser);
  };

  /**
   * 通話状態に応じた発信/終了ボタンの内容を決定
   */
  const getCallButtonContentWrapper = () => {
    const content = getCallButtonContent(
      callStatus,
      dialedNumber,
      connectionStatus,
      {
        handleCall,
        hangupCall: handleHangup,
        answerCall: () => answerCall(getSimpleUser()),
      },
    );
    return {
      ...content,
      icon: getIconComponent(content.iconType, 'h-6 w-6', content.iconAnimated),
    };
  };

  /**
   * 接続ボタンの表示内容を決定
   */
  const getConnectionButtonContentWrapper = () => {
    const content = getConnectionButtonContent(connectionStatus);
    return {
      ...content,
      icon: getIconComponent(content.iconType, 'mr-2 h-4 w-4', content.iconAnimated),
    };
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-4">
      {/* 音声再生用のhidden audio要素 */}
      <audio autoPlay ref={audioRef} style={{ display: 'none' }} />

      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-7xl">
        {/* SIP設定フォーム */}
        <Card className="w-full lg:w-1/3 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-xl font-bold text-gray-800 flex items-center">
              <Wifi className="mr-2 h-5 w-5 text-gray-600" />
              SIP設定
              {connectionStatus === 'connected' && (
                <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700" htmlFor="sip-url">
                SIP URL
              </Label>
              <Input
                className="w-full border-2 border-gray-200 focus:border-blue-500 transition-colors"
                disabled={connectionStatus === 'connected'}
                id="sip-url"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  updateSipConfig('url', e.target.value);
                }}
                placeholder="sip:example.com:5060"
                type="url"
                value={sipConfig.url}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700" htmlFor="sip-username">
                SIPユーザ名
              </Label>
              <Input
                className="w-full border-2 border-gray-200 focus:border-blue-500 transition-colors"
                disabled={connectionStatus === 'connected'}
                id="sip-username"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  updateSipConfig('username', e.target.value);
                }}
                placeholder="ユーザ名を入力"
                type="text"
                value={sipConfig.username}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700" htmlFor="sip-password">
                パスワード
              </Label>
              <Input
                className="w-full border-2 border-gray-200 focus:border-blue-500 transition-colors"
                disabled={connectionStatus === 'connected'}
                id="sip-password"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  updateSipConfig('password', e.target.value);
                }}
                placeholder="パスワードを入力"
                type="password"
                value={sipConfig.password}
              />
            </div>

            {/* 通話状態表示 */}
            {callStatus !== 'idle' && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl shadow-inner">
                <p className="text-sm font-medium text-blue-700">
                  {callStatus === 'calling' && '📞 発信中...'}
                  {callStatus === 'ringing' && `📱 ${incomingCallNumber} からの着信`}
                  {callStatus === 'in-call' && `🔊 通話中${incomingCallNumber ? ` - ${incomingCallNumber}` : ''}`}
                  {callStatus === 'ending' && '📴 通話終了中...'}
                </p>
              </div>
            )}

            {/* 接続ボタン */}
            <Button
              className={`w-full h-12 text-sm font-semibold rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 ${getConnectionButtonContentWrapper().className}`}
              disabled={
                (!isSipConfigValid() && connectionStatus !== 'connected')
                || getConnectionButtonContentWrapper().disabled
              }
              onClick={() => {
                void handleConnect();
              }}
            >
              {getConnectionButtonContentWrapper().icon}
              {getConnectionButtonContentWrapper().text}
            </Button>
          </CardContent>
        </Card>

        {/* モダンな電話デザイン */}
        <div className="flex flex-col items-center w-full lg:w-2/3">
          {/* 電話本体のフレーム */}
          <div className="relative bg-gradient-to-b from-gray-50 via-white to-gray-100 rounded-[3rem] p-8 shadow-2xl border-4 border-gray-300 w-full max-w-md">
            {/* 電話上部のスピーカーグリル */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-2 bg-gray-400 rounded-full shadow-inner"></div>
            </div>

            {/* ディスプレイエリア */}
            <div className="bg-gradient-to-b from-gray-50 to-gray-100 rounded-2xl p-6 mb-8 shadow-inner border-2 border-gray-300">
              <div className="flex items-center justify-between">
                <Input
                  className="font-mono text-center border-0 bg-transparent shadow-none text-3xl font-bold text-gray-800 focus:ring-0 focus:border-0 placeholder:text-gray-500"
                  maxLength={20}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    handleDialedNumberChange(e.target.value);
                  }}
                  placeholder="番号を入力"
                  value={dialedNumber}
                />
                <Button
                  className="ml-2 text-gray-500 hover:text-gray-700 bg-transparent hover:bg-gray-200 border-0 shadow-none"
                  disabled={!dialedNumber}
                  onClick={clearDialedNumber}
                  size="sm"
                  variant="ghost"
                >
                  クリア
                </Button>
              </div>
            </div>

            {/* ダイアルパッド */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {DIAL_PAD_BUTTONS.flat().map(digit => (
                <Button
                  className="h-16 w-16 mx-auto text-2xl font-bold bg-gradient-to-b from-white to-gray-100 hover:from-gray-100 hover:to-gray-200 border-2 border-gray-300 rounded-full shadow-lg transition-all duration-200 hover:shadow-xl active:scale-95 text-gray-800 hover:text-gray-900"
                  key={digit}
                  onClick={() => { handleDialPadClick(digit); }}
                  size="lg"
                  variant="outline"
                >
                  {digit}
                </Button>
              ))}
            </div>

            {/* 発信/終了ボタン */}
            <div className="flex justify-center">
              <Button
                className={`h-16 w-16 text-lg font-semibold disabled:bg-gray-400 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-110 active:scale-95 ${getCallButtonContentWrapper().className}`}
                disabled={getCallButtonContentWrapper().disabled}
                onClick={() => {
                  const buttonContent = getCallButtonContentWrapper();
                  void buttonContent.onClick();
                }}
              >
                {getCallButtonContentWrapper().icon}
              </Button>
            </div>

            {/* 電話下部の装飾 */}
            <div className="flex justify-center mt-6">
              <div className="w-16 h-1 bg-gray-400 rounded-full shadow-inner"></div>
            </div>
          </div>

          {/* 通話状態インジケーター */}
          {callStatus !== 'idle' && (
            <div className="mt-6 px-6 py-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-700 text-center">
                {getCallButtonContentWrapper().text}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
