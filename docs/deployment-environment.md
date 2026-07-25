# 배포 환경변수 운영 원칙

`.env.local`은 로컬 개발 전용이며 Git과 Vercel 배포에 포함되지 않는다. 로컬에서 새 환경변수를 추가할 때는 아래 세 곳을 함께 관리한다.

1. `.env.local`: 로컬 실제 값
2. `.env.example`: 변수 이름과 설명만 기록
3. Vercel Project Settings → Environment Variables: Preview와 Production 실제 값

## 현재 추가된 외부 서비스 변수

| 변수 | 공개 여부 | 적용 환경 |
| --- | --- | --- |
| `POLLINATIONS_API_KEY` | 서버 비밀키 | Preview, Production |
| `NEXT_PUBLIC_KAKAO_MAP_JAVASCRIPT_KEY` | 브라우저 공개키 | Development, Preview, Production |

환경변수를 추가하거나 변경한 뒤에는 로컬 개발 서버를 재시작하고, Vercel에서는 새 배포를 실행해야 반영된다.

카카오 JavaScript 키에는 `http://localhost:3000`뿐 아니라 Vercel Preview/Production에서 실제 사용할 도메인을 Kakao Developers의 JavaScript SDK 허용 도메인으로 등록해야 한다.
