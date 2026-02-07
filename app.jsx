import { useState, useCallback, useRef, useEffect } from "react";

// ============================================================
// CONSTANTS
// ============================================================
const GEMINI_VOICES = [
  { name: "Zephyr", desc: "Bright, upbeat" },
  { name: "Puck", desc: "Upbeat, energetic" },
  { name: "Charon", desc: "Informative, clear" },
  { name: "Kore", desc: "Firm, decisive" },
  { name: "Fenrir", desc: "Excitable, dynamic" },
  { name: "Leda", desc: "Youthful" },
  { name: "Orus", desc: "Firm, decisive" },
  { name: "Aoede", desc: "Smooth, breathy" },
  { name: "Callirrhoe", desc: "Easy-going, relaxed" },
  { name: "Autonoe", desc: "Bright, optimistic" },
  { name: "Enceladus", desc: "Breathy, soft" },
  { name: "Iapetus", desc: "Clear, articulate" },
  { name: "Umbriel", desc: "Easy-going, calm" },
  { name: "Algieba", desc: "Smooth, pleasant" },
  { name: "Despina", desc: "Smooth, flowing" },
  { name: "Erinome", desc: "Clear, precise" },
  { name: "Algenib", desc: "Gravelly texture" },
  { name: "Rasalgethi", desc: "Informative, professional" },
  { name: "Laomedeia", desc: "Upbeat, lively" },
  { name: "Achernar", desc: "Soft, gentle" },
  { name: "Alnilam", desc: "Firm, strong" },
  { name: "Schedar", desc: "Even, balanced" },
  { name: "Gacrux", desc: "Mature, experienced" },
  { name: "Pulcherrima", desc: "Forward, expressive" },
  { name: "Achird", desc: "Friendly, approachable" },
  { name: "Zubenelgenubi", desc: "Unique" },
  { name: "Vindemiatrix", desc: "Gentle, kind" },
  { name: "Sadachbia", desc: "Lively, animated" },
  { name: "Sadaltager", desc: "Knowledgeable, authoritative" },
  { name: "Sulafat", desc: "Warm, welcoming" },
];

const PITCH_OPTIONS = ["low", "mid", "high"];
const SPEED_OPTIONS = ["slow", "normal", "fast"];
const EMOTION_OPTIONS = ["small", "medium", "large"];
const QUALITY_OPTIONS = ["clear", "breathy", "nasal", "husky"];
const AGE_OPTIONS = ["child", "teen", "adult"];
const PERSONALITY_OPTIONS = ["calm", "cheerful", "shy", "aggressive"];

const DEFAULT_CHARACTER = {
  id: "",
  name: "",
  voiceName: "Kore",
  pitch: "mid",
  speed: "normal",
  emotionIntensity: "medium",
  voiceQuality: "clear",
  age: "adult",
  personality: "calm",
  directorsNotes: "",
};

const SAMPLE_RATE = 24000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function generateId() {
  return "char_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function buildPromptForCharacter(char, lineText, dictionary) {
  let processedText = lineText;
  // Apply dictionary - inject readings
  if (dictionary && dictionary.length > 0) {
    for (const entry of dictionary) {
      processedText = processedText.replaceAll(entry.word, `${entry.word}（${entry.reading}）`);
    }
  }

  const pitchMap = { low: "low-pitched, deep voice", mid: "mid-range pitch", high: "high-pitched voice" };
  const speedMap = { slow: "slow, deliberate pace", normal: "natural conversational pace", fast: "quick, energetic pace" };
  const emotionMap = { small: "restrained emotion, subtle expressiveness", medium: "moderate expressiveness", large: "highly expressive, dramatic emotion" };
  const qualityMap = { clear: "clear, crisp articulation", breathy: "breathy, airy voice quality", nasal: "slightly nasal resonance", husky: "husky, raspy voice quality" };
  const ageMap = { child: "child-like voice", teen: "teenage voice quality", adult: "adult voice" };
  const personalityMap = { calm: "calm, composed demeanor", cheerful: "cheerful, bright personality", shy: "shy, hesitant delivery", aggressive: "assertive, forceful delivery" };

  let prompt = `## AUDIO PROFILE: ${char.name}\n\n`;
  prompt += `### VOICE CHARACTERISTICS\n`;
  prompt += `- Pitch: ${pitchMap[char.pitch]}\n`;
  prompt += `- Speed: ${speedMap[char.speed]}\n`;
  prompt += `- Emotion intensity: ${emotionMap[char.emotionIntensity]}\n`;
  prompt += `- Voice quality: ${qualityMap[char.voiceQuality]}\n`;
  prompt += `- Age impression: ${ageMap[char.age]}\n`;
  prompt += `- Personality: ${personalityMap[char.personality]}\n`;

  if (char.directorsNotes && char.directorsNotes.trim()) {
    prompt += `\n### DIRECTOR'S NOTES\n${char.directorsNotes}\n`;
  }

  // Add pronunciation guide if dictionary has entries
  if (dictionary && dictionary.length > 0) {
    prompt += `\n### PRONUNCIATION GUIDE\n`;
    for (const entry of dictionary) {
      if (lineText.includes(entry.word)) {
        prompt += `- ${entry.word} should be read as "${entry.reading}"\n`;
      }
    }
  }

  prompt += `\nRead the following line naturally, in character:\n「${processedText}」`;
  return prompt;
}

function buildMultiSpeakerPrompt(lines, characters, dictionary) {
  let prompt = "";
  const charMap = {};
  for (const line of lines) {
    const char = characters[line.speaker];
    if (char && !charMap[line.speaker]) {
      charMap[line.speaker] = char;
      const pitchMap = { low: "low-pitched, deep voice", mid: "mid-range pitch", high: "high-pitched voice" };
      const speedMap = { slow: "slow, deliberate pace", normal: "natural conversational pace", fast: "quick, energetic pace" };
      const qualityMap = { clear: "clear, crisp articulation", breathy: "breathy, airy voice quality", nasal: "slightly nasal resonance", husky: "husky, raspy voice quality" };
      prompt += `## ${line.speaker}'s voice: ${pitchMap[char.pitch]}, ${speedMap[char.speed]}, ${qualityMap[char.voiceQuality]}\n`;
      if (char.directorsNotes) prompt += `Director's notes for ${line.speaker}: ${char.directorsNotes}\n`;
    }
  }

  if (dictionary && dictionary.length > 0) {
    prompt += `\n## PRONUNCIATION GUIDE\n`;
    for (const entry of dictionary) {
      prompt += `- ${entry.word} = "${entry.reading}"\n`;
    }
  }

  prompt += `\nTTS the following conversation between ${lines.map(l => l.speaker).filter((v, i, a) => a.indexOf(v) === i).join(" and ")}:\n`;
  for (const line of lines) {
    let text = line.text;
    if (dictionary) {
      for (const entry of dictionary) {
        text = text.replaceAll(entry.word, `${entry.word}（${entry.reading}）`);
      }
    }
    prompt += `${line.speaker}: ${text}\n`;
  }
  return prompt;
}

function pcmToWav(pcmData) {
  const dataLength = pcmData.byteLength;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, CHANNELS, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * CHANNELS * (BITS_PER_SAMPLE / 8), true);
  view.setUint16(32, CHANNELS * (BITS_PER_SAMPLE / 8), true);
  view.setUint16(34, BITS_PER_SAMPLE, true);
  writeStr(36, "data");
  view.setUint32(40, dataLength, true);
  new Uint8Array(buffer, 44).set(new Uint8Array(pcmData));
  return new Blob([buffer], { type: "audio/wav" });
}

function createSilence(durationMs) {
  const samples = Math.floor((SAMPLE_RATE * durationMs) / 1000);
  return new Int16Array(samples);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// ============================================================
// ICONS (inline SVG components)
// ============================================================
const IconPlus = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/></svg>;
const IconPlay = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><polygon points="2,1 12,7 2,13"/></svg>;
const IconStop = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="2" width="10" height="10" rx="1"/></svg>;
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="2,4 12,4"/><path d="M5,4V2.5A.5.5,0,0,1,5.5,2h3a.5.5,0,0,1,.5.5V4"/><path d="M3,4L3.8,12.2a1,1,0,0,0,1,.8h4.4a1,1,0,0,0,1-.8L11,4"/></svg>;
const IconEdit = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8.5,2.5l3,3L5,12H2V9Z"/></svg>;
const IconUpload = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2,10v3a1,1,0,0,0,1,1h10a1,1,0,0,0,1-1V10"/><polyline points="5,5 8,2 11,5"/><line x1="8" y1="2" x2="8" y2="10"/></svg>;
const IconDownload = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2,10v3a1,1,0,0,0,1,1h10a1,1,0,0,0,1-1V10"/><polyline points="5,8 8,11 11,8"/><line x1="8" y1="11" x2="8" y2="2"/></svg>;
const IconBook = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2,2H6a2,2,0,0,1,2,2V13a1.5,1.5,0,0,0-1.5-1.5H2Z"/><path d="M14,2H10a2,2,0,0,0-2,2V13a1.5,1.5,0,0,1,1.5-1.5H14Z"/></svg>;
const IconSave = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11,13H3a1,1,0,0,1-1-1V2A1,1,0,0,1,3,1H9l3,3v8A1,1,0,0,1,11,13Z"/><rect x="5" y="8" width="4" height="4"/><line x1="5" y1="1" x2="5" y2="4"/></svg>;
const IconMic = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="6" y="1" width="6" height="9" rx="3"/><path d="M3,8a6,6,0,0,0,12,0"/><line x1="9" y1="14" x2="9" y2="17"/><line x1="6" y1="17" x2="12" y2="17"/></svg>;
const IconX = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="3" x2="11" y2="11"/><line x1="11" y1="3" x2="3" y2="11"/></svg>;
const IconSettings = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2"/><path d="M8,1V3M8,13v2M1,8H3M13,8h2M2.9,2.9L4.3,4.3M11.7,11.7l1.4,1.4M13.1,2.9l-1.4,1.4M4.3,11.7,2.9,13.1"/></svg>;
const IconWave = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="2" y1="7" x2="2" y2="13"/><line x1="5" y1="4" x2="5" y2="16"/><line x1="8" y1="6" x2="8" y2="14"/><line x1="11" y1="2" x2="11" y2="18"/><line x1="14" y1="5" x2="14" y2="15"/><line x1="17" y1="7" x2="17" y2="13"/></svg>;

// ============================================================
// SUB-COMPONENTS
// ============================================================

function RadioGroup({ label, options, value, onChange, optionLabels }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{label}</label>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              padding: "5px 12px",
              fontSize: 12,
              border: "1px solid",
              borderColor: value === opt ? "#f59e0b" : "#334155",
              borderRadius: 6,
              background: value === opt ? "rgba(245,158,11,0.15)" : "transparent",
              color: value === opt ? "#fbbf24" : "#94a3b8",
              cursor: "pointer",
              transition: "all 0.15s",
              fontFamily: "inherit",
            }}
          >
            {optionLabels ? optionLabels[opt] || opt : opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function CharacterEditor({ character, onSave, onCancel, onPreview, isPreviewLoading }) {
  const [form, setForm] = useState({ ...DEFAULT_CHARACTER, ...character });
  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div style={{
        background: "#1e293b",
        borderRadius: 16,
        border: "1px solid #334155",
        width: "min(640px, 92vw)",
        maxHeight: "90vh",
        overflow: "auto",
        boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
      }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 18, color: "#f1f5f9", fontWeight: 600 }}>
            {character.id ? "キャラクター編集" : "新規キャラクター"}
          </h2>
          <button onClick={onCancel} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4 }}><IconX /></button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Name + Voice */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>キャラクター名</label>
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="例: 理事長"
                style={{ width: "100%", padding: "8px 12px", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>ベースボイス</label>
              <select
                value={form.voiceName}
                onChange={(e) => update("voiceName", e.target.value)}
                style={{ width: "100%", padding: "8px 12px", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }}
              >
                {GEMINI_VOICES.map((v) => (
                  <option key={v.name} value={v.name}>{v.name} — {v.desc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Parameters */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            <RadioGroup label="声の高さ (Pitch)" options={PITCH_OPTIONS} value={form.pitch} onChange={(v) => update("pitch", v)} />
            <RadioGroup label="話速 (Speed)" options={SPEED_OPTIONS} value={form.speed} onChange={(v) => update("speed", v)} />
            <RadioGroup label="感情量 (Emotion)" options={EMOTION_OPTIONS} value={form.emotionIntensity} onChange={(v) => update("emotionIntensity", v)} />
            <RadioGroup label="声質 (Quality)" options={QUALITY_OPTIONS} value={form.voiceQuality} onChange={(v) => update("voiceQuality", v)} />
            <RadioGroup label="年齢 (Age)" options={AGE_OPTIONS} value={form.age} onChange={(v) => update("age", v)} />
            <RadioGroup label="性格 (Personality)" options={PERSONALITY_OPTIONS} value={form.personality} onChange={(v) => update("personality", v)} />
          </div>

          {/* Director's Notes */}
          <div style={{ marginTop: 8, marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>詳細口調設定 (Director's Notes)</label>
            <textarea
              value={form.directorsNotes}
              onChange={(e) => update("directorsNotes", e.target.value)}
              placeholder={"emotional pattern:\n  default: cold and blunt\n  embarrassed: pitch rises slightly\n\narticulation:\n  clear consonants\n  short pauses before important words"}
              rows={8}
              style={{ width: "100%", padding: "10px 12px", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#cbd5e1", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }}
            />
          </div>

          {/* Preview */}
          <div style={{ background: "#0f172a", borderRadius: 10, padding: 14, marginBottom: 8, border: "1px solid #1e293b" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => onPreview(form)}
                disabled={isPreviewLoading || !form.name}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 16px",
                  background: isPreviewLoading ? "#334155" : "linear-gradient(135deg, #f59e0b, #d97706)",
                  border: "none", borderRadius: 8, color: "#0f172a",
                  fontSize: 13, fontWeight: 600, cursor: isPreviewLoading ? "wait" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {isPreviewLoading ? <span className="spin">⟳</span> : <IconPlay />}
                {isPreviewLoading ? "生成中..." : "プレビュー再生"}
              </button>
              <span style={{ fontSize: 11, color: "#64748b" }}>サンプルテキストで音声を確認</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #334155", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onCancel} style={{ padding: "8px 20px", background: "transparent", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>キャンセル</button>
          <button
            onClick={() => { if (form.name.trim()) onSave({ ...form, id: form.id || generateId() }); }}
            disabled={!form.name.trim()}
            style={{
              padding: "8px 24px",
              background: form.name.trim() ? "linear-gradient(135deg, #f59e0b, #d97706)" : "#334155",
              border: "none", borderRadius: 8, color: "#0f172a", fontSize: 13, fontWeight: 600,
              cursor: form.name.trim() ? "pointer" : "not-allowed",
              fontFamily: "inherit",
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function DictionaryManager({ dictionary, setDictionary, onClose }) {
  const [newWord, setNewWord] = useState("");
  const [newReading, setNewReading] = useState("");

  const addEntry = () => {
    if (newWord.trim() && newReading.trim()) {
      setDictionary((d) => [...d, { word: newWord.trim(), reading: newReading.trim() }]);
      setNewWord("");
      setNewReading("");
    }
  };

  const removeEntry = (idx) => setDictionary((d) => d.filter((_, i) => i !== idx));

  const exportDict = () => {
    const data = JSON.stringify({ version: "1.0", entries: dictionary }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "dictionary.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const importDict = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.entries) setDictionary(data.entries);
        } catch { alert("無効なJSONファイルです"); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", width: "min(500px, 90vw)", maxHeight: "80vh", overflow: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 18, color: "#f1f5f9", display: "flex", alignItems: "center", gap: 8 }}><IconBook /> 読み辞書</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4 }}><IconX /></button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Entry list */}
          {dictionary.length > 0 ? (
            <div style={{ marginBottom: 16 }}>
              {dictionary.map((entry, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#0f172a", borderRadius: 8, marginBottom: 6 }}>
                  <span style={{ color: "#f1f5f9", fontSize: 14, flex: 1 }}>{entry.word}</span>
                  <span style={{ color: "#64748b", fontSize: 13 }}>→</span>
                  <span style={{ color: "#fbbf24", fontSize: 14, flex: 1 }}>{entry.reading}</span>
                  <button onClick={() => removeEntry(i)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 4 }}><IconTrash /></button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "#64748b", fontSize: 13, textAlign: "center", padding: "20px 0" }}>辞書エントリがありません</p>
          )}

          {/* Add new */}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>単語</label>
              <input value={newWord} onChange={(e) => setNewWord(e.target.value)} placeholder="築古"
                style={{ width: "100%", padding: "7px 10px", background: "#0f172a", border: "1px solid #334155", borderRadius: 6, color: "#f1f5f9", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}
                onKeyDown={(e) => e.key === "Enter" && addEntry()}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>読み</label>
              <input value={newReading} onChange={(e) => setNewReading(e.target.value)} placeholder="ちくふる"
                style={{ width: "100%", padding: "7px 10px", background: "#0f172a", border: "1px solid #334155", borderRadius: 6, color: "#f1f5f9", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}
                onKeyDown={(e) => e.key === "Enter" && addEntry()}
              />
            </div>
            <button onClick={addEntry} disabled={!newWord.trim() || !newReading.trim()}
              style={{ padding: "7px 14px", background: newWord.trim() && newReading.trim() ? "#f59e0b" : "#334155", border: "none", borderRadius: 6, color: "#0f172a", fontSize: 13, fontWeight: 600, cursor: newWord.trim() && newReading.trim() ? "pointer" : "not-allowed", whiteSpace: "nowrap", fontFamily: "inherit" }}>
              追加
            </button>
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid #334155", display: "flex", gap: 10 }}>
          <button onClick={exportDict} style={{ padding: "7px 14px", background: "transparent", border: "1px solid #334155", borderRadius: 6, color: "#94a3b8", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>エクスポート</button>
          <button onClick={importDict} style={{ padding: "7px 14px", background: "transparent", border: "1px solid #334155", borderRadius: 6, color: "#94a3b8", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>インポート</button>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ padding: "7px 18px", background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 6, color: "#0f172a", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>閉じる</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP COMPONENT
// ============================================================
export default function App() {
  // State
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [characters, setCharacters] = useState([]);
  const [editingChar, setEditingChar] = useState(null);
  const [dictionary, setDictionary] = useState([]);
  const [showDict, setShowDict] = useState(false);
  const [scriptLines, setScriptLines] = useState([]);
  const [speakerMap, setSpeakerMap] = useState({});
  const [detectedSpeakers, setDetectedSpeakers] = useState([]);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState({ current: 0, total: 0, currentSpeaker: "" });
  const [genError, setGenError] = useState(null);
  const [pauseMs, setPauseMs] = useState(500);
  const [requestDelay, setRequestDelay] = useState(1.0);

  // Audio state
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const abortRef = useRef(false);

  // Preview
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const previewAudioRef = useRef(null);

  // File upload handler
  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
      const parsed = [];
      const speakers = new Set();
      for (const line of lines) {
        const match = line.match(/^(.+?)[：:](.+)$/);
        if (match) {
          const speaker = match[1].trim();
          const text = match[2].trim();
          parsed.push({ speaker, text, index: parsed.length });
          speakers.add(speaker);
        }
      }
      setScriptLines(parsed);
      setDetectedSpeakers([...speakers]);
      // Auto-map speakers to existing characters by name
      const autoMap = {};
      for (const sp of speakers) {
        const found = characters.find((c) => c.name === sp);
        if (found) autoMap[sp] = found.id;
      }
      setSpeakerMap(autoMap);
    };
    reader.readAsText(file);
  }, [characters]);

  // Character CRUD
  const saveCharacter = (char) => {
    setCharacters((prev) => {
      const idx = prev.findIndex((c) => c.id === char.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = char; return next; }
      return [...prev, char];
    });
    setEditingChar(null);
  };

  // Export/Import characters
  const exportCharacters = () => {
    const data = JSON.stringify({ version: "1.0", characters, dictionary }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "characters.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const importCharacters = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.characters) setCharacters(data.characters);
          if (data.dictionary) setDictionary(data.dictionary);
        } catch { alert("無効なJSONファイルです"); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Preview voice
  const previewVoice = async (charForm) => {
    if (!apiKey) { alert("API Keyを設定してください"); return; }
    setIsPreviewLoading(true);
    try {
      const prompt = buildPromptForCharacter(charForm, "こんにちは、テスト音声です。本日はよろしくお願いします。", dictionary);
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: charForm.voiceName } } },
            },
          }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioData) throw new Error("音声データが取得できませんでした");
      const pcm = base64ToArrayBuffer(audioData);
      const wav = pcmToWav(pcm);
      const url = URL.createObjectURL(wav);
      if (previewAudioRef.current) { previewAudioRef.current.pause(); URL.revokeObjectURL(previewAudioRef.current.src); }
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.play();
    } catch (err) {
      alert("プレビューエラー: " + err.message);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // ============================================================
  // AUDIO GENERATION (with multi-speaker pair optimization)
  // ============================================================
  const generateAudio = async () => {
    if (!apiKey) { alert("API Keyを設定してください"); return; }

    // Validate all speakers are mapped
    const unmapped = detectedSpeakers.filter((sp) => !speakerMap[sp]);
    if (unmapped.length > 0) {
      alert(`以下の話者にキャラクターが割り当てられていません:\n${unmapped.join(", ")}`);
      return;
    }

    setIsGenerating(true);
    setGenError(null);
    abortRef.current = false;

    const charLookup = {};
    for (const sp of detectedSpeakers) {
      charLookup[sp] = characters.find((c) => c.id === speakerMap[sp]);
    }

    // Build generation plan: group consecutive pairs with 2 speakers for multi-speaker API
    const plan = [];
    let i = 0;
    while (i < scriptLines.length) {
      if (
        i + 1 < scriptLines.length &&
        scriptLines[i].speaker !== scriptLines[i + 1].speaker &&
        charLookup[scriptLines[i].speaker] &&
        charLookup[scriptLines[i + 1].speaker]
      ) {
        // Multi-speaker pair
        plan.push({ type: "multi", lines: [scriptLines[i], scriptLines[i + 1]] });
        i += 2;
      } else {
        // Single speaker
        plan.push({ type: "single", lines: [scriptLines[i]] });
        i += 1;
      }
    }

    setGenProgress({ current: 0, total: scriptLines.length, currentSpeaker: "" });
    const allPcmChunks = [];
    let processedLines = 0;

    try {
      for (let pi = 0; pi < plan.length; pi++) {
        if (abortRef.current) break;

        const step = plan[pi];

        if (step.type === "multi") {
          const [line1, line2] = step.lines;
          const char1 = charLookup[line1.speaker];
          const char2 = charLookup[line2.speaker];
          setGenProgress({ current: processedLines, total: scriptLines.length, currentSpeaker: `${line1.speaker} & ${line2.speaker} (Multi)` });

          const prompt = buildMultiSpeakerPrompt(step.lines, { [line1.speaker]: char1, [line2.speaker]: char2 }, dictionary);

          let success = false;
          for (let retry = 0; retry < 3 && !success; retry++) {
            try {
              const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                      responseModalities: ["AUDIO"],
                      speechConfig: {
                        multiSpeakerVoiceConfig: {
                          speakerVoiceConfigs: [
                            { speaker: line1.speaker, voiceConfig: { prebuiltVoiceConfig: { voiceName: char1.voiceName } } },
                            { speaker: line2.speaker, voiceConfig: { prebuiltVoiceConfig: { voiceName: char2.voiceName } } },
                          ],
                        },
                      },
                    },
                  }),
                }
              );
              const data = await res.json();
              if (data.error) {
                if (res.status === 429) {
                  const wait = Math.pow(2, retry + 1) * 2000;
                  await new Promise((r) => setTimeout(r, wait));
                  continue;
                }
                throw new Error(data.error.message);
              }
              const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
              if (!audioData) throw new Error("No audio data");
              allPcmChunks.push(new Int16Array(base64ToArrayBuffer(audioData)));
              success = true;
            } catch (err) {
              if (retry === 2) {
                // Fallback: generate individually
                console.warn("Multi-speaker failed, falling back to single:", err.message);
                for (const line of step.lines) {
                  if (abortRef.current) break;
                  const char = charLookup[line.speaker];
                  const singlePrompt = buildPromptForCharacter(char, line.text, dictionary);
                  const sRes = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        contents: [{ parts: [{ text: singlePrompt }] }],
                        generationConfig: {
                          responseModalities: ["AUDIO"],
                          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: char.voiceName } } },
                        },
                      }),
                    }
                  );
                  const sData = await sRes.json();
                  if (sData.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
                    allPcmChunks.push(new Int16Array(base64ToArrayBuffer(sData.candidates[0].content.parts[0].inlineData.data)));
                  }
                  if (step.lines.indexOf(line) < step.lines.length - 1) {
                    allPcmChunks.push(createSilence(pauseMs));
                  }
                  await new Promise((r) => setTimeout(r, requestDelay * 1000));
                }
              }
            }
          }
          processedLines += 2;
        } else {
          // Single speaker
          const line = step.lines[0];
          const char = charLookup[line.speaker];
          setGenProgress({ current: processedLines, total: scriptLines.length, currentSpeaker: line.speaker });

          const prompt = buildPromptForCharacter(char, line.text, dictionary);

          let success = false;
          for (let retry = 0; retry < 3 && !success; retry++) {
            try {
              const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                      responseModalities: ["AUDIO"],
                      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: char.voiceName } } },
                    },
                  }),
                }
              );
              const data = await res.json();
              if (data.error) {
                if (res.status === 429) {
                  const wait = Math.pow(2, retry + 1) * 2000;
                  await new Promise((r) => setTimeout(r, wait));
                  continue;
                }
                throw new Error(data.error.message);
              }
              const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
              if (!audioData) throw new Error("No audio data");
              allPcmChunks.push(new Int16Array(base64ToArrayBuffer(audioData)));
              success = true;
            } catch (err) {
              if (retry === 2) {
                setGenError(`行${line.index + 1}でエラー: ${err.message}`);
              }
            }
          }
          processedLines += 1;
        }

        // Add silence between steps (not after last)
        if (pi < plan.length - 1 && !abortRef.current) {
          allPcmChunks.push(createSilence(pauseMs));
        }

        // Rate limit delay
        if (pi < plan.length - 1 && !abortRef.current) {
          await new Promise((r) => setTimeout(r, requestDelay * 1000));
        }
      }

      if (!abortRef.current && allPcmChunks.length > 0) {
        // Combine all PCM
        const totalLength = allPcmChunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const combined = new Int16Array(totalLength);
        let offset = 0;
        for (const chunk of allPcmChunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        const wav = pcmToWav(combined.buffer);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const url = URL.createObjectURL(wav);
        setAudioBlob(wav);
        setAudioUrl(url);
        setGenProgress({ current: scriptLines.length, total: scriptLines.length, currentSpeaker: "完了" });
      }
    } catch (err) {
      setGenError("生成エラー: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const stopGeneration = () => { abortRef.current = true; };

  const playAudio = () => {
    if (!audioUrl) return;
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.play();
    setIsPlaying(true);
  };

  const stopAudio = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setIsPlaying(false);
  };

  const downloadAudio = () => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement("a");
    a.href = url; a.download = "generated_audio.wav"; a.click();
    URL.revokeObjectURL(url);
  };

  // Character color assignment
  const charColors = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];
  const getCharColor = (idx) => charColors[idx % charColors.length];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0a0f1a 0%, #0f172a 40%, #111827 100%)",
      color: "#e2e8f0",
      fontFamily: "'Noto Sans JP', 'Segoe UI', sans-serif",
    }}>
      {/* Inject font + global styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { display: inline-block; animation: spin 1s linear infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .pulse { animation: pulse 1.5s ease-in-out infinite; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        select option { background: #1e293b; color: #f1f5f9; }
        input::placeholder, textarea::placeholder { color: #475569; }
      `}</style>

      {/* HEADER */}
      <header style={{
        padding: "12px 24px",
        borderBottom: "1px solid #1e293b",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(15,23,42,0.8)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ color: "#f59e0b", display: "flex" }}><IconWave /></div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, background: "linear-gradient(135deg, #f59e0b, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            VoiceCast Studio
          </h1>
          <span style={{ fontSize: 10, color: "#475569", padding: "2px 8px", border: "1px solid #334155", borderRadius: 4 }}>Gemini TTS</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative" }}>
            <input
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Gemini API Key"
              style={{
                width: 280, padding: "6px 80px 6px 12px", background: "#0f172a", border: "1px solid #334155",
                borderRadius: 8, color: "#f1f5f9", fontSize: 12, fontFamily: "inherit",
              }}
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#64748b", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}
            >
              {showApiKey ? "隠す" : "表示"}
            </button>
          </div>
          {apiKey && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} title="API Key設定済み" />}
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div style={{ display: "flex", height: "calc(100vh - 53px)" }}>

        {/* LEFT SIDEBAR: Character Panel */}
        <aside style={{
          width: 280,
          minWidth: 280,
          borderRight: "1px solid #1e293b",
          display: "flex",
          flexDirection: "column",
          background: "rgba(15,23,42,0.5)",
        }}>
          <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #1e293b" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>キャラクター</h2>
              <button
                onClick={() => setEditingChar({ ...DEFAULT_CHARACTER })}
                style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "5px 10px",
                  background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
                  borderRadius: 6, color: "#fbbf24", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <IconPlus /> 追加
              </button>
            </div>
          </div>

          {/* Character list */}
          <div style={{ flex: 1, overflow: "auto", padding: 10 }}>
            {characters.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 16px", color: "#475569" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎭</div>
                <p style={{ fontSize: 12, margin: 0 }}>キャラクターを追加して<br />音声生成を開始しましょう</p>
              </div>
            ) : (
              characters.map((char, idx) => (
                <div
                  key={char.id}
                  style={{
                    padding: "10px 12px",
                    background: "#1e293b",
                    borderRadius: 10,
                    marginBottom: 6,
                    border: "1px solid #334155",
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = getCharColor(idx))}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#334155")}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: getCharColor(idx), flexShrink: 0 }} />
                      <span style={{ fontSize: 14, fontWeight: 500, color: "#f1f5f9" }}>{char.name}</span>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={(e) => { e.stopPropagation(); setEditingChar(char); }}
                        style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4 }}><IconEdit /></button>
                      <button onClick={(e) => { e.stopPropagation(); setCharacters((c) => c.filter((cc) => cc.id !== char.id)); }}
                        style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4 }}><IconTrash /></button>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                    {char.voiceName} · {char.pitch} · {char.speed} · {char.voiceQuality}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sidebar footer buttons */}
          <div style={{ padding: 12, borderTop: "1px solid #1e293b", display: "flex", flexDirection: "column", gap: 6 }}>
            <button onClick={() => setShowDict(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "transparent", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", fontSize: 12, cursor: "pointer", width: "100%", fontFamily: "inherit" }}>
              <IconBook /> 読み辞書 {dictionary.length > 0 && <span style={{ background: "#f59e0b", color: "#0f172a", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 600 }}>{dictionary.length}</span>}
            </button>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={exportCharacters} style={{ flex: 1, padding: "7px 0", background: "transparent", border: "1px solid #334155", borderRadius: 8, color: "#64748b", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                <IconSave /> 保存
              </button>
              <button onClick={importCharacters} style={{ flex: 1, padding: "7px 0", background: "transparent", border: "1px solid #334155", borderRadius: 8, color: "#64748b", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                <IconUpload /> 読込
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Script Upload Area */}
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #1e293b" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>台本</h2>
              <label style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
                background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)",
                borderRadius: 8, color: "#60a5fa", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}>
                <IconUpload /> TXTファイルを選択
                <input type="file" accept=".txt" onChange={handleFileUpload} style={{ display: "none" }} />
              </label>
            </div>

            {/* Speaker ↔ Character mapping */}
            {detectedSpeakers.length > 0 && (
              <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
                {detectedSpeakers.map((sp) => (
                  <div key={sp} style={{ display: "flex", alignItems: "center", gap: 8, background: "#1e293b", padding: "6px 12px", borderRadius: 8, border: "1px solid #334155" }}>
                    <span style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 500 }}>{sp}</span>
                    <span style={{ color: "#475569" }}>→</span>
                    <select
                      value={speakerMap[sp] || ""}
                      onChange={(e) => setSpeakerMap((m) => ({ ...m, [sp]: e.target.value }))}
                      style={{ padding: "4px 8px", background: "#0f172a", border: "1px solid #334155", borderRadius: 6, color: speakerMap[sp] ? "#fbbf24" : "#ef4444", fontSize: 12, fontFamily: "inherit" }}
                    >
                      <option value="">未割当</option>
                      {characters.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Script Lines Preview */}
          <div style={{ flex: 1, overflow: "auto", padding: "0 24px" }}>
            {scriptLines.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#475569" }}>
                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📝</div>
                <p style={{ fontSize: 14, margin: "0 0 8px" }}>台本ファイルをアップロードしてください</p>
                <p style={{ fontSize: 12, margin: 0, color: "#334155" }}>フォーマット: 「話者名:セリフ」（1行1発言）</p>
              </div>
            ) : (
              <div style={{ padding: "12px 0" }}>
                {scriptLines.map((line, idx) => {
                  const charIdx = characters.findIndex((c) => c.id === speakerMap[line.speaker]);
                  const color = charIdx >= 0 ? getCharColor(charIdx) : "#475569";
                  return (
                    <div key={idx} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(30,41,59,0.5)", animation: "slideIn 0.2s ease-out", animationDelay: `${idx * 20}ms`, animationFillMode: "both" }}>
                      <div style={{ width: 28, textAlign: "right", fontSize: 11, color: "#334155", paddingTop: 3, flexShrink: 0 }}>{idx + 1}</div>
                      <div style={{
                        fontSize: 12, fontWeight: 600, color, minWidth: 90, paddingTop: 2,
                        display: "flex", alignItems: "flex-start", gap: 4,
                      }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, marginTop: 5, flexShrink: 0 }} />
                        {line.speaker}
                      </div>
                      <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6, flex: 1 }}>{line.text}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Generation Controls */}
          <div style={{
            padding: "16px 24px",
            borderTop: "1px solid #1e293b",
            background: "rgba(15,23,42,0.8)",
            backdropFilter: "blur(12px)",
          }}>
            {/* Settings row */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <label style={{ fontSize: 11, color: "#64748b" }}>行間ポーズ</label>
                <input type="number" value={pauseMs} onChange={(e) => setPauseMs(Number(e.target.value))}
                  style={{ width: 60, padding: "4px 6px", background: "#0f172a", border: "1px solid #334155", borderRadius: 4, color: "#f1f5f9", fontSize: 12, textAlign: "center", fontFamily: "inherit" }} />
                <span style={{ fontSize: 11, color: "#475569" }}>ms</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <label style={{ fontSize: 11, color: "#64748b" }}>リクエスト間隔</label>
                <input type="number" value={requestDelay} onChange={(e) => setRequestDelay(Number(e.target.value))} step={0.5}
                  style={{ width: 50, padding: "4px 6px", background: "#0f172a", border: "1px solid #334155", borderRadius: 4, color: "#f1f5f9", fontSize: 12, textAlign: "center", fontFamily: "inherit" }} />
                <span style={{ fontSize: 11, color: "#475569" }}>秒</span>
              </div>
              <div style={{ flex: 1 }} />
              {scriptLines.length > 0 && (
                <span style={{ fontSize: 11, color: "#475569" }}>{scriptLines.length}行 · {detectedSpeakers.length}話者</span>
              )}
            </div>

            {/* Progress bar */}
            {isGenerating && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "#94a3b8" }} className="pulse">
                    生成中: {genProgress.currentSpeaker}
                  </span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>
                    {genProgress.current} / {genProgress.total}
                  </span>
                </div>
                <div style={{ height: 4, background: "#1e293b", borderRadius: 2 }}>
                  <div style={{
                    height: "100%",
                    width: `${genProgress.total > 0 ? (genProgress.current / genProgress.total) * 100 : 0}%`,
                    background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
                    borderRadius: 2,
                    transition: "width 0.3s ease",
                  }} />
                </div>
              </div>
            )}

            {genError && (
              <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 8, padding: "6px 10px", background: "rgba(239,68,68,0.1)", borderRadius: 6 }}>{genError}</div>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {!isGenerating ? (
                <button
                  onClick={generateAudio}
                  disabled={scriptLines.length === 0 || !apiKey}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "10px 24px",
                    background: scriptLines.length > 0 && apiKey ? "linear-gradient(135deg, #f59e0b, #d97706)" : "#334155",
                    border: "none", borderRadius: 10, color: "#0f172a", fontSize: 14, fontWeight: 700,
                    cursor: scriptLines.length > 0 && apiKey ? "pointer" : "not-allowed",
                    fontFamily: "inherit",
                    boxShadow: scriptLines.length > 0 && apiKey ? "0 4px 20px rgba(245,158,11,0.3)" : "none",
                  }}
                >
                  <IconMic /> 音声生成
                </button>
              ) : (
                <button onClick={stopGeneration}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "10px 24px",
                    background: "#ef4444", border: "none", borderRadius: 10, color: "white",
                    fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}>
                  <IconStop /> 中止
                </button>
              )}

              {audioUrl && (
                <>
                  <button onClick={isPlaying ? stopAudio : playAudio}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "10px 18px",
                      background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)",
                      borderRadius: 10, color: "#60a5fa", fontSize: 13, fontWeight: 500,
                      cursor: "pointer", fontFamily: "inherit",
                    }}>
                    {isPlaying ? <><IconStop /> 停止</> : <><IconPlay /> 再生</>}
                  </button>
                  <button onClick={downloadAudio}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "10px 18px",
                      background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)",
                      borderRadius: 10, color: "#34d399", fontSize: 13, fontWeight: 500,
                      cursor: "pointer", fontFamily: "inherit",
                    }}>
                    <IconDownload /> WAVダウンロード
                  </button>
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* MODALS */}
      {editingChar && (
        <CharacterEditor
          character={editingChar}
          onSave={saveCharacter}
          onCancel={() => setEditingChar(null)}
          onPreview={previewVoice}
          isPreviewLoading={isPreviewLoading}
        />
      )}
      {showDict && (
        <DictionaryManager
          dictionary={dictionary}
          setDictionary={setDictionary}
          onClose={() => setShowDict(false)}
        />
      )}
    </div>
  );
}
