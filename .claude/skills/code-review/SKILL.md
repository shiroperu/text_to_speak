---
name: code-review
description: >
  React/TypeScript プロジェクトのコードレビュースキル。
  型安全性、Reactパターン、セキュリティ、パフォーマンス、コーディング規約の
  観点でコードを検査する。レビュー実行手順とチェックリストを提供する。
  コードレビューの実行、品質検査が必要な場面で使用する。
---

# コードレビュースキル

## レビュー実行手順

### Step 1: 変更範囲の特定
```bash
# 最新の変更を確認
git diff --name-only HEAD~1
# または特定のコミット範囲
git diff --name-only [base]..[head]
```

### Step 2: 静的解析の実行
```bash
# TypeScript 型チェック
npx tsc --noEmit 2>&1 | head -50

# ESLint
npx eslint src/ --ext .ts,.tsx --format compact 2>&1 | head -50
```

### Step 3: 各ファイルの詳細レビュー

変更されたファイルを1つずつ読み、以下の観点で検査する。

#### 型安全性チェック
```bash
# any の使用を検索
grep -rn ":\s*any" src/ --include="*.ts" --include="*.tsx"
grep -rn "as any" src/ --include="*.ts" --include="*.tsx"
```

#### セキュリティチェック
```bash
# dangerouslySetInnerHTML の使用を検索
grep -rn "dangerouslySetInnerHTML" src/ --include="*.tsx"
# ハードコードされた鍵・トークンを検索
grep -rn "apiKey\|API_KEY\|secret\|token" src/ --include="*.ts" --include="*.tsx" | grep -v "\.d\.ts"
```

#### ファイルサイズチェック
```bash
# 300行超のファイルを検出
find src/ -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -rn | awk '$1 > 300'
```

#### マジックナンバーチェック
```bash
# 数値リテラルの直接使用を検索（定数化すべきもの）
grep -rn "[^a-zA-Z_][0-9]\{3,\}" src/ --include="*.ts" --include="*.tsx" | grep -v "constants/" | grep -v "node_modules"
```

### Step 4: レビュー結果の整理

指摘事項を重要度（CRITICAL / WARNING / SUGGESTION）に分類し、
code-reviewer エージェントのフォーマットに従って結果を報告する。
