UPDATE "Product"
SET "isActive" = false
WHERE "purchaseType" = 'EXTERNAL'
  AND "partnerName" = '한국화훼농협';
