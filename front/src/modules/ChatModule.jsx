import { useState, useRef, useEffect } from 'react';
import { Send, RotateCcw, Sparkles, Activity, BookOpen } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import ChatBubble from '../components/ChatBubble';
import GlowButton from '../components/GlowButton';
import './ChatModule.css';

export default function ChatModule() {
  const {
    sessionId, chatTurns, setChatTurns, setSessionId,
    selectedModel, updateModel, selectedMode, updateMode,
    supportedModels, modelProfiles, supportedModes, ensureSession, refreshSessions,
  } = useApp();

  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [sources, setSources] = useState([]);
  const [selectedSourceIdx, setSelectedSourceIdx] = useState('');
  const [traceItems, setTraceItems] = useState([]);
  const [traceStatus, setTraceStatus] = useState('En espera.');
  const messagesEndRef = useRef(null);
  const flowTickerRef = useRef(null);
  const traceCleanupTimersRef = useRef([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatTurns]);

  useEffect(() => () => {
    if (flowTickerRef.current) {
      clearInterval(flowTickerRef.current);
      flowTickerRef.current = null;
    }

    traceCleanupTimersRef.current.forEach((timer) => clearTimeout(timer));
    traceCleanupTimersRef.current = [];
  }, []);

  const stopFlowTicker = () => {
    if (flowTickerRef.current) {
      clearInterval(flowTickerRef.current);
      flowTickerRef.current = null;
    }
  };

  const clearTraceTimers = () => {
    traceCleanupTimersRef.current.forEach((timer) => clearTimeout(timer));
    traceCleanupTimersRef.current = [];
  };

  const appendTraceStep = (label) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    setTraceItems((prev) => {
      if (prev.some((item) => item.label === label)) {
        return prev;
      }
      return [...prev, { id, label }];
    });

    const cleanupTimer = setTimeout(() => {
      setTraceItems((prev) => prev.filter((item) => item.id !== id));
      traceCleanupTimersRef.current = traceCleanupTimersRef.current.filter((timer) => timer !== cleanupTimer);
    }, 5200);

    traceCleanupTimersRef.current.push(cleanupTimer);
  };

  const handleSend = async () => {
    const q = question.trim();
    if (!q || sending) return;

    const selectedModelProfile = modelProfiles.find((profile) => profile.weight === selectedModel);
    if (selectedModelProfile?.weight === 'pesado') {
      const shouldContinue = window.confirm(
        `Has seleccionado el perfil ${selectedModelProfile.display_name || 'Alto analisis (mas costo)'}. Este perfil ofrece mayor razonamiento, pero incrementa el consumo de tokens, el costo y la latencia de respuesta. ¿Deseas continuar?`
      );
      if (!shouldContinue) return;
    }

    stopFlowTicker();
    clearTraceTimers();
    setTraceItems([]);

    const flowSteps = [
      'Analizando tu mensaje inicial',
      'Clasificando intencion y modo de respuesta',
      selectedMode === 'libre'
        ? 'Priorizando evidencia del contexto y respaldo general'
        : 'Consultando evidencia del contexto seleccionado',
      'Redactando respuesta juridica',
      'Aplicando validacion de consistencia final',
    ];

    let flowIndex = 0;
    appendTraceStep(flowSteps[flowIndex]);
    setTraceStatus(flowSteps[flowIndex]);
    flowTickerRef.current = setInterval(() => {
      flowIndex += 1;
      if (flowIndex < flowSteps.length) {
        const nextStep = flowSteps[flowIndex];
        appendTraceStep(nextStep);
        setTraceStatus(nextStep);
        return;
      }

      stopFlowTicker();
      setTraceStatus('Esperando respuesta del modelo...');
    }, 1300);

    setSending(true);
    setQuestion('');

    // Optimistic user message
    const userTurn = { user: q, assistant: '', grounded: false, timestamp: new Date().toISOString() };
    setChatTurns((prev) => [...prev, userTurn]);

    try {
      const data = await api('/rag/query', {
        method: 'POST',
        timeoutMs: 165000,
        body: JSON.stringify({
          question: q,
          sessionId,
          model: selectedModel,
          mode: selectedMode,
        }),
      });

      stopFlowTicker();

      if (data?.route?.lane) {
        appendTraceStep(
          data.route.lane === 'pesado'
            ? 'Ruta usada: carril pesado con analisis documental'
            : 'Ruta usada: carril rapido conversacional'
        );
      }
      appendTraceStep('Respuesta lista');
      setTraceStatus('Respuesta finalizada.');

      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem('tacticalLexSessionId', data.sessionId);
      }

      // Replace the optimistic turn with the real answer
      setChatTurns((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          user: q,
          assistant: data.answer,
          grounded: data.grounded,
          mode: data.mode || selectedMode,
          useFileSearch: Boolean(data?.route?.useFileSearch),
          timestamp: new Date().toISOString(),
        };
        return updated;
      });

      setSources(data.sources || []);
      if (data.sources?.length > 0) {
        setSelectedSourceIdx(String(data.sources[0].index));
      }

      // Refresh sidebar sessions list
      refreshSessions().catch(() => {});
    } catch (err) {
      stopFlowTicker();
      appendTraceStep('Se detecto un error en la consulta');
      setTraceStatus('No fue posible completar el flujo.');
      setChatTurns((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          user: q,
          assistant: `Error: ${err.message}`,
          grounded: false,
          mode: selectedMode,
          useFileSearch: false,
          timestamp: new Date().toISOString(),
        };
        return updated;
      });
    } finally {
      setSending(false);
    }
  };

  const handleReset = async () => {
    try {
      await api('/chat/session/reset', {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      });
      setChatTurns([]);
      setSources([]);
      clearTraceTimers();
      setTraceItems([]);
      setTraceStatus('En espera.');
      await ensureSession();
    } catch {
      // silent
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const shortId = (id) => {
    if (!id) return 'N/A';
    if (id.length <= 14) return id;
    return `${id.slice(0, 7)}...${id.slice(-5)}`;
  };

  const selectedSource = sources.find((s) => String(s.index) === selectedSourceIdx);
  const activeMode = supportedModes.find((m) => m.id === selectedMode);
  const selectedProfile = modelProfiles.find((profile) => profile.weight === selectedModel);

  return (
    <div className="chat-module">
      {/* ═══════ Chat Area ═══════ */}
      <div className="chat-area">
        <div className="chat-header">
          <div className="chat-header-left">
            <span className="chat-session-chip">Sesión: {shortId(sessionId)}</span>
            <GlowButton variant="ghost" size="small" onClick={handleReset}>
              <RotateCcw size={14} /> Reset
            </GlowButton>
          </div>
          <div className="chat-controls">
            <select className="chat-select" value={selectedModel} onChange={(e) => updateModel(e.target.value)}>
              {modelProfiles.length ? (
                modelProfiles.map((profile) => (
                  <option key={profile.weight} value={profile.weight} title={profile.tooltips?.module_chat || ''}>
                    {profile.display_name || profile.human_name}
                  </option>
                ))
              ) : (
                supportedModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))
              )}
            </select>
            <select className="chat-select" value={selectedMode} onChange={(e) => updateMode(e.target.value)}>
              {supportedModes.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre || m.id}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="chat-messages-area">
          {chatTurns.length === 0 ? (
            <div className="chat-empty">
              <div className="chat-empty-icon">
                <Sparkles size={28} />
              </div>
              <h3>Bienvenido a Tactical Lex</h3>
              <p>Haz tu primera pregunta para iniciar la consulta legal asistida por IA</p>
            </div>
          ) : (
            chatTurns.map((turn, i) => (
              <div key={i} className="chat-turn-row">
                <ChatBubble role="user" text={turn.user} timestamp={turn.timestamp} />
                {turn.assistant && (
                  <ChatBubble
                    role="assistant"
                    text={turn.assistant}
                    grounded={turn.grounded}
                    responseMode={turn.mode}
                    usedContext={turn.useFileSearch}
                    timestamp={turn.timestamp}
                  />
                )}
                {!turn.assistant && sending && i === chatTurns.length - 1 && (
                  <div className="chat-bubble assistant">
                    <span className="bubble-meta">Tactical Lex • pensando...</span>
                    <div className="bubble-body" style={{ display: 'flex', gap: 4 }}>
                      <span style={{ animation: 'pulse 1.2s ease-in-out infinite' }}>●</span>
                      <span style={{ animation: 'pulse 1.2s ease-in-out 0.2s infinite' }}>●</span>
                      <span style={{ animation: 'pulse 1.2s ease-in-out 0.4s infinite' }}>●</span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          <div className="chat-scroll-anchor" ref={messagesEndRef} />
        </div>

        <div className="chat-composer">
          <textarea
            className="chat-composer-input"
            rows={1}
            placeholder="Pregunta algo sobre tus documentos legales..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
          <button className="chat-send-btn" onClick={handleSend} disabled={sending || !question.trim()}>
            {sending ? <span className="sending-spinner" /> : <Send size={20} />}
          </button>
        </div>
      </div>

      {/* ═══════ Side Panel ═══════ */}
      <div className="chat-side">
        {selectedProfile?.tooltips?.module_chat ? (
          <div className="mode-hint mode-hint-glow">
            <strong>Perfil IA seleccionado: {selectedProfile.display_name || selectedProfile.human_name}</strong>
            <span>{selectedProfile.tooltips.module_chat}</span>
          </div>
        ) : null}

        {activeMode && (
          <div className="mode-hint">
            <strong>{activeMode.nombre}:</strong> {activeMode.descripcion}
          </div>
        )}

        <div className="side-panel">
          <div className="side-panel-title">
            <Activity size={16} /> Flujo de Pensamiento
          </div>

          <div className={`ai-thinking-visual ${sending ? 'active' : ''}`}>
            <div className="ai-loader">
              <span className="ai-loader-ring ring-a" />
              <span className="ai-loader-ring ring-b" />
              <span className="ai-loader-core" />
            </div>
          </div>

          <div className="trace-status">{traceStatus}</div>
          <div className="trace-list">
            {traceItems.length > 0 ? (
              traceItems.map((item) => (
                <div key={item.id} className="trace-line">
                  <span className="trace-line-dot" />
                  <span className="trace-text">{item.label}</span>
                </div>
              ))
            ) : (
              <div className="trace-empty">Sin actividad reciente.</div>
            )}
          </div>
        </div>

        <div className="side-panel" style={{ flex: 1 }}>
          <div className="side-panel-title">
            <BookOpen size={16} /> Fuentes de Fundamentación
          </div>
          {sources.length > 0 ? (
            <>
              <select
                className="sources-select"
                value={selectedSourceIdx}
                onChange={(e) => setSelectedSourceIdx(e.target.value)}
              >
                {sources.map((s) => (
                  <option key={s.index} value={String(s.index)}>
                    #{s.index} {s.title || '(sin título)'}
                  </option>
                ))}
              </select>
              {selectedSource && (
                <div className="source-detail">
                  #{selectedSource.index}{'\n'}
                  Título: {selectedSource.title || '(sin título)'}{'\n'}
                  URI: {selectedSource.uri || '(sin uri)'}{'\n'}
                  Extracto:{'\n'}{selectedSource.excerpt || '(sin extracto)'}
                </div>
              )}
            </>
          ) : (
            <div className="source-detail">No hay fuentes disponibles aún.</div>
          )}
        </div>
      </div>
    </div>
  );
}
