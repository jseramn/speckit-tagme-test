import { createBrowserClient } from "@insforge/sdk/ssr";

/**
 * Browser InsForge client with SSR cookie-based session refresh.
 */
export const insforgeBrowser = createBrowserClient();