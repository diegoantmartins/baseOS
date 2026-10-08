import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Server configuration error: missing Supabase credentials.');
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify caller (Master/Platform Admin)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token);

    if (callerError || !caller) {
      throw new Error('Unauthorized');
    }

    // Fetch caller profile to verify platform_admin status
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_platform_admin, role')
      .eq('id', caller.id)
      .single();

    if (profileError || !callerProfile?.is_platform_admin) {
      throw new Error('Forbidden: Only platform administrators can provision organization admins.');
    }

    const { email, password, name, organizationId, invitedBy } = await req.json();

    if (!email || !password || !name || !organizationId) {
      throw new Error('Missing required fields.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Create or find user in Auth
    let userId: string;
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      user_metadata: { name },
      email_confirm: true,
    });

    if (createError) {
      if (
        createError.message?.toLowerCase().includes('already been registered') ||
        createError.message?.toLowerCase().includes('email exists') ||
        createError.status === 422
      ) {
        // Find existing user by email via profiles
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', normalizedEmail)
          .single();

        if (!existingProfile?.id) {
          throw new Error('User exists but profile not found. Manual intervention required.');
        }
        userId = existingProfile.id;
      } else {
        throw new Error(`Failed to create Auth user: ${createError.message}`);
      }
    } else {
      userId = createData.user.id;
    }

    // 2. Upsert profile with role='admin'
    const { error: upsertError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email: normalizedEmail,
      name: name.trim(),
      role: 'admin',
      organization_id: organizationId,
      updated_at: new Date().toISOString(),
    });

    if (upsertError) {
      throw new Error(`Failed to configure profile: ${upsertError.message}`);
    }

    // 3. Create or update user_membership
    const { data: existingMembership } = await supabaseAdmin
      .from('user_memberships')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    let membershipId: string;
    if (existingMembership?.id) {
      await supabaseAdmin
        .from('user_memberships')
        .update({ role: 'admin', status: 'active', updated_at: new Date().toISOString() })
        .eq('id', existingMembership.id);
      membershipId = existingMembership.id;
    } else {
      // Need a unique ID for membership. Assuming format 'mem_xxx' or just uuid if not specific.
      const newMembershipId = 'mem_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
      const { error: insertError } = await supabaseAdmin
        .from('user_memberships')
        .insert({
          id: newMembershipId,
          user_id: userId,
          organization_id: organizationId,
          role: 'admin',
          status: 'active',
          invited_by: invitedBy,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        throw new Error(`Failed to create membership: ${insertError.message}`);
      }
      membershipId = newMembershipId;
    }

    return new Response(
      JSON.stringify({ ok: true, userId, membershipId, email: normalizedEmail }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
