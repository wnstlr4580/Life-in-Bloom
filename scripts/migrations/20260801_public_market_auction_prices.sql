create table if not exists "PublicMarketAuctionPrice" (
  "id" text primary key default gen_random_uuid()::text,
  "marketId" text not null,
  "marketName" text not null,
  "companyCode" text not null,
  "tradeDate" date not null,
  "itemName" text not null,
  "quantity" integer not null,
  "minPrice" integer not null,
  "maxPrice" integer not null,
  "averagePrice" integer not null,
  "sourceUrl" text not null,
  "fetchedAt" timestamptz not null default now(),
  unique ("marketId", "tradeDate", "itemName")
);

create index if not exists "PublicMarketAuctionPrice_lookup_idx"
  on "PublicMarketAuctionPrice" ("marketId", "tradeDate" desc, "itemName");

alter table "PublicMarketAuctionPrice" enable row level security;
