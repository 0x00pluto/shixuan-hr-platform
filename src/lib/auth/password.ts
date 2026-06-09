import bcrypt from "bcryptjs";

/** 演示账号统一初始密码，见 README「系统账号」 */
export const DEMO_USER_PASSWORD = "Shixuan@2026";

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
