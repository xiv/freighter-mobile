import { getAppUpdateText } from "helpers/appUpdateText";

// Mock i18n instance
const mockI18n = {
  language: "en",
} as any;

// Mock translation function
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    "appUpdate.defaultMessage": "Please update your app to the latest version",
  };
  return translations[key] || key;
};

describe("getAppUpdateText", () => {
  it("should return translation fallback when not enabled", () => {
    const appUpdateText = {
      enabled: false,
      payload: {
        en: "Custom message",
        pt: "Mensagem personalizada",
      },
    };

    const result = getAppUpdateText(appUpdateText, mockI18n, mockT);

    expect(result).toBe("Please update your app to the latest version");
  });

  it("should return translation fallback when payload is undefined", () => {
    const appUpdateText = {
      enabled: true,
      payload: undefined,
    };

    const result = getAppUpdateText(appUpdateText, mockI18n, mockT);

    expect(result).toBe("Please update your app to the latest version");
  });

  it("should return translation fallback when payload is empty", () => {
    const appUpdateText = {
      enabled: true,
      payload: {} as any,
    };

    const result = getAppUpdateText(appUpdateText, mockI18n, mockT);

    expect(result).toBe("Please update your app to the latest version");
  });

  it("should return translation fallback when payload is not an object", () => {
    const appUpdateText = {
      enabled: true,
      payload: "   " as any,
    };

    const result = getAppUpdateText(appUpdateText, mockI18n, mockT);

    expect(result).toBe("Please update your app to the latest version");
  });

  it("should return current language text when available", () => {
    const appUpdateText = {
      enabled: true,
      payload: {
        en: "Update available in English",
        pt: "Atualização disponível em Português",
      },
    };

    const result = getAppUpdateText(appUpdateText, mockI18n, mockT);

    expect(result).toBe("Update available in English");
  });

  it("should return English text when current language not available", () => {
    const appUpdateText = {
      enabled: true,
      payload: {
        pt: "Atualização disponível em Português",
        es: "Actualización disponible en Español",
      },
    };

    const result = getAppUpdateText(appUpdateText, mockI18n, mockT);

    expect(result).toBe("Please update your app to the latest version");
  });

  it("should return English text when current language is not English", () => {
    const appUpdateText = {
      enabled: true,
      payload: {
        en: "Update available in English",
        pt: "Atualização disponível em Português",
      },
    };

    const ptI18n = { language: "pt" } as any;
    const result = getAppUpdateText(appUpdateText, ptI18n, mockT);

    expect(result).toBe("Atualização disponível em Português");
  });

  it("should return translation fallback when payload is not an object", () => {
    const appUpdateText = {
      enabled: true,
      payload: "invalid json" as any,
    };

    const result = getAppUpdateText(appUpdateText, mockI18n, mockT);

    expect(result).toBe("Please update your app to the latest version");
  });

  it("should return translation fallback when payload is a simple string", () => {
    const appUpdateText = {
      enabled: true,
      payload: "just a string" as any,
    };

    const result = getAppUpdateText(appUpdateText, mockI18n, mockT);

    expect(result).toBe("Please update your app to the latest version");
  });

  it("should handle complex JSON payload with multiple languages", () => {
    const appUpdateText = {
      enabled: true,
      payload: {
        en: "New version available!",
        pt: "Nova versão disponível!",
        es: "¡Nueva versión disponible!",
        fr: "Nouvelle version disponible!",
      },
    };

    const result = getAppUpdateText(appUpdateText, mockI18n, mockT);

    expect(result).toBe("New version available!");
  });

  it("should handle empty object payload", () => {
    const appUpdateText = {
      enabled: true,
      payload: {},
    };

    const result = getAppUpdateText(appUpdateText, mockI18n, mockT);

    expect(result).toBe("Please update your app to the latest version");
  });

  it("should handle null values in JSON payload", () => {
    const appUpdateText = {
      enabled: true,
      payload: {
        en: null as any,
        pt: "Atualização disponível",
      },
    };

    const result = getAppUpdateText(appUpdateText, mockI18n, mockT);

    expect(result).toBe("Please update your app to the latest version");
  });

  it("should handle non-object payload from remote config", () => {
    const appUpdateText = {
      enabled: true,
      payload: 123 as any, // Number instead of object
    };

    const result = getAppUpdateText(appUpdateText, mockI18n, mockT);

    expect(result).toBe("Please update your app to the latest version");
  });

  it("should handle object payload from remote config", () => {
    const appUpdateText = {
      enabled: true,
      payload: { en: "Update available", pt: "Atualização disponível" },
    };

    const result = getAppUpdateText(appUpdateText, mockI18n, mockT);

    expect(result).toBe("Update available");
  });

  it("should handle boolean payload from remote config", () => {
    const appUpdateText = {
      enabled: true,
      payload: true as any, // Boolean instead of object
    };

    const result = getAppUpdateText(appUpdateText, mockI18n, mockT);

    expect(result).toBe("Please update your app to the latest version");
  });

  it("should handle null payload from remote config", () => {
    const appUpdateText = {
      enabled: true,
      payload: null as any, // Null payload
    };

    const result = getAppUpdateText(appUpdateText, mockI18n, mockT);

    expect(result).toBe("Please update your app to the latest version");
  });
});
