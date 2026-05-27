-- Remove transient auth trigger debug metadata from existing users.

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'trigger_error'
WHERE raw_user_meta_data ? 'trigger_error';
