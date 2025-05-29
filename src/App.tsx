import { Phone } from 'lucide-react';
import { useState } from 'react';

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
   * 発信ボタンクリック時の処理
   */
  const handleCall = (): void => {
    console.log('発信開始:', { dialedNumber, sipConfig });
    // TODO: SIP.js を使用した実際の通話処理を実装
  };

  /**
   * ダイアル番号クリア処理
   */
  const handleClear = (): void => {
    setDialedNumber('');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-cyan-50 p-4">
      <div id="phone" className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl">
        {/* SIP設定フォーム */}
        <Card className="w-full lg:w-1/3">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-800">
              SIP設定
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
                onChange={(e) => { handleSipConfigChange('url', e.target.value); }}
                className="w-full"
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
                onChange={(e) => { handleSipConfigChange('username', e.target.value); }}
                className="w-full"
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
                onChange={(e) => { handleSipConfigChange('password', e.target.value); }}
                className="w-full"
              />
            </div>
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
                  readOnly
                  placeholder="番号を入力してください"
                  className="text-lg font-mono text-center border-none shadow-none text-2xl"
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
            onClick={handleCall}
            disabled={!dialedNumber || !sipConfig.url || !sipConfig.username}
            className="w-full max-w-md h-14 text-lg font-semibold bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl"
          >
            <Phone className="mr-2 h-5 w-5" />
            発信
          </Button>
        </div>
      </div>
    </div>
  );
}

export default App;
