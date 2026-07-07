-- 용도별 분류 + 상품 확충
-- Supabase SQL Editor에서 실행하세요.

-- 1) 용도 태그 컬럼 추가 (생일/축하/개업/결혼/추모/감사)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "useTags" TEXT[] DEFAULT '{}';

-- 2) 기존 상품에 용도 태그 달기 (이름 기준)
UPDATE "Product" SET "useTags" = ARRAY['생일','감사'] WHERE name LIKE '%튤립%' AND "useTags" = '{}';
UPDATE "Product" SET "useTags" = ARRAY['결혼','감사'] WHERE name LIKE '%백합%' AND "useTags" = '{}';
UPDATE "Product" SET "useTags" = ARRAY['생일','결혼'] WHERE name LIKE '%장미%' AND "useTags" = '{}';
UPDATE "Product" SET "useTags" = ARRAY['생일','축하'] WHERE name LIKE '%혼합%' AND "useTags" = '{}';
UPDATE "Product" SET "useTags" = ARRAY['축하']       WHERE name LIKE '%수국%' AND "useTags" = '{}';
UPDATE "Product" SET "useTags" = ARRAY['개업','축하'] WHERE name LIKE '%해바라기%' AND "useTags" = '{}';
UPDATE "Product" SET "useTags" = ARRAY['감사']       WHERE name LIKE '%라벤더%' AND "useTags" = '{}';
UPDATE "Product" SET "useTags" = ARRAY['추모']       WHERE name LIKE '%국화%' AND "useTags" = '{}';

-- 3) 신규 상품 12종 (이미지는 배포에 포함된 /flowers/*.jpg 사용)
INSERT INTO "Product"
  (id, name, description, price, stock, category, images, "flowerMeaning", "ohaengTags", "seasonTags", "colorTags", "useTags", "isActive", "createdAt")
VALUES
  ('prod_wreath_congrats1', '축하화환 3단 — 핑크 거베라', '개업·행사를 화사하게 빛내주는 프리미엄 3단 축하화환입니다. 리본 문구를 무료로 넣어드려요.', 150000, 5, 'wreath', ARRAY['/flowers/pink_gerbera.jpg'], '언제나 밝은 마음', ARRAY['화'], ARRAY['all'], ARRAY['pink'], ARRAY['축하','개업'], true, NOW()),
  ('prod_wreath_congrats2', '개업 축하화환 — 오렌지 거베라', '새로운 시작을 응원하는 밝은 오렌지빛 축하화환입니다.', 120000, 5, 'wreath', ARRAY['/flowers/orange_gerbera.jpg'], '풍성한 결실', ARRAY['화','토'], ARRAY['all'], ARRAY['orange'], ARRAY['개업','축하'], true, NOW()),
  ('prod_wreath_mourn1', '근조화환 3단 — 흰 국화', '깊은 애도의 마음을 정중하게 전하는 흰 국화 3단 근조화환입니다.', 130000, 5, 'wreath', ARRAY['/flowers/white_mum.jpg'], '성실과 애도', ARRAY['금'], ARRAY['all'], ARRAY['white'], ARRAY['추모'], true, NOW()),
  ('prod_wreath_mourn2', '근조 바구니 — 흰 백합', '조문 자리에 조용히 마음을 전하는 백합 근조 바구니입니다.', 80000, 8, 'wreath', ARRAY['/flowers/white_lily.jpg'], '순수한 애도', ARRAY['금'], ARRAY['all'], ARRAY['white'], ARRAY['추모'], true, NOW()),
  ('prod_bq_birthday_rose', '생일 꽃다발 — 핑크 장미', '생일 주인공을 위한 사랑스러운 핑크 장미 꽃다발입니다.', 45000, 15, 'bouquet', ARRAY['/flowers/pink_rose.jpg'], '행복한 사랑', ARRAY['화'], ARRAY['all'], ARRAY['pink'], ARRAY['생일','축하'], true, NOW()),
  ('prod_bq_propose_rose', '프로포즈 꽃다발 — 빨간 장미', '평생 잊지 못할 순간을 위한 빨간 장미 프로포즈 꽃다발입니다.', 89000, 10, 'bouquet', ARRAY['/flowers/red_rose.jpg'], '뜨거운 사랑', ARRAY['화'], ARRAY['all'], ARRAY['red'], ARRAY['결혼'], true, NOW()),
  ('prod_bq_wedding_calla', '웨딩 부케 — 화이트 카라', '우아한 화이트 카라로 만든 순백의 웨딩 부케입니다.', 110000, 5, 'bouquet', ARRAY['/flowers/white_calla.jpg'], '순수한 아름다움', ARRAY['금'], ARRAY['spring','summer'], ARRAY['white'], ARRAY['결혼'], true, NOW()),
  ('prod_bq_thanks_carnation', '감사 꽃다발 — 카네이션', '고마운 마음을 전하는 붉은 카네이션 꽃다발입니다. 부모님·스승님께 좋아요.', 38000, 20, 'bouquet', ARRAY['/flowers/red_carnation.jpg'], '존경과 감사', ARRAY['화'], ARRAY['spring'], ARRAY['red'], ARRAY['감사'], true, NOW()),
  ('prod_bq_baby_sweetpea', '출산 축하 꽃다발 — 스위트피', '새 생명의 탄생을 축하하는 파스텔빛 스위트피 꽃다발입니다.', 52000, 10, 'bouquet', ARRAY['/flowers/pink_sweatpea.jpg'], '작은 기쁨', ARRAY['화'], ARRAY['spring'], ARRAY['pink'], ARRAY['축하'], true, NOW()),
  ('prod_bq_cheer_sunflower', '응원 꽃다발 — 해바라기', '힘내라는 마음을 담은 밝은 해바라기 꽃다발입니다.', 42000, 12, 'bouquet', ARRAY['/flowers/yellow_sunflower.jpg'], '당신만 바라봐요', ARRAY['토'], ARRAY['summer'], ARRAY['yellow'], ARRAY['축하','감사'], true, NOW()),
  ('prod_plant_eucalyptus', '집들이 화분 — 유칼립투스', '새 보금자리에 싱그러운 초록을 더하는 유칼립투스 화분입니다.', 35000, 10, 'plant', ARRAY['/flowers/green_eucalyptus.jpg'], '추억과 회복', ARRAY['목'], ARRAY['all'], ARRAY['green'], ARRAY['축하','개업'], true, NOW()),
  ('prod_bq_mini_chamomile', '미니 부케 — 캐모마일', '부담 없이 건네기 좋은 캐모마일 미니 부케입니다.', 25000, 25, 'bouquet', ARRAY['/flowers/white_chamomile.jpg'], '힘든 날을 이겨내는 힘', ARRAY['금','토'], ARRAY['spring','summer'], ARRAY['white'], ARRAY['생일','감사'], true, NOW())
ON CONFLICT (id) DO NOTHING;
