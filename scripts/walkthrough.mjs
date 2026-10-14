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
  console.log('3. Configuring Admin (Service Role style)...');
  const adminEmail = 'admin-homolog5@baseos.online';
  
  let adminUserId;
  const { data: signUpData, error: signUpErr } = await supabase.rpc('provision_organization_admin', {
    p_email: adminEmail,
    p_password: 'Password123!',
    p_name: 'Admin Homolog 5',
    p_organization_id: orgId
  });
  
  if (signUpErr) {
    throw new Error('Create User failed: ' + signUpErr.message);
  } else {
    if (!signUpData.ok) throw new Error('Create User logical failed: ' + signUpData.error);
    adminUserId = signUpData.user_id;
  }
  
  console.log('Admin Auth User created. ID:', adminUserId);
  
  // Profiles and Membership are created by the RPC!
  // Skipping manual insert...
  
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
    name: 'Equipe de Teste',
    short_name: 'EQT'
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
    team_name: 'Equipe de Teste',
    team_short_name: 'EQT',
    access_token: crypto.randomBytes(16).toString('hex'),
    registration_deadline: new Date(Date.now() + 86400000).toISOString(),
    status: 'approved'
  });
  if (ctErr) throw new Error('Link failed: ' + ctErr.message);
  console.log('Team linked. CT ID:', ctId);
  
  console.log('--- WALKTHROUGH SUCCESSFUL ---');
  console.log(JSON.stringify({
    orgId,
    adminUserId,
    compId,
    teamId,
    ctId
  }, null, 2));
}

run().catch(console.error);
