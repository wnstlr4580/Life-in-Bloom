// 사진(이미지 파일)을 SNS로 공유하는 공통 로직.
// 사주 공유카드(components/saju/ShareCard.tsx)와 같은 순서로 동작한다:
//  1) 이미지 파일째 Web Share — 모바일 공유 시트에서 카카오톡·인스타 스토리/피드로 바로 보낼 수 있다
//  2) 안드로이드 카카오톡 인앱 브라우저(Web Share 없음) — 외부 브라우저로 열어서 공유하도록 안내
//  3) 파일 공유만 안 되는 환경 — 글·링크만 공유
//  4) 공유 기능 자체가 없음(PC 등) — 이미지를 저장해 준다

export type ShareOutcome = "shared" | "aborted" | "external" | "saved" | "failed"

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** 원격 이미지 URL을 Blob으로 받아온다 (공유/저장용) */
export async function fetchImageBlob(imageUrl: string): Promise<Blob> {
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`image fetch failed: ${res.status}`)
  return res.blob()
}

function isAbort(err: unknown) {
  return err instanceof Error && err.name === "AbortError"
}

export async function sharePhoto(opts: {
  getBlob: () => Promise<Blob>
  fileName: string
  title: string
  text: string
  /** 링크 공유·외부 브라우저 열기에 쓰는 페이지 주소 */
  url: string
}): Promise<ShareOutcome> {
  const { getBlob, fileName, title, text, url } = opts

  let blob: Blob | null = null
  try {
    blob = await getBlob()
    const file = new File([blob], fileName, { type: blob.type || "image/jpeg" })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title, text })
      return "shared"
    }
  } catch (err) {
    if (isAbort(err)) return "aborted" // 사용자가 공유 시트를 닫음
  }

  // 안드로이드 카카오톡 인앱 브라우저는 Web Share 자체가 없다 — 외부 브라우저로 넘긴다.
  if (!navigator.share && /KAKAOTALK/i.test(navigator.userAgent)) {
    if (confirm("카카오톡 안에서는 공유하기가 안 돼요.\n크롬 등 다른 브라우저로 열어서 공유할까요?")) {
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`
      return "external"
    }
    return "aborted"
  }

  try {
    if (navigator.share) {
      await navigator.share({ title, text, url })
      return "shared"
    }
    if (blob) {
      downloadBlob(blob, fileName)
      alert("이 브라우저는 공유하기를 지원하지 않아 사진을 저장했어요.\n저장한 사진을 인스타그램·카카오톡에 올려 주세요.")
      return "saved"
    }
  } catch (err) {
    if (isAbort(err)) return "aborted"
  }
  return "failed"
}
