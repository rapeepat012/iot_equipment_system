-- PostgreSQL schema for IoT Equipment System (Supabase)
-- Run this in Supabase SQL Editor.

begin;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists users (
  id bigserial primary key,
  student_id varchar(12) not null unique,
  email varchar(50) not null unique,
  fullname varchar(100) not null,
  password varchar(255) not null,
  role varchar(20) not null default 'user',
  status varchar(20) not null default 'active',
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp,
  constraint chk_users_role check (role in ('admin', 'staff', 'user')),
  constraint chk_users_status check (status in ('active', 'inactive', 'suspended'))
);

create table if not exists equipment (
  id bigserial primary key,
  name varchar(100) not null,
  description text,
  category varchar(50),
  image_url varchar(255),
  quantity_total integer not null default 0,
  quantity_available integer not null default 0,
  status varchar(20) not null default 'available',
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp,
  constraint chk_equipment_status check (
    status in ('available', 'limited', 'unavailable', 'maintenance', 'borrowed', 'lost')
  )
);

create table if not exists borrow_requests (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  request_date timestamp not null default current_timestamp,
  borrow_date date not null,
  return_date date not null,
  status varchar(20) not null default 'pending',
  approver_id bigint,
  approver_name varchar(100),
  approved_at timestamp,
  notes text,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp,
  constraint chk_borrow_requests_status check (status in ('pending', 'approved', 'rejected', 'completed'))
);

create table if not exists borrow_request_items (
  id bigserial primary key,
  request_id bigint not null references borrow_requests(id) on delete cascade,
  equipment_id bigint not null references equipment(id) on delete cascade,
  quantity_requested integer not null,
  quantity_approved integer not null default 0,
  created_at timestamp not null default current_timestamp
);

create table if not exists borrowing (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  equipment_id bigint not null references equipment(id) on delete cascade,
  borrow_date timestamp not null,
  return_date timestamp,
  due_date timestamp not null,
  status varchar(20) not null default 'borrowed',
  notes text,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp,
  constraint chk_borrowing_status check (status in ('borrowed', 'returned', 'overdue', 'lost'))
);

create table if not exists borrowing_history (
  id bigserial primary key,
  borrowing_id bigint not null references borrowing(id) on delete cascade,
  user_id bigint not null references users(id) on delete cascade,
  equipment_id bigint not null references equipment(id) on delete cascade,
  approver_id bigint,
  approver_name varchar(100),
  equipment_names text,
  action varchar(20) not null,
  action_date timestamp not null,
  notes text,
  created_at timestamp not null default current_timestamp,
  constraint chk_borrowing_history_action check (action in ('borrow', 'return', 'extend', 'lost', 'approve'))
);

create table if not exists pending_registrations (
  id bigserial primary key,
  fullname varchar(100) not null,
  email varchar(50) not null unique,
  student_id varchar(14) not null unique,
  password_hash varchar(255) not null,
  role varchar(20) not null default 'user',
  status varchar(20) not null default 'pending',
  notes text,
  requested_at timestamp not null default current_timestamp,
  reviewed_at timestamp,
  constraint chk_pending_role check (role in ('admin', 'staff', 'user')),
  constraint chk_pending_status check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists idx_borrowing_user_id on borrowing(user_id);
create index if not exists idx_borrowing_equipment_id on borrowing(equipment_id);
create index if not exists idx_borrowing_status on borrowing(status);
create index if not exists idx_borrowing_borrow_date on borrowing(borrow_date);
create index if not exists idx_borrowing_due_date on borrowing(due_date);

create index if not exists idx_borrowing_history_borrowing_id on borrowing_history(borrowing_id);
create index if not exists idx_borrowing_history_user_id on borrowing_history(user_id);
create index if not exists idx_borrowing_history_equipment_id on borrowing_history(equipment_id);
create index if not exists idx_borrowing_history_action on borrowing_history(action);
create index if not exists idx_borrowing_history_action_date on borrowing_history(action_date);

create index if not exists idx_borrow_requests_user_id on borrow_requests(user_id);
create index if not exists idx_borrow_requests_status on borrow_requests(status);
create index if not exists idx_borrow_requests_request_date on borrow_requests(request_date);
create index if not exists idx_borrow_requests_borrow_date on borrow_requests(borrow_date);

create index if not exists idx_borrow_request_items_request_id on borrow_request_items(request_id);
create index if not exists idx_borrow_request_items_equipment_id on borrow_request_items(equipment_id);

create index if not exists idx_equipment_status on equipment(status);
create index if not exists idx_equipment_category on equipment(category);
create index if not exists idx_equipment_name on equipment(name);

create index if not exists idx_users_student_id on users(student_id);
create index if not exists idx_users_email on users(email);
create index if not exists idx_users_role on users(role);
create index if not exists idx_users_status on users(status);

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
before update on users
for each row
execute function set_updated_at();

drop trigger if exists trg_equipment_updated_at on equipment;
create trigger trg_equipment_updated_at
before update on equipment
for each row
execute function set_updated_at();

drop trigger if exists trg_borrow_requests_updated_at on borrow_requests;
create trigger trg_borrow_requests_updated_at
before update on borrow_requests
for each row
execute function set_updated_at();

drop trigger if exists trg_borrowing_updated_at on borrowing;
create trigger trg_borrowing_updated_at
before update on borrowing
for each row
execute function set_updated_at();

create or replace view active_borrowing as
select
  b.id,
  b.user_id,
  u.student_id,
  u.fullname,
  u.email,
  b.equipment_id,
  e.name as equipment_name,
  b.borrow_date,
  b.due_date,
  b.status,
  case
    when b.due_date < now() and b.status = 'borrowed' then 'overdue'
    else b.status
  end as current_status
from borrowing b
join users u on b.user_id = u.id
join equipment e on b.equipment_id = e.id
where b.status in ('borrowed', 'overdue');

commit;

