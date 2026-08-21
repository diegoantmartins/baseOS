import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();
  
  console.log('Navegando para https://sistemagdc.com.br/ ...');
  await page.goto('https://sistemagdc.com.br/', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Aguarda carregar elementos da interface
  await page.waitForTimeout(2000);
  
  const screenshotPath = '/home/diego-martins/.gemini/antigravity-ide/brain/6e877f8a-f8f4-4606-8f90-988b662b3438/scratch/sistemagdc.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot salva em: ${screenshotPath}`);

  // Coleta botões e textos visíveis
  const title = await page.title();
  const buttons = await page.$$eval('.x-btn-inner, .x-btn, button, a', els => 
    els.map(el => el.textContent?.trim()).filter(Boolean)
  );

  console.log('Título:', title);
  console.log('Botões/Opções encontradas:', buttons);

  await browser.close();
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
