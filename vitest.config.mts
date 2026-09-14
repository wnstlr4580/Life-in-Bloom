import { defineConfig, configDefaults } from "vitest/config"
import { fileURLToPath } from "node:url"

// tsconfig의 "@/*" → 프로젝트 루트 별칭을 vitest에서도 해석하도록 매핑
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    // .claude/worktrees/*는 별도 git worktree(다른 브랜치 체크아웃)라 자체 lib/ 사본을 갖지만,
    // "@" 별칭은 항상 이 루트를 가리키므로 그 안의 테스트가 루트 소스와 뒤섞여 잘못 실패한다.
    exclude: [...configDefaults.exclude, ".claude/**"],
  },
})
