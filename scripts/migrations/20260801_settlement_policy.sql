-- 구매확정 기준 주간 정산을 위한 상세 장부 필드
alter table "Seller" add column if not exists "commissionRate" integer not null default 10;
alter table "Seller" drop constraint if exists "Seller_commissionRate_check";
alter table "Seller" add constraint "Seller_commissionRate_check" check ("commissionRate" between 0 and 100);

alter table "OrderItem"
  add column if not exists "commissionVat" integer not null default 0,
  add column if not exists "shippingFeeAmount" integer not null default 0,
  add column if not exists "discountShare" integer not null default 0,
  add column if not exists "pgFee" integer not null default 0,
  add column if not exists "pgFeeVat" integer not null default 0,
  add column if not exists "adjustmentAmount" integer not null default 0;

-- 기존 주문은 기존 정산액을 보존한다. 신규 주문부터 수수료 VAT와 배송비 귀속 정책을 적용한다.
create index if not exists "OrderItem_settlement_due_idx"
  on "OrderItem" ("settlementStatus", "settlementDueAt");
