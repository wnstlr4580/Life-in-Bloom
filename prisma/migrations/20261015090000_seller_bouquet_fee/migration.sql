ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "bouquetMakingFee" INTEGER;
ALTER TABLE "Seller" ADD CONSTRAINT "Seller_bouquetMakingFee_check" CHECK ("bouquetMakingFee" IS NULL OR "bouquetMakingFee" BETWEEN 0 AND 100000);
