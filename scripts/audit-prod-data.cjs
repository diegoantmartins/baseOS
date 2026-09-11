const https = require('https');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const BASE_URL = "https://voltz.baseos.online/rest/v1";

async function getCount(table) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/${table}?select=count`;
    const req = https.request(url, {
      method: 'HEAD',
      headers: {
        'apikey': API_KEY,
        'Authorization': `Bearer ${API_KEY}`,
        'Range-Unit': 'items',
        'Prefer': 'count=exact'
      }
    }, (res) => {
      const cr = res.headers['content-range'];
      if (cr) {
        const parts = cr.split('/');
        resolve(parseInt(parts[1], 10) || 0);
      } else {
        resolve(0);
      }
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const tables = [
    'competitions',
    'teams',
    'competition_teams',
    'competition_athletes',
    'matches',
    'competition_match_slots',
    'competition_rounds',
    'competition_stages',
    'profiles'
  ];

  console.log('--- CONTAGEM DE DADOS EM PRODUÇÃO (voltz.baseos.online) ---');
  for (const t of tables) {
    try {
      const count = await getCount(t);
      console.log(`${t}: ${count}`);
    } catch (e) {
      console.log(`${t}: ERRO (${e.message})`);
    }
  }
}

run();
