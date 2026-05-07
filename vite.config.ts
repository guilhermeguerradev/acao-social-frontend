import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

declare const process: {
  cwd: () => string;
  env: Record<string, string | undefined>;
};

function numberFromEnv(value: string | undefined) {
  if (!value) return undefined;

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };
  const apiProxyTarget = env.VITE_API_PROXY_TARGET
    ?? (env.VITE_API_PROTOCOL && env.VITE_API_HOST && env.VITE_API_PORT
      ? `${env.VITE_API_PROTOCOL}://${env.VITE_API_HOST}:${env.VITE_API_PORT}`
      : undefined);

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: env.VITE_DEV_HOST,
      port: numberFromEnv(env.VITE_DEV_PORT),
      proxy: apiProxyTarget
        ? {
            "/api": {
              target: apiProxyTarget,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api/, ""),
            },
          }
        : undefined,
    },
    preview: {
      host: env.VITE_PREVIEW_HOST,
      port: numberFromEnv(env.VITE_PREVIEW_PORT),
    },
  };
});
