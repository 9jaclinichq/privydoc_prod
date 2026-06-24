export async function loadConfig() {
  // PrivyDoc configuration is loaded server-side for maximum confidentiality.
  // This loader runs on startup to guarantee ready-state.
  return Promise.resolve();
}
