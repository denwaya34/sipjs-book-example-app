import { Phone, PhoneCall, PhoneOff, Wifi, WifiOff } from 'lucide-react';
import { useEffect } from 'react';

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
): React.ReactElement => {
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
  const { connectionStatus, connect, disconnect, getUserAgent } = useSipConnection();
  const { audioRef, setupAudioSession } = useAudioStream();
  const {
    callStatus,
    incomingCallNumber,
    makeCall,
    answerCall,
    hangupCall,
    handleIncomingCall,
  } = useCallSession(setupAudioSession);

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      const userAgent = getUserAgent();
      if (userAgent) {
        void userAgent.stop();
      }
    };
  }, [getUserAgent]);

  /**
   * SIP接続/切断処理
   */
  const handleConnect = async (): Promise<void> => {
    if (connectionStatus === 'connected') {
      await disconnect();
      return;
    }

    try {
      await connect(sipConfig, handleIncomingCall);
    }
    catch (error) {
      console.error('接続エラー:', error);
    }
  };

  /**
   * 発信処理のラッパー
   */
  const handleCall = async (): Promise<void> => {
    const userAgent = getUserAgent();
    await makeCall(dialedNumber, userAgent, sipConfig);
  };

  /**
   * 着信通話の自動応答（デモ用）
   */
  useEffect(() => {
    if (callStatus === 'ringing') {
      // 実際のアプリケーションでは手動応答を実装
      const timer = setTimeout(() => {
        void answerCall();
      }, 1000);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [callStatus, answerCall]);

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
        hangupCall,
        answerCall,
      },
    );
    return {
      ...content,
      icon: getIconComponent(content.iconType, 'mr-2 h-5 w-5', content.iconAnimated),
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
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-cyan-50 p-4">
      {/* 音声再生用のhidden audio要素 */}
      <audio autoPlay ref={audioRef} style={{ display: 'none' }} />

      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl" id="phone">
        {/* SIP設定フォーム */}
        <Card className="w-full lg:w-1/3">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-800 flex items-center">
              SIP設定
              {connectionStatus === 'connected' && (
                <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium" htmlFor="sip-url">
                SIP URL
              </Label>
              <Input
                className="w-full"
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
              <Label className="text-sm font-medium" htmlFor="sip-username">
                SIPユーザ名
              </Label>
              <Input
                className="w-full"
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
              <Label className="text-sm font-medium" htmlFor="sip-password">
                パスワード
              </Label>
              <Input
                className="w-full"
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
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-600">
                  {callStatus === 'calling' && '発信中...'}
                  {callStatus === 'ringing' && `${incomingCallNumber} からの着信`}
                  {callStatus === 'in-call' && `通話中${incomingCallNumber ? ` - ${incomingCallNumber}` : ''}`}
                  {callStatus === 'ending' && '通話終了中...'}
                </p>
              </div>
            )}

            {/* 接続ボタン */}
            <Button
              className={`w-full h-12 text-sm font-semibold rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl ${getConnectionButtonContentWrapper().className}`}
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

        {/* ダイアルパッドとコントロール */}
        <div className="flex flex-col items-center space-y-6 w-full lg:w-2/3">
          {/* ダイアル番号表示 */}
          <Card className="w-full max-w-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Input
                  className="text-lg font-mono text-center border-2 border-gray-200 shadow-sm text-2xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  maxLength={20}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    handleDialedNumberChange(e.target.value);
                  }}
                  placeholder="番号を入力してください"
                  value={dialedNumber}
                />
                <Button
                  className="ml-2"
                  disabled={!dialedNumber}
                  onClick={clearDialedNumber}
                  size="sm"
                  variant="ghost"
                >
                  クリア
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ダイアルパッド */}
          <div className="grid grid-cols-3 gap-4 w-full max-w-md">
            {DIAL_PAD_BUTTONS.flat().map(digit => (
              <Button
                className="h-16 w-full text-2xl font-bold bg-white hover:bg-gray-50 border-2 border-gray-300 rounded-xl shadow-md transition-all duration-200 hover:shadow-lg active:scale-95"
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
          <Button
            className={`w-full max-w-md h-14 text-lg font-semibold disabled:bg-gray-400 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl ${getCallButtonContentWrapper().className}`}
            disabled={getCallButtonContentWrapper().disabled}
            onClick={() => {
              const buttonContent = getCallButtonContentWrapper();
              void buttonContent.onClick();
            }}
          >
            {getCallButtonContentWrapper().icon}
            {getCallButtonContentWrapper().text}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default App;
