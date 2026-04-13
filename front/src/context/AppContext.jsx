import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const AppContext = createContext(null);

const SESSION_KEY = 'tacticalLexSessionId';
const MODEL_KEY = 'tacticalLexChatModel';
const MODE_KEY = 'tacticalLexChatMode';

export function AppProvider({ children }) {
  const [state, setState] = useState(null);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [sessionId, setSessionId] = useState(localStorage.getItem(SESSION_KEY) || null);
  const [chatTurns, setChatTurns] = useState([]);
  const [selectedModel, setSelectedModel] = useState(localStorage.getItem(MODEL_KEY) || '');
  const [selectedMode, setSelectedMode] = useState(localStorage.getItem(MODE_KEY) || '');
  const [supportedModels, setSupportedModels] = useState([]);
  const [supportedModes, setSupportedModes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshState = useCallback(async () => {
    try {
      const data = await api('/state', { method: 'GET' });
      setState(data);
      setSupportedModels(data.supportedModels || []);
      setSupportedModes(data.supportedChatModes || []);

      if (!selectedModel || !(data.supportedModels || []).includes(selectedModel)) {
        const m = data.defaultChatModel || (data.supportedModels || [])[0] || '';
        setSelectedModel(m);
        localStorage.setItem(MODEL_KEY, m);
      }

      if (!selectedMode) {
        const mode = data.defaultChatMode || 'hibrido';
        setSelectedMode(mode);
        localStorage.setItem(MODE_KEY, mode);
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [selectedModel, selectedMode]);

  const refreshStores = useCallback(async () => {
    try {
      const data = await api('/stores', { method: 'GET' });
      setStores(data.stores || []);
      setSelectedStore(data.selectedStoreName || null);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const refreshDocuments = useCallback(async (storeName) => {
    try {
      const query = storeName ? `?storeName=${encodeURIComponent(storeName)}` : '';
      const data = await api(`/documents${query}`, { method: 'GET' });
      setDocuments(data.documents || []);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const ensureSession = useCallback(async () => {
    try {
      const persisted = localStorage.getItem(SESSION_KEY);
      const payload = persisted ? { sessionId: persisted } : {};
      const data = await api('/chat/session', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setSessionId(data.sessionId);
      setChatTurns(data.turns || []);
      localStorage.setItem(SESSION_KEY, data.sessionId);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const updateModel = useCallback((model) => {
    setSelectedModel(model);
    localStorage.setItem(MODEL_KEY, model);
  }, []);

  const updateMode = useCallback((mode) => {
    setSelectedMode(mode);
    localStorage.setItem(MODE_KEY, mode);
  }, []);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        await refreshState();
        await refreshStores();
        await ensureSession();
      } catch {
        // errors already captured
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    state,
    stores,
    selectedStore,
    documents,
    sessionId,
    chatTurns,
    selectedModel,
    selectedMode,
    supportedModels,
    supportedModes,
    loading,
    error,
    setChatTurns,
    setSessionId,
    setSelectedStore,
    setDocuments,
    setError,
    refreshState,
    refreshStores,
    refreshDocuments,
    ensureSession,
    updateModel,
    updateMode,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
