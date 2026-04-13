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

## Modelos de Chat

Los modelos se seleccionan desde el frontend y se envian en cada request al backend.

Modelos soportados:

- gemini-3.1-pro-preview
- gemini-3-flash-preview
- gemini-3.1-flash-lite-preview

## Modos de Conversacion

- Estricto: solo responde con evidencia del contexto recuperado; si no hay evidencia suficiente, no responde fuera del documento.
- Hibrido: permite saludo/conversacion casual sin contexto, pero para preguntas de contenido aplica modo estricto.
- Libre con Preferencia de Contexto: prioriza el contexto cargado, pero puede responder conocimiento general aclarando cuando sea fuera de contexto.

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
