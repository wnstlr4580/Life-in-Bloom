# 오행 포토부스 배경 합성 AI 프롬프트 템플릿

참고한 샘플: 화이트 튤립 / 퍼플 수국 (팀에서 올려주신 `_03.png`, `_04.png`)
사용 방식: 실제 촬영된 4컷 원본 사진(포즈 그대로)을 이미지 편집형 AI(제미나이 나노바나나, GPT 이미지 편집, 또는 동일 계열 img2img 편집 툴)에 넣고, 아래 프롬프트로 배경만 교체.

## 공통 규칙 (모든 조합에 동일 적용)

- 입력 사진 속 인물의 얼굴, 표정, 포즈, 손동작, 옷, 헤어스타일, 카메라 구도는 절대 변경하지 않음 — 배경만 교체.
- 배경은 [꽃 색상]의 [꽃 종류]가 풍성하게 핀 정원/덤불로, 사람 좌우를 자연스럽게 감싸도록 배치.
- 조명은 원본 사진의 빛 방향과 톤을 유지하되, 부드럽고 화사한 자연광 느낌으로 보정.
- 사람과 배경 경계는 머리카락 잔털까지 자연스럽게 합성 (경계선이 티 나지 않게).
- 전체 색감은 꽃 색상과 어울리는 파스텔 톤으로 통일.

## 프롬프트 템플릿 (그대로 복사 후 대괄호만 교체)

```
Replace only the background of this photo with a lush, photorealistic garden of
[color] [flower species], softly framing both sides of the people without
covering their faces or bodies. Keep every person's face, expression, pose,
hand gesture, clothing, and framing exactly as in the original — do not alter
them in any way. Match the original photo's lighting direction and softness,
but grade the overall tone toward a warm, dreamy pastel look consistent with
[color] [flower species]. Blend hair edges and body outlines naturally into
the new background with no visible cutout edges. Shallow depth of field,
slightly soft-focus background, abundant blooms, no text, no logos, no
watermarks in the generated image.
```

**네거티브 프롬프트 (지원되는 툴이면 추가):**
```
altered face, changed pose, extra fingers, distorted hands, warped body,
different clothing, visible cutout edge, harsh edge halo, text, watermark,
logo, sparse or wilted flowers
```

## 프레임/카드 레이아웃 프롬프트 (배경 합성 후 별도로 씌우는 틀)

배경 합성이 끝난 4컷 스트립 위에 카드형 틀을 씌울 때 쓰는 프롬프트 (또는 코드로 직접 그려도 됨 — 이 부분은 반복되는 요소라 AI 생성보다 템플릿화가 더 안정적):

```
Design a portrait photo-booth card template around a 4-cut photo strip.
Card background: solid soft pastel tone matching [color] [flower species]
(e.g. cream ivory for white flowers, soft lavender-white for purple flowers).
Right side: a thin vertical accent line, a small flat-style icon of
[flower species], and vertical Korean text "인생네컷" in a matching ink color.
Scatter a few small illustrated petals of [flower species] loosely in the
outer margins/corners of the card, outside the photo strip itself.
Bottom area, centered, stacked top to bottom: the date, a thin horizontal
divider with a tiny heart-arrow accent, then two lines of text — Korean bold
line "[꽃 종류]의 꽃말 : [꽃말 한글]" followed by a smaller italic English line
"[꽃말 영어]". Clean, minimal, editorial, no clutter.
```

---

## 예시 1 — 화이트 튤립 (준 것과 동일 스타일 확인용)

```
Replace only the background of this photo with a lush, photorealistic garden of
white tulips, softly framing both sides of the people without covering their
faces or bodies. Keep every person's face, expression, pose, hand gesture,
clothing, and framing exactly as in the original — do not alter them in any
way. Match the original photo's lighting direction and softness, but grade the
overall tone toward a warm, dreamy pastel look consistent with white tulips.
Blend hair edges and body outlines naturally into the new background with no
visible cutout edges. Shallow depth of field, slightly soft-focus background,
abundant blooms, no text, no logos, no watermarks in the generated image.
```

카드 틀: 크림 아이보리 배경, 화이트 튤립 아이콘, 날짜 "2024.05.20"

## 예시 2 — 퍼플 수국

```
Replace only the background of this photo with a lush, photorealistic garden of
purple hydrangea bushes, softly framing both sides of the people without
covering their faces or bodies. Keep every person's face, expression, pose,
hand gesture, clothing, and framing exactly as in the original — do not alter
them in any way. Match the original photo's lighting direction and softness,
but grade the overall tone toward a warm, dreamy pastel look consistent with
purple hydrangea. Blend hair edges and body outlines naturally into the new
background with no visible cutout edges. Shallow depth of field, slightly
soft-focus background, abundant blooms, no text, no logos, no watermarks in
the generated image.
```

카드 틀: 소프트 라벤더-화이트 배경, 수국 아이콘, 꽃말 "수국의 꽃말 : 진심, 변하지 않는 마음 / sincere heart, unchanged love"

## 예시 3 — 레드 장미 (화 오행, 신규 예시로 확장성 확인용)

```
Replace only the background of this photo with a lush, photorealistic garden of
red roses, softly framing both sides of the people without covering their
faces or bodies. Keep every person's face, expression, pose, hand gesture,
clothing, and framing exactly as in the original — do not alter them in any
way. Match the original photo's lighting direction and softness, but grade the
overall tone toward a warm, dreamy pastel look consistent with red roses.
Blend hair edges and body outlines naturally into the new background with no
visible cutout edges. Shallow depth of field, slightly soft-focus background,
abundant blooms, no text, no logos, no watermarks in the generated image.
```

카드 틀: 소프트 로즈 핑크 배경, 레드 로즈 아이콘, 꽃말 "장미의 꽃말 : 열정적인 사랑 / passionate love"

---

이 템플릿의 [color]/[flower species]/꽃말 부분만 바꾸면 전체 조합에 그대로 재사용 가능합니다.
