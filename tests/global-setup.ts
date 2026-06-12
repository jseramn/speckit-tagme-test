import { ensureRoleJwts } from "./helpers/auth-setup";

export default async function globalSetup(): Promise<void> {
  await ensureRoleJwts();
}