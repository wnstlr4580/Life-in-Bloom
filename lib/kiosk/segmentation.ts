// 브라우저 내 인물 세그멘테이션 (MediaPipe Selfie Segmenter)
// 실시간 비디오가 아니라 캡처된 정지 프레임 1장만 처리하면 되므로
// 지연 시간 부담이 적다 (설계 문서 6-1 참고).
"use client"

import { FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision"

let segmenterPromise: Promise<ImageSegmenter> | null = null

function getSegmenter(): Promise<ImageSegmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const files = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
      )
      return ImageSegmenter.createFromOptions(files, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
          delegate: "GPU",
        },
        outputCategoryMask: false,
        outputConfidenceMasks: true, // 인물일 확률(0~1)을 그대로 알파값으로 사용
      })
    })()
  }
  return segmenterPromise
}

/** 정지 이미지에서 인물 확률 마스크(0~1, width*height 길이)를 추출 */
export async function segmentPerson(image: ImageBitmap): Promise<Float32Array> {
  const segmenter = await getSegmenter()
  const result = segmenter.segment(image)
  const mask = result.confidenceMasks?.[0]
  if (!mask) throw new Error("세그멘테이션 결과가 없습니다.")
  const data = mask.getAsFloat32Array()
  mask.close()
  return data
}

/** 카메라 상태 변경 전 모델을 미리 로드해두어 촬영 직후 지연을 줄인다 */
export function preloadSegmenter() {
  void getSegmenter()
}
