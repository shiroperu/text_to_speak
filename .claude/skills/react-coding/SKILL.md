---
name: react-coding
description: >
  React 19 + TypeScript 5 によるフロントエンド実装スキル。
  Bulletproof-react パターン、shadcn/ui、Tailwind CSS、Zustand、
  TanStack Query を活用した高品質なコンポーネント開発手法。
  React コンポーネントの作成、フック開発、状態管理、API連携の場面で使用する。
---

# React コーディングスキル

## コンポーネント作成テンプレート

### ページコンポーネント

```typescript
/**
 * [ページ名]ページ
 * 場所: src/features/[feature]/pages/[PageName].tsx
 * 目的: [ページの目的]
 */
import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function [PageName]() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <[PageName]Content />
    </Suspense>
  );
}

function [PageName]Content() {
  // hooks
  // handlers
  // render
}
```

### 機能コンポーネント

```typescript
/**
 * [コンポーネント名]
 * 場所: src/features/[feature]/components/[ComponentName].tsx
 * 目的: [コンポーネントの目的]
 */
import { cn } from '@/lib/cn';

interface [ComponentName]Props {
  // 必須props
  className?: string;
}

export function [ComponentName]({ className, ...props }: [ComponentName]Props) {
  return (
    <div className={cn('', className)}>
      {/* content */}
    </div>
  );
}
```

### カスタムフック

```typescript
/**
 * [フック名]
 * 場所: src/features/[feature]/hooks/[hookName].ts
 * 目的: [フックの目的]
 */
import { useQuery, useMutation } from '@tanstack/react-query';

export function use[Name]() {
  return useQuery({
    queryKey: ['[key]'],
    queryFn: [fetchFunction],
  });
}
```

### Zustand ストア

```typescript
/**
 * [ストア名]ストア
 * 場所: src/features/[feature]/stores/[storeName].ts
 * 目的: [ストアの目的]
 */
import { create } from 'zustand';

interface [Store]State {
  // state
}

interface [Store]Actions {
  // actions
}

export const use[Store]Store = create<[Store]State & [Store]Actions>()((set, get) => ({
  // initial state
  // actions
}));
```

### Zod スキーマ

```typescript
/**
 * [スキーマ名]バリデーション
 * 場所: src/features/[feature]/schemas/[schemaName].ts
 * 目的: [バリデーションの目的]
 */
import { z } from 'zod';

export const [schemaName]Schema = z.object({
  // fields
});

export type [SchemaName] = z.infer<typeof [schemaName]Schema>;
```

### API呼び出し

```typescript
/**
 * [API名] API
 * 場所: src/features/[feature]/api/[apiName].ts
 * 目的: [APIの目的]
 */
import { apiClient } from '@/lib/api-client';
import type { [ResponseType] } from '../types';

export async function [apiName]([params]): Promise<[ResponseType]> {
  const { data } = await apiClient.get<[ResponseType]>('[endpoint]', {
    params: [params],
  });
  return data;
}
```

## shadcn/ui 使用ガイドライン

- コンポーネント追加: `npx shadcn@latest add [component]`
- カスタマイズ: `src/components/ui/` 配下のファイルを直接編集
- cn ユーティリティ: `import { cn } from '@/lib/cn'` で条件付きクラス名

## Tailwind CSS 規約

- カスタムカラーは `tailwind.config.js` の `theme.extend.colors` に定義
- レスポンシブ: `sm:`, `md:`, `lg:` プレフィックス
- ダークモード: `dark:` プレフィックス（対応する場合）
