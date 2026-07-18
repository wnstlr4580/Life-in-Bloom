alter table "Product"
  add column if not exists "deliveryDays" text[] not null default '{}',
  add column if not exists "deliveryStartTime" text,
  add column if not exists "deliveryEndTime" text,
  add column if not exists "displayStartAt" timestamptz,
  add column if not exists "displayEndAt" timestamptz;

create index if not exists "Product_display_period_idx"
  on "Product" ("isActive", "displayStartAt", "displayEndAt");
