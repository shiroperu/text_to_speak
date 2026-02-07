# 要件定義書：マルチキャラクター音声生成アプリ

## 1. プロジェクト概要

### 1.1 目的
テキスト形式の台本データ（複数人の会話）から、キャラクターごとに個別設定された声質・話し方でAI音声を生成するWebアプリケーション。

### 1.2 技術基盤
- **音声生成エンジン**: Google AI Studio — Gemini 2.5 Flash TTS（`gemini-2.5-flash-preview-tts`）
- **API**: Gemini API REST エンドポイント（`generativelanguage.googleapis.com/v1beta`）
- **出力形式**: PCM 16bit 24kHz → WAV変換

### 1.3 Gemini TTS API の技術的特性と制約

| 項目 | 内容 |
|------|------|
| マルチスピーカー対応 | 1リクエストあたり最大**2話者**まで |
| プロンプトによる制御 | 自然言語で声のスタイル・アクセント・ペース・トーンを制御可能 |
| 利用可能ボイス数 | 30種類のプリビルトボイス |
| 入力制限 | テキスト+プロンプト合計 最大8,000バイト（各フィールド4,000バイト上限） |
| 出力上限 | 約655秒（約10分55秒）/リクエスト |
| 対応言語 | 24言語（日本語対応済み） |

> **重要**: マルチスピーカーは1リクエスト2話者までのため、3人以上の会話は**行ごとにシングルスピーカーTTS**で生成し、結合する方式を採用する。

---

## 2. 機能要件

### 2.1 キャラクター管理

#### 2.1.1 キャラクター作成・編集

各キャラクターに以下のパラメータを設定可能とする。

**基本パラメータ（UIセレクタ）:**

| パラメータ | 選択肢 | 用途 |
|-----------|--------|------|
| キャラクター名 | 自由入力（テキスト） | 台本の話者名との紐付け |
| ベースボイス | 30種のプリビルトボイスから選択 | Gemini API `voiceName` に対応 |
| 声の高さ（Pitch） | low / mid / high | プロンプトに反映 |
| 話速（Speed） | slow / normal / fast | プロンプトに反映 |
| 感情量（Emotion Intensity） | small / medium / large | プロンプトに反映 |
| 声質（Voice Quality） | clear / breathy / nasal / husky | プロンプトに反映 |
| 年齢（Age） | child / teen / adult | プロンプトに反映 |
| 性格（Personality） | calm / cheerful / shy / aggressive | プロンプトに反映 |

**詳細口調設定（テキストエリア — 自由記述）:**

ユーザーが自然言語で詳細な口調・演技指示を記述できるフィールド。以下のような構造化された指示を受け付ける。

```
emotional pattern:
  default: cold and blunt
  embarrassed: pitch rises slightly, speech becomes faster
  angry: consonants stronger, shorter pauses
  kind moments: softer tone, breathier ending

tsundere behavior:
  often starts lines sharply then softens at the end
  avoids sounding openly kind
  small tongue clicks or short sighs before speaking

articulation:
  clear consonants
  short pauses before important words
  sometimes cuts sentence endings short

breathing:
  audible light sighs
  short exhale after emotional lines

never monotone
never narrator style
sounds like talking to a specific person, not audience
```

#### 2.1.2 プリビルトボイス一覧

アプリ内で選択可能なGemini TTSボイス（全30種）:

| ボイス名 | 特徴 |
|----------|------|
| Zephyr | Bright, upbeat |
| Puck | Upbeat, energetic |
| Charon | Informative, clear |
| Kore | Firm, decisive |
| Fenrir | Excitable, dynamic |
| Leda | Youthful |
| Orus | Firm, decisive |
| Aoede | Smooth, breathy |
| Callirrhoe | Easy-going, relaxed |
| Autonoe | Bright, optimistic |
| Enceladus | Breathy, soft |
| Iapetus | Clear, articulate |
| Umbriel | Easy-going, calm |
| Algieba | Smooth, pleasant |
| Despina | Smooth, flowing |
| Erinome | Clear, precise |
| Algenib | Gravelly texture |
| Rasalgethi | Informative, professional |
| Laomedeia | Upbeat, lively |
| Achernar | Soft, gentle |
| Alnilam | Firm, strong |
| Schedar | Even, balanced |
| Gacrux | Mature, experienced |
| Pulcherrima | Forward, expressive |
| Achird | Friendly, approachable |
| Zubenelgenubi | — |
| Vindemiatrix | Gentle, kind |
| Sadachbia | Lively, animated |
| Sadaltager | Knowledgeable, authoritative |
| Sulafat | Warm, welcoming |

#### 2.1.3 キャラクターパラメータからプロンプトへの変換ロジック

UIで設定されたパラメータは、Gemini TTS APIに送信する**ディレクターズノート（演出指示プロンプト）**に自動変換される。

**変換例:**

ユーザー設定:
- 名前: アドバイザー
- ベースボイス: Charon
- 声の高さ: mid
- 話速: normal
- 感情量: medium
- 声質: clear
- 年齢: adult
- 性格: calm
- 詳細口調: （上記のtsundere設定例）

→ 生成されるプロンプト:
```
## AUDIO PROFILE: アドバイザー

### VOICE CHARACTERISTICS
- Pitch: mid range
- Speed: normal pace
- Emotion intensity: medium expressiveness
- Voice quality: clear articulation
- Age impression: adult
- Personality: calm demeanor

### DIRECTOR'S NOTES

emotional pattern:
  default: cold and blunt
  embarrassed: pitch rises slightly, speech becomes faster
  angry: consonants stronger, shorter pauses
  kind moments: softer tone, breathier ending

tsundere behavior:
  often starts lines sharply then softens at the end
  avoids sounding openly kind
  small tongue clicks or short sighs before speaking

articulation:
  clear consonants
  short pauses before important words
  sometimes cuts sentence endings short

breathing:
  audible light sighs
  short exhale after emotional lines

never monotone
never narrator style
sounds like talking to a specific person, not audience
```

#### 2.1.4 キャラクター保存

- キャラクター設定はJSON形式でエクスポート/インポート可能
- ブラウザのローカルストレージ（※環境制約に応じてファイルダウンロード方式に切替）で保存
- 複数キャラクターをまとめた「キャラクターセット」としても保存可能

**保存データ構造:**
```json
{
  "version": "1.0",
  "characters": [
    {
      "id": "char_001",
      "name": "理事長",
      "voiceName": "Kore",
      "pitch": "mid",
      "speed": "normal",
      "emotionIntensity": "medium",
      "voiceQuality": "clear",
      "age": "adult",
      "personality": "calm",
      "directorsNotes": "..."
    }
  ]
}
```

#### 2.1.5 キャラクター音声プレビュー

- 各キャラクター設定画面に「プレビュー」ボタンを配置
- プレビュー用のサンプルテキスト（デフォルト: 「こんにちは、テスト音声です。」）を設定可能
- ユーザーがカスタムテキストを入力してプレビューすることも可能
- プレビュー音声はブラウザ上でリアルタイム再生

---

### 2.2 台本管理

#### 2.2.1 台本アップロード

- **対応形式**: `.txt`ファイル（UTF-8エンコーディング）
- **フォーマット**: `話者名:セリフ`（コロンは全角`：`または半角`:`の両方に対応）

**入力例:**
```
理事長:今日は、今後のマンション管理を考えるうえで、避けて通れない現実についてお話しします。
アドバイザー:まず最初にお伝えしたいのは、これは一部のマンションだけの話ではない、ということです。
アドバイザー:今後、日本では中小規模の築古マンションが、確実に増えていきます。
理事長:他人事ではなく、全国的な話なんですね。
```

#### 2.2.2 台本パース処理

1. テキストファイルを行単位で解析
2. 各行から`話者名`と`セリフ`を分離
3. 話者名リストを自動抽出し、キャラクター割り当てUIに表示
4. 未割り当てのキャラクターがある場合は警告表示
5. 空行・コメント行（`#`で始まる行）はスキップ

#### 2.2.3 台本プレビュー

- アップロード後、台本の内容をテーブル形式で表示
- 各行に話者名・セリフ・割り当てキャラクターを表示
- 話者名とキャラクターの紐付けを手動で変更可能

---

### 2.3 辞書機能（読み間違い防止）

#### 2.3.1 辞書登録

- 単語と読み仮名のペアを登録
- 登録例: `築古` → `ちくふる`
- 登録済み辞書エントリの一覧表示・編集・削除

#### 2.3.2 辞書適用ロジック

台本テキストをGemini TTS APIに送信する前に、以下の前処理を行う：

**方式A — テキスト内ルビ注入:**
```
元テキスト: 築古マンション
変換後: 築古（ちくふる）マンション
```

**方式B — プロンプト内発音指示:**
```
## PRONUNCIATION GUIDE
- 築古 should be read as "ちくふる"
- 分譲 should be read as "ぶんじょう"
```

→ **方式Aと方式Bの併用を推奨**（精度向上のため）

#### 2.3.3 辞書保存

- 辞書データもJSON形式でエクスポート/インポート可能
- キャラクターセットと一緒に保存可能

**辞書データ構造:**
```json
{
  "version": "1.0",
  "entries": [
    { "word": "築古", "reading": "ちくふる" },
    { "word": "分譲", "reading": "ぶんじょう" }
  ]
}
```

---

### 2.4 音声生成

#### 2.4.1 生成フロー

```
台本アップロード
    ↓
台本パース（話者名・セリフ分離）
    ↓
辞書適用（読み仮名前処理）
    ↓
各行ごとに音声生成リクエスト
    ↓
キャラクター設定 → プロンプト変換
    ↓
Gemini TTS API 呼び出し
  - model: gemini-2.5-flash-preview-tts
  - responseModalities: ["AUDIO"]
  - speechConfig: voiceConfig + プロンプト
    ↓
PCM音声データ受信
    ↓
行間に自然なポーズ（silence）を挿入
    ↓
全行の音声を結合
    ↓
WAV形式で出力
```

#### 2.4.2 API呼び出し方式

**3話者以上対応のため、行単位（シングルスピーカー）方式を採用:**

各行ごとに以下のリクエストを送信：

```javascript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: promptWithDirectorsNotes }]
      }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: character.voiceName
            }
          }
        }
      }
    })
  }
);
```

**プロンプト構成（各行ごと）:**
```
[キャラクターのディレクターズノート]

Read the following line in character:
「今日は、今後のマンション管理を考えるうえで、避けて通れない現実についてお話しします。」
```

#### 2.4.3 音声結合処理

1. 各行のPCM音声データ（16bit, 24kHz, モノラル）を受信
2. 行間に設定可能な無音区間を挿入（デフォルト: 500ms = 24,000サンプル）
3. 全PCMデータを連結
4. WAVヘッダを付与して出力

#### 2.4.4 レートリミット対策

- Gemini API の無料枠にはレートリミットあり（RPM/TPM制限）
- リクエスト間に適切なディレイ（デフォルト: 1秒）を設定可能
- リトライ処理（429エラー時、指数バックオフ）を実装

#### 2.4.5 進捗表示

- 全体の行数に対する進捗率をプログレスバーで表示
- 現在生成中の行番号と話者名を表示
- エラー発生時は該当行をハイライトし、スキップ or リトライを選択可能

---

### 2.5 音声再生・ダウンロード

- 生成した音声をブラウザ上で再生可能
- WAV形式でダウンロード可能
- 個別行の音声も再生可能（デバッグ・確認用）

---

## 3. 画面構成

### 3.1 メイン画面レイアウト

```
┌──────────────────────────────────────────────────┐
│  ヘッダー: アプリ名 + API Key 設定               │
├────────────────┬─────────────────────────────────┤
│                │                                 │
│  キャラクター  │  台本エディタ / プレビュー       │
│  管理パネル    │                                 │
│                │  [台本アップロード]               │
│  [+新規作成]   │  [話者↔キャラクター紐付け]       │
│  キャラ一覧    │  [台本プレビューテーブル]         │
│  - 理事長      │                                 │
│  - アドバイザー │                                 │
│                │  ──────────────────             │
│  [辞書管理]    │  音声生成コントロール            │
│                │  [行間ポーズ: ___ms]             │
│                │  [リクエスト間隔: ___s]          │
│                │  [▶ 音声生成開始]                │
│                │  [プログレスバー]                │
│                │  [▶ 再生] [⬇ ダウンロード]       │
│                │                                 │
├────────────────┴─────────────────────────────────┤
│  フッター: ステータス / エラーメッセージ          │
└──────────────────────────────────────────────────┘
```

### 3.2 キャラクター編集ダイアログ

```
┌──────────────────────────────────────┐
│  キャラクター設定                     │
│                                      │
│  名前: [____________]                │
│  ベースボイス: [▼ Kore        ]      │
│                                      │
│  声の高さ:  ○low  ●mid  ○high       │
│  話速:      ○slow ●normal ○fast     │
│  感情量:    ○small ●medium ○large   │
│  声質:      ●clear ○breathy ...     │
│  年齢:      ○child ○teen ●adult     │
│  性格:      ●calm ○cheerful ...     │
│                                      │
│  詳細口調設定:                        │
│  ┌──────────────────────────────┐    │
│  │ emotional pattern:           │    │
│  │   default: cold and blunt    │    │
│  │   ...                        │    │
│  └──────────────────────────────┘    │
│                                      │
│  プレビューテキスト:                  │
│  [こんにちは、テスト音声です。]       │
│  [▶ プレビュー再生]                  │
│                                      │
│  [保存]  [キャンセル]                 │
└──────────────────────────────────────┘
```

### 3.3 辞書管理ダイアログ

```
┌──────────────────────────────────────┐
│  読み辞書                            │
│                                      │
│  単語          読み                  │
│  ┌────────────┬────────────┬───┐    │
│  │ 築古        │ ちくふる    │ ✕ │    │
│  │ 分譲        │ ぶんじょう  │ ✕ │    │
│  └────────────┴────────────┴───┘    │
│                                      │
│  新規追加:                           │
│  単語: [________] 読み: [________]   │
│  [+ 追加]                            │
│                                      │
│  [エクスポート] [インポート] [閉じる] │
└──────────────────────────────────────┘
```

---

## 4. 非機能要件

### 4.1 セキュリティ
- API KeyはブラウザのローカルのみでSSとして保持（サーバーに送信しない）
- APIリクエストはクライアントサイドから直接送信（フロントエンドのみ構成）

### 4.2 パフォーマンス
- 音声生成は行単位で非同期処理
- レートリミットを考慮した適切なリクエスト間隔
- 大量行（100行以上）の台本にも対応

### 4.3 エラーハンドリング
- API Key未設定時の警告
- ネットワークエラー時のリトライ
- レートリミット（429）時の自動ウェイト＆リトライ
- 不正な台本フォーマットのバリデーション
- 文字数制限超過時の自動分割

### 4.4 対応ブラウザ
- Chrome（最新版）
- Safari（最新版）
- Firefox（最新版）

---

## 5. 技術スタック（推奨）

| レイヤー | 技術 |
|----------|------|
| フロントエンド | React（JSX単体ファイル） |
| スタイリング | Tailwind CSS |
| 音声処理 | Web Audio API + PCM→WAV変換 |
| API通信 | Fetch API（クライアントサイド直接通信） |
| データ永続化 | JSON エクスポート/インポート（ファイルダウンロード方式） |
| 音声結合 | クライアントサイドでPCMバイナリ結合 |

---

## 6. データフロー詳細

```
[ユーザー]
    │
    ├─ (1) キャラクター設定 → JSON保存/読込
    │
    ├─ (2) 辞書登録 → JSON保存/読込
    │
    ├─ (3) 台本.txt アップロード
    │       │
    │       ├─ パース: 話者名・セリフ分離
    │       ├─ 話者名の自動検出
    │       └─ キャラクター紐付け確認
    │
    └─ (4) 音声生成開始
            │
            ├─ 各行ループ:
            │   ├─ 辞書適用（テキスト前処理）
            │   ├─ キャラクター設定 → プロンプト構築
            │   ├─ Gemini TTS API 呼び出し
            │   ├─ PCMデータ受信・Base64デコード
            │   └─ レートリミット待機
            │
            ├─ 全行PCM結合（行間ポーズ挿入）
            ├─ WAVヘッダ付与
            └─ 再生 / ダウンロード
```

---

## 7. 将来拡張（Phase 2以降）

- BGM・効果音の自動挿入
- 行ごとの感情タグ指定（`[怒り]`、`[悲しみ]`など）
- 生成音声のピッチ・速度の後処理調整
- MP3/OGG形式での出力
- 台本のリアルタイム編集（エディタ内直接編集）
- マルチスピーカーAPI活用（2人以下の会話の最適化）
- バッチ処理（複数台本の一括生成）

---

## 8. 制限事項・注意点

1. **Gemini TTS は Preview 版**: API仕様が変更される可能性がある
2. **無料枠のレートリミット**: 大量の台本処理には有料APIキーが推奨される
3. **マルチスピーカー制限**: APIは1リクエスト2話者まで。3人以上は行単位生成で対応
4. **音声品質**: プロンプトによる制御は確率的であり、同じ設定でも若干の揺れがある
5. **日本語の読み精度**: 辞書登録で補完するが、完全な制御は困難な場合がある
6. **出力上限**: 1リクエストあたり最大約655秒。長い台本は行単位生成で回避
