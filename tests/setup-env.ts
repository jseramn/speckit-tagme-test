import {
  applyJwtTokens,
  loadEnvFiles,
  readJwtCache,
} from "./helpers/auth-setup";

loadEnvFiles();

const cached = readJwtCache();
if (cached) {
  applyJwtTokens(cached);
}