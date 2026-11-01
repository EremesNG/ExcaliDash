/**
 * Compare the complete JSON content shared by peers, including nested bindings,
 * custom data and new editor fields. Sort object keys so wire round-trips and
 * property insertion order don't create edits. Arrays keep their order.
 * Revision metadata is compared separately; non-JSON values are not persisted.
 */
export const getElementContentSig = (element: any): string => {
  if (!element || typeof element !== "object") return "";
  const {
    version: _version,
    versionNonce: _nonce,
    updated: _updated,
    ...content
  } = element;
  return JSON.stringify(content, (_key, value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, value[key]]),
      );
    }
    return value;
  });
};

export const reconcileElements = (
  localElements: readonly any[],
  remoteElements: readonly any[],
  localAppState?: any,
  preferLocalOnEqual = false,
): any[] => {
  const localMap = new Map<string, any>();

  localElements.forEach((el) => {
    localMap.set(el.id, el);
  });

  const getVersion = (element: any) => element?.version ?? 0;
  const getVersionNonce = (element: any) => element?.versionNonce ?? 0;
  const getUpdated = (element: any) => {
    const value = element?.updated;
    return typeof value === "number" ? value : Number(value) || 0;
  };

  remoteElements.forEach((remoteEl) => {
    const localEl = localMap.get(remoteEl.id);

    if (!localEl) {
      localMap.set(remoteEl.id, remoteEl);
      return;
    }

    if (
      localEl.id === localAppState?.editingTextElement?.id ||
      localEl.id === localAppState?.resizingElement?.id ||
      localEl.id === localAppState?.newElement?.id
    ) {
      return;
    }

    const remoteVersion = getVersion(remoteEl);
    const localVersion = getVersion(localEl);
    if (remoteVersion !== localVersion) {
      if (remoteVersion > localVersion) localMap.set(remoteEl.id, remoteEl);
      return;
    }

    // Excalidraw resolves concurrent versions by the lowest nonce. Arrival
    // order and peers' wall clocks must not make equal-version edits diverge.
    const remoteNonce = getVersionNonce(remoteEl);
    const localNonce = getVersionNonce(localEl);
    if (remoteNonce !== localNonce) {
      if (remoteNonce < localNonce) localMap.set(remoteEl.id, remoteEl);
      return;
    }

    const remoteUpdated = getUpdated(remoteEl);
    const localUpdated = getUpdated(localEl);
    if (remoteUpdated !== localUpdated) {
      if (remoteUpdated > localUpdated) localMap.set(remoteEl.id, remoteEl);
      return;
    }

    // An HTTP snapshot may predate a live interaction with equal metadata.
    // Socket frames still accept changing content in their delivery order.
    if (preferLocalOnEqual) return;

    // If the metadata says "equal" but content differs, accept the remote element.
    // This enables live shape creation/move frames that don't bump version fields.
    if (getElementContentSig(remoteEl) !== getElementContentSig(localEl)) {
      localMap.set(remoteEl.id, remoteEl);
    }
  });

  return Array.from(localMap.values());
};

export const applyElementOrder = (
  elements: readonly any[],
  elementOrder: readonly string[] | undefined | null,
): any[] => {
  if (!Array.isArray(elementOrder) || elementOrder.length === 0)
    return [...elements];

  const byId = new Map<string, any>();
  for (const el of elements) {
    if (el && typeof el.id === "string") byId.set(el.id, el);
  }

  const ordered: any[] = [];
  const seen = new Set<string>();

  for (const id of elementOrder) {
    const el = byId.get(id);
    if (!el) continue;
    ordered.push(el);
    seen.add(id);
  }

  // Preserve any elements not mentioned in the remote ordering (e.g. local-only elements)
  // by appending them in their existing order.
  for (const el of elements) {
    const id = el?.id;
    if (typeof id !== "string") continue;
    if (seen.has(id)) continue;
    ordered.push(el);
  }

  return ordered;
};
