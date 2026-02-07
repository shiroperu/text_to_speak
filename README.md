# VoiceCast Studio

テキスト台本から、キャラクターごとに個別設定された声質・話し方でAI音声を生成するWebアプリケーション。

## 主な機能

- **キャラクター管理** — 30種のGeminiボイスから選択し、声の高さ・話速・感情量・声質・年齢・性格を設定。自由記述の演技指示（Director's Notes）にも対応
- **台本パース** — `話者名:セリフ` 形式のテキストファイルをアップロードし、話者を自動検出してキャラクターに紐付け
- **読み辞書** — 単語と読み仮名のペアを登録し、読み間違いを防止（テキスト内ルビ注入 + プロンプト内発音指示の併用）
- **音声生成** — Gemini 2.5 Flash TTS APIを行単位で呼び出し、行間ポーズを挿入して結合。マルチスピーカーAPI（2話者ペア）の自動最適化、レートリミット対策（指数バックオフ）付き
- **再生・ダウンロード** — 生成したWAV音声をブラウザ上で再生、またはファイルとしてダウンロード
- **エクスポート/インポート** — キャラクター設定・辞書をJSON形式で保存・復元

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フレームワーク | Vite + React 19 + TypeScript |
| スタイリング | Tailwind CSS v3 |
| 音声生成 | Google Gemini 2.5 Flash TTS API |
| 音声処理 | PCM 16bit 24kHz → WAV（クライアントサイド変換） |
| データ永続化 | JSONファイル エクスポート/インポート |

## セットアップ

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開き、ヘッダー右上にGemini APIキーを入力してください。

APIキーは [Google AI Studio](https://aistudio.google.com/apikey) から取得できます。

## 使い方

1. **キャラクター作成** — 左サイドバーの「追加」からキャラクターを作成し、ボイスやパラメータを設定
2. **台本アップロード** — メインエリアの「TXTファイルを選択」から台本をアップロード
3. **話者紐付け** — 検出された話者名にキャラクターを割り当て
4. **音声生成** — 「音声生成」ボタンをクリックして生成開始
5. **再生・保存** — 生成完了後、再生ボタンまたはWAVダウンロードボタンで音声を取得

### 台本フォーマット

```
理事長:今日は、今後のマンション管理を考えるうえで、避けて通れない現実についてお話しします。
アドバイザー:まず最初にお伝えしたいのは、これは一部のマンションだけの話ではない、ということです。
```

- 1行1発言、`話者名:セリフ` または `話者名：セリフ`（全角コロンも可）
- `#` で始まる行はコメントとしてスキップ
- 空行は無視

## ビルド

```bash
npm run build    # dist/ にプロダクションビルドを出力
npm run preview  # ビルド結果をプレビュー
```

## プロジェクト構成

```
src/
├── config.ts              定数・デフォルト値
├── types.ts               TypeScript型定義
├── App.tsx                ルートコンポーネント
├── main.tsx               エントリポイント
├── index.css              Tailwind CSS
├── components/
│   ├── Header.tsx         ヘッダー + APIキー入力
│   ├── Sidebar.tsx        キャラクター一覧
│   ├── ScriptPanel.tsx    台本アップロード + プレビュー
│   ├── GenerationControls.tsx  生成設定 + 進捗
│   ├── CharacterEditor.tsx     キャラクター編集モーダル
│   ├── DictionaryManager.tsx   辞書管理モーダル
│   ├── RadioGroup.tsx     汎用ラジオボタン
│   └── icons.tsx          SVGアイコン
├── hooks/
│   ├── useAudioGeneration.ts   音声生成パイプライン
│   ├── useAudioPlayback.ts     再生・ダウンロード
│   └── useVoicePreview.ts      ボイスプレビュー
└── utils/
    ├── audio.ts           PCM/WAV変換
    ├── prompt.ts          TTS用プロンプト構築
    ├── file.ts            ファイル入出力・台本パース
    └── id.ts              ID生成
```
