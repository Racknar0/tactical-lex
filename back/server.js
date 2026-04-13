import express from "express";
import cors from "cors";
import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import {
  IA_DEFAULT_WEIGHT,
  getIAProfileByWeight,
  getPublicIAProfiles,
  getSupportedModelIds,
  getSupportedModelWeights,
  resolveIAProfile,
} from "./configIA.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

function parseTimeoutMs(rawValue, defaultValue) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return defaultValue;
  if (parsed < 0) return defaultValue;
  return Math.floor(parsed);
}

const PORT = Number(process.env.PORT ?? 3300);
const IA_MODEL_PROFILES = getPublicIAProfiles();
const SUPPORTED_CHAT_MODELS = getSupportedModelIds();
const SUPPORTED_MODEL_WEIGHTS = getSupportedModelWeights();
const DEFAULT_MODEL_PROFILE =
  getIAProfileByWeight(IA_DEFAULT_WEIGHT) || IA_MODEL_PROFILES[0];
const DEFAULT_CHAT_MODEL =
  DEFAULT_MODEL_PROFILE?.model || IA_MODEL_PROFILES[0]?.model;
const DEFAULT_CHAT_MODEL_WEIGHT =
  DEFAULT_MODEL_PROFILE?.weight || IA_DEFAULT_WEIGHT;
const STATE_PATH = path.join(__dirname, "storage", "app-state.json");
const CHAT_MEMORY_PATH = path.join(__dirname, "storage", "chat-memory.json");
const UPLOADS_PATH = path.join(__dirname, "storage", "uploads");
const MAX_TURNS_PER_SESSION = Number(process.env.CHAT_MAX_TURNS ?? 25);
const MAX_CHAT_SESSIONS = Number(process.env.CHAT_MAX_SESSIONS ?? 5);
const CHAT_QUERY_TIMEOUT_MS = parseTimeoutMs(
  process.env.CHAT_QUERY_TIMEOUT_MS,
  120000
);
const CASUAL_FAST_TIMEOUT_MS = parseTimeoutMs(
  process.env.CASUAL_FAST_TIMEOUT_MS,
  120000
);
const CASUAL_FAST_MODEL =
  getIAProfileByWeight("ligero")?.model || DEFAULT_CHAT_MODEL;
const INTENT_CLASSIFIER_ENABLED =
  String(process.env.INTENT_CLASSIFIER_ENABLED ?? "true").toLowerCase() !==
  "false";
const INTENT_CLASSIFIER_MODEL =
  resolveIAProfile(process.env.INTENT_CLASSIFIER_MODEL?.trim())?.model ||
  CASUAL_FAST_MODEL;
const INTENT_CLASSIFIER_TIMEOUT_MS = parseTimeoutMs(
  process.env.INTENT_CLASSIFIER_TIMEOUT_MS,
  5000
);
const STRICT_TEMPERATURE = 0.1;
const HYBRID_TEMPERATURE = 0.25;
const FREE_TEMPERATURE = 0.5;
const GOOGLE_API_LOGS_ENABLED =
  String(process.env.GOOGLE_API_LOGS ?? "true").toLowerCase() !== "false";
const ASSISTANT_IDENTITY_MESSAGE =
  "Soy Tactical Lex IA, una IA entrenada para responder sobre temas legales.";
const BASE_IDENTITY_INSTRUCTION =
  "Siempre debes presentarte como Tactical Lex IA, una IA entrenada para responder sobre temas legales. Si el usuario pregunta quien eres, responde explicitamente con esa identidad.";
const UPLOAD_MAX_TOKENS_PER_CHUNK = 500;
const UPLOAD_MAX_OVERLAP_TOKENS = 200;
const NO_EVIDENCE_MESSAGE =
  "No hay evidencia suficiente en el documento o contexto seleccionado para responder esa pregunta.";
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
  `${BASE_IDENTITY_INSTRUCTION} Modo estricto: responde SOLO con evidencia recuperada por File Search. Tono directo, sin saludo ni charla casual. Si la evidencia no es suficiente, responde exactamente: ${NO_EVIDENCE_MESSAGE}`;
const HYBRID_SMALL_TALK_INSTRUCTION =
  `${BASE_IDENTITY_INSTRUCTION} Modo hibrido: si la consulta es casual, responde breve y natural. Si es tecnica/documental, responde de forma rigurosa y sustentada en contexto cuando se active File Search.`;
const FREE_CONTEXT_PREFERRED_INSTRUCTION =
  `${BASE_IDENTITY_INSTRUCTION} Modo libre: prioriza responder con evidencia recuperada por File Search. Si no hay evidencia suficiente, puedes responder con conocimiento general, pero aclara explicitamente que esa parte no viene del contexto cargado.`;
const GENERAL_FAST_INSTRUCTION =
  `${BASE_IDENTITY_INSTRUCTION} Responde en espanol de forma breve y directa. Si la pregunta requiere documento y no hay contexto activo, indicalo claramente.`;
const LEGAL_PETITION_SYSTEM_INSTRUCTION =
  "Eres un abogado administrativo en Colombia. Tu tarea es tomar los hechos informales narrados por el usuario y redactarlos en un lenguaje juridico, formal y respetuoso. Debes consultar el documento adjunto en el File Search (Ley 1437) UNICAMENTE para extraer los articulos que fundamentan el Derecho de Peticion e incluirlos en la respuesta. No inventes leyes.";
const LEGAL_TUTELA_SYSTEM_INSTRUCTION_TEMPLATE =
  "Eres un experto Abogado Constitucionalista en Colombia. Tu tarea es redactar el cuerpo de una Acción de Tutela. Toma los hechos y pretensiones informales del usuario y redáctalos en un lenguaje jurídico, formal, cronológico y respetuoso dirigido a un Juez de la República. Debes consultar el documento adjunto (Decreto 2591) para extraer los fundamentos legales de la procedencia de la tutela. El derecho vulnerado principal es: [insertar derecho_vulnerado].";
const POLICE_REPORT_SYSTEM_INSTRUCTION =
  "Eres un oficial de alto rango de la Policía Nacional de Colombia, experto en redacción documental institucional y militar. Tu tarea es tomar el relato informal de un subalterno y transformarlo en un informe de policía impecable, objetivo, cronológico, en tercera persona o primera persona formal, usando terminología policial adecuada (ej: 'sujeto', 'indiciado', 'procedimiento policial', 'cuadrante'). El tono debe ser altamente respetuoso, típicamente dirigido a un superior.";
const FPJ5_CAPTURE_SYSTEM_INSTRUCTION =
  "Eres un experto Investigador de Policía Judicial (SIJIN) en Colombia. Tu tarea es tomar el relato informal de un policía de vigilancia y transformarlo en el relato de los hechos para un Formato FPJ-5 (Captura en Flagrancia). Redacta en tercera persona, usando tiempo pasado, de forma estrictamente cronológica y descriptiva. Usa lenguaje técnico penal (ej: 'indiciado', 'elemento material probatorio', 'voces de auxilio', 'registro a persona').";

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

function resolveRequestedModelSelection(inputValue) {
  const raw = typeof inputValue === "string" ? inputValue.trim() : "";
  if (!raw) {
    return {
      ok: true,
      requested: "",
      profile: DEFAULT_MODEL_PROFILE,
    };
  }

  const profile = resolveIAProfile(raw);
  if (!profile) {
    return {
      ok: false,
      requested: raw,
      profile: null,
    };
  }

  return {
    ok: true,
    requested: raw,
    profile,
  };
}

function normalizeForIntent(input) {
  return String(input ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function asksForAssistantIdentity(question) {
  const text = normalizeForIntent(question);
  if (!text) return false;

  return /\b(quien eres|que eres|como te llamas|identificate|tu nombre)\b/i.test(
    text
  );
}

function isSmallTalkMessage(input) {
  const text = normalizeForIntent(input);
  if (!text) {
    return false;
  }

  const smallTalkPattern =
    /^(hola+|buenas|buenos dias|buenas tardes|buenas noches|que tal|como estas|gracias|ok|dale|listo|perfecto|genial|hi|hello|thanks|thank you|buen dia)[!.?\s]*$/i;

  if (smallTalkPattern.test(text)) {
    return true;
  }

  const hasDocumentIntent =
    /(documento|archivo|pdf|contexto|capitulo|clausula|articulo|seccion|resumen|segun|busca|donde dice|que dice|ley|decreto|norma|fpj|tutela)/i.test(
      text
    );

  if (hasDocumentIntent) {
    return false;
  }

  return text.length <= 24 && !text.includes("?");
}

function phaseOneFastFilters(question) {
  const raw = String(question ?? "").trim();
  const text = normalizeForIntent(raw);
  const tokenCount = text.split(/\s+/).filter(Boolean).length;
  const hasQuestionMark = /[?¿]/.test(raw);
  const conversational = isSmallTalkMessage(text);

  if (conversational && tokenCount <= 6 && !hasQuestionMark) {
    return {
      needsContext: false,
      conversational: true,
      reason: "fase_1_cortesia",
      confidence: "alta",
      phase: "fase_1",
      uncertain: false,
      tokenCount,
      hasQuestionMark,
    };
  }

  if (tokenCount <= 2 && !hasQuestionMark) {
    return {
      needsContext: false,
      conversational: true,
      reason: "fase_1_mensaje_muy_corto",
      confidence: "alta",
      phase: "fase_1",
      uncertain: false,
      tokenCount,
      hasQuestionMark,
    };
  }

  return {
    needsContext: false,
    conversational,
    reason: "fase_1_sin_decision",
    confidence: "baja",
    phase: "fase_1",
    uncertain: true,
    tokenCount,
    hasQuestionMark,
  };
}

function phaseTwoDocumentTriggers(question, baseIntent) {
  const text = normalizeForIntent(question);
  const hasDocumentSignal =
    /(documento|archivo|pdf|contexto|capitulo|clausula|articulo|seccion|resumen|segun|busca|donde dice|que dice|en el texto|en el contrato|fuente|evidencia|pagina|manual|norma|ley|decreto|jurisprudencia|sentencia|codigo|fpj|captura|tutela|derecho de peticion)/i.test(
      text
    );
  const hasActionSignal =
    /(resum|explic|analiz|cita|extrae|redact|compar|interpret|fundament|pasos|procedimiento|llenar|diligenciar|seccion|apartado|art\.?\s*\d+)/i.test(
      text
    );

  if (hasDocumentSignal || hasActionSignal) {
    return {
      ...baseIntent,
      needsContext: true,
      conversational: false,
      reason: hasDocumentSignal
        ? "fase_2_gatillo_documental"
        : "fase_2_gatillo_accion_tecnica",
      confidence: "alta",
      phase: "fase_2",
      uncertain: false,
      hasDocumentSignal,
      hasActionSignal,
    };
  }

  if (baseIntent.hasQuestionMark && baseIntent.tokenCount >= 10) {
    return {
      ...baseIntent,
      needsContext: true,
      conversational: false,
      reason: "fase_2_pregunta_informativa",
      confidence: "media",
      phase: "fase_2",
      uncertain: false,
      hasDocumentSignal,
      hasActionSignal,
    };
  }

  return {
    ...baseIntent,
    reason: "fase_2_ambiguo",
    confidence: "baja",
    phase: "fase_2",
    uncertain: true,
    hasDocumentSignal,
    hasActionSignal,
  };
}

async function classifyIntentWithMicroModel(ai, question) {
  const prompt = `Analiza la intencion del siguiente mensaje del usuario y responde SOLO JSON valido.\n\nMensaje: "${String(
    question ?? ""
  ).replace(/"/g, '\\"')}"\n\nReglas:\n- needsContext=true si para responder bien hay que consultar documentos legales o evidencia del contexto local.\n- conversational=true si es saludo/cortesia/charla casual.\n- confidence debe ser: alta, media o baja.\n\nFormato JSON exacto:\n{\n  "needsContext": true|false,\n  "conversational": true|false,\n  "confidence": "alta|media|baja",\n  "reason": "texto_corto"\n}`;

  const response = await withTimeout(
    ai.models.generateContent({
      model: INTENT_CLASSIFIER_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            needsContext: { type: "BOOLEAN" },
            conversational: { type: "BOOLEAN" },
            confidence: { type: "STRING" },
            reason: { type: "STRING" },
          },
          required: ["needsContext", "conversational"],
        },
      },
    }),
    INTENT_CLASSIFIER_TIMEOUT_MS,
    `El clasificador de intencion excedio ${INTENT_CLASSIFIER_TIMEOUT_MS}ms.`
  );

  const parsed = extractJsonObjectFromText(response.text);
  const confidenceRaw = String(parsed?.confidence ?? "media").toLowerCase();
  const confidence = ["alta", "media", "baja"].includes(confidenceRaw)
    ? confidenceRaw
    : "media";

  return {
    needsContext: Boolean(parsed?.needsContext),
    conversational: Boolean(parsed?.conversational),
    confidence,
    reason: String(parsed?.reason ?? "fase_3_micro_clasificador"),
    phase: "fase_3",
    uncertain: false,
  };
}

async function classifyQuestionNeedsContext(ai, question, mode) {
  if (mode === "estricto") {
    return {
      needsContext: true,
      conversational: false,
      reason: "modo_estricto",
      confidence: "alta",
      phase: "modo",
      uncertain: false,
      classifierUsed: false,
      lane: "pesado",
    };
  }

  const phaseOne = phaseOneFastFilters(question);
  const phaseTwo = phaseTwoDocumentTriggers(question, phaseOne);

  if (!phaseTwo.uncertain || !INTENT_CLASSIFIER_ENABLED) {
    return {
      ...phaseTwo,
      classifierUsed: false,
      lane: phaseTwo.needsContext ? "pesado" : "rapido",
    };
  }

  try {
    const micro = await classifyIntentWithMicroModel(ai, question);
    return {
      ...phaseTwo,
      ...micro,
      classifierUsed: true,
      lane: micro.needsContext ? "pesado" : "rapido",
    };
  } catch (error) {
    logGoogleApiCall("intent.classifier.error", {
      model: INTENT_CLASSIFIER_MODEL,
      message: clipText(error?.message ?? "", 180),
    });

    return {
      ...phaseTwo,
      classifierUsed: false,
      lane: phaseTwo.needsContext ? "pesado" : "rapido",
      reason: "fase_3_fallback_reglas",
    };
  }
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

function generateSessionTitle(question) {
  const text = String(question ?? "").trim();
  if (!text) return "Nueva conversación";
  const words = text.split(/\s+/).slice(0, 6).join(" ");
  return words.length > 40 ? words.slice(0, 40) + "..." : words;
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

function enforceAssistantIdentity(answer, question) {
  if (typeof answer !== "string" || !answer.trim()) {
    return ASSISTANT_IDENTITY_MESSAGE;
  }

  if (/tactical\s*lex\s*ia/i.test(answer)) {
    return answer;
  }

  if (!asksForAssistantIdentity(question)) {
    return answer;
  }

  return `${ASSISTANT_IDENTITY_MESSAGE}\n\n${answer}`;
}

function extractJsonObjectFromText(text) {
  const raw = String(text ?? "").trim();
  if (!raw) {
    throw new Error("Gemini devolvio una respuesta vacia.");
  }

  const fencedMatch = raw.match(/```json\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch?.[1]?.trim() || raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  const jsonSlice =
    start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;

  return JSON.parse(jsonSlice);
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
  const preferredProfile =
    resolveIAProfile(preferredModel) || DEFAULT_MODEL_PROFILE;
  const balancedModel =
    getIAProfileByWeight("equilibrado")?.model || DEFAULT_CHAT_MODEL;
  const lightweightModel =
    getIAProfileByWeight("ligero")?.model || DEFAULT_CHAT_MODEL;

  const chain = contextRequired
    ? [preferredProfile.model, balancedModel, lightweightModel]
    : [preferredProfile.model, lightweightModel];

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
    timeoutMs = CHAT_QUERY_TIMEOUT_MS,
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
        timeoutMs,
        `El modelo no respondio dentro de ${timeoutMs}ms. Prueba otro modelo o reintenta.`
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
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return await promise;
  }

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
    modelWeight: DEFAULT_CHAT_MODEL_WEIGHT,
    supportedModels: SUPPORTED_MODEL_WEIGHTS,
    supportedModelIds: SUPPORTED_CHAT_MODELS,
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
      modelWeight: DEFAULT_CHAT_MODEL_WEIGHT,
      supportedModels: SUPPORTED_MODEL_WEIGHTS,
      defaultChatModel: DEFAULT_CHAT_MODEL_WEIGHT,
      supportedModelIds: SUPPORTED_CHAT_MODELS,
      defaultChatModelId: DEFAULT_CHAT_MODEL,
      supportedModelProfiles: IA_MODEL_PROFILES,
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

app.get("/api/chat/sessions", async (_req, res, next) => {
  try {
    const chatMemory = await readChatMemory();
    const sessions = Object.values(chatMemory.sessions)
      .map((s) => ({
        sessionId: s.sessionId,
        title: s.title || "Nueva conversación",
        updatedAt: s.updatedAt,
        turnsCount: Array.isArray(s.turns) ? s.turns.length : 0,
      }))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    res.json({ ok: true, sessions });
  } catch (error) {
    next(error);
  }
});

app.post("/api/chat/session/new", async (_req, res, next) => {
  try {
    const sessionId = randomUUID();
    const chatMemory = await readChatMemory();

    chatMemory.sessions[sessionId] = {
      sessionId,
      title: "Nueva conversación",
      updatedAt: new Date().toISOString(),
      turns: [],
    };

    await writeChatMemory(pruneChatMemory(chatMemory));

    res.json({
      ok: true,
      sessionId,
      title: "Nueva conversación",
      turns: [],
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/chat/session/switch", async (req, res, next) => {
  try {
    const sessionId = normalizeSessionId(req.body?.sessionId);
    if (!sessionId) {
      return res.status(400).json({
        ok: false,
        message: "sessionId es obligatorio.",
      });
    }

    const chatMemory = await readChatMemory();
    const session = chatMemory.sessions[sessionId];

    if (!session) {
      return res.status(404).json({
        ok: false,
        message: "Sesión no encontrada.",
      });
    }

    res.json({
      ok: true,
      sessionId: session.sessionId,
      title: session.title || "Nueva conversación",
      turns: session.turns || [],
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

app.post("/api/generar-peticion", async (req, res) => {
  try {
    const {
      nombres,
      cedula,
      entidad,
      objeto,
      hechos,
      model,
      tipoDocumento,
      direccionNotificacion,
      correoElectronico,
      relacionDocumentos,
    } = req.body ?? {};

    if (!nombres || !cedula || !entidad || !objeto || !hechos) {
      return res.status(400).json({
        ok: false,
        message:
          "Faltan campos obligatorios: nombres, cedula, entidad, objeto y hechos.",
      });
    }

    const modelSelection = resolveRequestedModelSelection(model);
    if (!modelSelection.ok) {
      return res.status(400).json({
        ok: false,
        message: `Perfil/modelo no soportado: ${modelSelection.requested}. Permitidos: ${SUPPORTED_MODEL_WEIGHTS.join(
          ", "
        )}.`,
      });
    }
    const selectedModelProfile = modelSelection.profile;
    const selectedModel = selectedModelProfile.model;

    const state = await readState();
    const storeId = String(state?.activeStoreName ?? "").trim();
    if (!storeId) {
      return res.status(400).json({
        ok: false,
        message:
          "No hay Bóveda de Contexto activa. Selecciona una en Bóveda de Contexto y reintenta.",
      });
    }

    const ai = getAIClient();

    const prompt = [
      "Redacta insumos para un Derecho de Peticion en Colombia con salida JSON estricto.",
      "Debes devolver exactamente dos llaves: hechos_juridicos y fundamentos_de_derecho.",
      "No agregues llaves extra, no devuelvas markdown.",
      "",
      "Datos del solicitante:",
      `- Nombres y apellidos: ${String(nombres).trim()}`,
      `- Tipo de documento: ${String(tipoDocumento || "Cédula de Ciudadanía").trim()}`,
      `- Número de documento: ${String(cedula).trim()}`,
      `- Dirección de notificación: ${String(direccionNotificacion || "No informada").trim()}`,
      `- Correo electrónico: ${String(correoElectronico || "No informado").trim()}`,
      "",
      "Datos de la entidad:",
      `- Entidad: ${String(entidad).trim()}`,
      "",
      "Petición del usuario:",
      `- Objeto de la petición: ${String(objeto).trim()}`,
      `- Hechos (informales): ${String(hechos).trim()}`,
      `- Relación de documentos: ${String(relacionDocumentos || "Sin anexos reportados").trim()}`,
      "",
      "Formato obligatorio:",
      '{"hechos_juridicos":"...","fundamentos_de_derecho":"..."}',
    ].join("\n");

    logGoogleApiCall("models.generateContent.legalPetition", {
      model: selectedModel,
      modelWeight: selectedModelProfile.weight,
      storeId,
      entidad: clipText(String(entidad), 80),
      objeto: clipText(String(objeto), 120),
    });

    const response = await withTimeout(
      ai.models.generateContent({
        model: selectedModel,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          temperature: 0.2,
          systemInstruction: LEGAL_PETITION_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          tools: [
            {
              fileSearch: {
                fileSearchStoreNames: [storeId],
                topK: 8,
              },
            },
          ],
        },
      }),
      CHAT_QUERY_TIMEOUT_MS,
      `Gemini no respondio dentro de ${CHAT_QUERY_TIMEOUT_MS}ms para generar el documento.`
    );

    const parsed = extractJsonObjectFromText(response.text);
    const result = {
      hechos_juridicos: String(parsed?.hechos_juridicos ?? "").trim(),
      fundamentos_de_derecho: String(parsed?.fundamentos_de_derecho ?? "").trim(),
    };

    if (!result.hechos_juridicos || !result.fundamentos_de_derecho) {
      throw new Error(
        "Gemini no devolvio el JSON esperado con hechos_juridicos y fundamentos_de_derecho."
      );
    }

    return res.json({
      ok: true,
      model: selectedModel,
      modelWeight: selectedModelProfile.weight,
      modelHumanName: selectedModelProfile.human_name,
      data: result,
    });
  } catch (error) {
    console.error("[generar-peticion]", error);
    return res.status(500).json({
      ok: false,
      message:
        "No se pudo generar el Derecho de Petición con Gemini/File Search. Verifica la Bóveda activa y reintenta.",
      detail: error?.message || "Fallo desconocido.",
    });
  }
});

app.post("/api/generar-tutela", async (req, res) => {
  try {
    const {
      nombres,
      cedula,
      entidad_accionada,
      derecho_vulnerado,
      hechos,
      pretension,
      model,
      tipoDocumento,
      direccionNotificacion,
      correoElectronico,
      relacionPruebas,
    } = req.body ?? {};

    if (
      !nombres ||
      !cedula ||
      !entidad_accionada ||
      !derecho_vulnerado ||
      !hechos ||
      !pretension
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "Faltan campos obligatorios: nombres, cedula, entidad_accionada, derecho_vulnerado, hechos y pretension.",
      });
    }

    const modelSelection = resolveRequestedModelSelection(model);
    if (!modelSelection.ok) {
      return res.status(400).json({
        ok: false,
        message: `Perfil/modelo no soportado: ${modelSelection.requested}. Permitidos: ${SUPPORTED_MODEL_WEIGHTS.join(
          ", "
        )}.`,
      });
    }
    const selectedModelProfile = modelSelection.profile;
    const selectedModel = selectedModelProfile.model;

    const state = await readState();
    const storeId = String(state?.activeStoreName ?? "").trim();
    if (!storeId) {
      return res.status(400).json({
        ok: false,
        message:
          "No hay Bóveda de Contexto activa. Selecciona una en Bóveda de Contexto y reintenta.",
      });
    }

    const ai = getAIClient();
    const tutelaSystemInstruction =
      LEGAL_TUTELA_SYSTEM_INSTRUCTION_TEMPLATE.replace(
        "[insertar derecho_vulnerado]",
        String(derecho_vulnerado).trim()
      );

    const prompt = [
      "Redacta insumos para una Acción de Tutela en Colombia con salida JSON estricto.",
      "Debes devolver exactamente tres llaves: hechos_juridicos, pretensiones_juridicas y fundamentos_de_derecho.",
      "No agregues llaves extra, no devuelvas markdown.",
      "Los hechos juridicos deben estar enumerados (1., 2., 3...).",
      "Las pretensiones juridicas deben convertirse en ordenes claras que puede impartir un juez.",
      "Los fundamentos de derecho deben citar normas constitucionales y del Decreto 2591 aplicables al caso.",
      "",
      "Datos del accionante:",
      `- Nombres y apellidos: ${String(nombres).trim()}`,
      `- Tipo de documento: ${String(tipoDocumento || "Cédula de Ciudadanía").trim()}`,
      `- Número de documento: ${String(cedula).trim()}`,
      `- Dirección de notificación: ${String(direccionNotificacion || "No informada").trim()}`,
      `- Correo electrónico: ${String(correoElectronico || "No informado").trim()}`,
      "",
      "Datos de la entidad accionada:",
      `- Entidad accionada: ${String(entidad_accionada).trim()}`,
      "",
      "Base del caso:",
      `- Derecho fundamental vulnerado: ${String(derecho_vulnerado).trim()}`,
      `- Hechos (informales): ${String(hechos).trim()}`,
      `- Pretensión del accionante (informal): ${String(pretension).trim()}`,
      `- Relación de pruebas: ${String(relacionPruebas || "Sin anexos reportados").trim()}`,
      "",
      "Formato obligatorio:",
      '{"hechos_juridicos":"...","pretensiones_juridicas":"...","fundamentos_de_derecho":"..."}',
    ].join("\n");

    logGoogleApiCall("models.generateContent.legalTutela", {
      model: selectedModel,
      modelWeight: selectedModelProfile.weight,
      storeId,
      entidadAccionada: clipText(String(entidad_accionada), 80),
      derechoVulnerado: clipText(String(derecho_vulnerado), 80),
    });

    const response = await withTimeout(
      ai.models.generateContent({
        model: selectedModel,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          temperature: 0.2,
          systemInstruction: tutelaSystemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              hechos_juridicos: { type: "STRING" },
              pretensiones_juridicas: { type: "STRING" },
              fundamentos_de_derecho: { type: "STRING" },
            },
            required: [
              "hechos_juridicos",
              "pretensiones_juridicas",
              "fundamentos_de_derecho",
            ],
          },
          tools: [
            {
              fileSearch: {
                fileSearchStoreNames: [storeId],
                topK: 8,
              },
            },
          ],
        },
      }),
      CHAT_QUERY_TIMEOUT_MS,
      `Gemini no respondio dentro de ${CHAT_QUERY_TIMEOUT_MS}ms para generar la tutela.`
    );

    const parsed = extractJsonObjectFromText(response.text);
    const result = {
      hechos_juridicos: String(parsed?.hechos_juridicos ?? "").trim(),
      pretensiones_juridicas: String(parsed?.pretensiones_juridicas ?? "").trim(),
      fundamentos_de_derecho: String(parsed?.fundamentos_de_derecho ?? "").trim(),
    };

    if (
      !result.hechos_juridicos ||
      !result.pretensiones_juridicas ||
      !result.fundamentos_de_derecho
    ) {
      throw new Error(
        "Gemini no devolvio el JSON esperado con hechos_juridicos, pretensiones_juridicas y fundamentos_de_derecho."
      );
    }

    return res.json({
      ok: true,
      model: selectedModel,
      modelWeight: selectedModelProfile.weight,
      modelHumanName: selectedModelProfile.human_name,
      data: result,
    });
  } catch (error) {
    console.error("[generar-tutela]", error);
    return res.status(500).json({
      ok: false,
      message:
        "No se pudo generar la Acción de Tutela con Gemini/File Search. Verifica la Bóveda activa y reintenta.",
      detail: error?.message || "Fallo desconocido.",
    });
  }
});

app.post("/api/generar-informe-policia", async (req, res) => {
  try {
    const {
      grado,
      nombres,
      unidad,
      fecha_hora,
      lugar,
      relato,
      model,
    } = req.body ?? {};

    if (!grado || !nombres || !unidad || !fecha_hora || !lugar || !relato) {
      return res.status(400).json({
        ok: false,
        message:
          "Faltan campos obligatorios: grado, nombres, unidad, fecha_hora, lugar y relato.",
      });
    }

    const modelSelection = resolveRequestedModelSelection(model);
    if (!modelSelection.ok) {
      return res.status(400).json({
        ok: false,
        message: `Perfil/modelo no soportado: ${modelSelection.requested}. Permitidos: ${SUPPORTED_MODEL_WEIGHTS.join(
          ", "
        )}.`,
      });
    }
    const selectedModelProfile = modelSelection.profile;
    const selectedModel = selectedModelProfile.model;

    const ai = getAIClient();

    const prompt = [
      "Redacta un informe de novedad policial con salida JSON estricto.",
      "Debes devolver exactamente dos llaves: asunto y cuerpo_informe.",
      "No agregues llaves extra, no devuelvas markdown.",
      "",
      "Datos del uniformado:",
      `- Grado: ${String(grado).trim()}`,
      `- Nombres y apellidos: ${String(nombres).trim()}`,
      `- Unidad/cuadrante: ${String(unidad).trim()}`,
      "",
      "Datos de la novedad:",
      `- Fecha y hora: ${String(fecha_hora).trim()}`,
      `- Lugar: ${String(lugar).trim()}`,
      `- Relato informal: ${String(relato).trim()}`,
      "",
      "Formato obligatorio:",
      '{"asunto":"...","cuerpo_informe":"..."}',
    ].join("\n");

    logGoogleApiCall("models.generateContent.policeReport", {
      model: selectedModel,
      modelWeight: selectedModelProfile.weight,
      unidad: clipText(String(unidad), 80),
      lugar: clipText(String(lugar), 100),
    });

    const response = await withTimeout(
      ai.models.generateContent({
        model: selectedModel,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          temperature: 0.2,
          systemInstruction: POLICE_REPORT_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              asunto: { type: "STRING" },
              cuerpo_informe: { type: "STRING" },
            },
            required: ["asunto", "cuerpo_informe"],
          },
        },
      }),
      CHAT_QUERY_TIMEOUT_MS,
      `Gemini no respondio dentro de ${CHAT_QUERY_TIMEOUT_MS}ms para generar el informe policial.`
    );

    const parsed = extractJsonObjectFromText(response.text);
    const result = {
      asunto: String(parsed?.asunto ?? "").trim(),
      cuerpo_informe: String(parsed?.cuerpo_informe ?? "").trim(),
    };

    if (!result.asunto || !result.cuerpo_informe) {
      throw new Error(
        "Gemini no devolvio el JSON esperado con asunto y cuerpo_informe."
      );
    }

    return res.json({
      ok: true,
      model: selectedModel,
      modelWeight: selectedModelProfile.weight,
      modelHumanName: selectedModelProfile.human_name,
      data: result,
    });
  } catch (error) {
    console.error("[generar-informe-policia]", error);
    return res.status(500).json({
      ok: false,
      message:
        "No se pudo generar el Informe de Novedad Policial. Reintenta en unos segundos.",
      detail: error?.message || "Fallo desconocido.",
    });
  }
});

app.post("/api/generar-captura", async (req, res) => {
  try {
    const {
      capturador,
      unidad,
      indiciado,
      presunto_delito,
      lugar_fecha_hora,
      relato,
      model,
    } = req.body ?? {};

    if (
      !capturador ||
      !unidad ||
      !indiciado ||
      !presunto_delito ||
      !lugar_fecha_hora ||
      !relato
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "Faltan campos obligatorios: capturador, unidad, indiciado, presunto_delito, lugar_fecha_hora y relato.",
      });
    }

    const modelSelection = resolveRequestedModelSelection(model);
    if (!modelSelection.ok) {
      return res.status(400).json({
        ok: false,
        message: `Perfil/modelo no soportado: ${modelSelection.requested}. Permitidos: ${SUPPORTED_MODEL_WEIGHTS.join(
          ", "
        )}.`,
      });
    }
    const selectedModelProfile = modelSelection.profile;
    const selectedModel = selectedModelProfile.model;

    const ai = getAIClient();

    const prompt = [
      "Redacta un texto técnico para Formato FPJ-5 (Captura en Flagrancia) con salida JSON estricto.",
      "Debes devolver exactamente una llave: relato_fpj5.",
      "No agregues llaves extra, no devuelvas markdown.",
      "",
      "Datos del procedimiento:",
      `- Capturador (grado y nombres): ${String(capturador).trim()}`,
      `- Unidad/cuadrante: ${String(unidad).trim()}`,
      `- Indiciado: ${String(indiciado).trim()}`,
      `- Presunto delito: ${String(presunto_delito).trim()}`,
      `- Lugar, fecha y hora: ${String(lugar_fecha_hora).trim()}`,
      `- Relato informal de captura: ${String(relato).trim()}`,
      "",
      "Formato obligatorio:",
      '{"relato_fpj5":"..."}',
    ].join("\n");

    logGoogleApiCall("models.generateContent.captureFpj5", {
      model: selectedModel,
      modelWeight: selectedModelProfile.weight,
      unidad: clipText(String(unidad), 80),
      presuntoDelito: clipText(String(presunto_delito), 80),
    });

    const response = await withTimeout(
      ai.models.generateContent({
        model: selectedModel,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          temperature: 0.2,
          systemInstruction: FPJ5_CAPTURE_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              relato_fpj5: { type: "STRING" },
            },
            required: ["relato_fpj5"],
          },
        },
      }),
      CHAT_QUERY_TIMEOUT_MS,
      `Gemini no respondio dentro de ${CHAT_QUERY_TIMEOUT_MS}ms para generar la captura.`
    );

    const parsed = extractJsonObjectFromText(response.text);
    const result = {
      relato_fpj5: String(parsed?.relato_fpj5 ?? "").trim(),
    };

    if (!result.relato_fpj5) {
      throw new Error("Gemini no devolvio el JSON esperado con relato_fpj5.");
    }

    return res.json({
      ok: true,
      model: selectedModel,
      modelWeight: selectedModelProfile.weight,
      modelHumanName: selectedModelProfile.human_name,
      data: result,
    });
  } catch (error) {
    console.error("[generar-captura]", error);
    return res.status(500).json({
      ok: false,
      message:
        "No se pudo generar el relato técnico de captura FPJ-5. Reintenta en unos segundos.",
      detail: error?.message || "Fallo desconocido.",
    });
  }
});

app.post("/api/rag/query", async (req, res, next) => {
  try {
    const ai = getAIClient();
    const state = await readState();
    const requestedSessionId = normalizeSessionId(req.body?.sessionId);
    const sessionId = requestedSessionId ?? randomUUID();
    const modelSelection = resolveRequestedModelSelection(req.body?.model);
    if (!modelSelection.ok) {
      return res.status(400).json({
        ok: false,
        message: `Perfil/modelo no soportado: ${modelSelection.requested}. Permitidos: ${SUPPORTED_MODEL_WEIGHTS.join(
          ", "
        )}.`,
      });
    }
    const selectedModelProfile = modelSelection.profile;
    const modelName = selectedModelProfile.model;
    const mode = normalizeMode(req.body?.mode);

    const question = req.body?.question?.trim();
    if (!question) {
      return res.status(400).json({
        ok: false,
        message: "La pregunta no puede estar vacia.",
      });
    }

    const chatMemory = await readChatMemory();
    const previousTurns = getSessionTurns(chatMemory, sessionId).slice(
      -MAX_TURNS_PER_SESSION
    );
    const contents = buildConversationContents(previousTurns, question);
    const intent = await classifyQuestionNeedsContext(ai, question, mode);
    const contextRequired =
      mode === "estricto" || (mode === "hibrido" && intent.needsContext);
    const useFileSearch =
      Boolean(state.activeStoreName) &&
      (contextRequired || (mode === "libre" && intent.needsContext));

    // Fast-path: casual messages in hybrid/libre skip heavy models
    const isCasualFastPath =
      mode !== "estricto" &&
      intent.lane === "rapido" &&
      !intent.needsContext &&
      intent.conversational;
    const effectiveModel = isCasualFastPath ? CASUAL_FAST_MODEL : modelName;
    const effectiveTimeout = isCasualFastPath
      ? CASUAL_FAST_TIMEOUT_MS
      : CHAT_QUERY_TIMEOUT_MS;

    if (contextRequired && !state.activeStoreName) {
      return res.status(400).json({
        ok: false,
        message: "No hay store activo seleccionado. Ve primero a Boveda de Contexto.",
      });
    }

    logGoogleApiCall("models.generateContent", {
      model: effectiveModel,
      selectedModelWeight: selectedModelProfile.weight,
      mode,
      sessionId,
      activeStoreName: state.activeStoreName,
      questionPreview: clipText(question, 200),
      previousTurns: previousTurns.length,
      intent,
      isCasualFastPath,
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
        temperature: STRICT_TEMPERATURE,
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
    } else if (isCasualFastPath) {
      // Fast casual: no file search, conversational tone
      config = {
        temperature: HYBRID_TEMPERATURE,
        systemInstruction: HYBRID_SMALL_TALK_INSTRUCTION,
      };
    } else if (mode === "hibrido") {
      config = {
        temperature: HYBRID_TEMPERATURE,
        systemInstruction: HYBRID_SMALL_TALK_INSTRUCTION,
      };
    } else {
      config = state.activeStoreName
        ? {
            temperature: FREE_TEMPERATURE,
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
              temperature: FREE_TEMPERATURE,
            systemInstruction: GENERAL_FAST_INSTRUCTION,
          };
    }

    const modelResult = await generateContentWithFallback(ai, {
      preferredModel: effectiveModel,
      contents,
      config,
      sessionId,
      mode,
      contextRequired,
      timeoutMs: effectiveTimeout,
    });

    const response = modelResult.response;

    const sources = extractGroundingSources(response);
    const grounded = sources.length > 0;
    let answer = response.text ?? "(Sin texto de respuesta generado)";

    if (contextRequired) {
      answer = grounded ? answer : NO_EVIDENCE_MESSAGE;
    } else if (mode === "libre" && intent.needsContext && !grounded) {
      answer = `${answer}\n\nAdvertencia: esta parte no proviene del documento cargado; se respondio con conocimiento general.`;
    }

    answer = enforceAssistantIdentity(answer, question);
    const usedModelProfile = resolveIAProfile(modelResult.usedModel);

    const updatedTurns = [
      ...previousTurns,
      {
        user: question,
        assistant: answer,
        grounded,
        model: modelResult.usedModel,
        selectedModelWeight: selectedModelProfile.weight,
        usedModelWeight: usedModelProfile?.weight ?? null,
        mode,
        useFileSearch,
        contextRequired,
        timestamp: new Date().toISOString(),
      },
    ].slice(-MAX_TURNS_PER_SESSION);

    // Auto-generate title from first message if session is new
    const existingSession = chatMemory.sessions[sessionId];
    const sessionTitle =
      existingSession?.title && existingSession.title !== "Nueva conversación"
        ? existingSession.title
        : generateSessionTitle(question);

    chatMemory.sessions[sessionId] = {
      sessionId,
      title: sessionTitle,
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
      modelWeight: selectedModelProfile.weight,
      modelHumanName: selectedModelProfile.human_name,
      selectedModelWeight: selectedModelProfile.weight,
      usedModelWeight: usedModelProfile?.weight ?? null,
      usedModelHumanName: usedModelProfile?.human_name ?? modelResult.usedModel,
      fallbackModelUsed: modelResult.fallbackUsed,
      mode,
      modeInfo: SUPPORTED_CHAT_MODES.find((item) => item.id === mode) ?? null,
      route: {
        lane: intent.lane,
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
