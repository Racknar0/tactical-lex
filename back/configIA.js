export const IA_MODEL_CONFIG = [
  {
    weight: "pesado",
    weigth: "pesado",
    model: "gemini-3.1-pro-preview",
    human_name: "Gemini 3.1 Pro",
    display_name: "Alto analisis (mas costo)",
    tooltips: {
      module_chat:
        "Utiliza mayor razonamiento y profundidad. Recomendado para consultas juridicas complejas; mayor costo de tokens y mayor latencia.",
      module_documents:
        "Utiliza mayor razonamiento para redaccion y estructura juridica avanzada. Mayor costo de tokens y tiempo de respuesta.",
    },
  },
  {
    weight: "equilibrado",
    weigth: "equilibrado",
    model: "gemini-3-flash-preview",
    human_name: "Gemini 3 Flash",
    display_name: "Uso recomendado",
    tooltips: {
      module_chat:
        "Balance entre calidad, velocidad y costo. Recomendado como opcion por defecto para uso diario.",
      module_documents:
        "Balance entre calidad de redaccion y tiempo de generacion. Ideal para la mayoria de documentos.",
    },
  },
  {
    weight: "ligero",
    weigth: "ligero",
    model: "gemini-3.1-flash-lite-preview",
    human_name: "Gemini 3.1 Flash Lite",
    display_name: "Economico",
    tooltips: {
      module_chat:
        "Respuesta mas rapida y menor costo. Menor profundidad de razonamiento en consultas complejas.",
      module_documents:
        "Generacion rapida y economica para borradores iniciales y tareas simples.",
    },
  },
];

export const IA_DEFAULT_WEIGHT = "equilibrado";

const MODEL_BY_WEIGHT = new Map(
  IA_MODEL_CONFIG.map((profile) => [String(profile.weight || "").toLowerCase(), profile])
);

const MODEL_BY_ID = new Map(
  IA_MODEL_CONFIG.map((profile) => [String(profile.model || "").toLowerCase(), profile])
);

export function getIAProfileByWeight(weight) {
  return MODEL_BY_WEIGHT.get(String(weight || "").trim().toLowerCase()) || null;
}

export function resolveIAProfile(input) {
  const normalized = String(input || "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return MODEL_BY_WEIGHT.get(normalized) || MODEL_BY_ID.get(normalized) || null;
}

export function getSupportedModelWeights() {
  return IA_MODEL_CONFIG.map((profile) => profile.weight);
}

export function getSupportedModelIds() {
  return IA_MODEL_CONFIG.map((profile) => profile.model);
}

export function getPublicIAProfiles() {
  return IA_MODEL_CONFIG.map((profile) => ({
    weight: profile.weight,
    weigth: profile.weigth,
    model: profile.model,
    human_name: profile.human_name,
    display_name: profile.display_name,
    tooltips: profile.tooltips,
  }));
}
