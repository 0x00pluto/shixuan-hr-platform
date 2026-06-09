export function nowIso() {
  return new Date().toISOString();
}

export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}
