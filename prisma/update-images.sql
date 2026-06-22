-- 상품 이미지를 검증된 Unsplash 실사 꽃 이미지로 업데이트
-- Supabase SQL Editor에서 실행하세요

UPDATE "Product" SET images = ARRAY['https://images.unsplash.com/photo-1778074631493-5bdb54f8ada6?w=800&h=800&fit=crop&q=80']
WHERE name = '봄날의 튤립 다발';

UPDATE "Product" SET images = ARRAY['https://images.unsplash.com/photo-1750369326137-21de716e3224?w=800&h=800&fit=crop&q=80']
WHERE name = '청초한 수국 화분';

UPDATE "Product" SET images = ARRAY['https://images.unsplash.com/photo-1592242690836-0bddd3f89466?w=800&h=800&fit=crop&q=80']
WHERE name = '순백의 백합 부케';

UPDATE "Product" SET images = ARRAY['https://images.unsplash.com/photo-1523693916903-027d144a2b7d?w=800&h=800&fit=crop&q=80']
WHERE name = '열정의 장미 다발';

UPDATE "Product" SET images = ARRAY['https://images.unsplash.com/photo-1508808787069-421e7986016e?w=800&h=800&fit=crop&q=80']
WHERE name = '가을빛 국화 화환';

UPDATE "Product" SET images = ARRAY['https://images.unsplash.com/photo-1528190590778-23ac3ad37dff?w=800&h=800&fit=crop&q=80']
WHERE name = '라벤더 드라이플라워';

UPDATE "Product" SET images = ARRAY['https://images.unsplash.com/photo-1776445602573-0cc8680b4d0a?w=800&h=800&fit=crop&q=80']
WHERE name = '해바라기 미니 화분';

UPDATE "Product" SET images = ARRAY['https://images.unsplash.com/photo-1741803099750-e4102ab379b1?w=800&h=800&fit=crop&q=80']
WHERE name = '파스텔 혼합 꽃다발';

-- 확인
SELECT name, images FROM "Product" ORDER BY name;
