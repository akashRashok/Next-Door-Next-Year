declare const chrome: any;
import { extractListingAddress, isSupportedListingUrl } from './listing.js';
export {};

type RecordEvidence = { reference: string; stage: string; summary: string; url: string; source: string };
type Project = { kind: 'verified' | 'candidate'; id: string; title: string; address: string | null; metres: number; direction: string; checkedAt: string; evidenceScope: string; records?: RecordEvidence[]; question?: string; stage?: string | null; source?: string; date?: string | null };
type Lookup = { matchScope: string; matchedAddress: string | null; facts: { bedrooms: number | null; bathrooms: number | null } | null; coverage: string; projects: Project[]; checkedAt: string; message: string | null };

const form = document.querySelector<HTMLFormElement>('#address-form')!;
const input = document.querySelector<HTMLInputElement>('#address')!;
const result = document.querySelector<HTMLDivElement>('#result')!;
const readButton = document.querySelector<HTMLButtonElement>('#read-listing')!;
const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
const extractNote = document.querySelector<HTMLParagraphElement>('#extract-note')!;
let requestNumber = 0;
let controller: AbortController | null = null;
let activeTabId: number | null = null;
let activeUrl = '';

function node<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', content = ''): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content) element.textContent = content;
  return element;
}
function section(title: string, step: string): HTMLElement {
  const wrap = node('section', 'result-section');
  const heading = node('div', 'result-heading');
  heading.append(node('span', 'step', step), node('h2', '', title));
  wrap.append(heading);
  return wrap;
}
function status(message: string, kind = ''): HTMLElement {
  return node('p', `status ${kind}`, message);
}
function clear(): void {
  requestNumber++;
  controller?.abort();
  controller = null;
  result.replaceChildren();
  extractNote.textContent = '';
  submitButton.disabled = false;
  readButton.disabled = false;
}
function safeUrl(url: string): string | null {
  try { const parsed = new URL(url); return parsed.protocol === 'https:' ? parsed.href : null; } catch { return null; }
}
function addLink(parent: HTMLElement, label: string, url: string): void {
  const safe = safeUrl(url);
  if (!safe) return;
  const link = node('a', '', label);
  link.href = safe;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  parent.append(link);
}
function render(data: Lookup): void {
  result.replaceChildren();
  const match = section('Address match', '02');
  if (data.matchedAddress) match.append(node('p', 'match', data.matchedAddress));
  const scope = data.matchScope === 'unit' ? 'Verified unit' : data.matchScope === 'building' ? 'Building only' : data.matchScope.replaceAll('_', ' ');
  match.append(node('p', `meta match-scope ${data.matchScope === 'building' ? 'building' : ''}`, scope));
  if (data.facts?.bedrooms !== null && data.facts?.bedrooms !== undefined) {
    const fact = node('div', 'fact');
    fact.append(node('strong', '', String(data.facts.bedrooms)), document.createTextNode(data.facts.bedrooms === 1 ? 'bedroom' : 'bedrooms'));
    match.append(fact);
  }
  if (data.message) match.append(status(data.message, data.coverage === 'checked' ? '' : 'warn'));
  result.append(match);
  if (!data.projects.length) return;
  const plans = section('Nearby planning', '03');
  const heading = plans.querySelector('.result-heading')!;
  const headingRow = node('div', 'plans-heading');
  headingRow.append(heading, node('span', 'plan-count', `${data.projects.length} ${data.projects.length === 1 ? 'site' : 'sites'}`));
  plans.prepend(headingRow);
  plans.append(node('p', 'meta plans-intro', 'Within 300 m · straight-line distance'));
  for (const project of data.projects) {
    const card = node('article', 'project');
    const chips = node('div', 'chips');
    chips.append(node('span', `chip ${project.kind === 'candidate' ? 'candidate' : ''}`, project.kind === 'verified' ? 'Manually verified' : 'Unverified candidate'));
    card.append(chips);
    card.append(node('h3', '', project.title));
    const proximity = node('p', 'proximity');
    proximity.append(node('strong', '', String(project.metres)), document.createTextNode(`m ${project.direction}`));
    card.append(proximity);
    if (project.address) card.append(node('p', 'project-address', project.address));
    if (project.kind === 'verified' && project.records) {
      for (const record of project.records) {
        const row = node('div', 'record');
        row.append(node('strong', '', `${record.stage} · ${record.reference}`));
        row.append(node('p', '', record.summary));
        addLink(row, `Open ${record.source} ↗`, record.url);
        card.append(row);
      }
      if (project.question) {
        const question = node('div', 'question');
        question.append(node('strong', '', 'Ask at inspection'), document.createTextNode(project.question));
        card.append(question);
      }
    } else {
      if (project.stage) card.append(node('p', '', `Reported stage: ${project.stage}`));
      card.append(node('p', 'candidate-note', 'Microburbs candidate only. Check the council or NSW portal for an official status and documents.'));
    }
    card.append(node('small', '', `Checked ${project.checkedAt.slice(0, 10)} · ${project.evidenceScope}`));
    plans.append(card);
  }
  result.append(plans);
}

async function search(address: string): Promise<void> {
  clear();
  const sequence = requestNumber;
  controller = new AbortController();
  submitButton.disabled = true;
  readButton.disabled = true;
  result.append(section('Address match', '02'));
  result.querySelector('section')?.append(status('Checking this address and nearby records…'));
  try {
    const response = await fetch('http://127.0.0.1:8787/api/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address }), signal: controller.signal });
    const body = await response.json();
    if (sequence !== requestNumber) return;
    if (!response.ok) throw new Error(body.message || 'Could not check this address.');
    render(body as Lookup);
  } catch (error) {
    if (sequence !== requestNumber || (error as Error).name === 'AbortError') return;
    result.replaceChildren();
    const box = section('Address match', '02');
    box.append(status(error instanceof Error ? error.message : 'The lookup failed. Retry shortly.', 'error'));
    result.append(box);
  } finally {
    if (sequence === requestNumber) {
      submitButton.disabled = false;
      readButton.disabled = false;
      controller = null;
    }
  }
}

form.addEventListener('submit', event => { event.preventDefault(); void search(input.value.trim()); });

function listingAddressCandidates(): string[] {
  const candidates: string[] = [];
  const add = (value: unknown): void => {
    if (typeof value === 'string' && value.trim() && !candidates.includes(value)) candidates.push(value);
  };
  for (const element of Array.from(document.querySelectorAll('h1, [data-testid*="address"], [itemprop="streetAddress"]'))) {
    add(element.textContent);
  }
  add(document.querySelector('meta[property="og:title"]')?.getAttribute('content'));
  add(document.querySelector('meta[name="twitter:title"]')?.getAttribute('content'));
  add(document.title);
  for (const script of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
    try {
      const walk = (value: unknown, depth: number): void => {
        if (depth > 5 || !value || typeof value !== 'object') return;
        if (Array.isArray(value)) { for (const item of value) walk(item, depth + 1); return; }
        const item = value as Record<string, unknown>;
        add(item.name);
        add(item.headline);
        if (typeof item.address === 'string') add(item.address);
        if (item.address && typeof item.address === 'object' && !Array.isArray(item.address)) {
          const address = item.address as Record<string, unknown>;
          if (typeof address.streetAddress === 'string' && typeof address.addressLocality === 'string') {
            add(`${address.streetAddress}, ${address.addressLocality}, ${address.addressRegion || ''} ${address.postalCode || ''}`);
          }
        }
        for (const child of Object.values(item)) walk(child, depth + 1);
      };
      walk(JSON.parse(script.textContent || 'null'), 0);
    } catch { /* Malformed metadata should not block visible page content. */ }
  }
  return candidates.slice(0, 40);
}

readButton.addEventListener('click', async () => {
  extractNote.textContent = '';
  readButton.disabled = true;
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab?.id || !isSupportedListingUrl(tab.url || '')) {
      extractNote.textContent = 'Open an individual realestate.com.au or Domain property page, or enter the address above.';
      input.focus(); return;
    }
    const run = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: listingAddressCandidates });
    const address = extractListingAddress(run?.[0]?.result || []);
    if (!address) { extractNote.textContent = 'This page did not expose a clear NSW address. Enter it above.'; input.focus(); return; }
    input.value = address;
    await search(address);
  } catch { extractNote.textContent = 'Could not read this page. Enter the address above.'; input.focus(); }
  finally { readButton.disabled = false; }
});

async function refreshTab(): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (tab?.id !== activeTabId || (tab?.url || '') !== activeUrl) {
    clear(); input.value = '';
    activeTabId = tab?.id ?? null;
    activeUrl = tab?.url || '';
  }
}
chrome.tabs.onActivated.addListener(() => { void refreshTab(); });
chrome.tabs.onUpdated.addListener((id: number, info: { url?: string }) => { if (id === activeTabId && info.url) void refreshTab(); });
void refreshTab();
