ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';

DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'diegoantmartins89@gmail.com';
  v_password text := 'Au15022020...';
BEGIN
  -- Busca o usuário caso ele já exista
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email LIMIT 1;
  
  IF v_user_id IS NULL THEN
    -- Cria um novo UUID para o usuário administrador
    v_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      aud,
      role
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      '{"name":"Diego Martins Administrador"}',
      'authenticated',
      'authenticated'
    );
  ELSE
    -- Atualiza a senha se o usuário já existir
    UPDATE auth.users
    SET encrypted_password = crypt(v_password, gen_salt('bf'))
    WHERE id = v_user_id;
  END IF;
  
  -- Atualiza o perfil criado automaticamente pela trigger para o tipo 'admin'
  UPDATE public.profiles
  SET role = 'admin', name = 'Diego Martins Administrador'
  WHERE id = v_user_id;

END $$;
