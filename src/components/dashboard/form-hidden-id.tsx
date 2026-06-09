/** 通过 FormData 传递实体 ID，避免对 Server Action 使用 .bind() */
export function FormHiddenId({
  name,
  value,
}: {
  name: string;
  value: string;
}) {
  return <input type="hidden" name={name} value={value} />;
}
