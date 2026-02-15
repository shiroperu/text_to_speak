---
name: prompt-optimization
description: >
  ElevenLabs TTS API の音声最適化スキル。
  キャラクターパラメータから voice_settings への変換、
  Pronunciation Dictionary による発音制御、モデル選定ガイドを提供する。
  TTS の音声設定設計・改善が必要な場面で使用する。
---

# ElevenLabs TTS 音声最適化スキル

## API概要

- **ベースURL**: `https://api.elevenlabs.io/v1`
- **認証**: `xi-api-key` ヘッダー
- **出力形式**: MP3（デフォルト）, PCM, μ-law
- **日本語対応**: `apply_text_normalization: "auto"` を推奨

## モデル選定ガイド

| ユースケース | 推奨モデル | 理由 |
|------------|----------|------|
| 台本の一括生成（品質重視） | `eleven_multilingual_v2` | 日本語品質が最良 |
| プレビュー再生（速度重視） | `eleven_turbo_v2_5` | 低遅延でイテレーション向き |
| 感情豊かなキャラクター | `eleven_v3` | 最大表現力（3,000字制限注意） |
| リアルタイム用途 | `eleven_flash_v2_5` | 75ms超低遅延 |

## voice_settings 変換マップ

### UIパラメータ → ElevenLabs パラメータ

```typescript
// キャラクター設定からvoice_settingsを生成する変換ロジック

interface CharacterParams {
  emotionIntensity: 'small' | 'medium' | 'large';
  speed: 'slow' | 'normal' | 'fast';
  voiceQuality: 'clear' | 'breathy' | 'nasal' | 'husky';
  personality: 'calm' | 'cheerful' | 'shy' | 'aggressive';
}

interface ElevenLabsVoiceSettings {
  stability: number;        // 0.0 - 1.0
  similarity_boost: number; // 0.0 - 1.0
  style: number;            // 0.0 - 1.0
  use_speaker_boost: boolean;
  speed: number;            // 0.7 - 1.2
}

const STABILITY_MAP = { small: 0.75, medium: 0.50, large: 0.30 };
const STYLE_MAP = { calm: 0.0, cheerful: 0.3, shy: 0.1, aggressive: 0.5 };
const SPEED_MAP = { slow: 0.85, normal: 1.0, fast: 1.15 };
const SIMILARITY_MAP = { clear: 0.80, breathy: 0.60, nasal: 0.70, husky: 0.65 };

function toVoiceSettings(params: CharacterParams): ElevenLabsVoiceSettings {
  return {
    stability: STABILITY_MAP[params.emotionIntensity],
    similarity_boost: SIMILARITY_MAP[params.voiceQuality],
    style: STYLE_MAP[params.personality],
    use_speaker_boost: true,
    speed: SPEED_MAP[params.speed],
  };
}
```

## UIパラメータの再設計（ElevenLabs向け）

Gemini TTS では Pitch / Age がプロンプトで制御可能だったが、
ElevenLabs ではボイス選択で決まるため、UIの役割が変わる:

| 旧パラメータ | ElevenLabsでの対応 |
|------------|-------------------|
| ベースボイス（30種固定） | Voice Library から選択（voice_id） |
| 声の高さ（Pitch） | **ボイス選択で決定**（API制御不可） |
| 話速（Speed） | `speed` パラメータ (0.7-1.2) |
| 感情量 | `stability` パラメータ（逆相関） |
| 声質 | `similarity_boost` + ボイス選択 |
| 年齢 | **ボイス選択で決定**（API制御不可） |
| 性格 | `style` パラメータ |
| 詳細口調設定 | テキスト演出 + previous/next_text |

→ **Pitch と Age はボイス選択UIに統合**し、
  voice_settings で制御可能なパラメータのみスライダーUIにする提案を検討。

## Pronunciation Dictionary

### PLS ファイルフォーマット

```xml
<?xml version="1.0" encoding="UTF-8"?>
<lexicon version="1.0"
  xmlns="http://www.w3.org/2005/01/pronunciation-lexicon"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.w3.org/2005/01/pronunciation-lexicon"
  alphabet="ipa" xml:lang="ja">
  <lexeme>
    <grapheme>築古</grapheme>
    <alias>ちくふる</alias>
  </lexeme>
  <lexeme>
    <grapheme>分譲</grapheme>
    <alias>ぶんじょう</alias>
  </lexeme>
</lexicon>
```

### API操作

```bash
# 辞書アップロード
POST /v1/pronunciation-dictionaries/add-from-file
# → { id, version_id } を取得

# リクエストに適用（最大3辞書）
{
  "pronunciation_dictionary_locators": [
    { "pronunciation_dictionary_id": "...", "version_id": "..." }
  ]
}
```

## 行間の連続性確保

ElevenLabs の `previous_text` / `next_text` を活用して
行単位生成でも自然な音声のつながりを実現する:

```typescript
// 行 i の生成時
{
  previous_text: lines[i - 1]?.text ?? "",
  text: lines[i].text,
  next_text: lines[i + 1]?.text ?? "",
}
```

## レートリミット対策

- 429エラー時は `Retry-After` ヘッダーを確認
- 指数バックオフで再試行
- 同時リクエスト数はプランの concurrency limit に従う
