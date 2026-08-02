-- 관리자 전역 노출 정책과 판매자 내부 상품 정렬 정책
create table if not exists "ExposurePolicy" (
  "id" text primary key default 'default',
  "nonghyupPriorityEnabled" boolean not null default true,
  "preferredSellerIds" text[] not null default '{}',
  "inventoryMode" text not null default 'NONE',
  "adminPromotionsEnabled" boolean not null default true,
  "sellerPoliciesEnabled" boolean not null default true,
  "updatedAt" timestamptz not null default now(),
  constraint "ExposurePolicy_inventoryMode_check" check ("inventoryMode" in ('NONE', 'HIGH_STOCK', 'LOW_STOCK'))
);

insert into "ExposurePolicy" ("id") values ('default') on conflict ("id") do nothing;

alter table "Seller" add column if not exists "productSortStrategy" text not null default 'MANUAL';
alter table "Seller" drop constraint if exists "Seller_productSortStrategy_check";
alter table "Seller" add constraint "Seller_productSortStrategy_check"
  check ("productSortStrategy" in ('MANUAL', 'LOW_STOCK', 'HIGH_STOCK', 'BEST_SELLING', 'LATEST'));

alter table "Product" add column if not exists "sellerPromoted" boolean not null default false;
alter table "Product" add column if not exists "sellerPriority" integer not null default 0;
alter table "Product" drop constraint if exists "Product_sellerPriority_check";
alter table "Product" add constraint "Product_sellerPriority_check" check ("sellerPriority" between 0 and 100);

create index if not exists "Product_seller_priority_idx"
  on "Product" ("sellerId", "sellerPromoted" desc, "sellerPriority" desc);
