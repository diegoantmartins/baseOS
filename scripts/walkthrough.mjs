import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import ws from 'ws';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://api.baseos.online';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!anonKey) {
  console.error('VITE_SUPABASE_ANON_KEY is required in env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { 'x-my-custom-header': 'baseos' } }, auth: { persistSession: false }, realtime: { transport: ws } });

async function run() {
  console.log('--- STARTING WALKTHROUGH ---');
  
  // 1. Login Master
  console.log('1. Login Master...');
  const { data: masterAuth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'diegomartins@baseos.online',
    password: 'Au15022020...'
  });
  
  if (authErr) throw new Error('Master login failed: ' + authErr.message);
  console.log('Master logged in. UID:', masterAuth.user.id);
  
  // 2. Create Organization
  console.log('2. Creating Organization...');
  const orgId = 'org_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  const { error: orgErr } = await supabase.from('organizations').insert({
    id: orgId,
    name: 'BaseOS Homologação Fase 1A',
    status: 'active'
  });
  
  if (orgErr) throw new Error('Failed to create org: ' + orgErr.message);
  console.log('Organization created. ID:', orgId);
  
  // 3. Configure Admin
  console.log('3. Configuring Admin (Fallback style)...');
  const adminEmail = 'admin-homolog4@baseos.online';
  
  // Create temp client for signUp
  const tempClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: ws } });
  let adminUserId;
  const { data: signUpData, error: signUpErr } = await tempClient.auth.signUp({
    email: adminEmail,
    password: 'Password123!',
    options: { data: { name: 'Admin Homolog 2' } }
  });
  
  if (signUpErr) {
    if (signUpErr.message.includes('already')) {
      const { data: existing } = await supabase.from('profiles').select('id').eq('email', adminEmail).single();
      if (!existing) throw new Error('Email exists but no profile');
      adminUserId = existing.id;
    } else {
      throw new Error('SignUp failed: ' + signUpErr.message);
    }
  } else {
    adminUserId = signUpData.user.id;
  }
  
  console.log('Admin Auth User created. ID:', adminUserId);
  
  // Master inserts Profile
  const { error: profErr } = await supabase.from('profiles').upsert({
    id: adminUserId,
    email: adminEmail,
    name: 'Admin Homolog 2',
    role: 'admin',
    organization_id: orgId
  });
  if (profErr) throw new Error('Profile upsert failed: ' + profErr.message);
  
  // Master inserts Membership
  const memId = 'mem_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  const { error: memErr } = await supabase.from('user_memberships').upsert({
    id: memId,
    user_id: adminUserId,
    organization_id: orgId,
    role: 'admin',
    status: 'active'
  });
  if (memErr) throw new Error('Membership upsert failed: ' + memErr.message);
  console.log('Admin Profile and Membership created. Mem ID:', memId);
  
  // 4. Logout Master
  await supabase.auth.signOut();
  console.log('Master logged out.');
  
  // 5. Login Admin
  console.log('5. Login Admin...');
  const { data: adminAuth, error: adminAuthErr } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: 'Password123!'
  });
  if (adminAuthErr) throw new Error('Admin login failed: ' + adminAuthErr.message);
  console.log('Admin logged in. UID:', adminAuth.user.id);
  
  // 6. Create Competition
  console.log('6. Creating Competition...');
  const compId = 'comp_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  const { error: compErr } = await supabase.from('competitions').insert({
    id: compId,
    organization_id: orgId,
    name: 'Campeonato de Homologação',
    status: 'planning',
    modality: 'indoor'
  });
  if (compErr) throw new Error('Competition creation failed: ' + compErr.message);
  console.log('Competition created. ID:', compId);
  
  // 7. Create Team
  console.log('7. Creating Team...');
  const teamId = 'team_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  const { error: teamErr } = await supabase.from('teams').insert({
    id: teamId,
    organization_id: orgId,
    name: 'Equipe de Teste'
  });
  if (teamErr) throw new Error('Team creation failed: ' + teamErr.message);
  console.log('Team created. ID:', teamId);
  
  // 8. Link Team
  console.log('8. Linking Team to Competition...');
  const ctId = 'ct_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  const { error: ctErr } = await supabase.from('competition_teams').insert({
    id: ctId,
    competition_id: compId,
    team_id: teamId,
    status: 'active'
  });
  if (ctErr) throw new Error('Link failed: ' + ctErr.message);
  console.log('Team linked. CT ID:', ctId);
  
  console.log('--- WALKTHROUGH SUCCESSFUL ---');
  console.log(JSON.stringify({
    orgId,
    adminUserId,
    memId,
    compId,
    teamId,
    ctId
  }, null, 2));
}

run().catch(console.error);
