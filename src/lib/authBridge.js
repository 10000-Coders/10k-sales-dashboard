/**
 * Bridge between axios (no Redux import) and the store — avoids circular deps.
 */

let onTokensUpdated = null;
let onAuthFailed = null;

export function registerAuthHandlers({ onTokensUpdated: tokensCb, onAuthFailed: failCb } = {}) {
  onTokensUpdated = tokensCb || null;
  onAuthFailed = failCb || null;
}

export function notifyTokensUpdated(tokens) {
  onTokensUpdated?.(tokens);
}

export function notifyAuthFailed() {
  onAuthFailed?.();
}
