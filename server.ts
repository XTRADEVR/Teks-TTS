import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Add it in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

type ChatMode = 'default' | 'research' | 'image' | 'video' | 'diagram';

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

function buildSystemInstruction(mode: ChatMode, modelLabel: string): string {
  const basePersona = [
    'You are Venice, a private, anonymous, helpful assistant.',
    `Active model persona: ${modelLabel}.`,
    'Tone: Direct, fast, helpful, concise like DeepSeek V4.1 Flash. Never lecture. Never say "As an AI".',
    'Language rule: Always reply in the same language the user uses (use natural Indonesian if the user writes in Indonesian).',
    'Privacy rule: You are private and anonymous — never say you store or retain user data.',
  ].join('\n');

  switch (mode) {
    case 'research':
      return `${basePersona}

CAPABILITY ACTIVE: Learn about the World (Deep Agentic Research).
- Conduct thorough research using search grounding when facts, current events, or real-world context are needed.
- Present clear, well-structured findings with concise sections and factual accuracy.`;

    case 'image':
      return `${basePersona}

CAPABILITY ACTIVE: Generate any image.
- You MUST begin your response with the exact format:
[Generating image: {ultra-detailed, 8k, cinematic prompt in English}]
- Enhance the user's concept to be ultra-detailed, 8k, photorealistic or stylized cinematic art with lighting, lens, composition, atmosphere, and texture details.
- Right after the [Generating image: ...] line, provide a concise visual breakdown for Imagen (subject, framing, lighting, color palette, camera settings) in the user's language.`;

    case 'video':
      return `${basePersona}

CAPABILITY ACTIVE: Create AI Video.
- Produce a crisp AI Video Storyboard with numbered scenes (Scene 1, Scene 2, etc.).
- For each scene include: Shot Type & Camera Movement, Visual Action, Audio/Mood cue, and a ready-to-use Video Generation Prompt (cinematic, 4K, fluid motion).`;

    case 'diagram':
      return `${basePersona}

CAPABILITY ACTIVE: Create a Flowchart or Diagram.
- ALWAYS output valid Mermaid.js syntax inside a \`\`\`mermaid ... \`\`\` fenced code block.
- Quote node labels in double quotes if they contain spaces, punctuation, or parentheses, e.g., A["Robot bangun pagi"] --> B["Siapkan susu"].
- Keep diagrams clean, readable, and syntactically valid Mermaid v11/v12 code, followed by a brief 1-2 sentence summary.`;

    default:
      return `${basePersona}

If the user explicitly asks for an image prompt, begin with [Generating image: {ultra-detailed 8k cinematic prompt}] and describe it for Imagen.
If the user explicitly asks for a flowchart or diagram, output valid Mermaid.js syntax inside a \`\`\`mermaid ... \`\`\` code block.
If the user explicitly asks for an AI video, output a structured video storyboard + prompts.`;
  }
}

function extractGeminiError(err: unknown): { status: number; message: string } {
  if (err && typeof err === 'object') {
    const anyErr = err as { status?: number; message?: string };
    const msg = anyErr.message || 'Upstream Gemini request failed.';
    if (msg.includes('GEMINI_API_KEY')) {
      return { status: 500, message: msg };
    }
    if (msg.includes('PERMISSION_DENIED') || anyErr.status === 403) {
      return {
        status: 403,
        message: 'Permission denied. Please verify your GEMINI_API_KEY in Settings > Secrets.',
      };
    }
    if (msg.includes('API_KEY_INVALID') || anyErr.status === 400) {
      return {
        status: 400,
        message: msg,
      };
    }
    if (msg.includes('RESOURCE_EXHAUSTED') || anyErr.status === 429) {
      return {
        status: 429,
        message: 'Rate limit or quota reached. Please retry shortly.',
      };
    }
    return { status: anyErr.status && anyErr.status >= 400 ? anyErr.status : 500, message: msg };
  }
  return { status: 500, message: 'Unexpected server error.' };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const {
        messages,
        mode = 'default',
        modelLabel = 'Kimi K2.5 - Private + Anon',
      } = req.body as {
        messages?: IncomingMessage[];
        mode?: ChatMode;
        modelLabel?: string;
      };

      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'Messages array is required.' });
        return;
      }

      const ai = getAiClient();
      const contents = messages
        .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      if (contents.length === 0) {
        res.status(400).json({ error: 'At least one non-empty message is required.' });
        return;
      }

      const useSearch = mode === 'research';

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction: buildSystemInstruction(mode, modelLabel),
          thinkingConfig: {
            thinkingLevel: mode === 'research' ? ThinkingLevel.HIGH : ThinkingLevel.LOW,
          },
          ...(useSearch ? { tools: [{ googleSearch: {} }] } : {}),
        },
      });

      const text = response.text?.trim() || '';
      const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources = Array.isArray(rawChunks)
        ? rawChunks
            .map((chunk) => chunk?.web)
            .filter((web): web is { uri: string; title?: string } => Boolean(web?.uri))
            .map((web) => ({
              uri: web.uri,
              title: web.title || web.uri,
            }))
        : [];

      res.json({ text, sources });
    } catch (err) {
      const parsed = extractGeminiError(err);
      res.status(parsed.status).json({ error: parsed.message });
    }
  });

  app.post('/api/tts', async (req, res) => {
    try {
      const {
        mode = 'single',
        text,
        voiceName = 'Kore',
        style,
        lines,
      } = req.body as {
        mode?: 'single' | 'multi';
        text?: string;
        voiceName?: string;
        style?: string;
        lines?: Array<{
          speaker: string;
          text: string;
          style?: string;
          voiceName?: string;
        }>;
      };

      const ai = getAiClient();
      const allowedVoices = new Set(['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr']);
      const safeVoice = allowedVoices.has(voiceName) ? voiceName : 'Kore';

      if (mode === 'multi') {
        if (!Array.isArray(lines) || lines.length < 2) {
          res.status(400).json({
            error: 'Dual-speaker mode requires at least two speaker lines.',
          });
          return;
        }

        const cleanLines = lines
          .map((l) => ({
            speaker: (l.speaker || '').trim(),
            text: (l.text || '').trim(),
            style: (l.style || '').trim(),
            voiceName: allowedVoices.has(l.voiceName || '') ? l.voiceName! : 'Kore',
          }))
          .filter((l) => l.speaker && l.text);

        if (cleanLines.length < 2) {
          res.status(400).json({
            error: 'Please provide text and names for both speakers.',
          });
          return;
        }

        // Collect the first 2 distinct speakers for multiSpeakerVoiceConfig
        const distinctSpeakers: Array<{ speaker: string; voiceName: string }> = [];
        for (const line of cleanLines) {
          if (!distinctSpeakers.some((s) => s.speaker === line.speaker)) {
            distinctSpeakers.push({
              speaker: line.speaker,
              voiceName: line.voiceName,
            });
          }
          if (distinctSpeakers.length === 2) break;
        }

        if (distinctSpeakers.length !== 2) {
          res.status(400).json({
            error: 'Multi-speaker TTS requires exactly 2 distinct speaker names.',
          });
          return;
        }

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash-tts',
          contents: [
            {
              role: 'user',
              parts: cleanLines.map((l) => ({
                text: `${l.speaker}: ${l.text}`,
                speechMetadata: {
                  speaker: l.speaker,
                  ...(l.style ? { style: l.style } : {}),
                },
              })),
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: distinctSpeakers.map((s) => ({
                  speaker: s.speaker,
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: s.voiceName },
                  },
                })),
              },
            },
          },
        });

        const base64Audio =
          response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
          res.status(502).json({ error: 'No audio data returned from TTS model.' });
          return;
        }

        res.json({ audioBase64: base64Audio, mimeType: 'audio/wav' });
        return;
      }

      // Single-speaker mode
      const cleanText = (text || '').trim();
      if (!cleanText) {
        res.status(400).json({ error: 'Text is required for Text-to-Speech.' });
        return;
      }

      const cleanStyle = (style || '').trim();

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                ...(cleanStyle ? { speechMetadata: { style: cleanStyle } } : {}),
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: safeVoice },
            },
          },
        },
      });

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        res.status(502).json({ error: 'No audio data returned from TTS model.' });
        return;
      }

      res.json({ audioBase64: base64Audio, mimeType: 'audio/wav' });
    } catch (err) {
      const parsed = extractGeminiError(err);
      res.status(parsed.status).json({ error: parsed.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Venice AI server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
