// src/utils/id.ts
// Generates unique IDs for characters.
// Uses timestamp + random suffix for collision-free IDs without external deps.

export function generateId(): string {
  return "char_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
