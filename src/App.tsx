import { Phone, Wifi, WifiOff, PhoneCall, PhoneOff } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { UserAgent, Inviter, Invitation, SessionState } from 'sip.js';

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
type CallStatus = 'idle' | 'calling' | 'incoming' | 'active' | 'ending';

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
  const [incomingNumber, setIncomingNumber] = useState<string>('');
  
  // SIP.js UserAgent
  const userAgentRef = useRef<UserAgent | null>(null);
  const currentSessionRef = useRef<Inviter | Invitation | null>(null);

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      if (userAgentRef.current) {
        userAgentRef.current.stop();
      }
    };
  }, []);

  /**
   * SIP UserAgentの初期化
   */
  const initializeUserAgent = () => {
    if (userAgentRef.current) {
      userAgentRef.current.stop();
    }

    const userAgent = new UserAgent({
      uri: UserAgent.makeURI(`sip:${sipConfig.username}@${sipConfig.url.replace('sip:', '').split(':')[0]}`),
      transportOptions: {
        server: sipConfig.url,
      },
      authorizationUsername: sipConfig.username,
      authorizationPassword: sipConfig.password,
      displayName: sipConfig.username,
    });

    // 着信処理
    userAgent.delegate = {
      onInvite: (invitation: Invitation) => {
        console.log('着信:', invitation);
        setIncomingNumber(invitation.remoteIdentity.uri.user || '不明');
        setCallStatus('incoming');
        currentSessionRef.current = invitation;
        
        // 着信音などの処理をここに追加可能
      }
    };

    userAgentRef.current = userAgent;
    return userAgent;
  };

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
      if (userAgentRef.current) {
        await userAgentRef.current.stop();
        userAgentRef.current = null;
      }
      setConnectionStatus('disconnected');
      setCallStatus('idle');
      console.log('SIP接続を切断しました');
      return;
    }

    // 接続処理
    setConnectionStatus('connecting');
    console.log('SIP接続を開始します:', sipConfig);

    try {
      const userAgent = initializeUserAgent();
      
      await userAgent.start();
      setConnectionStatus('connected');
      console.log('SIP接続が完了しました');
    }
    catch (error) {
      setConnectionStatus('error');
      console.error('SIP接続に失敗しました:', error);
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
   * 発信ボタンクリック時の処理
   */
  const handleCall = async (): Promise<void> => {
    if (!userAgentRef.current || connectionStatus !== 'connected') {
      console.error('SIP接続が確立されていません');
      return;
    }

    if (callStatus === 'active') {
      // 通話終了
      if (currentSessionRef.current) {
        await currentSessionRef.current.bye();
        currentSessionRef.current = null;
      }
      setCallStatus('idle');
      console.log('通話を終了しました');
      return;
    }

    console.log('発信開始:', { dialedNumber, sipConfig });
    
    try {
      setCallStatus('calling');
      
      const target = UserAgent.makeURI(`sip:${dialedNumber}@${sipConfig.url.replace('sip:', '').split(':')[0]}`);
      if (!target) {
        throw new Error('無効な発信先です');
      }

      const inviter = new Inviter(userAgentRef.current, target);
      currentSessionRef.current = inviter;

      // セッションの状態変化を監視
      inviter.stateChange.addListener((state: SessionState) => {
        console.log('通話状態変化:', state);
        switch (state) {
          case SessionState.Established:
            setCallStatus('active');
            break;
          case SessionState.Terminated:
            setCallStatus('idle');
            currentSessionRef.current = null;
            break;
        }
      });

      await inviter.invite();
      console.log('発信しました');
    }
    catch (error) {
      console.error('発信に失敗しました:', error);
      setCallStatus('idle');
      currentSessionRef.current = null;
    }
  };

  /**
   * ダイアル番号クリア処理
   */
  const handleClear = (): void => {
    setDialedNumber('');
  };

  /**
   * 着信応答処理
   */
  const handleAcceptCall = async (): Promise<void> => {
    if (currentSessionRef.current && callStatus === 'incoming') {
      try {
        await (currentSessionRef.current as Invitation).accept();
        setCallStatus('active');
        console.log('着信に応答しました');
      }
      catch (error) {
        console.error('着信応答に失敗しました:', error);
        setCallStatus('idle');
        currentSessionRef.current = null;
      }
    }
  };

  /**
   * 着信拒否処理
   */
  const handleRejectCall = async (): Promise<void> => {
    if (currentSessionRef.current && callStatus === 'incoming') {
      try {
        await (currentSessionRef.current as Invitation).reject();
        setCallStatus('idle');
        currentSessionRef.current = null;
        setIncomingNumber('');
        console.log('着信を拒否しました');
      }
      catch (error) {
        console.error('着信拒否に失敗しました:', error);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-cyan-50 p-4">
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

            {/* 接続状態表示 */}
            {connectionStatus === 'error' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">
                  接続に失敗しました。設定を確認して再試行してください。
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

          {/* 発信ボタン */}
          <Button
            onClick={() => { void handleCall(); }}
            disabled={
              (!dialedNumber && callStatus !== 'active')
              || connectionStatus !== 'connected'
            }
            className={`w-full max-w-md h-14 text-lg font-semibold rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl ${
              callStatus === 'active' 
                ? 'bg-red-600 hover:bg-red-700' 
                : callStatus === 'calling'
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-green-600 hover:bg-green-700 disabled:bg-gray-400'
            }`}
          >
            {callStatus === 'active' ? (
              <>
                <PhoneOff className="mr-2 h-5 w-5" />
                終話
              </>
            ) : callStatus === 'calling' ? (
              <>
                <PhoneCall className="mr-2 h-5 w-5 animate-pulse" />
                発信中...
              </>
            ) : (
              <>
                <Phone className="mr-2 h-5 w-5" />
                発信
              </>
            )}
          </Button>

          {/* 着信UI */}
          {callStatus === 'incoming' && (
            <Card className="w-full max-w-md bg-blue-50 border-blue-200">
              <CardContent className="p-6 text-center">
                <div className="mb-4">
                  <PhoneCall className="mx-auto h-12 w-12 text-blue-600 animate-bounce" />
                  <h3 className="text-lg font-semibold text-gray-800 mt-2">着信中</h3>
                  <p className="text-gray-600">{incomingNumber}</p>
                </div>
                <div className="flex gap-4">
                  <Button
                    onClick={() => { void handleAcceptCall(); }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    応答
                  </Button>
                  <Button
                    onClick={() => { void handleRejectCall(); }}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    <PhoneOff className="mr-2 h-4 w-4" />
                    拒否
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 通話状態表示 */}
          {callStatus === 'active' && (
            <Card className="w-full max-w-md bg-green-50 border-green-200">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
                  <span className="text-green-700 font-medium">通話中</span>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;
