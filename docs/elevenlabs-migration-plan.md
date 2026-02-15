# Gemini TTS → ElevenLabs TTS 移行計画書

## 文書管理情報
- **作成日**: 2026-02-13
- **ステータス**: ジャッジメント承認待ち

---

## 1. 移行の背景と目的

### 1.1 現状の課題
- Gemini TTS API（`gemini-2.5-flash-preview-tts`）はPreview版で **モデルが不安定**
- `finishReason: OTHER` が頻発し、正常に音声出力できないケースが多い
- 音声の安定性がボイスによって大きく異なる（一部ボイスは日本語で使用不可）

### 1.2 移行先
- **ElevenLabs TTS API**（`eleven_multilingual_v2`）
- 安定した音声出力、日本語対応、豊富なボイスライブラリ（10,000+）
- 数値パラメータによる再現性の高い音声制御

---

## 2. ElevenLabs APIキーの取得方法

### 2.1 アカウント作成
1. [ElevenLabs公式サイト](https://elevenlabs.io) にアクセス
2. 「Sign Up」でアカウント作成（メール or Google/GitHub認証）
3. 無料プランで即利用可能（クレジットカード不要）

### 2.2 APIキーの取得
1. ログイン後、画面左下のプロフィールアイコンをクリック
2. 「Profile + API key」を選択
3. 「API Key」セクションで「Show」→ キーをコピー
4. 形式: `sk_` から始まる英数字文字列（旧形式は `xi-` プレフィックス）

### 2.3 Free tier の制限

| 項目 | 内容 |
|------|------|
| 月間文字数 | 10,000文字（日本語1文字 = 1カウント） |
| 同時リクエスト | 2 |
| ボイスクローン | 不可（プリセットボイスのみ） |
| Pronunciation Dictionary | 利用可能 |
| Voice Library | 利用可能 |
| 商用利用 | 不可 |

---

## 3. API仕様比較（Gemini vs ElevenLabs）

| 項目 | Gemini TTS（現行） | ElevenLabs（移行先） |
|------|-------------------|---------------------|
| エンドポイント | `generativelanguage.googleapis.com/v1beta/models/...` | `api.elevenlabs.io/v1/text-to-speech/{voice_id}` |
| 認証 | URLパラメータ `?key=` | ヘッダー `xi-api-key` |
| 音声制御 | 自然言語プロンプト | 数値パラメータ（`voice_settings`） |
| ボイス数 | 30種プリビルト | 10,000+ Voice Library |
| レスポンス | JSON（Base64エンコードPCM） | 直接バイナリ（MP3/PCM） |
| 行間連続性 | なし | `previous_text` / `next_text` |
| 辞書機能 | テキスト内ルビ注入 | Pronunciation Dictionary API |
| レートリミット | ~10 RPM | 同時接続2（Free tier） |
| エラーハンドリング | `finishReason` で判定 | HTTPステータス + JSONエラーボディ |

---

## 4. voice_settings パラメータ仕様

### 4.1 パラメータ一覧

| パラメータ | 範囲 | デフォルト | 効果 |
|-----------|------|-----------|------|
| `stability` | 0.0 - 1.0 | 0.50 | 安定性。高い=安定・単調、低い=感情豊かだが揺れやすい |
| `similarity_boost` | 0.0 - 1.0 | 0.75 | 元音声への忠実度。高い=忠実だがノイズ、低い=自然 |
| `style` | 0.0 - 1.0 | 0.00 | スタイル誇張。高い=表現力大だが不安定化 |
| `use_speaker_boost` | boolean | true | 明瞭度ブースト |
| `speed` | 0.7 - 1.2 | 1.0 | 話速 |

### 4.2 推奨モデル

| モデルID | 用途 | 日本語対応 | style効果 |
|---------|------|----------|----------|
| `eleven_multilingual_v2`（**主モデル**） | 高品質、安定、多言語 | 推奨 | あり |
| `eleven_turbo_v2_5`（フォールバック） | 低遅延、速度優先 | あり | 限定的 |

---

## 5. キャラクターパラメータの変換設計

### 5.1 変換方針

ElevenLabsでは **ボイスの基本特性（声の高さ、年齢感）はボイス選択（voice_id）で決まる**。
voice_settingsで制御できるのは「安定性」「忠実度」「表現力」「速度」の4軸のみ。

| 現行パラメータ | ElevenLabsでの扱い |
|--------------|-------------------|
| **Pitch**（声の高さ） | ElevenLabsでは制御不可のため**削除** |
| **Age**（年齢） | ElevenLabsでは制御不可のため**削除** |
| **Speed**（話速） | `speed` に直接マッピング |
| **EmotionIntensity**（感情量） | `stability`（逆相関）+ `style` に変換 |
| **VoiceQuality**（声質） | `similarity_boost` + `use_speaker_boost` に変換 |
| **Personality**（性格） | `style` への加算補正 |
| **DirectorsNotes**（自由記述） | ElevenLabsでは反映不可のため**削除**。代わりに感情タグシステムを実装 |

### 5.2 具体的マッピング表

#### Speed → speed
| UI値 | speed値 |
|------|--------|
| slow | 0.85 |
| normal | 1.0 |
| fast | 1.15 |

#### EmotionIntensity → stability + style（ベース値）
| UI値 | stability | style（ベース） |
|------|-----------|----------------|
| small | 0.75 | 0.00 |
| medium | 0.50 | 0.15 |
| large | 0.30 | 0.40 |

#### VoiceQuality → similarity_boost + use_speaker_boost
| UI値 | similarity_boost | use_speaker_boost |
|------|-----------------|-------------------|
| clear | 0.80 | true |
| breathy | 0.60 | false |
| nasal | 0.70 | true |
| husky | 0.65 | false |

#### Personality → style 加算補正
| UI値 | style加算値 |
|------|-----------|
| calm | +0.00 |
| cheerful | +0.15 |
| shy | +0.05 |
| aggressive | +0.25 |

**最終 style 値** = EmotionIntensity のベース + Personality の加算（上限 1.0）

### 5.3 変換ロジック（擬似コード）

```typescript
function buildVoiceSettings(char: Character): VoiceSettings {
  const speedMap = { slow: 0.85, normal: 1.0, fast: 1.15 };
  const emotionStability = { small: 0.75, medium: 0.50, large: 0.30 };
  const emotionStyle = { small: 0.0, medium: 0.15, large: 0.40 };
  const personalityBonus = { calm: 0.0, cheerful: 0.15, shy: 0.05, aggressive: 0.25 };
  const qualitySimilarity = { clear: 0.80, breathy: 0.60, nasal: 0.70, husky: 0.65 };
  const qualityBoost = { clear: true, breathy: false, nasal: true, husky: false };

  return {
    stability: emotionStability[char.emotionIntensity],
    similarity_boost: qualitySimilarity[char.voiceQuality],
    style: Math.min(1.0, emotionStyle[char.emotionIntensity] + personalityBonus[char.personality]),
    use_speaker_boost: qualityBoost[char.voiceQuality],
    speed: speedMap[char.speed],
  };
}
```

---

## 6. 変更対象ファイル一覧

### 6.1 変更規模サマリー

| 変更レベル | ファイル数 | 対象ファイル |
|-----------|----------|-------------|
| **大幅書き換え** | 5 | useAudioGeneration.ts, useVoicePreview.ts, prompt.ts, audio.ts, config.ts |
| **中程度の書き換え** | 2 | types.ts, CharacterEditor.tsx |
| **軽微な書き換え** | 4 | Header.tsx, Sidebar.tsx, GenerationControls.tsx, useAudioPlayback.ts |
| **間接的影響** | 2 | App.tsx, useFirestoreSync.ts |
| **変更不要** | 12 | main.tsx, index.css, file.ts, id.ts, storage.ts, firebase.ts, useAuth.ts, RadioGroup.tsx, icons.tsx, ScriptPanel.tsx, DictionaryManager.tsx, vite.config.ts |

### 6.2 大幅書き換え（5ファイル）

#### `src/hooks/useAudioGeneration.ts`
- API呼び出しロジック全体を ElevenLabs 仕様に書き換え
- 認証: URLパラメータ → `xi-api-key` ヘッダー
- リクエスト構造: Gemini形式 → `{ text, model_id, voice_settings }` 形式
- レスポンス処理: Base64 JSON → バイナリ `arrayBuffer()`
- `previous_text` / `next_text` パラメータの実装（行間連続性）
- エラーハンドリング: `finishReason` → HTTPステータス + JSONエラーボディ

#### `src/hooks/useVoicePreview.ts`
- useAudioGeneration と同様に ElevenLabs API 呼び出しに変更
- レスポンスがバイナリのため、Blob → Audio再生に簡素化

#### `src/utils/prompt.ts`
- `buildPromptForCharacter()` → `buildVoiceSettings()` に置換
- 自然言語プロンプト構築 → 数値パラメータオブジェクト構築
- ラベルマッピング定数群は不要に
- `sanitizeForTts()` は維持（テキスト前処理）
- `applyDictionary()` はPhase 1で維持（テキスト内読み替え方式）

#### `src/utils/audio.ts`
- `base64ToArrayBuffer()` → 削除（ElevenLabsはバイナリレスポンス）
- `pcmToWav()` → 維持（PCM出力 `pcm_24000` を使用するため）
- `createSilence()` → 維持

#### `src/config.ts`
- `GEMINI_VOICES` → ElevenLabsボイスリストに置換
- `GEMINI_TTS_MODEL` → `ELEVENLABS_MODEL_ID`
- `GEMINI_API_BASE` → `ELEVENLABS_API_BASE`
- PCMパラメータ定数（SAMPLE_RATE等）→ 維持（`pcm_24000` 使用）
- パラメータ選択肢定数 → 維持（UIパラメータは同じ）

### 6.3 中程度の書き換え（2ファイル）

#### `src/types.ts`
- `GeminiVoice` → `ElevenLabsVoice`（`voice_id`, `name`, `category` 等）
- `Character` の `voiceName` → `voiceId` に変更
- `VoiceSettings` 型を新規追加
- UIパラメータ型（Pitch, Speed等）は維持（変換ロジックで使用）

#### `src/components/CharacterEditor.tsx`
- ボイス選択ドロップダウンの選択肢を ElevenLabs ボイスに変更
- `GEMINI_VOICES` → ElevenLabs ボイスリストへの差し替え

### 6.4 軽微な書き換え（4ファイル）

| ファイル | 変更内容 |
|---------|---------|
| `Header.tsx` | "Gemini TTS" → "ElevenLabs"、placeholder変更 |
| `Sidebar.tsx` | `char.voiceName` → `char.voiceId` 表示変更 |
| `GenerationControls.tsx` | ダウンロードラベル確認（WAV維持） |
| `useAudioPlayback.ts` | ファイル名確認（WAV維持） |

---

## 7. 技術方針の決定事項

### 7.1 音声出力形式: **PCM（`pcm_24000`）を採用**

**理由:**
- 現行の音声処理パイプライン（`pcmToWav()`, `createSilence()`）をほぼそのまま流用可能
- SAMPLE_RATE = 24000 も変更不要
- コード変更量が最小

```typescript
// ElevenLabs API呼び出し時
const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=pcm_24000`;
const res = await fetch(url, { ... });
const arrayBuffer = await res.arrayBuffer();
const pcm = new Int16Array(arrayBuffer);
// → 以降は現行の結合・WAV変換処理をそのまま使用
```

### 7.2 previous_text / next_text: **実装する**

行単位生成での自然な会話フロー実現のため活用。Gemini TTS にはなかった機能で、品質向上が期待できる。

### 7.3 辞書機能: **Phase 1 はテキスト内読み替え方式を維持**

- 現行の `applyDictionary()` をそのまま使用
- ElevenLabs もテキスト内のひらがな読みを正しく認識する
- Pronunciation Dictionary API への移行は将来のPhase 2で検討

### 7.4 ボイス選択: **API動的取得方式**

- APIKey設定後に `GET /v1/voices` でボイス一覧を動的取得
- ユーザーのアカウントで利用可能なボイス（Premade + カスタム）を全て表示
- APIKey未設定時は「APIキーを設定するとボイスを選択できます」と表示
- 取得したリストはstateでキャッシュし、毎回APIコールしない

### 7.5 DirectorsNotes: **削除（フィールド・UI共に削除）**

- ElevenLabs は自然言語プロンプトによる音声制御に非対応
- DirectorsNotes フィールドは Character 型から削除
- 代わりに **感情タグシステム**（セクション7.7）を実装して行単位の感情制御を実現

### 7.6 既存データの互換性: **マイグレーション関数を用意**

- localStorage / Firestore の旧Character形式を検出し、新形式に自動変換
- `voiceName` → `voiceId` のマッピングテーブルで変換

### 7.7 感情タグシステム: **実装する**

台本テキストに感情タグを埋め込むことで、行単位で voice_settings を動的に補正する仕組み。
画面上に使用可能な感情タグ一覧を表示する。

#### 7.7.1 感情タグ定義

| タグ | stability補正 | style補正 | speed補正 | 説明 |
|------|-------------|-----------|-----------|------|
| `[emotion:angry]` | -0.15 | +0.20 | — | 怒り |
| `[emotion:sad]` | -0.10 | +0.10 | 0.9 | 悲しみ |
| `[emotion:happy]` | -0.05 | +0.15 | — | 喜び |
| `[emotion:excited]` | -0.15 | +0.25 | 1.1 | 興奮 |
| `[emotion:calm]` | +0.10 | -0.05 | 0.95 | 穏やか |
| `[emotion:fearful]` | -0.10 | +0.10 | 1.05 | 恐怖 |
| `[whisper]` | +0.20 | -0.10 | 0.9 | ささやき |
| `[shout]` | -0.20 | +0.30 | 1.1 | 叫び |

#### 7.7.2 使用方法

台本テキストの行頭にタグを記述:
```
理事長:[emotion:angry] そんなことは許さない！
アドバイザー:[whisper] 落ち着いてください...
理事長:[emotion:sad] すまない、言い過ぎた。
```

#### 7.7.3 処理フロー

1. 台本パース時にタグを検出・抽出
2. キャラクターの base voice_settings に補正値を加算/減算
3. 値を有効範囲（0.0-1.0, speed: 0.7-1.2）にクランプ
4. タグ部分はテキストから除去して API に送信

#### 7.7.4 UI要件

- 台本エディタ / 生成画面に「使用可能な感情タグ一覧」パネルを表示
- タグ名・効果の説明・使用例を一覧表示
- コピーボタンで簡単にタグを挿入可能にする

---

## 8. 実装順序（推奨）

| Step | 内容 | 対象ファイル |
|------|------|-------------|
| 1 | 型定義・定数の更新 | types.ts, config.ts |
| 2 | voice_settings 変換ロジック + 感情タグパーサー実装 | prompt.ts |
| 3 | API呼び出しロジック書き換え | useAudioGeneration.ts |
| 4 | プレビュー機能書き換え | useVoicePreview.ts |
| 5 | 音声処理ユーティリティ更新 | audio.ts |
| 6 | UI更新（ボイス選択・ラベル・感情タグ一覧パネル） | CharacterEditor.tsx, Header.tsx, Sidebar.tsx, ScriptPanel.tsx |
| 7 | データマイグレーション（DirectorsNotes削除対応含む） | storage.ts（or 新規） |
| 8 | 動作確認・調整 | 全体 |

---

## 9. ジャッジメント承認済み方針

| # | 項目 | 決定事項 | 承認 |
|---|------|---------|------|
| 1 | 音声出力形式 | PCM 24kHz → WAV 方式を維持 | 承認済み |
| 2 | UIパラメータ体系 | 現行6パラメータを維持、voice_settingsに変換 | 承認済み |
| 3 | Pitch / Age | **削除**（ElevenLabsでは制御不可） | 承認済み |
| 4 | 辞書機能 | テキスト内読み替え方式を維持 | 承認済み |
| 5 | DirectorsNotes | **削除**（フィールド・UI共に削除） | 承認済み |
| 6 | 感情タグシステム | 実装する + 画面にタグ一覧表示 | 承認済み |
| 7 | ボイス選択 | API動的取得（GET /v1/voices） | 承認済み |
| 8 | previous_text / next_text | 実装して行間連続性を向上 | 承認済み |
