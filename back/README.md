# Tactical Lex

Tactical Lex es una app demo moderna para operaciones RAG en la nube con 3 vistas:

1. Boveda de Contexto: crear/seleccionar stores de contexto y subir documentos.
2. Nucleo de Recuperacion Cognitiva: hacer preguntas fundamentadas sobre el store seleccionado con memoria de sesion.
3. Generador de Documentos: modulo vacio reservado para implementacion futura.

## Requisitos

- Node.js 18+
- Una API key valida de Gemini

## Entorno

Configura estas variables antes de iniciar:

- GOOGLE_API_KEY: tu API key de Gemini
- PORT (opcional): por defecto 3300
- CHAT_QUERY_TIMEOUT_MS: timeout general del chat (ms)
- CASUAL_FAST_TIMEOUT_MS: timeout del carril rapido (ms)
- INTENT_CLASSIFIER_ENABLED: activa/desactiva micro-clasificador de intenciones
- INTENT_CLASSIFIER_MODEL: perfil o modelo para clasificacion ambigua (ej: ligero)
- INTENT_CLASSIFIER_TIMEOUT_MS: timeout del micro-clasificador (ms)

## Configuracion IA Centralizada

Los perfiles y modelos se centralizan en [back/configIA.js](configIA.js).

Perfiles soportados:

- pesado (Gemini 3.1 Pro)
- equilibrado (Gemini 3 Flash)
- ligero (Gemini 3.1 Flash Lite)

El frontend envia el perfil (peso) y el backend resuelve automaticamente el modelo real.

## Modos de Conversacion

- Estricto (Auditor Legal): temperatura baja, solo evidencia del contexto. Si falta evidencia responde con negativa explicita.
- Hibrido (Asistente Inteligente): usa un router por fases (filtros rapidos, gatillos documentales y micro-clasificador opcional). Charla casual va por carril rapido; consulta tecnica/documental va por carril pesado con contexto.
- Libre con Preferencia de Contexto (Consultor Experto): prioriza contexto, pero puede completar con conocimiento general y advertencia explicita si fue fuera del documento.

## Ejecucion

Desde la raiz del workspace:

```bash
node tactical-lex/server.js
```

Luego abre:

```text
http://localhost:3300
```

## Notas

- Tactical Lex usa stores de Gemini File Search.
- Los archivos subidos se guardan temporalmente en storage/uploads y se eliminan despues de indexar.
- El Flujo de Pensamiento muestra etapas operativas de recuperacion, no razonamiento privado.
- La memoria de conversacion se persiste por sesion en storage/chat-memory.json.
- Usa Reiniciar Memoria en la vista de chat para iniciar un nuevo contexto de sesion.
