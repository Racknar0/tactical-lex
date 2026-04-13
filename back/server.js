import express from "express";
import cors from "cors";
import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const PORT = Number(process.env.PORT ?? 3300);
const SUPPORTED_CHAT_MODELS = [
  "gemini-3.1-pro-preview",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite-preview",
];
const DEFAULT_CHAT_MODEL = "gemini-3-flash-preview";
const STATE_PATH = path.join(__dirname, "storage", "app-state.json");
const CHAT_MEMORY_PATH = path.join(__dirname, "storage", "chat-memory.json");
const UPLOADS_PATH = path.join(__dirname, "storage", "uploads");
const MAX_TURNS_PER_SESSION = Number(process.env.CHAT_MAX_TURNS ?? 12);
const MAX_CHAT_SESSIONS = Number(process.env.CHAT_MAX_SESSIONS ?? 200);
const CHAT_QUERY_TIMEOUT_MS = Number(process.env.CHAT_QUERY_TIMEOUT_MS ?? 45000);
const GOOGLE_API_LOGS_ENABLED =
  String(process.env.GOOGLE_API_LOGS ?? "true").toLowerCase() !== "false";
const UPLOAD_MAX_TOKENS_PER_CHUNK = 500;
const UPLOAD_MAX_OVERLAP_TOKENS = 200;
const NO_EVIDENCE_MESSAGE =
  "No tengo suficiente evidencia en el contexto seleccionado para responder esa pregunta.";
const SUPPORTED_CHAT_MODES = [
  {
    id: "estricto",
    nombre: "Estricto",
    descripcion:
      "Solo responde con evidencia recuperada del contexto. Si no hay evidencia, no responde fuera del documento.",
  },
  {
    id: "hibrido",
    nombre: "Hibrido",
    descripcion:
      "Permite conversacion casual (saludos/cortesia) sin contexto, pero preguntas de contenido se resuelven en modo estricto.",
  },
  {
    id: "libre",
    nombre: "Libre con Preferencia de Contexto",
    descripcion:
      "Prioriza el contexto del store, pero si falta evidencia puede responder conocimiento general aclarando que es fuera de contexto.",
  },
];
const DEFAULT_CHAT_MODE = "hibrido";
const STRICT_RAG_INSTRUCTION =
  `Responde SOLO con evidencia recuperada por File Search. Si la evidencia no es suficiente, responde exactamente: ${NO_EVIDENCE_MESSAGE}`;
const HYBRID_SMALL_TALK_INSTRUCTION =
  "Eres un asistente conversacional en espanol. Si el usuario saluda o hace charla casual, responde de forma breve y natural sin forzar busqueda documental.";
const FREE_CONTEXT_PREFERRED_INSTRUCTION =
  "Prioriza responder con evidencia recuperada por File Search. Si no hay evidencia suficiente, puedes responder con conocimiento general, pero aclara explicitamente que la parte no viene del contexto cargado.";
const GENERAL_FAST_INSTRUCTION =
  "Responde en espanol de forma breve y directa. Si la pregunta requiere documento y no hay contexto activo, indicalo claramente.";

const initialState = {
  activeStoreName: null,
  lastIndexedDocumentName: null,
};

const initialChatMemory = {
  sessions: {},
};

async function readState() {
  try {
    const raw = await fs.readFile(STATE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return { ...initialState, ...parsed };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { ...initialState };
    }
    throw error;
  }
}

async function writeState(nextState) {
  await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
  await fs.writeFile(STATE_PATH, JSON.stringify(nextState, null, 2), "utf8");
}

async function readChatMemory() {
  try {
    const raw = await fs.readFile(CHAT_MEMORY_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...initialChatMemory,
      ...parsed,
      sessions: parsed?.sessions ?? {},
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { ...initialChatMemory };
    }
    throw error;
  }
}

async function writeChatMemory(chatMemory) {
  await fs.mkdir(path.dirname(CHAT_MEMORY_PATH), { recursive: true });
  await fs.writeFile(
    CHAT_MEMORY_PATH,
    JSON.stringify(chatMemory, null, 2),
    "utf8"
  );
}

function normalizeSessionId(input) {
  if (typeof input !== "string") {
    return null;
  }

  const cleaned = input.trim();
  if (!cleaned) {
    return null;
  }

  return /^[a-zA-Z0-9_-]{6,128}$/.test(cleaned) ? cleaned : null;
}

function normalizeMode(input) {
  if (typeof input !== "string") {
    return DEFAULT_CHAT_MODE;
  }

  const cleaned = input.trim().toLowerCase();
  const exists = SUPPORTED_CHAT_MODES.some((mode) => mode.id === cleaned);
  return exists ? cleaned : DEFAULT_CHAT_MODE;
}

function isSmallTalkMessage(input) {
  if (typeof input !== "string") {
    return false;
  }

  const text = input.trim().toLowerCase();
  if (!text) {
    return false;
  }

  const smallTalkPattern =
    /^(hola+|buenas|buenos dias|buenas tardes|buenas noches|que tal|como estas|gracias|ok|dale|listo|perfecto|genial|hi|hello|thanks|thank you)[!.?\s]*$/i;

  if (smallTalkPattern.test(text)) {
    return true;
  }

  const hasDocumentIntent =
    /(documento|archivo|pdf|contexto|capitulo|clausula|articulo|seccion|resumen|segun|busca|donde dice|que dice)/i.test(
      text
    );

  if (hasDocumentIntent) {
    return false;
  }

  return text.length <= 24 && !text.includes("?");
}

function classifyQuestionNeedsContext(question) {
  const text = String(question ?? "").trim().toLowerCase();
  const hasQuestionMark = /[?¿]/.test(text);
  const tokenCount = text.split(/\s+/).filter(Boolean).length;
  const hasDocumentSignal =
    /(documento|archivo|pdf|contexto|capitulo|clausula|articulo|seccion|resumen|segun|busca|donde dice|que dice|en el texto|en el contrato|fuente|evidencia)/i.test(
      text
    );
  const conversational = isSmallTalkMessage(text);

  if (hasDocumentSignal) {
    return {
      needsContext: true,
      reason: "senales_documentales",
      conversational,
      tokenCount,
    };
  }

  if (conversational) {
    return {
      needsContext: false,
      reason: "charla_casual",
      conversational,
      tokenCount,
    };
  }

  if (hasQuestionMark || tokenCount >= 10) {
    return {
      needsContext: true,
      reason: "pregunta_informativa",
      conversational,
      tokenCount,
    };
  }

  return {
    needsContext: false,
    reason: "consulta_general_corta",
    conversational,
    tokenCount,
  };
}

function pruneChatMemory(chatMemory) {
  const entries = Object.entries(chatMemory.sessions);
  if (entries.length <= MAX_CHAT_SESSIONS) {
    return chatMemory;
  }

  const sorted = entries.sort((a, b) => {
    const aUpdated = new Date(a[1].updatedAt ?? 0).getTime();
    const bUpdated = new Date(b[1].updatedAt ?? 0).getTime();
    return bUpdated - aUpdated;
  });

  chatMemory.sessions = Object.fromEntries(sorted.slice(0, MAX_CHAT_SESSIONS));
  return chatMemory;
}

function getSessionTurns(chatMemory, sessionId) {
  const session = chatMemory.sessions[sessionId];
  if (!session || !Array.isArray(session.turns)) {
    return [];
  }
  return session.turns;
}

function buildConversationContents(turns, question) {
  const contents = [];

  for (const turn of turns) {
    contents.push({
      role: "user",
      parts: [{ text: turn.user }],
    });
    contents.push({
      role: "model",
      parts: [{ text: turn.assistant }],
    });
  }

  contents.push({
    role: "user",
    parts: [{ text: question }],
  });

  return contents;
}

function getAIClient() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    const error = new Error(
      "Falta la variable de entorno GOOGLE_API_KEY. Agregala en tactical-lex/.env o en el entorno del sistema."
    );
    error.statusCode = 400;
    throw error;
  }

  return new GoogleGenAI({ apiKey });
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getUploadChunkingConfig() {
  const maxTokensPerChunk = Math.max(200, Math.floor(UPLOAD_MAX_TOKENS_PER_CHUNK));
  const maxOverlapTokens = Math.min(
    Math.max(0, Math.floor(UPLOAD_MAX_OVERLAP_TOKENS)),
    maxTokensPerChunk - 1
  );

  return {
    whiteSpaceConfig: {
      maxTokensPerChunk,
      maxOverlapTokens,
    },
  };
}

function clipText(text, maxLength = 180) {
  if (typeof text !== "string") {
    return "";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}

function summarizeContents(contents) {
  if (!Array.isArray(contents)) {
    return [];
  }

  return contents.slice(-6).map((item) => {
    const text = item?.parts?.[0]?.text ?? "";
    return {
      role: item?.role ?? "unknown",
      textPreview: clipText(text, 120),
    };
  });
}

function logGoogleApiCall(operation, payload) {
  if (!GOOGLE_API_LOGS_ENABLED) {
    return;
  }

  const timestamp = new Date().toISOString();
  const safePayload = payload ?? {};
  console.log(
    `[GoogleAPI][${timestamp}] ${operation} -> ${JSON.stringify(safePayload)}`
  );
}

function translateUpstreamError(errorMessage) {
  try {
    const parsed = JSON.parse(errorMessage);
    const upstream = parsed?.error;
    if (!upstream) {
      return null;
    }

    const status = String(upstream.status ?? "");

    if (status === "UNAVAILABLE") {
      return "El servicio de Google esta temporalmente saturado. Reintenta en unos segundos.";
    }

    if (status === "INVALID_ARGUMENT") {
      return "Google rechazo la solicitud por parametros invalidos.";
    }

    if (status === "UNAUTHENTICATED") {
      return "Google rechazo la solicitud por autenticacion invalida. Verifica tu GOOGLE_API_KEY.";
    }

    if (status === "PERMISSION_DENIED") {
      return "Google rechazo la solicitud por falta de permisos para este recurso.";
    }

    if (status === "RESOURCE_EXHAUSTED") {
      return "Google alcanzo el limite de capacidad para esta solicitud. Reintenta en breve.";
    }

    return `Error de Google API (${status || "desconocido"}).`;
  } catch {
    return null;
  }
}

function extractUpstreamStatus(errorMessage) {
  try {
    return String(JSON.parse(errorMessage)?.error?.status ?? "");
  } catch {
    return "";
  }
}

function shouldRetryModelCall(error) {
  const status = extractUpstreamStatus(error?.message ?? "");
  return (
    error?.statusCode === 504 ||
    status === "UNAVAILABLE" ||
    status === "RESOURCE_EXHAUSTED" ||
    status === "DEADLINE_EXCEEDED" ||
    status === "INTERNAL"
  );
}

function buildModelAttemptList(preferredModel, contextRequired) {
  const chain = contextRequired
    ? [
        preferredModel,
        "gemini-3-flash-preview",
        "gemini-3.1-flash-lite-preview",
      ]
    : [preferredModel, "gemini-3.1-flash-lite-preview"];

  return [...new Set(chain)].filter((model) =>
    SUPPORTED_CHAT_MODELS.includes(model)
  );
}

async function generateContentWithFallback(ai, options) {
  const {
    preferredModel,
    contents,
    config,
    sessionId,
    mode,
    contextRequired,
  } = options;

  const attempts = buildModelAttemptList(preferredModel, contextRequired);
  let lastError = null;

  for (const model of attempts) {
    try {
      logGoogleApiCall("models.generateContent.attempt", {
        model,
        mode,
        sessionId,
        contextRequired,
        hasTools: Array.isArray(config?.tools) && config.tools.length > 0,
      });

      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents,
          config,
        }),
        CHAT_QUERY_TIMEOUT_MS,
        `El modelo no respondio dentro de ${CHAT_QUERY_TIMEOUT_MS}ms. Prueba otro modelo o reintenta.`
      );

      return {
        response,
        usedModel: model,
        fallbackUsed: model !== preferredModel,
      };
    } catch (error) {
      const status = extractUpstreamStatus(error?.message ?? "");
      const retryable = shouldRetryModelCall(error);

      logGoogleApiCall("models.generateContent.attempt.error", {
        model,
        mode,
        sessionId,
        status,
        retryable,
        message: clipText(error?.message ?? "", 200),
      });

      lastError = error;
      if (!retryable) {
        break;
      }
    }
  }

  throw lastError ?? new Error("No se pudo obtener respuesta del modelo.");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withTimeout(promise, timeoutMs, timeoutMessage) {
  return await Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error(timeoutMessage);
        error.statusCode = 504;
        reject(error);
      }, timeoutMs);
    }),
  ]);
}

async function waitForOperation(ai, operation, timeoutMs = 180000) {
  const startedAt = Date.now();
  let current = operation;

  while (!current.done) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("Tiempo de espera agotado al finalizar la indexacion.");
    }

    await sleep(2000);
    logGoogleApiCall("operations.get", {
      operationName: current?.name ?? null,
      done: Boolean(current?.done),
    });
    current = await ai.operations.get({ operation: current });
  }

  if (current.error) {
    throw new Error(JSON.stringify(current.error));
  }

  return current;
}

async function listFileSearchStores(ai) {
  logGoogleApiCall("fileSearchStores.list", {
    pageSize: 20,
  });

  const pager = await ai.fileSearchStores.list({
    config: { pageSize: 20 },
  });

  const stores = [];
  for await (const store of pager) {
    stores.push({
      name: store.name,
      displayName: store.displayName ?? null,
      activeDocumentsCount: store.activeDocumentsCount ?? null,
      updateTime: store.updateTime ?? null,
    });

    if (stores.length >= 200) {
      break;
    }
  }

  return stores;
}

async function listDocumentsInStore(ai, storeName) {
  logGoogleApiCall("fileSearchStores.documents.list", {
    parent: storeName,
    pageSize: 20,
  });

  const pager = await ai.fileSearchStores.documents.list({
    parent: storeName,
    config: { pageSize: 20 },
  });

  const documents = [];
  for await (const document of pager) {
    documents.push({
      name: document.name ?? null,
      displayName: document.displayName ?? null,
      state: document.state ?? null,
      sizeBytes: document.sizeBytes ?? null,
      mimeType: document.mimeType ?? null,
      createTime: document.createTime ?? null,
      updateTime: document.updateTime ?? null,
    });

    if (documents.length >= 500) {
      break;
    }
  }

  return documents;
}

function extractGroundingSources(response) {
  const candidate = response.candidates?.[0];
  const chunks = candidate?.groundingMetadata?.groundingChunks ?? [];

  return chunks
    .map((chunk, index) => {
      const ctx = chunk.retrievedContext;
      if (!ctx) {
        return null;
      }

      return {
        index: index + 1,
        title: ctx.title ?? null,
        uri: ctx.uri ?? null,
        fileSearchStore: ctx.fileSearchStore ?? null,
        excerpt: ctx.text ?? null,
      };
    })
    .filter(Boolean);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "35mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    app: "Tactical Lex",
    model: DEFAULT_CHAT_MODEL,
    supportedModels: SUPPORTED_CHAT_MODELS,
  });
});

app.get("/api/state", async (_req, res, next) => {
  try {
    const state = await readState();
    const chatMemory = await readChatMemory();
    const chunkingConfig = getUploadChunkingConfig();
    res.json({
      ok: true,
      state,
      model: DEFAULT_CHAT_MODEL,
      supportedModels: SUPPORTED_CHAT_MODELS,
      defaultChatModel: DEFAULT_CHAT_MODEL,
      supportedChatModes: SUPPORTED_CHAT_MODES,
      defaultChatMode: DEFAULT_CHAT_MODE,
      chat: {
        maxTurnsPerSession: MAX_TURNS_PER_SESSION,
        maxSessions: MAX_CHAT_SESSIONS,
        sessionsInMemory: Object.keys(chatMemory.sessions).length,
      },
      uploadChunking: chunkingConfig.whiteSpaceConfig,
      hasApiKey: Boolean(process.env.GOOGLE_API_KEY),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/chat/session", async (req, res, next) => {
  try {
    const requested = normalizeSessionId(req.body?.sessionId);
    const sessionId = requested ?? randomUUID();

    const chatMemory = await readChatMemory();
    const existingTurns = getSessionTurns(chatMemory, sessionId);

    chatMemory.sessions[sessionId] = {
      sessionId,
      updatedAt: new Date().toISOString(),
      turns: existingTurns.slice(-MAX_TURNS_PER_SESSION),
    };

    await writeChatMemory(pruneChatMemory(chatMemory));

    res.json({
      ok: true,
      sessionId,
      turns: chatMemory.sessions[sessionId].turns,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/chat/session/reset", async (req, res, next) => {
  try {
    const sessionId = normalizeSessionId(req.body?.sessionId);
    if (!sessionId) {
      return res.status(400).json({
        ok: false,
        message: "sessionId es obligatorio.",
      });
    }

    const chatMemory = await readChatMemory();
    delete chatMemory.sessions[sessionId];
    await writeChatMemory(pruneChatMemory(chatMemory));

    res.json({
      ok: true,
      message: "Memoria de sesion limpiada.",
      sessionId,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/stores", async (_req, res, next) => {
  try {
    const ai = getAIClient();
    const state = await readState();
    const stores = await listFileSearchStores(ai);

    res.json({
      ok: true,
      stores,
      selectedStoreName: state.activeStoreName,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/documents", async (req, res, next) => {
  try {
    const ai = getAIClient();
    const state = await readState();
    const requestedStoreName =
      typeof req.query?.storeName === "string" ? req.query.storeName.trim() : "";
    const targetStoreName = requestedStoreName || state.activeStoreName;

    if (!targetStoreName) {
      return res.json({
        ok: true,
        storeName: null,
        documents: [],
        message: "No hay store activo para listar documentos.",
      });
    }

    const documents = await listDocumentsInStore(ai, targetStoreName);

    res.json({
      ok: true,
      storeName: targetStoreName,
      documents,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/document/delete", async (req, res, next) => {
  try {
    const ai = getAIClient();
    const state = await readState();
    const documentName = req.body?.documentName?.trim();

    if (!documentName) {
      return res.status(400).json({
        ok: false,
        message: "documentName es obligatorio.",
      });
    }

    logGoogleApiCall("fileSearchStores.documents.delete", {
      name: documentName,
    });

    await ai.fileSearchStores.documents.delete({
      name: documentName,
    });

    if (state.lastIndexedDocumentName === documentName) {
      state.lastIndexedDocumentName = null;
      await writeState(state);
    }

    res.json({
      ok: true,
      message: "Documento eliminado del store de contexto.",
      deletedDocumentName: documentName,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/store/create", async (req, res, next) => {
  try {
    const ai = getAIClient();
    const displayName =
      req.body?.displayName?.trim() || `tactical-lex-${Date.now()}`;

    logGoogleApiCall("fileSearchStores.create", {
      displayName,
    });

    const store = await ai.fileSearchStores.create({
      config: { displayName },
    });

    const state = await readState();
    state.activeStoreName = store.name;
    await writeState(state);

    res.json({
      ok: true,
      message: "Store de contexto creado y seleccionado.",
      store,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/store/select", async (req, res, next) => {
  try {
    const storeName = req.body?.storeName?.trim();
    if (!storeName) {
      return res.status(400).json({
        ok: false,
        message: "storeName es obligatorio.",
      });
    }

    const ai = getAIClient();
    const stores = await listFileSearchStores(ai);
    const exists = stores.some((store) => store.name === storeName);

    if (!exists) {
      return res.status(404).json({
        ok: false,
        message: "El store seleccionado no existe en la cuenta actual.",
      });
    }

    const state = await readState();
    state.activeStoreName = storeName;
    await writeState(state);

    res.json({
      ok: true,
      message: "Store de contexto activo actualizado.",
      selectedStoreName: storeName,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/store/delete", async (req, res, next) => {
  try {
    const ai = getAIClient();
    const state = await readState();

    const requestedStoreName = req.body?.storeName?.trim();
    const targetStoreName = requestedStoreName || state.activeStoreName;

    if (!targetStoreName) {
      return res.status(400).json({
        ok: false,
        message: "No hay store seleccionado para eliminar.",
      });
    }

    logGoogleApiCall("fileSearchStores.delete", {
      name: targetStoreName,
      force: true,
    });

    await ai.fileSearchStores.delete({
      name: targetStoreName,
      config: { force: true },
    });

    if (state.activeStoreName === targetStoreName) {
      await writeState({ ...initialState });
    }

    res.json({
      ok: true,
      message: "Store de contexto eliminado.",
      deletedStoreName: targetStoreName,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/documents/upload", async (req, res, next) => {
  let tempFilePath = null;

  try {
    const ai = getAIClient();
    const state = await readState();

    if (!state.activeStoreName) {
      return res.status(400).json({
        ok: false,
        message: "Selecciona o crea un store de contexto antes de subir archivos.",
      });
    }

    const fileName = req.body?.fileName?.trim();
    const mimeType = req.body?.mimeType?.trim() || "application/pdf";
    const base64 = req.body?.base64?.trim();

    if (!fileName || !base64) {
      return res.status(400).json({
        ok: false,
        message: "fileName y base64 son obligatorios.",
      });
    }

    const bytes = Buffer.from(base64, "base64");
    const chunkingConfig = getUploadChunkingConfig();
    await fs.mkdir(UPLOADS_PATH, { recursive: true });

    const safeName = sanitizeFileName(fileName);
    tempFilePath = path.join(UPLOADS_PATH, `${Date.now()}-${safeName}`);
    await fs.writeFile(tempFilePath, bytes);

    logGoogleApiCall("fileSearchStores.uploadToFileSearchStore", {
      fileSearchStoreName: state.activeStoreName,
      displayName: fileName,
      mimeType,
      chunkingConfig,
      tempFilePath,
      fileBytes: bytes.length,
    });

    const operation = await ai.fileSearchStores.uploadToFileSearchStore({
      fileSearchStoreName: state.activeStoreName,
      file: tempFilePath,
      config: {
        displayName: fileName,
        mimeType,
        chunkingConfig,
      },
    });

    const doneOperation = await waitForOperation(ai, operation);

    state.lastIndexedDocumentName = doneOperation.response?.documentName ?? fileName;
    await writeState(state);

    res.json({
      ok: true,
      message: "Documento subido e indexado correctamente.",
      operation: doneOperation,
    });
  } catch (error) {
    next(error);
  } finally {
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => undefined);
    }
  }
});

app.post("/api/rag/query", async (req, res, next) => {
  try {
    const ai = getAIClient();
    const state = await readState();
    const requestedSessionId = normalizeSessionId(req.body?.sessionId);
    const sessionId = requestedSessionId ?? randomUUID();
    const requestedModel = req.body?.model?.trim();
    const modelName = requestedModel || DEFAULT_CHAT_MODEL;
    const mode = normalizeMode(req.body?.mode);

    const question = req.body?.question?.trim();
    if (!question) {
      return res.status(400).json({
        ok: false,
        message: "La pregunta no puede estar vacia.",
      });
    }

    if (!SUPPORTED_CHAT_MODELS.includes(modelName)) {
      return res.status(400).json({
        ok: false,
        message: `Modelo no soportado: ${modelName}. Permitidos: ${SUPPORTED_CHAT_MODELS.join(
          ", "
        )}`,
      });
    }

    const chatMemory = await readChatMemory();
    const previousTurns = getSessionTurns(chatMemory, sessionId).slice(
      -MAX_TURNS_PER_SESSION
    );
    const contents = buildConversationContents(previousTurns, question);
    const intent = classifyQuestionNeedsContext(question);
    const contextRequired =
      mode === "estricto" || (mode === "hibrido" && intent.needsContext);
    const useFileSearch =
      Boolean(state.activeStoreName) &&
      (contextRequired || (mode === "libre" && intent.needsContext));

    if (contextRequired && !state.activeStoreName) {
      return res.status(400).json({
        ok: false,
        message: "No hay store activo seleccionado. Ve primero a Boveda de Contexto.",
      });
    }

    logGoogleApiCall("models.generateContent", {
      model: modelName,
      mode,
      sessionId,
      activeStoreName: state.activeStoreName,
      questionPreview: clipText(question, 200),
      previousTurns: previousTurns.length,
      intent,
      messagesSent: contents.length,
      contentsPreview: summarizeContents(contents),
      tool: {
        fileSearchStoreNames:
          useFileSearch && state.activeStoreName ? [state.activeStoreName] : [],
        topK: 8,
      },
    });

    let config;
    if (contextRequired) {
      config = {
        temperature: 0.2,
        systemInstruction: STRICT_RAG_INSTRUCTION,
        tools: useFileSearch
          ? [
              {
                fileSearch: {
                  fileSearchStoreNames: [state.activeStoreName],
                  topK: 8,
                },
              },
            ]
          : undefined,
      };
    } else if (mode === "hibrido") {
      config = {
        temperature: 0.35,
        systemInstruction: HYBRID_SMALL_TALK_INSTRUCTION,
      };
    } else {
      config = state.activeStoreName
        ? {
            temperature: 0.35,
            systemInstruction: FREE_CONTEXT_PREFERRED_INSTRUCTION,
            tools: useFileSearch
              ? [
                  {
                    fileSearch: {
                      fileSearchStoreNames: [state.activeStoreName],
                      topK: 8,
                    },
                  },
                ]
              : undefined,
          }
        : {
            temperature: 0.35,
            systemInstruction: GENERAL_FAST_INSTRUCTION,
          };
    }

    const modelResult = await generateContentWithFallback(ai, {
      preferredModel: modelName,
      contents,
      config,
      sessionId,
      mode,
      contextRequired,
    });

    const response = modelResult.response;

    const sources = extractGroundingSources(response);
    const grounded = sources.length > 0;
    let answer = response.text ?? "(Sin texto de respuesta generado)";

    if (contextRequired) {
      answer = grounded ? answer : NO_EVIDENCE_MESSAGE;
    } else if (mode === "libre" && intent.needsContext && !grounded) {
      answer = `${answer}\n\nNota: no encontre evidencia suficiente en el contexto cargado; esta respuesta puede estar fuera del documento.`;
    }

    const updatedTurns = [
      ...previousTurns,
      {
        user: question,
        assistant: answer,
        grounded,
        timestamp: new Date().toISOString(),
      },
    ].slice(-MAX_TURNS_PER_SESSION);

    chatMemory.sessions[sessionId] = {
      sessionId,
      updatedAt: new Date().toISOString(),
      turns: updatedTurns,
    };

    await writeChatMemory(pruneChatMemory(chatMemory));

    res.json({
      ok: true,
      answer,
      grounded,
      sources,
      activeStoreName: state.activeStoreName,
      sessionId,
      memoryTurns: updatedTurns.length,
      model: modelResult.usedModel,
      fallbackModelUsed: modelResult.fallbackUsed,
      mode,
      modeInfo: SUPPORTED_CHAT_MODES.find((item) => item.id === mode) ?? null,
      route: {
        contextRequired,
        useFileSearch,
        intent,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  const status = error.statusCode || 500;
  const translatedUpstream = translateUpstreamError(error.message);
  res.status(status).json({
    ok: false,
    message: translatedUpstream || error.message || "Error interno",
  });
});

app.listen(PORT, () => {
  console.log(`Tactical Lex ejecutandose en http://localhost:${PORT}`);
});
