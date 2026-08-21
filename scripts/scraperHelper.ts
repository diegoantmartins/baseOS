import { ApifyClient } from 'apify-client';
import { chromium } from 'playwright';
import * as dotenv from 'dotenv';

dotenv.config();

const APIFY_TOKEN = process.env.APIFY_TOKEN;

/**
 * Exemplo 1: Utilizando o Apify Client com a API configurada
 */
export async function runApifyActor(actorId: string, inputData: Record<string, unknown>) {
  if (!APIFY_TOKEN) {
    throw new Error('APIFY_TOKEN não configurado no arquivo .env');
  }

  const client = new ApifyClient({
    token: APIFY_TOKEN,
  });

  console.log(`Iniciando Actor do Apify: ${actorId}...`);
  const run = await client.actor(actorId).call(inputData);

  console.log(`Execução finalizada com status: ${run.status}`);
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  return items;
}

/**
 * Exemplo 2: Utilizando o Playwright para scraping direto e navegação web
 */
export async function scrapeWithPlaywright(url: string) {
  console.log(`Navegando com Playwright para: ${url}...`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const pageTitle = await page.title();
  console.log(`Título da página: ${pageTitle}`);

  await browser.close();
  return { pageTitle };
}
