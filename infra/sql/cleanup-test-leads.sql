-- Select rows we will remove (review before running)
select id, name, email, source, created_at from leads
where id in ('web_test_001','web_test_002')
   or email = 'jan@gmail.com';

-- Delete test leads (run only after review)
delete from leads
where id in ('web_test_001','web_test_002')
   or (email = 'jan@gmail.com' and name = 'Ján Novák');

-- Note: this file is intentionally not executed by CI. Run against your
-- production DB only after backing up and verifying the select above.
