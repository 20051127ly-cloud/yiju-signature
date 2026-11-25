import path from "node:path"
import type { IncomingMessage, ServerResponse } from "node:http"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv, type Plugin } from "vite"
import { handleHunyuan, sendJson } from "./server/hunyuan"

function hunyuanProxy(env: Record<string, string | undefined>): Plugin {
  const middleware = (req: IncomingMessage, res: ServerResponse) => {
    void handleHunyuan(req, res, { env, acceptHeaderKey: true }).catch((err: unknown) => {
      sendJson(res, 502, { error: String(err) })
    })
  }

  return {
    name: 'hunyuan-think-proxy',
    configureServer(server) { server.middlewares.use('/api/hunyuan', middleware) },
    configurePreviewServer(server) { server.middlewares.use('/api/hunyuan', middleware) },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') }
  return {
    base: './',
    plugins: [react(), hunyuanProxy(env)],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
