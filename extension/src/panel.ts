declare const chrome: any;
export {};

type RecordEvidence = { reference: string; stage: string; summary: string; url: string; source: string };
type Project = { kind: 'verified' | 'candidate'; id: string; title: string; address: string | null; metres: number; direction: string; checkedAt: string; evidenceScope: string; records?: RecordEvidence[]; question?: string; stage?: string | null; source?: string; date?: string | null };
type Lookup = { matchScope: string; matchedAddress: string | null; facts: { bedrooms: number | null; bathrooms: number | null } | null; coverage: string; projects: Project[]; checkedAt: string; message: string | null };

const form = document.querySelector<HTMLFormElement>('#address-form')!;
const input = document.querySelector<HTMLInputElement>('#address')!;
const result = document.querySelector<HTMLDivElement>('#result')!;
const readButton = document.querySelector<HTMLButtonElement>('#read-listing')!;
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
function section(title: string): HTMLElement {
  const wrap = node('section', 'result-section');
  wrap.append(node('h2', '', title));
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
  const match = section('Address match');
  if (data.matchedAddress) match.append(node('p', 'match', data.matchedAddress));
  const scope = data.matchScope === 'unit' ? 'Verified unit' : data.matchScope === 'building' ? 'Building only' : data.matchScope.replaceAll('_', ' ');
  match.append(node('p', 'meta', scope));
  if (data.facts?.bedrooms !== null && data.facts?.bedrooms !== undefined) {
    const fact = node('div', 'fact');
    fact.append(node('strong', '', String(data.facts.bedrooms)), document.createTextNode(data.facts.bedrooms === 1 ? 'bedroom' : 'bedrooms'));
    match.append(fact);
  }
  if (data.message) match.append(status(data.message, data.coverage === 'checked' ? '' : 'warn'));
  result.append(match);
  if (!data.projects.length) return;
  const plans = section('Nearby planning');
  plans.append(node('p', 'meta', 'Projects within 300 m · straight-line distance'));
  for (const project of data.projects) {
    const card = node('article', 'project');
    card.append(node('h3', '', project.title));
    const chips = node('div', 'chips');
    chips.append(node('span', `chip ${project.kind === 'candidate' ? 'candidate' : ''}`, project.kind === 'verified' ? 'Manually verified' : 'Unverified candidate'));
    chips.append(node('span', 'chip', `${project.metres} m ${project.direction}`));
    card.append(chips);
    if (project.address) card.append(node('p', '', project.address));
    if (project.kind === 'verified' && project.records) {
      for (const record of project.records) {
        const row = node('div', 'record');
        row.append(node('strong', '', `${record.stage} · ${record.reference}`));
        row.append(node('p', '', record.summary));
        addLink(row, `Open ${record.source} ↗`, record.url);
        card.append(row);
      }
      if (project.question) card.append(node('div', 'question', `Ask at inspection: ${project.question}`));
    } else {
      if (project.stage) card.append(node('p', '', `Reported stage: ${project.stage}`));
      card.append(node('p', 'meta', 'Microburbs candidate only. Check the council or NSW portal for an official status and documents.'));
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
  result.append(section('Address match'));
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
    const box = section('Address match');
    box.append(status(error instanceof Error ? error.message : 'The lookup failed. Retry shortly.', 'error'));
    result.append(box);
  }
}

form.addEventListener('submit', event => { event.preventDefault(); void search(input.value.trim()); });

function listingAddress(): string | null {
  const h1 = document.querySelector('h1')?.textContent?.trim() || '';
  const title = document.title;
  const text = h1 || title;
  const matched = text.match(/(?:unit\s*)?[a-z]?\d+[a-z]?\s*\/\s*\d+[a-z]?(?:-\d+[a-z]?)?\s+[^,]+,\s*[^,]+(?:,\s*NSW\s*\d{4})?/i)
    || text.match(/\d+[a-z]?(?:-\d+[a-z]?)?\s+[^,]+,\s*[^,]+(?:,\s*NSW\s*\d{4})?/i);
  return matched?.[0] || null;
}

readButton.addEventListener('click', async () => {
  extractNote.textContent = '';
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab?.id || !/^https:\/\/(www\.)?realestate\.com\.au\/property-/i.test(tab.url || '')) {
      extractNote.textContent = 'Automatic reading is available on realestate.com.au listing pages. Enter the address above on other sites.';
      input.focus(); return;
    }
    const run = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: listingAddress });
    const address = run?.[0]?.result;
    if (!address) { extractNote.textContent = 'No clear address found on this listing. Enter it above.'; input.focus(); return; }
    input.value = address;
    void search(address);
  } catch { extractNote.textContent = 'Could not read this page. Enter the address above.'; input.focus(); }
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
