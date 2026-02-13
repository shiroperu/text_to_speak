# マルチキャラクター音声生成アプリ — CLAUDE.md

## プロジェクト概要

テキスト形式の台本データ（複数人の会話）から、キャラクターごとに個別設定された
声質・話し方でAI音声を生成するWebアプリケーション。

- **音声エンジン**: ElevenLabs TTS API（`eleven_multilingual_v2` / `eleven_turbo_v2_5`）
- **フロントエンド**: React 19 + TypeScript 5 + Vite 6
- **スタイリング**: Tailwind CSS 3.4 + shadcn/ui

## プロジェクトドキュメント

開発前に必ず以下のドキュメントを読み込むこと:

- `requirements.md` — 要件定義書（機能要件・画面構成・データフロー）
- `09_システム・技術要件詳細化書.md` — フロントエンド技術要件（ライブラリ・規約・構造）

> **注意**: requirements.md は当初 Gemini TTS を前提に記述されているが、
> 音声エンジンは **ElevenLabs** に変更済み。API仕様・パラメータ体系が異なるため、
> 実装時は prompt-optimization スキル および prompt-engineer エージェントの
> 仕様を正とすること。

---

## ElevenLabs TTS — Gemini TTS との主な差分

| 項目 | Gemini TTS（旧） | ElevenLabs（現行） |
|------|-----------------|-------------------|
| 音声制御方式 | 自然言語プロンプト | 数値パラメータ（voice_settings） |
| ボイス選択 | 30種プリビルト（voiceName） | Voice Library 10,000+（voice_id） |
| パラメータ | Pitch/Speed/Emotionをプロンプトで記述 | stability/similarity_boost/style/speed |
| 出力形式 | PCM 16bit 24kHz → WAV変換 | MP3（デフォルト）、PCM、μ-law |
| 辞書機能 | テキスト内ルビ + プロンプト発音指示 | Pronunciation Dictionary API |
| 行間連続性 | なし | previous_text / next_text パラメータ |
| 文字数制限 | 8,000バイト（テキスト+プロンプト） | モデル依存（3,000〜40,000字） |
| 認証 | API Key（URLパラメータ） | xi-api-key（ヘッダー） |
| マルチスピーカー | 1リクエスト2話者まで | 1リクエスト1話者（voice_id指定） |

---

## チーム構成とワークフロー

### 役割

| 役割 | エージェント | 責任範囲 |
|------|------------|---------|
| **ジャッジメント**（ユーザー） | — | 最終意思決定、承認 |
| **プロジェクトマネージャー** | `project-manager` | 要件管理、タスク分解・指示、進捗管理 |
| **フロントエンドデベロッパー** | `frontend-developer` | React/TypeScript コーディング |
| **コードレビュワー** | `code-reviewer` | コード品質・セキュリティ・規約レビュー |
| **プロンプトエンジニア** | `prompt-engineer` | ElevenLabs 音声設計・最適化 |

### ワークフロールール

```
ジャッジメント（ユーザー）
    ↕ 確認・承認
プロジェクトマネージャー
    ↓ 作業指示
┌───────────────────┬────────────────────┬──────────────────┐
│ FEデベロッパー     │ コードレビュワー    │ プロンプトエンジニア│
│ (実装)            │ (レビュー)          │ (音声設計)        │
└───────────────────┴────────────────────┴──────────────────┘
```

### 絶対ルール

1. **PMは以下の場面で必ずジャッジメントに確認を求める**:
   - 要件定義の解釈・変更
   - 課題対応方針の決定
   - 画面設計・UI確認
   - 技術方針の決定
   - 優先順位の変更

2. **FEデベロッパーの実装は必ずコードレビュワーのレビューを通す**:
   - レビュー未通過のコードはマージ不可
   - CRITICAL指摘がある場合は必ず修正後に再レビュー

3. **音声設計はプロンプトエンジニアに相談して決定する**:
   - voice_settings の変換ロジック変更
   - Pronunciation Dictionary の設計変更
   - モデル選定の変更

4. **作業指示はPMからメンバーへ出す**:
   - メンバー間の直接指示は禁止
   - PMがタスクを管理・調整する

---

## 開発原則

Motto: "Small, clear, safe steps — always grounded in real docs"

### Principles
- 変更は最小限・安全・可逆にする
- 明快さ > 巧みさ、シンプルさ > 複雑さ
- 不要な依存は追加しない

### Workflow
- **Plan**: 大きな変更前に短い計画を共有
- **Read**: 変更前に関連ファイルを全て読む
- **Verify**: 外部API・仮定をドキュメントで確認
- **Implement**: スコープを絞り、モジュール単位で実装
- **Test & Docs**: テストとドキュメントを更新
- **Reflect**: 根本原因で修正、隣接リスクを考慮

### Code Style
- ファイル ≤ 300行、モジュールは単一目的
- ファイル先頭にヘッダコメント（where, what, why）
- コメントは多めに（理由、前提、トレードオフ）
- マジックナンバー禁止（`constants/` に定義）
- 要求された機能のみ実装（YAGNI）

### Accountability
- 要件が曖昧・セキュリティ関連・API契約変更時はエスカレーション
- 自信度80%未満の場合は正直に申告
- スコアリング: 正しいコード +1 / 破壊的変更 -4 / 不確実申告 0
- **正確さ > 速さ**

---

## Agent Teams 構成

Agent Teams を使用する場合の構成:

```
# PMをリードとして、チームを構成
チームリード（PM）がタスクを分解し、以下のチームメイトに委任:

1. frontend-developer — React実装タスク
2. code-reviewer — 実装完了後のレビュータスク
3. prompt-engineer — ElevenLabs音声設計タスク

# 起動例
このプロジェクトのAgent Teamを構成してください。
PMをリードとして、frontend-developer、code-reviewer、prompt-engineer を
チームメイトとして起動してください。
```

---

## Quick Checklist

Plan → Read files → Verify docs → Implement → Review → Judge → Next task
