const { chromium } = require('playwright');

async function inspectVoltz() {
  console.log('Inspecionando https://voltz.baseos.online ...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const networkRequests = [];
  page.on('request', req => {
    networkRequests.push({ url: req.url(), method: req.method() });
  });

  try {
    const response = await page.goto('https://voltz.baseos.online', { waitUntil: 'networkidle' });
    console.log('HTTP Status:', response.status());
    console.log('Title:', await page.title());

    // Inspect localStorage
    const storageData = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const res = {};
      for (const k of keys) {
        try {
          res[k] = JSON.parse(localStorage.getItem(k));
        } catch {
          res[k] = localStorage.getItem(k);
        }
      }
      return res;
    });

    console.log('\nChaves do LocalStorage encontradas:', Object.keys(storageData));

    // Check competitions
    if (storageData['voleipro.v1.competitions']) {
      const comps = storageData['voleipro.v1.competitions'];
      console.log(`\nCompetições no LocalStorage (${comps.length}):`);
      comps.forEach(c => {
        console.log(` - ID: ${c.id} | Nome: "${c.name}" | Modalidade: ${c.modality} | Status: ${c.status} | Criada em: ${c.createdAt}`);
      });
    }

    // Check auth/session
    if (storageData['voleipro.auth.session.v1']) {
      console.log('\nSessão de Auth Local:', storageData['voleipro.auth.session.v1']);
    }

    // Check banner or text in page
    const bannerText = await page.evaluate(() => {
      const banner = document.querySelector('[role="alert"], .bg-amber-500\\/10, [class*="alert"]');
      return banner ? banner.textContent : null;
    });
    console.log('\nBanner detectado na UI:', bannerText);

    // Filter network requests to see if any backend API / Supabase was called
    const apiRequests = networkRequests.filter(r => !r.url.includes('/assets/') && !r.url.includes('/fonts.') && !r.url.includes('google'));
    console.log('\nRequisições de Rede (não-estáticas):', apiRequests);

  } catch (err) {
    console.error('Erro ao inspecionar voltz.baseos.online:', err);
  } finally {
    await browser.close();
  }
}

inspectVoltz();
