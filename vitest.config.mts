import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

// tsconfig의 "@/*" → 프로젝트 루트 별칭을 vitest에서도 해석하도록 매핑
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
})
