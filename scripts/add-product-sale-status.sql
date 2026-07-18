alter table "Product"
  add column if not exists "saleStatus" text not null default 'ON_SALE';

update "Product"
set "saleStatus" = case
  when "isActive" = false then 'PAUSED'
  else 'ON_SALE'
end
where "saleStatus" is null or "saleStatus" not in ('ON_SALE', 'PAUSED', 'HIDDEN');

update "Product"
set "saleStatus" = 'PAUSED'
where "isActive" = false and "saleStatus" = 'ON_SALE';

create index if not exists "Product_sale_status_idx"
  on "Product" ("sellerId", "saleStatus");
