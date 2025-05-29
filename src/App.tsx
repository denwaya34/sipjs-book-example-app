import { Phone, Wifi, WifiOff, PhoneCall, PhoneOff } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { UserAgent, Inviter, Invitation, URI } from 'sip.js';
import type { UserAgentOptions } from 'sip.js';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * SIP設定のインターフェース定義
 */
interface SipConfig {
  url: string;
  username: string;
  password: string;
}

/**
 * SIP接続状態の型定義
 */
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * 通話状態の型定義
 */
type CallStatus = 'idle' | 'calling' | 'ringing' | 'in-call' | 'ending';

/**
 * ダイアルパッドのボタン配列
 */
const DIAL_PAD_BUTTONS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
] as const;

function App() {
  const [sipConfig, setSipConfig] = useState<SipConfig>({
    url: '',
    username: '',
    password: '',
  });
  const [dialedNumber, setDialedNumber] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [incomingCallNumber, setIncomingCallNumber] = useState<string>('');

  // SIP.js のUserAgentインスタンスへの参照
  const userAgentRef = useRef<UserAgent | null>(null);
  // 現在のセッション（通話）への参照
  const currentSessionRef = useRef<Inviter | Invitation | null>(null);
  // 通話中のオーディオ要素への参照
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      if (userAgentRef.current) {
        void userAgentRef.current.stop();
      }
    };
  }, []);

  /**
   * ダイアル番号入力時の処理（キーボード入力対応）
   * @param value - 入力された値
   */
  const handleDialedNumberChange = (value: string): void => {
    // 1~9、#、*のみを許可する正規表現
    const validCharactersRegex = /^[1-9#*]*$/;

    console.log(value);
    if (validCharactersRegex.test(value)) {
      setDialedNumber(value);
    }
  };

  /**
   * ダイアルパッドボタンクリック時の処理
   * @param digit - クリックされた数字または記号
   */
  const handleDialPadClick = (digit: string): void => {
    setDialedNumber(prev => prev + digit);
  };

  /**
   * SIP設定フォームの入力値変更処理
   * @param field - 変更対象のフィールド名
   * @param value - 新しい値
   */
  const handleSipConfigChange = (field: keyof SipConfig, value: string): void => {
    setSipConfig(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * SIP接続処理
   */
  const handleConnect = async (): Promise<void> => {
    if (connectionStatus === 'connected') {
      // 切断処理
      try {
        if (userAgentRef.current) {
          await userAgentRef.current.stop();
          userAgentRef.current = null;
        }
        setConnectionStatus('disconnected');
        setCallStatus('idle');
        console.log('SIP接続を切断しました');
      } catch (error) {
        console.error('SIP切断エラー:', error);
        setConnectionStatus('error');
      }
      return;
    }

    // 接続処理
    setConnectionStatus('connecting');
    console.log('SIP接続を開始します:', sipConfig);

    try {
      // WebSocket URI の構築
      const serverUri = sipConfig.url.startsWith('ws://') || sipConfig.url.startsWith('wss://')
        ? sipConfig.url
        : `wss://${sipConfig.url}`;

      // UserAgent オプションの設定
      const userAgentOptions = {
        uri: UserAgent.makeURI(`sip:${sipConfig.username}@${sipConfig.url.replace(/^(ws|wss):\/\//, '')}`),
        transportOptions: {
          server: serverUri,
        },
        authorizationUsername: sipConfig.username,
        authorizationPassword: sipConfig.password,
        delegate: {
          // 着信通話の処理
          onInvite: (invitation: Invitation) => {
            console.log('着信を受信しました:', invitation.remoteIdentity.uri.user);
            setIncomingCallNumber(invitation.remoteIdentity.uri.user ?? '不明');
            setCallStatus('ringing');
            currentSessionRef.current = invitation;

            // 自動応答（実際のアプリでは手動応答を実装）
            setTimeout(() => {
              void handleAnswerCall();
            }, 1000);
          },
        },
      };

      // UserAgent インスタンスの作成
      const userAgent = new UserAgent(userAgentOptions);
      userAgentRef.current = userAgent;

      // 接続開始
      await userAgent.start();
      
      setConnectionStatus('connected');
      console.log('SIP接続が完了しました');
    }
    catch (error) {
      setConnectionStatus('error');
      console.error('SIP接続に失敗しました:', error);
      userAgentRef.current = null;
    }
  };

  /**
   * 発信処理
   */
  const handleCall = async (): Promise<void> => {
    if (!userAgentRef.current || !dialedNumber) {
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
      const inviter = new Inviter(userAgentRef.current, targetUri);
      currentSessionRef.current = inviter;

      // セッション状態の監視
      inviter.stateChange.addListener((state) => {
        console.log('通話状態変更:', state);
        switch (state) {
          case 'Establishing':
            setCallStatus('calling');
            break;
          case 'Established':
            setCallStatus('in-call');
            // 音声セッションの設定
            setupAudioSession(inviter);
            break;
          case 'Terminated':
            setCallStatus('idle');
            currentSessionRef.current = null;
            break;
        }
      });

      // 発信実行
      await inviter.invite();
      
    } catch (error) {
      console.error('発信に失敗しました:', error);
      setCallStatus('idle');
      currentSessionRef.current = null;
    }
  };

  /**
   * 着信応答処理
   */
  const handleAnswerCall = async (): Promise<void> => {
    if (!currentSessionRef.current || !(currentSessionRef.current instanceof Invitation)) {
      return;
    }

    try {
      await currentSessionRef.current.accept();
      setCallStatus('in-call');
      setupAudioSession(currentSessionRef.current);
      console.log('着信に応答しました');
    } catch (error) {
      console.error('着信応答に失敗しました:', error);
      setCallStatus('idle');
    }
  };

  /**
   * 通話終了処理
   */
  const handleHangup = async (): Promise<void> => {
    if (!currentSessionRef.current) {
      return;
    }

    try {
      setCallStatus('ending');
      
      if (currentSessionRef.current instanceof Inviter) {
        await currentSessionRef.current.bye();
      } else if (currentSessionRef.current instanceof Invitation) {
        await currentSessionRef.current.bye();
      }

      currentSessionRef.current = null;
      setCallStatus('idle');
      setIncomingCallNumber('');
      console.log('通話を終了しました');
    } catch (error) {
      console.error('通話終了に失敗しました:', error);
      setCallStatus('idle');
    }
  };

  /**
   * 音声セッションのセットアップ
   */
  const setupAudioSession = (session: Inviter | Invitation): void => {
    try {
      // WebRTC PeerConnectionから音声ストリームを取得
      const peerConnection = (session.sessionDescriptionHandler as any)?.peerConnection;
      if (peerConnection) {
        const remoteStreams = peerConnection.getRemoteStreams();
        if (remoteStreams.length > 0 && audioRef.current) {
          audioRef.current.srcObject = remoteStreams[0];
          void audioRef.current.play().catch(console.error);
        }
      }
    } catch (error) {
      console.error('音声セッションのセットアップに失敗しました:', error);
    }
  };

  /**
   * 通話状態に応じた発信/終了ボタンの内容を決定
   */
  const getCallButtonContent = () => {
    switch (callStatus) {
      case 'calling':
        return {
          text: '発信中...',
          icon: <PhoneCall className="mr-2 h-5 w-5 animate-pulse" />,
          className: 'bg-yellow-600 hover:bg-yellow-700',
          onClick: handleHangup,
          disabled: false,
        };
      case 'ringing':
        return {
          text: '着信中',
          icon: <PhoneCall className="mr-2 h-5 w-5 animate-pulse" />,
          className: 'bg-blue-600 hover:bg-blue-700',
          onClick: handleAnswerCall,
          disabled: false,
        };
      case 'in-call':
        return {
          text: '通話終了',
          icon: <PhoneOff className="mr-2 h-5 w-5" />,
          className: 'bg-red-600 hover:bg-red-700',
          onClick: handleHangup,
          disabled: false,
        };
      case 'ending':
        return {
          text: '終了中...',
          icon: <PhoneOff className="mr-2 h-5 w-5" />,
          className: 'bg-gray-600',
          onClick: () => {},
          disabled: true,
        };
      default:
        return {
          text: '発信',
          icon: <Phone className="mr-2 h-5 w-5" />,
          className: 'bg-green-600 hover:bg-green-700',
          onClick: handleCall,
          disabled: !dialedNumber || connectionStatus !== 'connected',
        };
    }
  };

  /**
   * 接続ボタンの表示内容を決定
   */
  const getConnectionButtonContent = () => {
    switch (connectionStatus) {
      case 'connecting':
        return {
          text: '接続中...',
          icon: <Wifi className="mr-2 h-4 w-4 animate-pulse" />,
          className: 'bg-yellow-600 hover:bg-yellow-700',
          disabled: true,
        };
      case 'connected':
        return {
          text: '切断',
          icon: <WifiOff className="mr-2 h-4 w-4" />,
          className: 'bg-red-600 hover:bg-red-700',
          disabled: false,
        };
      case 'error':
        return {
          text: '再接続',
          icon: <Wifi className="mr-2 h-4 w-4" />,
          className: 'bg-orange-600 hover:bg-orange-700',
          disabled: false,
        };
      default:
        return {
          text: '接続',
          icon: <Wifi className="mr-2 h-4 w-4" />,
          className: 'bg-blue-600 hover:bg-blue-700',
          disabled: false,
        };
    }
  };

  /**
   * SIP設定が有効かチェック
   */
  const isSipConfigValid = (): boolean => {
    return !!(sipConfig.url && sipConfig.username && sipConfig.password);
  };

  /**
   * ダイアル番号クリア処理
   */
  const handleClear = (): void => {
    setDialedNumber('');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-cyan-50 p-4">
      {/* 音声再生用のhidden audio要素 */}
      <audio ref={audioRef} style={{ display: 'none' }} autoPlay />
      
      <div id="phone" className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl">
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
              <Label htmlFor="sip-url" className="text-sm font-medium">
                SIP URL
              </Label>
              <Input
                id="sip-url"
                type="url"
                placeholder="sip:example.com:5060"
                value={sipConfig.url}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  handleSipConfigChange('url', e.target.value);
                }}
                className="w-full"
                disabled={connectionStatus === 'connected'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sip-username" className="text-sm font-medium">
                SIPユーザ名
              </Label>
              <Input
                id="sip-username"
                type="text"
                placeholder="ユーザ名を入力"
                value={sipConfig.username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  handleSipConfigChange('username', e.target.value);
                }}
                className="w-full"
                disabled={connectionStatus === 'connected'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sip-password" className="text-sm font-medium">
                パスワード
              </Label>
              <Input
                id="sip-password"
                type="password"
                placeholder="パスワードを入力"
                value={sipConfig.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  handleSipConfigChange('password', e.target.value);
                }}
                className="w-full"
                disabled={connectionStatus === 'connected'}
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
              onClick={() => {
                void handleConnect();
              }}
              disabled={
                (!isSipConfigValid() && connectionStatus !== 'connected')
                || getConnectionButtonContent().disabled
              }
              className={`w-full h-12 text-sm font-semibold rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl ${getConnectionButtonContent().className}`}
            >
              {getConnectionButtonContent().icon}
              {getConnectionButtonContent().text}
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
                  value={dialedNumber}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    handleDialedNumberChange(e.target.value);
                  }}
                  placeholder="番号を入力してください"
                  className="text-lg font-mono text-center border-2 border-gray-200 shadow-sm text-2xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  maxLength={20}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="ml-2"
                  disabled={!dialedNumber}
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
                key={digit}
                variant="outline"
                size="lg"
                onClick={() => { handleDialPadClick(digit); }}
                className="h-16 w-full text-2xl font-bold bg-white hover:bg-gray-50 border-2 border-gray-300 rounded-xl shadow-md transition-all duration-200 hover:shadow-lg active:scale-95"
              >
                {digit}
              </Button>
            ))}
          </div>

          {/* 発信/終了ボタン */}
          <Button
            onClick={() => {
              const buttonContent = getCallButtonContent();
              void buttonContent.onClick();
            }}
            disabled={getCallButtonContent().disabled}
            className={`w-full max-w-md h-14 text-lg font-semibold disabled:bg-gray-400 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl ${getCallButtonContent().className}`}
          >
            {getCallButtonContent().icon}
            {getCallButtonContent().text}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default App;
