@echo off
chcp 65001 >nul
echo ==================================================
echo 日本語テキストマイニングツール 起動スクリプト
echo ==================================================

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [エラー] Node.js がインストールされていません。
    echo 以下のURLからNode.jsをダウンロードしてインストールしてください。
    echo https://nodejs.org/ja/
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [情報] 初回起動のため、依存パッケージをインストールしています...
    call npm install
    if %errorlevel% neq 0 (
        echo [エラー] パッケージのインストールに失敗しました。
        pause
        exit /b 1
    )
)

echo [情報] ツールを起動しています...ブラウザが開くまでお待ちください。
call npm run dev

pause
