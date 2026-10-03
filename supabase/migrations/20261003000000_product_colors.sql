create table if not exists product_colors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  hex text,
  position int not null default 0
);

alter table product_images
  add column if not exists color_id uuid references product_colors(id) on delete set null;

create index if not exists idx_product_colors_product_position
  on product_colors (product_id, position);

create index if not exists idx_product_images_product_color
  on product_images (product_id, color_id);

insert into product_colors (product_id, name, hex, position)
select
  grouped.product_id,
  grouped.color_name,
  grouped.color_hex,
  grouped.min_sort_order
from (
  select
    pi.product_id,
    trim(pi.color_name) as color_name,
    nullif(trim(pi.color_hex), '') as color_hex,
    min(pi.sort_order) as min_sort_order
  from product_images pi
  where nullif(trim(pi.color_name), '') is not null
  group by pi.product_id, trim(pi.color_name), nullif(trim(pi.color_hex), '')
) as grouped
where not exists (
  select 1
  from product_colors pc
  where pc.product_id = grouped.product_id
    and lower(trim(pc.name)) = lower(grouped.color_name)
    and coalesce(lower(trim(pc.hex)), '') = coalesce(lower(trim(grouped.color_hex)), '')
);

with image_color_match as (
  select
    pi.id as image_id,
    pc.id as color_id
  from product_images pi
  join product_colors pc
    on pc.product_id = pi.product_id
   and lower(trim(pc.name)) = lower(trim(pi.color_name))
   and coalesce(lower(trim(pc.hex)), '') = coalesce(lower(trim(pi.color_hex)), '')
)
update product_images pi
set color_id = icm.color_id
from image_color_match icm
where pi.id = icm.image_id
  and pi.color_id is null;

alter table product_colors enable row level security;

drop policy if exists "Public read product_colors" on product_colors;
create policy "Public read product_colors"
  on product_colors for select using (true);

drop policy if exists "Authenticated full product_colors" on product_colors;
create policy "Authenticated full product_colors"
  on product_colors for all to authenticated
  using (true)
  with check (true);

grant select on table product_colors to anon;
grant select, insert, update, delete on table product_colors to authenticated, service_role;
