# 꽃다발 스타일 정비 · 2026-10-15

- 전용 예시 30건에서 구성별 대표 6건을 유지하고 중복 24건은 isHidden으로 목록에서 제거한다. 사용자 작성 후기는 수정하지 않는다.
- 원본 백업은 artifacts/review-cleanup에 보관한다. 개인정보가 섞일 수 있어 Git에 포함하지 않는다.
- scripts/curate-bouquet-examples.mjs 로 계획을 검토하고 --apply 로 트랜잭션 적용한다.
- 생성 사진은 실제 구매 인증 사진이 아니다. composition.provenance=AI_STAGED_EXAMPLE 및 API isExample을 유지하고 별점·구매 주장과 분리한다.
- 이미지 도구: built-in image_gen. 원본은 public/reviews/curated에 저장.
- 프롬프트 공통: one square photorealistic flower image; natural imperfections; no people, text, collage or watermark.
- white: 8 white roses + baby's breath, kraft wrap, oak kitchen table, casual phone photograph.
- tulip: 13 orange tulips + 12 purple anemones, linen, sofa and paperback, overhead phone photograph.
- calla: 8 white calla lilies + 4 eucalyptus stems, ivory ribbon, hallway wooden bench.
- yellow: 8 yellow roses + 4 white lilies, kraft wrap, passenger seat of a parked car.
- sunflower: 6 sunflowers + 2 eucalyptus stems, linen, balcony chair; AI preview uses a beige studio background.
- blue: 3 blue hydrangea heads + 5 white roses, ivory wrap, kitchen counter; AI preview uses a pale blue studio background.
- 생성 이미지의 꽃 수는 구성 계획과 완전히 일치하지 않을 수 있다. 실제 제작·재고 보증에 사용하지 않는다.


## 2026-10-15 natural photo revision
Built-in image_gen used, one image per style. Output: public/reviews/curated/{white,tulip,calla,yellow,sunflower,blue}-v2.png. Preserve AI_STAGED_EXAMPLE provenance. Originals and catalog previews retained.
Shared prompt: Ordinary spontaneous smartphone snapshot, loose amateur assembly, varying bloom maturity and stem heights, wrinkled packaging, off-centre framing, flat natural light, no studio/catalog treatment, no text.
- white: 8 white roses and a few baby's breath stems, small uneven homemade hand-tied bunch, crumpled brown paper folded too high on one side, thin beige string, held sideways by one hand over an apartment entryway tiled floor, shot downward at 40 degrees, not a perfect circular dome
- tulip: orange tulips and dark purple anemones in a loose long narrow bunch, tulips bending outward in different directions, purple flowers partly obscured, loosely rolled natural linen with an uneven edge, lying diagonally on a kitchen table with scissors at the edge
- calla: 8 ivory calla lilies and sparse eucalyptus stems, tall and very loose asymmetrical hand-tied bundle with stems different lengths, plain white narrow ribbon, propped against a dining chair, ordinary off-white wall and electrical outlet, photographed slightly from above
- yellow: yellow roses and white lilies, only two lilies fully open and other buds closed, sparse airy amateur arrangement with gaps, cheap creased brown kraft paper with clear tape seam, resting on dark car passenger seat, handheld phone wide angle from above
- sunflower: 6 sunflowers of noticeably different sizes, some heads turned sideways and drooping slightly, 2 sprigs eucalyptus, loose modest hand-tied bouquet in wrinkled linen, held by one hand against denim-clad lap on a park bench, ordinary midday light
- blue: 3 pale blue hydrangea heads and 5 small ivory roses, hydrangeas irregular and pale almost lavender, sparse loose uneven amateur bouquet with roses clustered on one side, simple folded ivory paper and blue curling ribbon, resting tilted inside an ordinary shopping bag on a home kitchen floor
Review copy now describes visible differences and practical composition considerations without fabricated purchase experiences.

## Market correction
Removed all automatic demo pricing from live API and cards. Actual auction references take priority, then distance. Partial item references remain visible, missing items do not acquire fake prices. Re-synced 1237 official aggregate rows; roses found at Yangjae, Busan Eomgung/Gangdong, Gwangju, Gimhae. No rose rows in recent Goyang/Eumseong files; no recent Gwacheon file. Existing daily cron remains configured.

