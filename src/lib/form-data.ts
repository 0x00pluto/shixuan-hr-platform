export function reqFormId(formData: FormData, key: string): string {
  const value = String(formData.get(key) ?? "");
  if (!value) throw new Error(`缺少 ${key}`);
  return value;
}
