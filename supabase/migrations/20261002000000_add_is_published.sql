alter table products
  add column if not exists is_published boolean;

update products
set is_published = true
where is_published is null;

alter table products
  alter column is_published set default true,
  alter column is_published set not null;
