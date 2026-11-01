// Flat common.* keys; en is the schema, es is complete, zhCN is a partial overlay.
export const en = {
  "common.items.one": "{count} item",
  "common.items.other": "{count} items",
  "common.actions.delete": "Delete",
  "common.actions.cancel": "Cancel",
  "common.actions.close": "Close",
  "common.auth.retry": "Retry connection",
  "common.auth.redirecting": "Redirecting to sign-in...",
  "common.auth.loading": "Loading...",
  "common.auth.backendUnreachable": "Unable to reach the backend API. Check BACKEND_URL, FRONTEND_URL, and your reverse proxy configuration.",
  "common.auth.initializeFailed": "Unable to initialize authentication state. Check backend/API connectivity and refresh.",
  "common.auth.signOutFailed": "Could not sign out. Please try again.",
  "common.language.label": "Language",
  "common.avatar.label": "{name}'s profile picture",
};

export const es: Record<keyof typeof en, string> = {
  "common.items.one": "{count} elemento",
  "common.items.other": "{count} elementos",
  "common.actions.delete": "Eliminar",
  "common.actions.cancel": "Cancelar",
  "common.actions.close": "Cerrar",
  "common.auth.retry": "Reintentar conexión",
  "common.auth.redirecting": "Redirigiendo al inicio de sesión…",
  "common.auth.loading": "Cargando…",
  "common.auth.backendUnreachable": "No se pudo conectar con la API del servidor. Revisa BACKEND_URL, FRONTEND_URL y la configuración del proxy inverso.",
  "common.auth.initializeFailed": "No se pudo inicializar la autenticación. Revisa la conexión con el servidor o la API y actualiza la página.",
  "common.auth.signOutFailed": "No se pudo cerrar la sesión. Inténtalo de nuevo.",
  "common.language.label": "Idioma",
  "common.avatar.label": "Foto de perfil de {name}",
};

export const zhCN: Partial<Record<keyof typeof en, string>> = {};
