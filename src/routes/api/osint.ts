import { createFileRoute } from "@tanstack/react-router";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { botQuery, consultaPool } from "../../lib/bot-db";
import { CBO_DESCRICOES } from "../../lib/cbo";
import crypto from "crypto";

function countResults(r: { sections?: Array<{ fields?: unknown[]; list?: unknown[]; links?: unknown[]; credentials?: unknown[] }> }): number {
  let n = 0;
  for (const s of r.sections ?? []) {
    n += (s.fields?.length ?? 0) + (s.list?.length ?? 0) + (s.links?.length ?? 0) + (s.credentials?.length ?? 0);
  }
  return Math.max(1, n);
}

function buildCredentialCards(rows: any[], maskEmail = false): CredentialCard[] {
  const seen = new Set<string>();
  const cards: CredentialCard[] = [];
  for (const row of rows) {
    const rawEmail = (row.email || "").trim();
    const rawSenha = (row.senha || "").trim();
    
    // Ignora se estiver sem email ou sem senha
    if (!rawEmail || !rawSenha || rawEmail === "—" || rawSenha === "—") {
      continue;
    }

    const key = `${(row.url || "").toLowerCase()}|${rawEmail.toLowerCase()}|${rawSenha.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      const email = maskEmail ? unmaskEmail(rawEmail, rawEmail) : rawEmail;
      const id = crypto.createHash("md5").update(key).digest("hex");

      // Tenta extrair uma data no formato DD.MM.YYYY ou YYYY-MM-DD da fonte
      let extractedDate: string | undefined = undefined;
      const dateMatch = (row.fonte || "").match(/(\d{2}\.\d{2}\.\d{4})|(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        extractedDate = dateMatch[0];
      }

      cards.push({
        id,
        url: row.url || "—",
        email,
        password: rawSenha,
        telefone: row.telefone || "",
        source: row.fonte || "—",
        discoveredDate: extractedDate
      });
    }
  }
  return cards;
}

type Field = { label: string; value: string; mono?: boolean; warn?: boolean; ok?: boolean };
type CredentialCard = { id: string; url: string; email: string; password: string; telefone?: string; source: string; stolenDate?: string; discoveredDate?: string };
type IpCard = {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  asn: string;
  reverse: string;
  isProxy: boolean;
  isDatacenter: boolean;
  isMobile: boolean;
};
type Section = { title: string; icon?: string; collapsible?: boolean; fields?: Field[]; list?: string[]; links?: { label: string; url: string }[]; credentials?: CredentialCard[]; ipCards?: IpCard[] };
type OsintResult = {
  ok: boolean;
  tool: string;
  query: string;
  summary?: string;
  sections: Section[];
  sources: string[];
  error?: string;
};

async function searchIntelx(term: string): Promise<{ ips: string[] }> {
  const key = process.env.INTELX_API_KEY;
  if (!key) return { ips: [] };
  const base = 'https://free.intelx.io';
  const ips = new Set<string>();
  const ipRe = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g;
  const stealerRe = /(?:\[[A-Z]{2}\])?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})_\d{4}_\d{2}_\d{2}/;
  const privRe = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.|169\.254\.)/;
  try {
    const searchRes = await fetch(`${base}/intelligent/search`, {
      method: 'POST',
      headers: { 'x-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ term, maxresults: 100, media: 0, target: 0, timeout: 15 }),
      signal: AbortSignal.timeout(25000),
    });
    if (!searchRes.ok) return { ips: [] };
    const body = await searchRes.json();
    if (body.records) {
      for (const r of body.records) { extractIpsFromRecord(r, term, ips, ipRe, stealerRe, privRe); }
      return { ips: [...ips] };
    }
    const searchId = body.id;
    if (!searchId) return { ips: [] };
    await new Promise(r => setTimeout(r, 2000));
    const resultRes = await fetch(`${base}/intelligent/search/result?id=${encodeURIComponent(searchId)}&limit=100&offset=0&format=1`, {
      headers: { 'x-key': key },
      signal: AbortSignal.timeout(15000),
    });
    if (!resultRes.ok) return { ips: [] };
    const data = await resultRes.json();
    for (const r of (data.records || [])) { extractIpsFromRecord(r, term, ips, ipRe, stealerRe, privRe); }
    return { ips: [...ips] };
  } catch {
    return { ips: [] };
  }
}

function extractIpsFromRecord(r: any, term: string, ips: Set<string>, ipRe: RegExp, stealerRe: RegExp, privRe: RegExp) {
  const name = (r.name || '').trim();
  const nameLower = name.toLowerCase();
  const termLower = term.toLowerCase();
  const stealerMatch = name.match(stealerRe);
  if (stealerMatch) { const ip = stealerMatch[1]; if (!privRe.test(ip)) ips.add(ip); return; }
  if (nameLower === termLower || nameLower.includes(termLower)) {
    const text = `${name} ${r.description || ''} ${r.keyvalues ? JSON.stringify(r.keyvalues) : ''}`;
    let m; while ((m = ipRe.exec(text)) !== null) { if (!privRe.test(m[1])) ips.add(m[1]); }
  }
  if (name && ipRe.test(name)) {
    let m; while ((m = ipRe.exec(name)) !== null) { if (!privRe.test(m[1])) ips.add(m[1]); }
  }
}

async function enrichIp(ip: string): Promise<IpCard | null> {
  try {
    const r = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,as,reverse,proxy,hosting,mobile,query`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) return null;
    const d = await r.json();
    if (d.status !== "success") return null;
    return {
      ip: d.query || ip,
      country: d.country || "",
      countryCode: d.countryCode || "",
      region: d.region || "",
      city: d.city || "",
      lat: d.lat || 0,
      lon: d.lon || 0,
      timezone: d.timezone || "",
      isp: d.isp || "",
      org: d.org || "",
      asn: d.as || "",
      reverse: d.reverse || "",
      isProxy: !!d.proxy,
      isDatacenter: !!d.hosting,
      isMobile: !!d.mobile,
    };
  } catch {
    return null;
  }
}

async function enrichIps(ips: string[]): Promise<IpCard[]> {
  const results = await Promise.allSettled(ips.map(enrichIp));
  return results
    .map(r => r.status === "fulfilled" ? r.value : null)
    .filter((v): v is IpCard => v !== null);
}

const json = (data: OsintResult, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

// ---------- helpers ----------
function unmaskEmail(masked: string, knownEmail: string): string {
  if (!masked.includes("@")) return masked;
  const [maskedLocal, maskedDomain] = masked.split("@");
  const [knownLocal, knownDomain] = knownEmail.toLowerCase().split("@");
  if (maskedDomain.toLowerCase() !== knownDomain) return masked;
  const firstChar = maskedLocal[0];
  if (firstChar && knownLocal[0] === firstChar) {
    return `${knownLocal}@${maskedDomain}`;
  }
  return masked;
}

function sha1Hex(text: string): string {
  return crypto.createHash("sha1").update(text).digest("hex").toUpperCase();
}

function formatPhone(t: any): string {
  if (!t) return "";
  if (typeof t === "string") return t.trim();
  if (typeof t === "number") return String(t);
  if (typeof t === "object") {
    const ddd = t.DDD || t.ddd || t.Ddd || "";
    const numero = t.NUMERO || t.numero || t.Numero || t.TELEFONE || t.telefone || t.Telefone || "";
    if (ddd && numero) return `(${ddd}) ${numero}`.trim();
    if (numero) return String(numero).trim();
    if (ddd) return String(ddd).trim();
  }
  return String(t);
}

function formatEmail(e: any): string {
  if (!e) return "";
  if (typeof e === "string") return e.trim();
  if (typeof e === "object") {
    return (e.EMAIL || e.email || e.Email || JSON.stringify(e)).trim();
  }
  return String(e);
}

function validCPF(raw: string): boolean {
  const cpf = raw.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (slice: number) => {
    let sum = 0;
    for (let i = 0; i < slice; i++) sum += parseInt(cpf[i]) * (slice + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === parseInt(cpf[9]) && calc(10) === parseInt(cpf[10]);
}

async function checkWhatsApp(numero: string): Promise<{ exists: boolean; number: string }> {
  const digits = numero.replace(/[^\d]/g, '');
  const full = digits.length <= 11 ? `55${digits}` : digits;
  try {
    const res = await fetch(`https://wa.me/${full}`, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(5000) });
    if (res.status === 302 || res.status === 301) {
      const loc = res.headers.get('location') || '';
      return { exists: loc.includes('wa.me') || loc.includes('whatsapp'), number: full };
    }
    return { exists: false, number: full };
  } catch {
    try {
      const res = await fetch(`https://wa.me/${full}`, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(8000) });
      return { exists: res.ok || res.status === 200, number: full };
    } catch {
      return { exists: false, number: full };
    }
  }
}

function parseApiData(cpf: string, data: any) {
  const d = data?.DADOS || {};
  const cboCode = d.CBO || '';
  const cboKey = cboCode.length >= 4 ? cboCode.padEnd(4, '0').substring(0, 4) : '';
  
  const cleanPhones = (phones: any[]) => {
    if (!Array.isArray(phones)) return [];
    return phones.map(tel => formatPhone(tel).replace(/[()\s-]/g, '').trim()).filter(tel => tel.length > 0);
  };
  
  const row = {
    cpf,
    nome: d.NOME || '',
    sexo: d.SEXO || '',
    nascimento: d.NASC ? d.NASC.substring(0,10) : null,
    nome_mae: d.NOME_MAE || '',
    nome_pai: d.NOME_PAI || '',
    rg: d.RG || '',
    renda: d.RENDA || '',
    titulo_eleitor: d.TITULO_ELEITOR || '',
    sit_cad: d.CD_SIT_CAD || '',
    estciv: d.ESTCIV || '',
    nacionalidade: d.NACIONALID || '',
    cbo: cboCode,
    cbo_descricao: CBO_DESCRICOES[cboKey] || '',
    orgao_emissor: d.ORGAO_EMISSOR || '',
    uf_emissao: d.UF_EMISSAO || '',
    data_obito: d.DT_OB ? d.DT_OB.substring(0,10) : null,
    mosaic: d.CD_MOSAIC || '',
    mosaic_novo: d.CD_MOSAIC_NOVO || '',
    mosaic_secundario: d.CD_MOSAIC_SECUNDARIO || '',
    contatos_id: d.CONTATOS_ID || '',
    contatos_id_conjuge: d.CONTATOS_ID_CONJUGE || '',
    cadastro_id: d.CADASTRO_ID || '',
    dt_sit_cad: d.DT_SIT_CAD || null,
    dt_informacao: d.DT_INFORMACAO || '',
    faixa_renda_id: d.FAIXA_RENDA_ID || '',
    so: d.SO || '',
    telefones: JSON.stringify(cleanPhones(data.TELEFONE || [])),
    emails: JSON.stringify(data.EMAIL || []),
    enderecos: JSON.stringify(data.ENDERECOS || []),
    score: JSON.stringify(data.SCORE || []),
    pis: JSON.stringify(data.PIS || []),
    poder_aquisitivo: JSON.stringify(data.PODER_AQUISITIVO || []),
    tse: JSON.stringify(data.TSE || []),
    parentes: typeof data.PARENTES === 'string' ? data.PARENTES : '',
    dados_raw: JSON.stringify(data),
  };
  return row;
}

async function fetchAndSaveExternal(tipo: string, q: string) {
  const API_EXTERNAL = 'http://apisbrasilpro.site/api';
  const urlMap: Record<string, string> = {
    nome: `${API_EXTERNAL}/busca_nome.php?nome=`,
    rg: `${API_EXTERNAL}/busca_rg.php?rg=`,
    mae: `${API_EXTERNAL}/busca_mae.php?mae=`,
    pai: `${API_EXTERNAL}/busca_pai.php?pai=`,
    tel: `${API_EXTERNAL}/busca_tel.php?tel=`
  };
  const url = urlMap[tipo];
  if (!url) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url + encodeURIComponent(q), { signal: ctrl.signal });
    clearTimeout(t);
    const data = await res.json();
    if (!data || (data.erro && !data.RESULTADOS?.length)) return null;
    const list = data.RESULTADOS || (data.DADOS ? [data] : []);
    if (!list.length) return null;
    
    if (consultaPool) {
      for (const item of list) {
        const d = item.DADOS || item.DADOS_DONO || item;
        if (d.CPF) {
          // Normalize DADOS_DONO structure to DADOS for parseApiData
          const normalized = item.DADOS ? item : { ...item, DADOS: d };
          const row = parseApiData(d.CPF.replace(/\D/g, ''), normalized);
          const vals = Object.values(row);
          consultaPool.query(`
            INSERT INTO cpf_cache (cpf, nome, sexo, nascimento, nome_mae, nome_pai, rg, renda, titulo_eleitor, 
sit_cad, estciv, nacionalidade, cbo, cbo_descricao, orgao_emissor, uf_emissao, data_obito, mosaic, mosaic_novo, 
mosaic_secundario, contatos_id, contatos_id_conjuge, cadastro_id, dt_sit_cad, dt_informacao, faixa_renda_id, so, 
telefones, emails, enderecos, score, pis, poder_aquisitivo, tse, parentes, dados_raw, fonte, consultado_em)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$2
8::jsonb,$29::jsonb,$30::jsonb,$31::jsonb,$32::jsonb,$33::jsonb,$34::jsonb,$35,$36::jsonb,'busca',NOW())
            ON CONFLICT (cpf) DO UPDATE SET nome=EXCLUDED.nome, cbo_descricao=EXCLUDED.cbo_descricao, 
cbo=EXCLUDED.cbo, consultado_em=NOW()
          `, vals).catch((err: any) => console.error("SAVE CACHE ERROR", err));
        }
      }
    }
    return data;
  } catch {
    return null;
  }
}

// ---------- tool implementations ----------

// disposable email domains (subset)
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com","10minutemail.com","guerrillamail.com","trashmail.com","tempmail.com",
  "yopmail.com","throwawaymail.com","getnada.com","temp-mail.org","fakeinbox.com",
  "maildrop.cc","dispostable.com","mailnesia.com","mintemail.com","sharklasers.com",
]);
const FREE_PROVIDERS = new Set([
  "gmail.com","googlemail.com","yahoo.com","ymail.com","outlook.com","hotmail.com","live.com",
  "icloud.com","me.com","aol.com","protonmail.com","proton.me","gmx.com","mail.com","zoho.com",
  "yandex.com","yandex.ru","tutanota.com","fastmail.com","uol.com.br","bol.com.br","terra.com.br",
]);

async function dnsHasMx(domain: string): Promise<{ has: boolean; first?: string }> {
  try {
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`, {
      headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(2000),
    });
    const d = await r.json() as { Answer?: { data: string }[] };
    const ans = d.Answer || [];
    return { has: ans.length > 0, first: ans[0]?.data };
  } catch { return { has: false }; }
}

// Holehe-style: real probe against each platform's signup/reset endpoint.
async function platformCheck(email: string, platform: string): Promise<"found" | "not_found" | "unknown"> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 2500);
  try {
    let url = "", method: "GET" | "POST" = "POST", body: URLSearchParams | undefined;
    const ct = "application/x-www-form-urlencoded";
    switch (platform) {
      case "Spotify":
        url = `https://spclient.wg.spotify.com/signup/public/v1/account?validate=1&email=${encodeURIComponent(email)}`; method = "GET"; break;
      case "GitHub":
        url = `https://github.com/signup_check/email`; body = new URLSearchParams({ value: email }); break;
      case "Adobe":
        url = `https://auth.services.adobe.com/signin/v2/users/${encodeURIComponent(email)}/status`; method = "GET"; break;
      case "Pinterest":
        url = `https://www.pinterest.com/_ngjs/resource/EmailExistsResource/get/?source_url=/&data=${encodeURIComponent(JSON.stringify({ options: { email } }))}`; method = "GET"; break;
      case "Lastpass":
        url = `https://lastpass.com/iterations.php?email=${encodeURIComponent(email)}`; method = "GET"; break;
      default:
        return "unknown";
    }
    const r = await fetch(url, { method, headers: { "user-agent": "Mozilla/5.0", "content-type": ct, accept: "application/json" }, body: method === "POST" ? body : undefined, signal: ctrl.signal });
    if (!r.ok && r.status !== 400) return "unknown";
    const txt = await r.text();
    if (platform === "Spotify") return /"status"\s*:\s*1/.test(txt) ? "not_found" : /"status"\s*:\s*20/.test(txt) ? "found" : "unknown";
    if (platform === "GitHub") return /already taken|already been taken/i.test(txt) ? "found" : /available/i.test(txt) ? "not_found" : "unknown";
    if (platform === "Adobe") return /"authenticationMethods"/.test(txt) ? "found" : /T2E1/.test(txt) ? "not_found" : "unknown";
    if (platform === "Pinterest") return /"valid"\s*:\s*false/.test(txt) ? "found" : /"valid"\s*:\s*true/.test(txt) ? "not_found" : "unknown";
    if (platform === "Lastpass") return /^\d+$/.test(txt.trim()) ? "found" : "not_found";
    return "unknown";
  } catch { return "unknown"; }
  finally { clearTimeout(t); }
}

const PLATFORMS: { name: string; kind: string; domain: string }[] = [
  { name: "Spotify", kind: "Mídia", domain: "spotify.com" },
  { name: "GitHub", kind: "Dev", domain: "github.com" },
  { name: "Adobe", kind: "Software", domain: "adobe.com" },
  { name: "Pinterest", kind: "Perfil", domain: "pinterest.com" },
  { name: "Lastpass", kind: "Senha", domain: "lastpass.com" },
];

async function toolEmail(email: string): Promise<OsintResult> {
  const sections: Section[] = [];
  const sources: string[] = [];
  const domain = (email.split("@")[1] || "").toLowerCase().trim();

  // Static checks — instant
  const isDisposable = DISPOSABLE_DOMAINS.has(domain);
  const isFree = FREE_PROVIDERS.has(domain);
  sections.push({
    title: "Disposable Check — Domínio",
    fields: [
      { label: "Domínio", value: domain || "—", mono: true },
      { label: "É descartável?", value: isDisposable ? "Yes" : "No", warn: isDisposable, ok: !isDisposable },
      { label: "Provedor gratuito?", value: isFree ? "Yes" : "No" },
      { label: "Domínio próprio?", value: !isFree && !isDisposable ? "Yes" : "No" },
    ],
  });
  sources.push("Lista pública de domínios descartáveis");

  // DB query — awaits here (fast, <200ms)
  const dbResult = await botQuery(
    `SELECT url, email, senha, telefone, fonte FROM credentials WHERE email = $1 LIMIT 1000`,
    [email.trim()]
  ).catch(() => ({ rows: [] }));

  const emailLeakResults = dbResult?.rows || [];
  if (emailLeakResults.length > 0) {
    const creds = buildCredentialCards(emailLeakResults);
    sections.push({
      title: `Vazamentos de Credenciais no Banco (${creds.length})`,
      credentials: creds,
    });
  } else {
    sections.push({
      title: "Vazamentos de Credenciais (Banco Local)",
      fields: [{ label: "Resultado", value: "Nenhuma credencial vazada encontrada para este e-mail nos dumps locais.", ok: true }],
    });
  }
  sources.push("Banco de dados local (Logoutify/BreachDirectory)");

  // Phones from leak results
  const phones = emailLeakResults
    .map(r => r.telefone)
    .filter((v: string) => v && v.trim() && v !== "—")
    .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
  if (phones.length > 0) {
    const formatted = phones.map((p: string) => {
      try { const parsed = parsePhoneNumberFromString(p, "BR"); return parsed ? parsed.formatInternational() : p; }
      catch { return p; }
    });
    sections.push({
      title: `Telefones associados ao e-mail (${phones.length})`,
      fields: [{ label: "Telefones encontrados em vazamentos", value: formatted.join(" · "), mono: true }],
      links: phones.map((p: string) => ({
        label: `Buscar telefone ${p}`,
        url: `/dashboard?tool=phone&query=${encodeURIComponent(p)}`,
      })),
    });
    sources.push("Telefones extraídos de vazamentos");
  }

  // Gravatar & dorks
  const md5 = await sha1Hex(email.trim().toLowerCase());
  sections.push({
    title: "Identidade pública — Links",
    links: [
      { label: "Gravatar", url: `https://gravatar.com/${md5.toLowerCase().slice(0, 32)}` },
      { label: "Google", url: `https://www.google.com/search?q=${encodeURIComponent(`"${email}"`)}` },
      { label: "GitHub commits", url: `https://github.com/search?q=${encodeURIComponent(email)}&type=commits` },
      { label: "LeakLookup", url: `https://leak-lookup.com/?q=${encodeURIComponent(email)}` },
      { label: "DeHashed", url: `https://dehashed.com/search?query=${encodeURIComponent(email)}` },
      { label: "IntelX", url: `https://intelx.io/?s=${encodeURIComponent(email)}` },
    ],
  });
  sources.push("Gravatar", "Google", "GitHub", "LeakLookup", "DeHashed", "IntelX");

  // Scam/Abuse references — static
  sections.push({
    title: "Scam / Abuse — Referências cruzadas",
    collapsible: true,
    fields: [
      { label: "ScamSearch", value: "Banco de dados colaborativo de e-mails reportados em golpes" },
      { label: "ScamAdviser", value: "Pontuação de confiança e histórico de denúncias" },
      { label: "CleanTalk", value: "Lista negra anti-spam usada por +500k sites" },
      { label: "StopForumSpam", value: "E-mails associados a spam/abuse em fóruns" },
      { label: "AbuseIPDB Email", value: "Cruzamento de e-mails com IPs reportados por abuse" },
    ],
    links: [
      { label: "ScamSearch", url: `https://scamsearch.io/search_report?searchoption=all&search=${encodeURIComponent(email)}` },
      { label: "ScamAdviser", url: `https://www.scamadviser.com/check-website/${encodeURIComponent(domain)}` },
      { label: "CleanTalk", url: `https://cleantalk.org/blacklists/${encodeURIComponent(email)}` },
      { label: "StopForumSpam", url: `https://www.stopforumspam.com/search?q=${encodeURIComponent(email)}` },
      { label: "AbuseIPDB", url: `https://www.abuseipdb.com/check/${encodeURIComponent(domain)}` },
    ],
  });
  sources.push("ScamSearch", "ScamAdviser", "CleanTalk", "StopForumSpam", "AbuseIPDB");

  // External APIs — enrich with IP geo, breaches, etc.
  await (async () => {
    const mx = await dnsHasMx(domain);
    let mxIps: string[] = [];
    if (mx.first) {
      const host = mx.first.split(/\s+/).pop() || mx.first;
      try {
        const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`, {
          headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(1000),
        });
        const d = await r.json() as { Answer?: { data: string }[] };
        mxIps = [...new Set((d.Answer || []).map(a => a.data))];
      } catch {}
    }
    sections.unshift({
      title: "SMTP Verify — Domínio",
      fields: [
        { label: "Domínio", value: domain || "—", mono: true },
        { label: "MX encontrado?", value: mx.has ? "Sim" : "Não", ok: mx.has, warn: !mx.has },
        { label: "Servidor MX", value: mx.first || "—", mono: true },
        ...(mxIps.length ? [{ label: "IPs do servidor MX", value: mxIps.join(" · "), mono: true }] : []),
        { label: "Caixa de entrada válida?", value: mx.has ? "provável" : "unknown" },
      ],
    });

    const [checks, hudsonData, xposedData, emailRepData, intelxData] = await Promise.all([
      Promise.all(PLATFORMS.map(async (p) => ({ p, r: await platformCheck(email, p.name) }))),
      fetch(`${process.env.HUDSONROCK_FREE_API_BASE || 'https://cavalier.hudsonrock.com/api/json/v2/osint-tools'}/search-by-email?email=${encodeURIComponent(email)}`, {
        headers: { accept: "application/json" }, signal: AbortSignal.timeout(5000),
      }).then(async r => r.ok ? r.json() : null).catch(() => null),
      fetch(`https://api.xposedornot.com/v1/check-email/${encodeURIComponent(email)}`, { signal: AbortSignal.timeout(1000) })
        .then(async r => r.status === 404 ? { breaches: [] } : r.ok ? r.json() : null).catch(() => null),
      fetch(`https://emailrep.io/${encodeURIComponent(email)}`, {
        headers: { accept: "application/json", "user-agent": "NoxIntel-OSINT" },
        signal: AbortSignal.timeout(1000),
      }).then(async r => r.ok ? r.json() : null).catch(() => null),
      searchIntelx(email),
    ]);

    for (const { p, r } of (checks || [])) {
      if (r === "unknown") continue;
      sections.push({
        title: `${p.name} — ${p.kind}`,
        collapsible: true,
        fields: [
          { label: "Status", value: r === "found" ? "Conta registrada" : "Nenhuma conta", ok: r === "found", warn: r === "found" },
          { label: "Plataforma", value: p.domain, mono: true },
        ],
      });
    }

    if (hudsonData?.stealers?.length) {
      sections.push({
        title: `Dispositivos comprometidos (${hudsonData.stealers.length})`,
        list: hudsonData.stealers.map((s: any) => {
          const parts: string[] = [];
          if (s.ip || s.ip_address) parts.push(`IP: ${s.ip || s.ip_address}`);
          if (s.malware) parts.push(`Malware: ${s.malware}`);
          if (s.domain) parts.push(`Domínio: ${s.domain}`);
          if (s.date || s.first_seen) parts.push(`Data: ${s.date || s.first_seen}`);
          if (s.computer_name) parts.push(`PC: ${s.computer_name}`);
          if (s.operating_system) parts.push(`OS: ${s.operating_system}`);
          return parts.join(" ─ ");
        }),
      });
    }

    if (xposedData) {
      const list = (xposedData.breaches?.[0] ?? []).filter(Boolean);
      sections.push({
        title: "XposedOrNot — Vazamento",
        fields: [{ label: "Total breaches", value: String(list.length), warn: list.length > 0 }],
        list: list.length ? list : ["Nenhum"],
      });
    }

    if (emailRepData) {
      sections.push({
        title: "EmailRep — Reputação",
        collapsible: true,
        fields: [
          { label: "Reputação", value: emailRepData.reputation ?? "—", ok: emailRepData.reputation === "high", warn: emailRepData.reputation === "low" },
          { label: "Suspeito", value: emailRepData.suspicious ? "Sim" : "Não", warn: !!emailRepData.suspicious },
          { label: "Credenciais vazadas", value: emailRepData.details?.credentials_leaked ? "Sim" : "Não", warn: !!emailRepData.details?.credentials_leaked },
        ],
      });
    }

    const stealerIps = [
      ...(hudsonData?.stealers?.map((s: any) => s.ip || s.ip_address || "").filter(Boolean) || []),
      ...(intelxData?.ips || []),
    ];
    const uniqueStealerIps = [...new Set(stealerIps)].filter(Boolean);
    if (uniqueStealerIps.length > 0) {
      const ipCards = await enrichIps(uniqueStealerIps);
      if (ipCards.length > 0) {
        sections.push({
          title: `Endereços IP (${ipCards.length})`,
          ipCards,
        });
      }
    }
    // Facha API Integration
    try {
      const fachaRes = await fetch(`https://api.facha.dev/v1/temporary-email/${encodeURIComponent(domain)}`, {
        signal: AbortSignal.timeout(3000)
      });
      if (fachaRes.ok) {
        const fachaData = await fachaRes.json() as { isTemporary?: boolean; domain?: string };
        sections.push({
          title: "Facha API — Temp Email Check",
          fields: [
            { label: "Domínio", value: fachaData.domain || domain, mono: true },
            { label: "E-mail temporário?", value: fachaData.isTemporary ? "Sim" : "Não", warn: fachaData.isTemporary, ok: !fachaData.isTemporary }
          ]
        });
        sources.push("Facha API (api.facha.dev)");
      }
    } catch (err) {
      console.error("Facha API error:", err);
    }
  })();

  return {
    ok: true, tool: "email", query: email,
    summary: `${sections.length} módulos consultados`,
    sections, sources,
  };
}



async function toolPassword(password: string): Promise<OsintResult> {
  const hash = await sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  let count = 0;
  try {
    const r = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { signal: AbortSignal.timeout(5000) });
    if (r.ok) {
      const text = await r.text();
      const line = text.split("\n").map((l) => l.trim()).find((l) => l.toUpperCase().startsWith(suffix));
      count = line ? parseInt(line.split(":")[1] ?? "0", 10) : 0;
    }
  } catch {}

  // Heurísticas de força
  const length = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const variety = [hasUpper, hasLower, hasDigit, hasSymbol].filter(Boolean).length;
  const strength =
    length >= 16 && variety >= 3 ? "Forte" :
    length >= 12 && variety >= 2 ? "Média" :
    "Fraca";

  const sections: Section[] = [];
  const sources: string[] = ["HIBP Pwned Passwords", "Banco de dados local (Logoutify/BreachDirectory)"];

  sections.push({
    title: "Força & Reputação (HIBP)",
    fields: [
      { label: "Prefix do Hash", value: prefix, mono: true },
      { label: "Ocorrências globais", value: count.toLocaleString("pt-BR"), warn: count > 0, ok: count === 0 },
      { label: "Status global", value: count > 0 ? "Vazada em dumps públicos" : "Não encontrada em vazamentos conhecidos", warn: count > 0, ok: count === 0 },
      { label: "Classificação local", value: strength, ok: strength === "Forte", warn: strength === "Fraca" },
    ],
  });

  // Query database for accounts/sites that leaked this password
  let leakResults: any[] = [];
  try {
    const r = await botQuery(
      `SELECT url, email, senha, telefone, fonte FROM credentials WHERE senha = $1 LIMIT 500`,
      [password]
    );
    if (r && r.rows) {
      leakResults = r.rows;
    }
  } catch (e) {
    console.error("Password leak search error:", e);
  }

  if (leakResults.length > 0) {
    const creds = buildCredentialCards(leakResults, true);
    sections.push({
      title: `Credenciais encontradas (${creds.length})`,
      credentials: creds,
    });
  } else {
    sections.push({
      title: "Vazamentos de Credenciais",
      fields: [{ label: "Resultado", value: "Nenhuma credencial em texto claro encontrada no nosso banco utilizando esta senha.", ok: true }],
    });
  }

  return {
    ok: true,
    tool: "password",
    query: "••••••••",
    summary: count > 0
      ? `Senha vazada ${count.toLocaleString("pt-BR")} vezes no HIBP · ${leakResults.length} vazamentos no banco`
      : `Senha não encontrada globalmente · ${leakResults.length} vazamentos no banco`,
    sections,
    sources,
  };
}

async function toolIp(ip: string): Promise<OsintResult> {
  const r = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json`, {
    headers: { accept: "application/json" },
  });
  const d = await r.json() as {
    ip?: string; hostname?: string; city?: string; region?: string; country?: string;
    loc?: string; org?: string; postal?: string; timezone?: string; anycast?: boolean;
    bogon?: boolean; error?: { title?: string; message?: string };
  };
  if (d.error) throw new Error(d.error.message || d.error.title || "Erro ipinfo.io");
  if (!d.ip) throw new Error("IP inválido");
  if (d.bogon) {
    return {
      ok: true, tool: "ip", query: String(d.ip),
      summary: `${d.ip} é um endereço bogon (não roteável publicamente)`,
      sections: [{ title: "Bogon", fields: [{ label: "IP", value: String(d.ip), mono: true, warn: true }] }],
      sources: ["ipinfo.io"],
    };
  }

  const sections: Section[] = [
    {
      title: "Geolocalização",
      fields: [
        { label: "País", value: String(d.country || "—") },
        { label: "Região", value: String(d.region || "—") },
        { label: "Cidade", value: String(d.city || "—") },
        { label: "CEP", value: String(d.postal || "—") },
        { label: "Lat/Lon", value: String(d.loc || "—"), mono: true },
        { label: "Fuso", value: String(d.timezone || "—") },
      ],
    },
    {
      title: "Rede",
      fields: [
        { label: "Organização (ASN)", value: String(d.org || "—") },
        { label: "Hostname", value: String(d.hostname || "—"), mono: true },
        { label: "Anycast", value: d.anycast ? "Sim" : "Não", warn: !!d.anycast },
      ],
    },
  ];
  const sources: string[] = ["ipinfo.io"];

  // Verifica se o IP aparece em vazamentos/dados expostos
  const intelx = await searchIntelx(ip);
  if (intelx.ips.length > 0) {
    const ipCards = await enrichIps(intelx.ips);
    sections.push({
      title: `Vazamentos — IPs relacionados (${intelx.ips.length})`,
      fields: [{ label: "Status", value: "Dados expostos encontrados para este IP", warn: true }],
      list: intelx.ips.map((x) => `IP: ${x}`),
      links: [{ label: "Ver mais detalhes", url: `https://intelx.io/?s=${encodeURIComponent(ip)}` }],
    });
    if (ipCards.length > 0) {
      sections.push({ title: `Endereços IP relacionados`, ipCards });
    }
    sources.push("Base de vazamentos");
  } else {
    sections.push({
      title: "Vazamentos",
      fields: [{ label: "Resultado", value: "Nenhum dado exposto encontrado para este IP.", ok: true }],
    });
    sources.push("Base de vazamentos");
  }

  return {
    ok: true,
    tool: "ip",
    query: String(d.ip),
    summary: `${d.city || "?"}, ${d.region || "?"} — ${d.country || "?"} (${d.org || "?"})`,
    sections,
    sources,
  };
}

async function toolDomain(domain: string): Promise<OsintResult> {
  const clean = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
  const sections: Section[] = [];
  const sources: string[] = ["Cloudflare DNS"];

  // Timeout para fetches externos (5s cada)
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 5000);

  // 1. DNS records via Cloudflare DoH
  const types = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA"];
  const dnsResults = await Promise.all(types.map(async (t) => {
    try {
      const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(clean)}&type=${t}`, {
        headers: { accept: "application/dns-json" },
        signal: AbortSignal.timeout(3000),
      });
      const d = await r.json() as { Answer?: { data: string }[]; };
      return { t, answers: (d.Answer || []).map((a) => a.data) };
    } catch {
      return { t, answers: [] as string[] };
    }
  }));
  const aRecords = dnsResults.find(r => r.t === "A")?.answers || [];
  const aasRecords = dnsResults.find(r => r.t === "AAAA")?.answers || [];
  sections.push({
    title: "DNS",
    fields: dnsResults.flatMap((r) =>
      r.answers.length ? r.answers.map((v) => ({ label: r.t, value: v, mono: true })) : [],
    ),
  });

  // 1b. Subdomínios via crt.sh
  const subdomains: string[] = [];
  try {
    const r = await fetch(`https://crt.sh/?q=%25.${encodeURIComponent(clean)}&output=json`, {
      signal: AbortSignal.timeout(3000),
    });
    if (r.ok) {
      const d = await r.json() as { name_value: string }[];
      for (const row of d) {
        const names = row.name_value.split("\n");
        for (const n of names) {
          if (n.endsWith(clean) && !subdomains.includes(n)) subdomains.push(n);
        }
      }
    }
    if (subdomains.length > 0) {
      sections.push({ title: `Subdomínios (${subdomains.length})`, list: subdomains.slice(0, 50) });
      sources.push("crt.sh");
    }
  } catch { /* ignore */ }

  // 2. WHOIS (via whois.cloudflare.com API grátis)
  try {
    const r = await fetch(`https://whois.cloudflare.com/json/${encodeURIComponent(clean)}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (r.ok) {
      const w = await r.json() as any;
      if (w.description || w.created_date || w.expires_date) {
        sections.push({
          title: "WHOIS",
          fields: [
            { label: "Domínio", value: w.description || clean, mono: true },
            { label: "Criado", value: w.created_date || "—", mono: true },
            { label: "Expira", value: w.expires_date || "—", mono: true },
            { label: "Atualizado", value: w.updated_date || "—", mono: true },
            { label: "Registrar", value: w.registrar?.name || "—" },
            { label: "Status", value: w.status || "—" },
          ],
        });
        sources.push("Cloudflare Whois");
      }
    }
  } catch { /* ignore */ }

  // 3. DATABASE LEAK SEARCH — host exato (sem subdomínios), com e sem https
  // Usa idx_url (Index Only Scan) para ser instantâneo mesmo com bilhões de linhas.
  let domainLeakResults: any[] = [];
  try {
    const lowerHost = clean.trim().toLowerCase().replace(/[^a-z0-9.\-]/g, "");
    const rawHost = clean.trim().replace(/[^a-zA-Z0-9.\-]/g, "");
    if (lowerHost) {
      const variants = [
        lowerHost, `https://${lowerHost}`, `http://${lowerHost}`, `https://${lowerHost}/`, `http://${lowerHost}/`,
        rawHost, `https://${rawHost}`, `http://${rawHost}`, `https://${rawHost}/`, `http://${rawHost}/`,
      ];
      const r = await botQuery(
        `SELECT url, email, senha, telefone, fonte FROM credentials WHERE url = ANY($1) LIMIT 100`,
        [variants]
      );
      if (r && r.rows) domainLeakResults = r.rows.slice(0, 100);
    }
  } catch (e) { console.error("Domain leak search error:", e); }

  if (domainLeakResults.length > 0) {
    const creds = buildCredentialCards(domainLeakResults);
    sections.push({ title: `Credenciais vazadas no domínio (${creds.length})`, credentials: creds });
  }

  // 4. Tech Stack (via Wappalyzer API)
  const WAPPALYZER_API = process.env.WAPPALYZER_API_KEY;
  if (WAPPALYZER_API) {
    try {
      const r = await fetch(`https://api.wappalyzer.com/v2/apps/${encodeURIComponent(clean)}`, {
        headers: { "x-api-key": WAPPALYZER_API },
        signal: AbortSignal.timeout(3000),
      });
      if (r.ok) {
        const techs = await r.json() as any[];
        if (techs.length > 0) {
          sections.push({
            title: "Tecnologias (Tech Stack)",
            list: techs.map((t: any) => `${t.name} (${t.cats?.map((c: any) => c.name).join(", ") || ""})`),
          });
          sources.push("Wappalyzer");
        }
      }
    } catch { /* ignore */ }
  }

  // 5. Shodan (se chave existir)
  const SHODAN_KEY = process.env.SHODAN_API_KEY;
  if (SHODAN_KEY && aRecords.length > 0) {
    try {
      const r = await fetch(`https://api.shodan.io/shodan/host/${encodeURIComponent(aRecords[0])}?key=${SHODAN_KEY}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (r.ok) {
        const s = await r.json() as any;
        sections.push({
          title: "Shodan (IP: " + aRecords[0] + ")",
          fields: [
            { label: "ISP", value: s.isp || "—" },
            { label: "Org", value: s.org || "—" },
            { label: "País", value: s.country_name || "—" },
            { label: "Vulns", value: (s.vulns || []).join(", ") || "—" },
          ],
        });
        sources.push("Shodan");
      }
    } catch { /* ignore */ }
  }

  // 6. Security Headers (via observatory API)
  try {
    const r = await fetch(`https://http-observatory.security.mozilla.org/api/v1/analyze?host=${encodeURIComponent(clean)}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (r.ok) {
      const sec = await r.json() as any;
      if (sec.endpoints) {
        const headers = sec.endpoints.flatMap((e: any) => e.headers || []).filter((h: any) => h);
        if (headers.length > 0) {
          sections.push({
            title: "Security Headers",
            fields: headers.slice(0, 20).map((h: any) => ({ label: h.header || "header", value: h.value || "—" })),
          });
          sources.push("Mozilla Observatory");
        }
      }
    }
  } catch { /* ignore */ }

  return {
    ok: true,
    tool: "domain",
    query: clean,
    summary: `${aRecords[0] || "Sem A"} • ${dnsResults.find((r) => r.t === "NS")?.answers.length || 0} NS • ${domainLeakResults.length} leaks`,
    sections,
    sources,
  };
}

async function toolCpfCnpj(raw: string): Promise<OsintResult> {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) {
    const ok = validCPF(digits);
    if (!ok) {
      return { ok: false, tool: "cpf", query: raw, error: "CPF inválido", sections: [], sources: [] };
    }
    
    let cpfData: any = null;
    
    try {
      if (consultaPool) {
        const cached = await consultaPool.query(`SELECT * FROM cpf_cache WHERE cpf = $1`, [digits]);
        if (cached.rows.length > 0 && cached.rows[0].dados_raw) {
          const row = cached.rows[0];
          cpfData = typeof row.dados_raw === 'string' ? JSON.parse(row.dados_raw) : row.dados_raw;
        }
      }
    } catch (e) {
      console.error("Cache check error:", e);
    }
    
    if (!cpfData) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 15000);
        const apiRes = await fetch(`http://apisbrasilpro.site/api/busca_cpf.php?cpf=${digits}`, { signal: ctrl.signal });
        clearTimeout(t);
        const data = await apiRes.json();
        if (data && !data.erro && data.DADOS && data.DADOS.CPF) {
          cpfData = data;
          if (consultaPool) {
            delete data.criado_por;
            const row = parseApiData(digits, data);
            const vals = Object.values(row);
            consultaPool.query(`
              INSERT INTO cpf_cache (cpf, nome, sexo, nascimento, nome_mae, nome_pai, rg, renda, titulo_eleitor, sit_cad, 
estciv, nacionalidade, cbo, cbo_descricao, orgao_emissor, uf_emissao, data_obito, mosaic, mosaic_novo, 
mosaic_secundario, contatos_id, contatos_id_conjuge, cadastro_id, dt_sit_cad, dt_informacao, faixa_renda_id, so, 
telefones, emails, enderecos, score, pis, poder_aquisitivo, tse, parentes, dados_raw, fonte, consultado_em)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$2
8::jsonb,$29::jsonb,$30::jsonb,$31::jsonb,$32::jsonb,$33::jsonb,$34::jsonb,$35,$36::jsonb,'api',NOW())
              ON CONFLICT (cpf) DO UPDATE SET nome=EXCLUDED.nome, sexo=EXCLUDED.sexo, nascimento=EXCLUDED.nascimento, 
nome_mae=EXCLUDED.nome_mae, nome_pai=EXCLUDED.nome_pai, rg=EXCLUDED.rg, renda=EXCLUDED.renda, 
titulo_eleitor=EXCLUDED.titulo_eleitor, sit_cad=EXCLUDED.sit_cad, estciv=EXCLUDED.estciv, 
nacionalidade=EXCLUDED.nacionalidade, cbo=EXCLUDED.cbo, cbo_descricao=EXCLUDED.cbo_descricao, 
orgao_emissor=EXCLUDED.orgao_emissor, uf_emissao=EXCLUDED.uf_emissao, data_obito=EXCLUDED.data_obito, 
mosaic=EXCLUDED.mosaic, mosaic_novo=EXCLUDED.mosaic_novo, mosaic_secundario=EXCLUDED.mosaic_secundario, 
contatos_id=EXCLUDED.contatos_id, contatos_id_conjuge=EXCLUDED.contatos_id_conjuge, cadastro_id=EXCLUDED.cadastro_id, 
dt_sit_cad=EXCLUDED.dt_sit_cad, dt_informacao=EXCLUDED.dt_informacao, faixa_renda_id=EXCLUDED.faixa_renda_id, 
so=EXCLUDED.so, telefones=EXCLUDED.telefones, emails=EXCLUDED.emails, enderecos=EXCLUDED.enderecos, 
score=EXCLUDED.score, pis=EXCLUDED.pis, poder_aquisitivo=EXCLUDED.poder_aquisitivo, tse=EXCLUDED.tse, 
parentes=EXCLUDED.parentes, dados_raw=EXCLUDED.dados_raw, consultado_em=NOW()
            `, vals).catch((e: any) => console.error('SAVE CACHE ERROR', e.message));
          }
        }
      } catch (e) {
        console.error("External API error:", e);
      }
    }
    
    if (!cpfData && consultaPool) {
      try {
        const fallback = await consultaPool.query(`SELECT * FROM cpf_cache WHERE cpf = $1`, [digits]);
        if (fallback.rows.length > 0) {
          const row = fallback.rows[0];
          cpfData = typeof row.dados_raw === 'string' ? JSON.parse(row.dados_raw) : row.dados_raw;
        }
      } catch (_) {}
    }
    
    if (!cpfData) {
      return { ok: false, tool: "cpf", query: raw, error: "CPF não localizado nas bases de dados.", sections: [], sources: [] };
    }
    
    const d = cpfData.DADOS || {};
    const sections: Section[] = [];
    
    sections.push({
      title: "Dados Cadastrais",
      fields: [
        { label: "CPF", value: digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4"), mono: true },
        { label: "Nome completo", value: d.NOME || "—" },
        { label: "Data de nascimento", value: d.NASC ? String(d.NASC).substring(0, 10) : "—", mono: true },
        { label: "Sexo", value: d.SEXO || "—" },
        { label: "Nome da mãe", value: d.NOME_MAE || "—" },
        { label: "Nome do pai", value: d.NOME_PAI || "—" },
        { label: "RG", value: d.RG ? `${d.RG} (${d.ORGAO_EMISSOR || ""} ${d.UF_EMISSAO || ""})`.trim() : "—", mono: true },
        { label: "Título de Eleitor", value: d.TITULO_ELEITOR || "—", mono: true },
        { label: "Situação cadastral", value: d.CD_SIT_CAD || "—" },
        { label: "Estado civil", value: d.ESTCIV || "—" },
        { label: "Nacionalidade", value: d.NACIONALID || "—" },
        { label: "Profissão (CBO)", value: d.CBO ? `${d.CBO} - ${d.CBO_DESCRICAO || ""}` : "—" },
        { label: "Óbito", value: d.DT_OB || "Não", warn: !!d.DT_OB },
      ],
    });
    
    const telefones: any[] = cpfData.TELEFONE || [];
    const emails: any[] = cpfData.EMAIL || [];
    const formattedEmails = emails.map(formatEmail).filter(Boolean);
    sections.push({
      title: "Contatos Associados",
      fields: [
        { label: "E-mails vinculados", value: formattedEmails.length > 0 ? formattedEmails.join(", ") : "Nenhum" },
      ],
      list: telefones.map(t => {
        const formatted = formatPhone(t);
        const clean = formatted.replace(/[() -]/g, "");
        return `Telefone: ${formatted} (${clean.length >= 10 ? "Móvel" : "Fixo"})`;
      }),
    });
    
    const enderecos: any[] = cpfData.ENDERECOS || [];
    sections.push({
      title: "Histórico de Endereços",
      list: enderecos.map(e => {
        return `${e.LOGRADOURO || ""}, ${e.NUMERO || ""} ${e.COMPLEMENTO || ""} - ${e.BAIRRO || ""} - ${e.CIDADE || ""}/${e.UF || ""} (CEP: ${e.CEP || ""})`;
      }),
    });
    
    const score = cpfData.SCORE;
    const pis = cpfData.PIS;
    const parentes = cpfData.PARENTES;
    
    sections.push({
      title: "Informações Financeiras & Vínculos",
      fields: [
        { label: "Faixa de renda estimada", value: d.RENDA || "—" },
        { label: "Poder aquisitivo", value: String(cpfData.PODER_AQUISITIVO || "—") },
        { label: "Mosaic Score", value: d.CD_MOSAIC || "—", mono: true },
        { label: "PIS", value: Array.isArray(pis) ? pis.join(", ") : String(pis || "—"), mono: true },
        { label: "Score de crédito", value: Array.isArray(score) ? score.map((s: any) => `${s.FONTE || ""}: ${s.SCORE || ""}`).join(", ") : String(score || "—"), mono: true },
      ],
    });
    
    if (parentes && String(parentes).trim().length > 0) {
      sections.push({
        title: "Vínculos de Parentesco",
        list: String(parentes).split("\n").map(p => p.trim()).filter(Boolean),
      });
    }
    
    return {
      ok: true,
      tool: "cpf",
      query: raw,
      summary: `${d.NOME || ""} (Nasc. ${d.NASC || ""})`,
      sections,
      sources: ["Receita Federal / apisbrasilpro.site", "Banco de dados local"],
    };
  }
  
  if (digits.length === 14) {
    return fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`).then(async (r) => {
      if (!r.ok) throw new Error("CNPJ não encontrado");
      const d = await r.json() as Record<string, unknown> & { qsa?: { nome_socio: string; qualificacao_socio: string }[] };
      return {
        ok: true,
        tool: "cnpj",
        query: raw,
        summary: `${d.razao_social} — ${d.descricao_situacao_cadastral}`,
        sections: [
          {
            title: "Empresa",
            fields: [
              { label: "Razão social", value: String(d.razao_social) },
              { label: "Nome fantasia", value: String(d.nome_fantasia || "—") },
              { label: "Situação", value: String(d.descricao_situacao_cadastral) },
              { label: "Abertura", value: String(d.data_inicio_atividade) },
              { label: "Porte", value: String(d.porte) },
              { label: "Capital social", value: `R$ ${Number(d.capital_social).toLocaleString("pt-BR")}` },
              { label: "Atividade principal", value: String(d.cnae_fiscal_descricao) },
            ],
          },
          {
            title: "Endereço",
            fields: [
              { label: "Logradouro", value: `${d.descricao_tipo_de_logradouro} ${d.logradouro}, ${d.numero}` },
              { label: "Bairro", value: String(d.bairro) },
              { label: "Município/UF", value: `${d.municipio}/${d.uf}` },
              { label: "CEP", value: String(d.cep) },
              { label: "Telefone", value: String(d.ddd_telefone_1 || "—") },
            ],
          },
          {
            title: "Quadro societário",
            list: (d.qsa || []).map((s) => `${s.nome_socio} — ${s.qualificacao_socio}`),
          },
        ],
        sources: ["BrasilAPI / Receita Federal"],
      } as OsintResult;
    });
  }
  
  return Promise.resolve({
    ok: false,
    tool: "cpf",
    query: raw,
    error: "Informe 11 dígitos (CPF) ou 14 dígitos (CNPJ).",
    sections: [],
    sources: [],
  });
}

// ===== Operadoras Brasil por prefixo (heurística) =====
const BR_CARRIERS: Record<string, string> = {
  "6": "Vivo", "7": "Vivo", "8": "TIM", "9": "Claro",
};
function brCarrierGuess(national: string): string {
  // Brasil celular: 9 + 8 dígitos. O dígito após o 9 inicial costuma indicar operadora.
  if (national.length === 11 && national[2] === "9") {
    const k = national[3];
    return BR_CARRIERS[k] || "Operadora desconhecida";
  }
  return "—";
}

async function toolPhone(raw: string): Promise<OsintResult> {
  const p = parsePhoneNumberFromString(raw, "BR");
  if (!p) {
    return { ok: false, tool: "phone", query: raw, error: "Número inválido", sections: [], sources: [] };
  }
  const e164 = p.number;
  const national = String(p.nationalNumber);
  const intl = p.formatInternational();
  const ddd = national.slice(0, 2);
  const carrier = p.country === "BR" ? brCarrierGuess(national) : "—";
  const digits = e164.replace(/\D/g, "");
  const sections: Section[] = [];
  const sources: string[] = ["libphonenumber-js", "Banco de dados local"];

  // 1) Technical & Messengers Validation
  let hasWa = false;
  try {
    const wa = await checkWhatsApp(digits);
    hasWa = wa.exists;
  } catch {}

  sections.push({
    title: "Validação Técnica & Mensageiros",
    fields: [
      { label: "E.164", value: e164, mono: true },
      { label: "Internacional", value: intl, mono: true },
      { label: "Nacional", value: p.formatNational(), mono: true },
      { label: "Operadora original", value: carrier },
      { label: "DDD/Região", value: ddd },
      { label: "Tipo de linha", value: national.length === 11 ? "Celular" : "Fixo" },
      { label: "WhatsApp", value: hasWa ? "🟢 Ativo / Registrado" : "🔴 Não detectado", ok: hasWa, warn: !hasWa },
    ],
    links: [
      { label: "Abrir conversa (WhatsApp)", url: `https://wa.me/${digits}` },
      { label: "Tme (Telegram)", url: `https://www.google.com/search?q=${encodeURIComponent(`"${e164}" OR "${intl}" site:t.me`)}` }
    ]
  });

  // 2) Query multi-database for leaks containing the phone number
  let leakResults: any[] = [];
  try {
    const r = await botQuery(
      `SELECT url, email, senha, telefone, fonte FROM credentials WHERE telefone LIKE $1 LIMIT 100`,
      [`%${national}%`]
    );
    if (r && r.rows) {
      leakResults = r.rows;
    }
  } catch (e) {
    console.error("Phone leak search error:", e);
  }

  if (leakResults.length > 0) {
    const creds = buildCredentialCards(leakResults);
    sections.push({
      title: `Vazamentos de Credenciais (${creds.length})`,
      credentials: creds,
    });
  } else {
    sections.push({
      title: "Vazamentos de Credenciais",
      fields: [{ label: "Resultado", value: "Nenhuma credencial vazada vinculada a este número encontrada nos dumps.", ok: true }],
    });
  }

  // 3) Query cache or external API for CPFs associated with the phone
  let cpfResults: any[] = [];
  try {
    if (consultaPool) {
      const ddd = national.slice(0, 2);
      const phoneNum = national.slice(2);
      const fullNumLike = `%${ddd}${phoneNum}%`;
      const phone8 = phoneNum.length === 9 && phoneNum.startsWith('9') ? phoneNum.slice(1) : phoneNum;
      const phone8Like = `%${ddd}${phone8}%`;
      const phone9Like = `%${ddd}9${phoneNum}%`;

      const queryStr = `
        SELECT * FROM cpf_cache 
        WHERE 
          CASE 
            WHEN jsonb_typeof(telefones->0) = 'object' THEN
              EXISTS (
                SELECT 1 FROM jsonb_to_recordset(telefones) AS t("DDD" text, "TELEFONE" text)
                WHERE t."DDD" = $1 AND (
                  t."TELEFONE" = $2
                  OR (length($2) = 9 AND left($2, 1) = '9' AND t."TELEFONE" = right($2, 8))
                  OR (length($2) = 8 AND t."TELEFONE" = '9' || $2)
                )
              )
            ELSE
              telefones::text ILIKE $3
              OR (length($2) = 9 AND left($2, 1) = '9' AND telefones::text ILIKE $4)
              OR (length($2) = 8 AND telefones::text ILIKE $5)
          END
        LIMIT 20
      `;
      const r = await consultaPool.query(queryStr, [ddd, phoneNum, fullNumLike, phone8Like, phone9Like]);
      if (r.rows.length > 0) {
        cpfResults = r.rows;
      }
    }
  } catch (e) {
    console.error("Phone CPF query error:", e);
  }

  if (cpfResults.length === 0) {
    try {
      const ext = await fetchAndSaveExternal('tel', national);
      if (ext) {
        const rawList = ext.RESULTADOS || (ext.DADOS ? [ext] : []);
        // Normalize DADOS_DONO structure from busca_tel API
        cpfResults = rawList.map((item: any) => {
          if (item.DADOS_DONO && !item.DADOS) {
            return { ...item, DADOS: item.DADOS_DONO };
          }
          return item;
        });
      }
    } catch (e) {
      console.error("External phone query error:", e);
    }
  }

  if (cpfResults.length > 0) {
    for (const item of cpfResults.slice(0, 10)) {
      const raw = item.dados_raw ? (typeof item.dados_raw === 'string' ? JSON.parse(item.dados_raw) : item.dados_raw) : item;
      const d = raw.DADOS || raw.DADOS_DONO || item;
      const cpfStr = d.CPF || item.cpf || "";
      const cpfDigits = String(cpfStr).replace(/\D/g, '');
      const cpfFormatted = cpfDigits.length === 11 ? cpfDigits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : String(cpfStr);

      sections.push({
        title: `Cadastro — ${d.NOME || item.nome || "—"}`,
        fields: [
          { label: "CPF", value: cpfFormatted, mono: true },
          { label: "Nome completo", value: d.NOME || item.nome || "—" },
          { label: "Data de nascimento", value: d.NASC ? String(d.NASC).substring(0, 10) : (item.nascimento ? String(item.nascimento).substring(0, 10) : "—"), mono: true },
          { label: "Sexo", value: d.SEXO || item.sexo || "—" },
          { label: "Nome da mãe", value: d.NOME_MAE || item.nome_mae || "—" },
          { label: "Nome do pai", value: d.NOME_PAI || item.nome_pai || "—" },
          { label: "RG", value: d.RG || item.rg || "—", mono: true },
        ],
      });

      // Contatos
      const tels: any[] = raw.TELEFONE || (item.telefones ? (typeof item.telefones === 'string' ? JSON.parse(item.telefones) : item.telefones) : []);
      const ems: any[] = raw.EMAIL || (item.emails ? (typeof item.emails === 'string' ? JSON.parse(item.emails) : item.emails) : []);
      if (tels.length > 0 || ems.length > 0) {
        sections.push({
          title: `Contatos — ${d.NOME || item.nome || "—"}`,
          fields: [
            { label: "E-mails", value: ems.length > 0 ? ems.map(formatEmail).filter(Boolean).join(", ") : "Nenhum" },
          ],
          list: tels.map((t: any) => {
            const formatted = formatPhone(t);
            const clean = formatted.replace(/[() -]/g, "");
            return `Telefone: ${formatted} (${clean.length >= 10 ? "Móvel" : "Fixo"})`;
          }),
        });
      }

      // Endereços
      const ends: any[] = raw.ENDERECOS || (item.enderecos ? (typeof item.enderecos === 'string' ? JSON.parse(item.enderecos) : item.enderecos) : []);
      if (ends.length > 0) {
        sections.push({
          title: `Endereços — ${d.NOME || item.nome || "—"}`,
          list: ends.map((e: any) => `${e.LOGRADOURO || ""}, ${e.NUMERO || ""} ${e.COMPLEMENTO || ""} - ${e.BAIRRO || ""} - ${e.CIDADE || ""}/${e.UF || ""} (CEP: ${e.CEP || ""})`),
        });
      }
    }
  }

  return {
    ok: true,
    tool: "phone",
    query: raw,
    summary: `${carrier} • ${national} • ${leakResults.length} vazamentos`,
    sections,
    sources,
  };
}

const USERNAME_SITES: { name: string; domain: string; url: (u: string) => string }[] = [
  { name: "GitHub", domain: "github.com", url: (u) => `https://github.com/${u}` },
  { name: "GitLab", domain: "gitlab.com", url: (u) => `https://gitlab.com/${u}` },
  { name: "BitBucket", domain: "bitbucket.org", url: (u) => `https://bitbucket.org/${u}` },
  { name: "Twitter / X", domain: "x.com", url: (u) => `https://x.com/${u}` },
  { name: "Instagram", domain: "instagram.com", url: (u) => `https://www.instagram.com/${u}/` },
  { name: "TikTok", domain: "tiktok.com", url: (u) => `https://www.tiktok.com/@${u}` },
  { name: "YouTube", domain: "youtube.com", url: (u) => `https://www.youtube.com/@${u}` },
  { name: "Reddit", domain: "reddit.com", url: (u) => `https://www.reddit.com/user/${u}` },
  { name: "Twitch", domain: "twitch.tv", url: (u) => `https://www.twitch.tv/${u}` },
  { name: "Medium", domain: "medium.com", url: (u) => `https://medium.com/@${u}` },
  { name: "Steam", domain: "steamcommunity.com", url: (u) => `https://steamcommunity.com/id/${u}` },
  { name: "Pinterest", domain: "pinterest.com", url: (u) => `https://www.pinterest.com/${u}/` },
  { name: "DeviantArt", domain: "deviantart.com", url: (u) => `https://www.deviantart.com/${u}` },
  { name: "Dev.to", domain: "dev.to", url: (u) => `https://dev.to/${u}` },
  { name: "HackerNews", domain: "news.ycombinator.com", url: (u) => `https://news.ycombinator.com/user?id=${u}` },
  { name: "Replit", domain: "replit.com", url: (u) => `https://replit.com/@${u}` },
  { name: "Vimeo", domain: "vimeo.com", url: (u) => `https://vimeo.com/${u}` },
  { name: "Spotify", domain: "spotify.com", url: (u) => `https://open.spotify.com/user/${u}` },
  { name: "SoundCloud", domain: "soundcloud.com", url: (u) => `https://soundcloud.com/${u}` },
  { name: "Behance", domain: "behance.net", url: (u) => `https://www.behance.net/${u}` },
  { name: "Dribbble", domain: "dribbble.com", url: (u) => `https://dribbble.com/${u}` },
  { name: "Keybase", domain: "keybase.io", url: (u) => `https://keybase.io/${u}` },
  { name: "Telegram", domain: "t.me", url: (u) => `https://t.me/${u}` },
  { name: "Facebook", domain: "facebook.com", url: (u) => `https://www.facebook.com/${u}` },
  { name: "Snapchat", domain: "snapchat.com", url: (u) => `https://www.snapchat.com/add/${u}` },
  { name: "Pastebin", domain: "pastebin.com", url: (u) => `https://pastebin.com/u/${u}` },
  { name: "Patreon", domain: "patreon.com", url: (u) => `https://www.patreon.com/${u}` },
  { name: "Flickr", domain: "flickr.com", url: (u) => `https://www.flickr.com/people/${u}` },
  { name: "Last.fm", domain: "last.fm", url: (u) => `https://www.last.fm/user/${u}` },
  { name: "Disqus", domain: "disqus.com", url: (u) => `https://disqus.com/by/${u}` },
  { name: "Kaggle", domain: "kaggle.com", url: (u) => `https://www.kaggle.com/${u}` },
  { name: "CodePen", domain: "codepen.io", url: (u) => `https://codepen.io/${u}` },
  { name: "Producthunt", domain: "producthunt.com", url: (u) => `https://www.producthunt.com/@${u}` },
  { name: "Mixcloud", domain: "mixcloud.com", url: (u) => `https://www.mixcloud.com/${u}/` },
  { name: "About.me", domain: "about.me", url: (u) => `https://about.me/${u}` },
  { name: "Wattpad", domain: "wattpad.com", url: (u) => `https://www.wattpad.com/user/${u}` },
  { name: "Quora", domain: "quora.com", url: (u) => `https://www.quora.com/profile/${u}` },
  { name: "Goodreads", domain: "goodreads.com", url: (u) => `https://www.goodreads.com/${u}` },
  { name: "Imgur", domain: "imgur.com", url: (u) => `https://imgur.com/user/${u}` },
  // ===== Pacote estendido =====
  { name: "Stack Overflow", domain: "stackoverflow.com", url: (u) => `https://stackoverflow.com/users/${u}` },
  { name: "HackerRank", domain: "hackerrank.com", url: (u) => `https://www.hackerrank.com/profile/${u}` },
  { name: "LeetCode", domain: "leetcode.com", url: (u) => `https://leetcode.com/${u}` },
  { name: "Codeforces", domain: "codeforces.com", url: (u) => `https://codeforces.com/profile/${u}` },
  { name: "Codewars", domain: "codewars.com", url: (u) => `https://www.codewars.com/users/${u}` },
  { name: "TryHackMe", domain: "tryhackme.com", url: (u) => `https://tryhackme.com/p/${u}` },
  { name: "HackTheBox", domain: "hackthebox.com", url: (u) => `https://app.hackthebox.com/profile/${u}` },
  { name: "Bugcrowd", domain: "bugcrowd.com", url: (u) => `https://bugcrowd.com/${u}` },
  { name: "HackerOne", domain: "hackerone.com", url: (u) => `https://hackerone.com/${u}` },
  { name: "Bluesky", domain: "bsky.app", url: (u) => `https://bsky.app/profile/${u}` },
  { name: "Threads", domain: "threads.net", url: (u) => `https://www.threads.net/@${u}` },
  { name: "Mastodon (social)", domain: "mastodon.social", url: (u) => `https://mastodon.social/@${u}` },
  { name: "Linktree", domain: "linktr.ee", url: (u) => `https://linktr.ee/${u}` },
  { name: "Substack", domain: "substack.com", url: (u) => `https://${u}.substack.com` },
  { name: "Kick", domain: "kick.com", url: (u) => `https://kick.com/${u}` },
  { name: "Rumble", domain: "rumble.com", url: (u) => `https://rumble.com/c/${u}` },
  { name: "Roblox", domain: "roblox.com", url: (u) => `https://www.roblox.com/user.aspx?username=${u}` },
  { name: "Letterboxd", domain: "letterboxd.com", url: (u) => `https://letterboxd.com/${u}` },
  { name: "MyAnimeList", domain: "myanimelist.net", url: (u) => `https://myanimelist.net/profile/${u}` },
  { name: "Anilist", domain: "anilist.co", url: (u) => `https://anilist.co/user/${u}` },
  { name: "ArtStation", domain: "artstation.com", url: (u) => `https://www.artstation.com/${u}` },
  { name: "Hashnode", domain: "hashnode.com", url: (u) => `https://hashnode.com/@${u}` },
  { name: "Itch.io", domain: "itch.io", url: (u) => `https://${u}.itch.io` },
  { name: "Bandcamp", domain: "bandcamp.com", url: (u) => `https://bandcamp.com/${u}` },
  { name: "AO3", domain: "archiveofourown.org", url: (u) => `https://archiveofourown.org/users/${u}` },
  { name: "Fandom", domain: "fandom.com", url: (u) => `https://www.fandom.com/u/${u}` },
  { name: "Trakt", domain: "trakt.tv", url: (u) => `https://trakt.tv/users/${u}` },
  { name: "Chess.com", domain: "chess.com", url: (u) => `https://www.chess.com/member/${u}` },
  { name: "Lichess", domain: "lichess.org", url: (u) => `https://lichess.org/@/${u}` },
  { name: "OpenStreetMap", domain: "openstreetmap.org", url: (u) => `https://www.openstreetmap.org/user/${u}` },
  { name: "OpenSea", domain: "opensea.io", url: (u) => `https://opensea.io/${u}` },
  { name: "GoFundMe", domain: "gofundme.com", url: (u) => `https://www.gofundme.com/f/${u}` },
];

async function toolUsername(username: string): Promise<OsintResult> {
  const u = username.replace(/^@/, "").trim();
  
  // 1. Query credentials multi-pool for leaks containing the username
  let leakResults: any[] = [];
  try {
    const r = await botQuery(
      `SELECT url, email, senha, telefone, fonte FROM credentials WHERE email LIKE $1 LIMIT 50`,
      [`%${u}%`]
    );
    if (r && r.rows) {
      leakResults = r.rows;
    }
  } catch (e) {
    console.error("Username leak search error:", e);
  }

  // 2. Perform concurrent profile scan across social networks
  const checks = await Promise.all(USERNAME_SITES.map(async (s) => {
    const url = s.url(u);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 7000);
      const r = await fetch(url, { method: "GET", redirect: "manual", signal: ctrl.signal, headers: { "user-agent": "Mozilla/5.0 NoxIntel-OSINT" } });
      clearTimeout(t);
      const found = r.status === 200;
      return { site: s, url, status: r.status, found };
    } catch {
      return { site: s, url, status: 0, found: false };
    }
  }));
  const hits = checks.filter((c) => c.found);

  const sections: Section[] = [];
  const sources: string[] = [`Verificação direta em ${checks.length} plataformas`, "Banco de dados local (Logoutify/BreachDirectory)"];

  if (leakResults.length > 0) {
    const creds = buildCredentialCards(leakResults);
    sections.push({
      title: `Vazamentos de Credenciais Relacionados (${creds.length})`,
      credentials: creds,
    });
  } else {
    sections.push({
      title: "Vazamentos de Credenciais",
      fields: [{ label: "Resultado", value: "Nenhuma credencial exposta foi associada a este username nos bancos vazados.", ok: true }],
    });
  }

  // Display only confirmed profile matches
  if (hits.length > 0) {
    hits.forEach((c) => {
      sections.push({
        title: `${c.site.name} — ${c.site.domain}`,
        icon: `https://www.google.com/s2/favicons?domain=${c.site.domain}&sz=64`,
        collapsible: true,
        fields: [
          { label: "Status", value: "Perfil encontrado", ok: true },
          { label: "URL", value: c.url, mono: true },
          { label: "Plataforma", value: c.site.domain, mono: true },
        ],
        links: [{ label: `Abrir no ${c.site.name}`, url: c.url }],
      });
    });
  }

  const { ips: intelxIps } = await searchIntelx(u);
  if (intelxIps.length > 0) {
    const ipCards = await enrichIps(intelxIps);
    sections.push({
      title: `Endereços IP (${intelxIps.length})`,
      ipCards,
    });
  }

  return {
    ok: true,
    tool: "username",
    query: u,
    summary: `${hits.length}/${checks.length} plataformas com perfil localizado · ${leakResults.length} vazamentos no banco`,
    sections,
    sources,
  };
}

async function toolLink(url: string): Promise<OsintResult> {
  const fetchUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  let hostname = "";
  try { hostname = new URL(fetchUrl).hostname; } catch { hostname = url; }

  // Usa variantes de prefixo para aproveitar o idx_url btree (prefix scan é muito mais rápido que wildcard no início)
  const urlVariants = [
    `${hostname}%`,
    `http://${hostname}%`,
    `https://${hostname}%`,
    `http://www.${hostname}%`,
    `https://www.${hostname}%`,
  ];
  const credPromise = botQuery(
    `SELECT url, email, senha, telefone, fonte FROM credentials
     WHERE url LIKE $1 OR url LIKE $2 OR url LIKE $3 OR url LIKE $4 OR url LIKE $5
     LIMIT 100`,
    urlVariants
  ).catch(() => ({ rows: [] }));

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(fetchUrl, { redirect: "follow", signal: ctrl.signal, headers: { "user-agent": "Mozilla/5.0 NoxIntel-OSINT" } });
    clearTimeout(t);
    const text = await r.text();
    const title = text.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || "—";
    const desc = text.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || "—";
    const ogImage = text.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] || "—";
    const u = new URL(r.url);
    const sections: Section[] = [
      {
        title: "URL",
        fields: [
          { label: "Final URL", value: r.url, mono: true },
          { label: "Status", value: String(r.status), ok: r.ok, warn: !r.ok },
          { label: "Servidor", value: r.headers.get("server") || "—" },
          { label: "Content-Type", value: r.headers.get("content-type") || "—" },
          { label: "Host", value: u.hostname, mono: true },
        ],
      },
      {
        title: "Metadados",
        fields: [
          { label: "Title", value: title },
          { label: "Description", value: desc },
          { label: "OG image", value: ogImage, mono: true },
        ],
      },
    ];
    const sources = ["fetch + parse HTML"];

    const credRows = (await credPromise).rows || [];
    if (credRows.length > 0) {
      const creds = buildCredentialCards(credRows);
      sections.push({ title: `Credenciais vazadas (${creds.length})`, credentials: creds });
      sources.push("banco de credenciais");
    }

    return {
      ok: true,
      tool: "link",
      query: url,
      summary: `${r.status} • ${u.hostname} • ${title.slice(0, 80)}`,
      sections,
      sources,
    };
  } catch {
    const credRows = (await credPromise).rows || [];
    const sections: Section[] = [];
    const sources: string[] = [];
    if (credRows.length > 0) {
      const creds = buildCredentialCards(credRows);
      sections.push({ title: `Credenciais vazadas (${creds.length})`, credentials: creds });
      sources.push("banco de credenciais");
    }
    return {
      ok: false,
      tool: "link",
      query: url,
      error: "Falha ao acessar o link — domínio inexistente, recusou conexão ou timeout.",
      sections,
      sources,
    };
  } finally {
    clearTimeout(t);
  }
}

async function toolUrlLogins(url: string): Promise<OsintResult> {
  const domain = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "").trim().toLowerCase();

  // Variantes de prefixo — usa o idx_url btree (Bitmap Index Scan)
  // Muito mais rápido que LIKE '%domain%' que faz Seq Scan em toda a tabela
  const urlVariants = [
    `${domain}%`,
    `http://${domain}%`,
    `https://${domain}%`,
    `http://www.${domain}%`,
    `https://www.${domain}%`,
  ];

  let allRows: any[] = [];
  try {
    const botResult = await botQuery(
      `SELECT url, email, senha, telefone, fonte FROM credentials
       WHERE url LIKE $1 OR url LIKE $2 OR url LIKE $3 OR url LIKE $4 OR url LIKE $5
       LIMIT 200`,
      urlVariants,
      8000,
      [0, 2, 3]
    );
    allRows = botResult.rows || [];
  } catch (e: any) {
    console.error("[toolUrlLogins] botMultiPool error:", e?.message);
  }

  const rows = buildCredentialCards(allRows);

  const uniqueEmails = new Set(allRows.map(r => r.email).filter(Boolean));
  const uniquePasswords = new Set(allRows.map(r => r.senha).filter(Boolean));

  const sections: Section[] = [];
  const sources: string[] = [];

  if (rows.length > 0) {
    sections.push({
      title: `Credenciais vazadas para "${domain}"`,
      fields: [
        { label: "Total", value: String(rows.length) },
        { label: "Emails únicos", value: String(uniqueEmails.size) },
        { label: "Senhas únicas", value: String(uniquePasswords.size) },
      ],
    });
    sections.push({ title: `Credenciais (${rows.length})`, credentials: rows });
    sources.push("banco de dados");
  } else {
    sections.push({ title: "Resultado", fields: [{ label: "Status", value: "Nenhuma credencial encontrada para este domínio.", warn: true }] });
  }

  sections.push({
    title: "Bases de vazamento externas",
    fields: [
      { label: "Domínio", value: domain, mono: true },
      { label: "LeakCheck", value: "Pesquise credenciais do domínio" },
      { label: "Snusbase", value: "Busca por domínio em dumps" },
      { label: "DeHashed", value: "Pesquise endereço nas bases" },
      { label: "BreachDirectory", value: "Verifique domínio em breaches" },
    ],
    links: [
      { label: "LeakCheck", url: `https://leakcheck.io/search?query=${encodeURIComponent(domain)}` },
      { label: "Snusbase", url: `https://snusbase.com/search?query=${encodeURIComponent(domain)}` },
      { label: "DeHashed", url: `https://dehashed.com/search?query=${encodeURIComponent(domain)}` },
      { label: "BreachDirectory", url: `https://breachdirectory.org/search?query=${encodeURIComponent(domain)}` },
      { label: "IntelX", url: `https://intelx.io/?s=${encodeURIComponent(domain)}` },
    ],
  });

  return {
    ok: true,
    tool: "urllogins",
    query: url,
    summary: `${rows.length} credenciais encontradas · ${uniqueEmails.size} emails · ${uniquePasswords.size} senhas`,
    sections,
    sources,
  };
}

async function toolBlockchain(addr: string): Promise<OsintResult> {
  // BTC via blockchain.info
  if (/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(addr)) {
    const r = await fetch(`https://blockchain.info/rawaddr/${encodeURIComponent(addr)}?limit=10`);
    if (!r.ok) throw new Error("Endereço BTC inválido");
    const d = await r.json() as { address: string; total_received: number; total_sent: number; final_balance: number; n_tx: number; txs: { hash: string; time: number; result: number }[] };
    return {
      ok: true,
      tool: "blockchain",
      query: addr,
      summary: `BTC • saldo ${(d.final_balance / 1e8).toFixed(8)} • ${d.n_tx} tx`,
      sections: [
        {
          title: "Carteira BTC",
          fields: [
            { label: "Endereço", value: d.address, mono: true },
            { label: "Saldo", value: `${(d.final_balance / 1e8).toFixed(8)} BTC` },
            { label: "Recebido", value: `${(d.total_received / 1e8).toFixed(8)} BTC` },
            { label: "Enviado", value: `${(d.total_sent / 1e8).toFixed(8)} BTC` },
            { label: "Transações", value: String(d.n_tx) },
          ],
        },
        {
          title: "Últimas transações",
          list: d.txs.slice(0, 10).map((t) => `${new Date(t.time * 1000).toLocaleString("pt-BR")} • ${(t.result / 1e8).toFixed(8)} BTC • ${t.hash.slice(0, 24)}…`),
        },
      ],
      sources: ["blockchain.info"],
    };
  }
  // ETH-like
  if (/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    return {
      ok: true,
      tool: "blockchain",
      query: addr,
      summary: "Endereço estilo EVM (Ethereum/Polygon/BSC)",
      sections: [
        {
          title: "Endereço",
          fields: [{ label: "Hash", value: addr, mono: true }],
        },
        {
          title: "Explorers",
          links: [
            { label: "Etherscan", url: `https://etherscan.io/address/${addr}` },
            { label: "Polygonscan", url: `https://polygonscan.com/address/${addr}` },
            { label: "BscScan", url: `https://bscscan.com/address/${addr}` },
            { label: "Arbiscan", url: `https://arbiscan.io/address/${addr}` },
          ],
        },
      ],
      sources: ["Heurística + explorers públicos"],
    };
  }
  throw new Error("Formato não reconhecido (BTC/EVM).");
}

async function toolSocial(handle: string): Promise<OsintResult> {
  const h = handle.replace(/^@/, "").trim();
  const checks = await Promise.all(USERNAME_SITES.map(async (s) => {
    const url = s.url(h);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 7000);
      const r = await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: ctrl.signal,
        headers: { "user-agent": "Mozilla/5.0 NoxIntel-OSINT" },
      });
      clearTimeout(t);
      let title: string | undefined;
      if (r.status === 200) {
        try {
          const text = (await r.text()).slice(0, 8000);
          title = text.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim().slice(0, 120);
        } catch { /* ignore */ }
      }
      return { name: s.name, url, status: r.status, found: r.status === 200, title };
    } catch {
      return { name: s.name, url, status: 0, found: false, title: undefined };
    }
  }));
  const hits = checks.filter((c) => c.found);
  const misses = checks.filter((c) => !c.found);
  return {
    ok: true,
    tool: "social",
    query: handle,
    summary: `${hits.length} perfis confirmados para "${h}" em ${checks.length} plataformas`,
    sections: [
      {
        title: `Perfis confirmados (${hits.length})`,
        fields: hits.map((h) => ({
          label: h.name,
          value: h.title ? `${h.url}\n${h.title}` : h.url,
          mono: true,
          ok: true,
        })),
        links: hits.map((h) => ({ label: `Abrir ${h.name}`, url: h.url })),
      },
      {
        title: `Não encontrados (${misses.length})`,
        list: misses.map((c) => `${c.name} — HTTP ${c.status || "erro"}`),
      },
    ],
    sources: [`Verificação direta em ${checks.length} plataformas`],
  };
}

async function toolWifi(query: string): Promise<OsintResult> {
  const q = query.trim();
  const sections: Section[] = [];
  const sources: string[] = [];

  // Check if query is a BSSID (MAC Address)
  const isBssid = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(q) || /^[0-9A-Fa-f]{12}$/.test(q);

  if (isBssid) {
    const formattedBssid = q.includes(":") || q.includes("-") 
      ? q.replace(/-/g, ":").toUpperCase() 
      : q.replace(/(.{2})/g, "$1:").slice(0, -1).toUpperCase();

    // 1. Mylnikov API
    try {
      const mylnikovRes = await fetch(`https://api.mylnikov.org/geolocation/wifi?v=1.1&data=open&bssid=${encodeURIComponent(formattedBssid)}`, {
        signal: AbortSignal.timeout(6000)
      });
      if (mylnikovRes.ok) {
        const mylnikovData = await mylnikovRes.json() as any;
        if (mylnikovData.desc === "OK" && mylnikovData.data) {
          sections.push({
            title: "Mylnikov Geo-Location",
            fields: [
              { label: "BSSID", value: formattedBssid, mono: true },
              { label: "Latitude", value: String(mylnikovData.data.lat), mono: true },
              { label: "Longitude", value: String(mylnikovData.data.lon), mono: true },
              { label: "Precisão", value: `${mylnikovData.data.range}m`, mono: true }
            ],
            links: [
              { label: "Ver no Google Maps", url: `https://www.google.com/maps?q=${mylnikovData.data.lat},${mylnikovData.data.lon}` }
            ]
          });
          sources.push("Mylnikov API (api.mylnikov.org)");
        }
      }
    } catch (err) {
      console.error("Mylnikov API error:", err);
    }

    // 2. WiGLE API (Using environment credentials if available, otherwise adding search options)
    const wigleName = process.env.WIGLE_API_NAME;
    const wigleToken = process.env.WIGLE_API_TOKEN;
    if (wigleName && wigleToken) {
      try {
        const auth = Buffer.from(`${wigleName}:${wigleToken}`).toString('base64');
        const wigleRes = await fetch(`https://api.wigle.net/api/v2/network/search?netid=${encodeURIComponent(formattedBssid)}`, {
          headers: { 'Authorization': `Basic ${auth}` },
          signal: AbortSignal.timeout(6000)
        });
        if (wigleRes.ok) {
          const wigleData = await wigleRes.json() as any;
          if (wigleData.success && wigleData.results && wigleData.results.length > 0) {
            const net = wigleData.results[0];
            sections.push({
              title: `WiGLE Network: ${net.ssid || "Sem SSID"}`,
              fields: [
                { label: "BSSID", value: net.netid || formattedBssid, mono: true },
                { label: "SSID", value: net.ssid || "—" },
                { label: "Canal", value: String(net.channel || "—") },
                { label: "Criptografia", value: net.encryption || "—" },
                { label: "Fabricante", value: net.manufacturer || "—" },
                { label: "Latitude", value: String(net.trilat || "—"), mono: true },
                { label: "Longitude", value: String(net.trilon || "—"), mono: true },
                { label: "Primeira vez visto", value: net.firsttime || "—" },
                { label: "Última vez visto", value: net.lasttime || "—" }
              ],
              links: [
                { label: "Ver no Google Maps", url: `https://www.google.com/maps?q=${net.trilat},${net.trilon}` }
              ]
            });
            sources.push("WiGLE API (api.wigle.net)");
          }
        }
      } catch (err) {
        console.error("WiGLE API error:", err);
      }
    }

    // Fallback options
    sections.push({
      title: "Pesquisa Externa de BSSID",
      fields: [
        { label: "BSSID", value: formattedBssid, mono: true }
      ],
      links: [
        { label: "Pesquisar no WiGLE", url: `https://wigle.net/search?query=true&netid=${encodeURIComponent(formattedBssid)}` },
        { label: "Pesquisar Fabricante OUI", url: `https://macvendors.com/?query=${encodeURIComponent(formattedBssid)}` }
      ]
    });
  } else {
    // SSID Search (Query WiGLE directly if credentials exist)
    let ssidFound = false;
    const wigleName = process.env.WIGLE_API_NAME;
    const wigleToken = process.env.WIGLE_API_TOKEN;
    if (wigleName && wigleToken) {
      try {
        const auth = Buffer.from(`${wigleName}:${wigleToken}`).toString('base64');
        const wigleRes = await fetch(`https://api.wigle.net/api/v2/network/search?ssid=${encodeURIComponent(q)}`, {
          headers: { 'Authorization': `Basic ${auth}` },
          signal: AbortSignal.timeout(6000)
        });
        if (wigleRes.ok) {
          const wigleData = await wigleRes.json() as any;
          if (wigleData.success && wigleData.results && wigleData.results.length > 0) {
            ssidFound = true;
            // Show up to 10 network matches for the SSID
            const matches = wigleData.results.slice(0, 10);
            matches.forEach((net: any, idx: number) => {
              sections.push({
                title: `Rede Encontrada #${idx + 1}: ${net.ssid || q}`,
                fields: [
                  { label: "BSSID", value: net.netid || "—", mono: true },
                  { label: "SSID", value: net.ssid || q },
                  { label: "Criptografia", value: net.encryption || "—" },
                  { label: "Latitude", value: String(net.trilat || "—"), mono: true },
                  { label: "Longitude", value: String(net.trilon || "—"), mono: true },
                  { label: "Fabricante", value: net.manufacturer || "—" },
                  { label: "Última vez visto", value: net.lasttime || "—" }
                ],
                links: [
                  { label: "Ver no Google Maps", url: `https://www.google.com/maps?q=${net.trilat},${net.trilon}` }
                ]
              });
            });
            sources.push("WiGLE API (SSID Search)");
          }
        }
      } catch (err) {
        console.error("WiGLE SSID search error:", err);
      }
    }

    if (!ssidFound) {
      sections.push({
        title: "Busca por SSID / Nome de Rede",
        fields: [
          { label: "SSID", value: q },
          { label: "Nota", value: "Nenhum resultado retornado no WiGLE em tempo real. Tente buscar externamente." }
        ],
        links: [
          { label: "Buscar SSID no WiGLE", url: `https://wigle.net/search?query=true&ssid=${encodeURIComponent(q)}` }
        ]
      });
    }
  }

  if (sections.length === 0) {
    sections.push({
      title: "Resultado da Localização",
      fields: [
        { label: "BSSID/SSID", value: q, mono: true },
        { label: "Status", value: "Nenhuma coordenada geográfica foi encontrada para esta rede nas bases gratuitas.", warn: true }
      ]
    });
  }

  return {
    ok: true,
    tool: "wifi",
    query: q,
    summary: sections.length > 1 ? `Localização Wi-Fi resolvida via bases públicas` : `Busca de Wi-Fi para: ${q}`,
    sections,
    sources: [...sources, "Bases públicas gratuitas"]
  };
}

async function toolName(name: string): Promise<OsintResult> {
  const q = encodeURIComponent(`"${name}"`);
  
  const sections: Section[] = [];
  const sources: string[] = [
    "Google", "Bing", "DuckDuckGo", "Yandex", "Escavador", "JusBrasil",
    "ConsultaSócio", "TSE", "CNDT", "DOU", "Lattes", "Scholar", "ResearchGate",
    "Internet Archive", "IntelX", "DeHashed", "OpenCorporates", "OFAC",
    "TinEye", "PimEyes", "FaceCheck.ID", "Banco de dados local"
  ];

  // 1. Check local cache first
  let nameResults: any[] = [];
  try {
    if (consultaPool) {
      const r = await consultaPool.query(`SELECT cpf, nome, sexo, nascimento, nome_mae, nome_pai, rg FROM cpf_cache WHERE nome ILIKE $1 LIMIT 20`, [`%${name}%`]);
      if (r.rows.length > 0) {
        nameResults = r.rows.map((row: any) => ({
          DADOS: {
            CPF: row.cpf,
            NOME: row.nome,
            SEXO: row.sexo,
            NASC: row.nascimento,
            NOME_MAE: row.nome_mae,
            NOME_PAI: row.nome_pai,
            RG: row.rg
          }
        }));
      }
    }
  } catch (e) {
    console.error("Name cache query error:", e);
  }

  // 2. Query external name API if not found locally
  if (nameResults.length === 0) {
    try {
      const ext = await fetchAndSaveExternal('nome', name);
      if (ext) {
        nameResults = ext.RESULTADOS || (ext.DADOS ? [ext] : []);
      }
    } catch (e) {
      console.error("External name query error:", e);
    }
  }

  // Format database results
  if (nameResults.length > 0) {
    for (const item of nameResults.slice(0, 10)) {
      const raw = item.dados_raw ? (typeof item.dados_raw === 'string' ? JSON.parse(item.dados_raw) : item.dados_raw) : item;
      const d = raw.DADOS || item;
      const cpfStr = d.CPF || item.cpf || "";
      const cpfDigits = String(cpfStr).replace(/\D/g, '');
      const cpfFormatted = cpfDigits.length === 11 ? cpfDigits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : String(cpfStr);

      sections.push({
        title: `Cadastro — ${d.NOME || item.nome || "—"}`,
        fields: [
          { label: "CPF", value: cpfFormatted, mono: true },
          { label: "Nome completo", value: d.NOME || item.nome || "—" },
          { label: "Data de nascimento", value: d.NASC ? String(d.NASC).substring(0, 10) : (item.nascimento ? String(item.nascimento).substring(0, 10) : "—"), mono: true },
          { label: "Sexo", value: d.SEXO || item.sexo || "—" },
          { label: "Nome da mãe", value: d.NOME_MAE || item.nome_mae || "—" },
          { label: "Nome do pai", value: d.NOME_PAI || item.nome_pai || "—" },
          { label: "RG", value: d.RG || item.rg || "—", mono: true },
        ],
      });

      // Contatos
      const tels: any[] = raw.TELEFONE || (item.telefones ? (typeof item.telefones === 'string' ? JSON.parse(item.telefones) : item.telefones) : []);
      const ems: any[] = raw.EMAIL || (item.emails ? (typeof item.emails === 'string' ? JSON.parse(item.emails) : item.emails) : []);
      if (tels.length > 0 || ems.length > 0) {
        sections.push({
          title: `Contatos — ${d.NOME || item.nome || "—"}`,
          fields: [
            { label: "E-mails", value: ems.length > 0 ? ems.map(formatEmail).filter(Boolean).join(", ") : "Nenhum" },
          ],
          list: tels.map((t: any) => {
            const formatted = formatPhone(t);
            const clean = formatted.replace(/[() -]/g, "");
            return `Telefone: ${formatted} (${clean.length >= 10 ? "Móvel" : "Fixo"})`;
          }),
        });
      }

      // Endereços
      const ends: any[] = raw.ENDERECOS || (item.enderecos ? (typeof item.enderecos === 'string' ? JSON.parse(item.enderecos) : item.enderecos) : []);
      if (ends.length > 0) {
        sections.push({
          title: `Endereços — ${d.NOME || item.nome || "—"}`,
          list: ends.map((e: any) => `${e.LOGRADOURO || ""}, ${e.NUMERO || ""} ${e.COMPLEMENTO || ""} - ${e.BAIRRO || ""} - ${e.CIDADE || ""}/${e.UF || ""} (CEP: ${e.CEP || ""})`),
        });
      }
    }
  } else {
    sections.push({
      title: "Busca Cadastral (Brasil)",
      fields: [{ label: "Resultado", value: "Nenhuma pessoa com este nome encontrada nas bases de dados cadastrais.", warn: true }]
    });
  }

  // Add search links / dorks (original style)
  sections.push(
    {
      title: "Motores de busca gerais",
      icon: `https://www.google.com/s2/favicons?domain=google.com&sz=64`,
      collapsible: true,
      links: [
        { label: "Google", url: `https://www.google.com/search?q=${q}` },
        { label: "Google (imagens)", url: `https://www.google.com/search?q=${q}&tbm=isch` },
        { label: "Bing", url: `https://www.bing.com/search?q=${q}` },
        { label: "DuckDuckGo", url: `https://duckduckgo.com/?q=${q}` },
        { label: "Yandex", url: `https://yandex.com/search/?text=${q}` },
      ],
    },
    {
      title: "Redes sociais (dorks por site:)",
      icon: `https://www.google.com/s2/favicons?domain=linkedin.com&sz=64`,
      collapsible: true,
      links: [
        { label: "LinkedIn", url: `https://www.google.com/search?q=${q}+site:linkedin.com` },
        { label: "Instagram", url: `https://www.google.com/search?q=${q}+site:instagram.com` },
        { label: "Facebook", url: `https://www.google.com/search?q=${q}+site:facebook.com` },
        { label: "Twitter / X", url: `https://www.google.com/search?q=${q}+site:x.com` },
        { label: "TikTok", url: `https://www.google.com/search?q=${q}+site:tiktok.com` },
        { label: "YouTube", url: `https://www.google.com/search?q=${q}+site:youtube.com` },
        { label: "Reddit", url: `https://www.google.com/search?q=${q}+site:reddit.com` },
        { label: "Telegram (t.me)", url: `https://www.google.com/search?q=${q}+site:t.me` },
      ],
    },
    {
      title: "Brasil — registros públicos & justiça",
      icon: `https://www.google.com/s2/favicons?domain=jusbrasil.com.br&sz=64`,
      collapsible: true,
      fields: [
        { label: "Escavador", value: "Currículos Lattes, processos, citações e relacionamentos profissionais" },
        { label: "JusBrasil", value: "Consulta processual unificada (cível, criminal, trabalhista)" },
        { label: "ConsultaSócio", value: "Empresas em que a pessoa figura como sócia/administradora" },
        { label: "TSE", value: "Lista de candidaturas, doações e prestações de contas" },
        { label: "CNDT", value: "Certidão Nacional de Débitos Trabalhistas" },
        { label: "Diários Oficiais", value: "Publicações em DOU, DOE e diários municipais" },
      ],
      links: [
        { label: "Escavador", url: `https://www.escavador.com/busca?q=${encodeURIComponent(name)}` },
        { label: "JusBrasil", url: `https://www.jusbrasil.com.br/busca?q=${q}` },
        { label: "ConsultaSócio", url: `https://www.consultasocio.com/q?q=${encodeURIComponent(name)}` },
        { label: "TSE candidaturas", url: `https://divulgacandcontas.tse.jus.br/divulga/#/busca/nome/${encodeURIComponent(name)}` },
        { label: "Google (diários oficiais)", url: `https://www.google.com/search?q=${q}+site:jusbrasil.com.br/diarios` },
      ],
    }
  );

  return {
    ok: true,
    tool: "name",
    query: name,
    summary: nameResults.length > 0 ? `${nameResults.length} pessoas localizadas cadastralmente` : "Dorks e links de pesquisa de nome",
    sections,
    sources,
  };
}

function toolMeta(file: string): Promise<OsintResult> {
  return Promise.resolve({
    ok: true,
    tool: "meta",
    query: file,
    summary: "Extração de metadados requer upload do arquivo (em breve)",
    sections: [
      {
        title: "Como funciona",
        list: [
          "EXIF de imagens (JPG/HEIC): câmera, GPS, data, software",
          "PDF: autor, software, datas de criação e modificação",
          "Office (DOCX/XLSX): autor, revisões, comentários ocultos",
        ],
      },
      {
        title: "Ferramentas externas",
        links: [
          { label: "ExifTool (online)", url: "https://exif.tools/" },
          { label: "Metadata2Go", url: "https://www.metadata2go.com/" },
        ],
      },
    ],
    sources: ["Roadmap"],
  });
}

async function toolPhotoLocation(query: string): Promise<OsintResult> {
  const q = query.trim();
  const sections: Section[] = [];
  
  sections.push({
    title: "AI Photo Locator — Análise por Foto",
    fields: [
      { label: "Foto / Localidade", value: q },
      { label: "Status", value: "A extração automatizada de coordenadas requer upload direto da imagem." }
    ],
    links: [
      { label: "Localizar no Where Is This Place", url: `https://whereisthisplace.net` },
      { label: "Buscar imagem no Google Lens", url: `https://lens.google.com/search?p=${encodeURIComponent(q)}` }
    ]
  });

  return {
    ok: true,
    tool: "photolocation",
    query: q,
    summary: `Localização Inteligente por Foto para: ${q}`,
    sections,
    sources: ["WhereIsThisPlace.net"]
  };
}

// ---------- route ----------
export const Route = createFileRoute("/api/osint")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { tool?: string; query?: string };
        try {
          body = await request.json() as { tool?: string; query?: string };
        } catch {
          return json({ ok: false, tool: "", query: "", error: "JSON inválido", sections: [], sources: [] }, 400);
        }
        const tool = String(body.tool || "").toLowerCase();
        const query = String(body.query || "").trim();
        if (!tool || !query) {
          return json({ ok: false, tool, query, error: "Parâmetros 'tool' e 'query' são obrigatórios.", sections: [], sources: [] }, 400);
        }

        // --- Auth + quota ---
        const auth = request.headers.get("authorization") || "";
        const tokenStr = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (!tokenStr) {
          return json({ ok: false, tool, query, error: "Faça login para usar as ferramentas.", sections: [], sources: [] }, 401);
        }
        const { verifyToken } = await import("@/lib/auth");
        const tokenPayload = verifyToken(tokenStr);
        if (!tokenPayload) {
          return json({ ok: false, tool, query, error: "Sessão inválida ou expirada.", sections: [], sources: [] }, 401);
        }
        // --- Quota check ---
        try {
          const { noxPool } = await import("@/lib/db");
          const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
          const sub = await noxPool.query(
            `SELECT p.daily_search_limit FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.user_id = $1 AND s.status = 'active' AND s.expires_at > now() LIMIT 1`,
            [tokenPayload.userId]
          );
          const limit = sub.rows[0]?.daily_search_limit ?? 5;
          const usage = await noxPool.query(
            `SELECT searches FROM search_usage WHERE user_id = $1 AND day = $2`,
            [tokenPayload.userId, today]
          );
          const todaySearches = usage.rows[0]?.searches ?? 0;
          if (todaySearches >= limit) {
            return json({
              ok: false, tool, query,
              error: `Limite diário de ${limit} buscas atingido. Volte amanhã ou faça upgrade do seu plano.`,
              sections: [], sources: [],
            }, 429);
          }
        } catch (e) {
          console.error("Quota check error:", e);
        }

        try {
          let r: OsintResult;
          switch (tool) {
            case "email": r = await toolEmail(query); break;
            case "password": r = await toolPassword(query); break;
            case "breach": r = await toolEmail(query); r.tool = "breach"; break;
            case "ip": r = await toolIp(query); break;
            case "domain": r = await toolDomain(query); break;
            case "cpf": case "cnpj": r = await toolCpfCnpj(query); break;
            case "phone": r = await toolPhone(query); break;
            case "username": r = await toolUsername(query); break;
            case "link": r = await toolLink(query); break;
            case "urllogins": r = await toolUrlLogins(query); break;
            case "blockchain": r = await toolBlockchain(query); break;
            case "social": r = await toolSocial(query); break;
            case "name": r = await toolName(query); break;
            case "wifi": r = await toolWifi(query); break;
            case "photolocation": r = await toolPhotoLocation(query); break;
            case "meta": r = await toolMeta(query); break;
            default:
              return json({ ok: false, tool, query, error: "Ferramenta desconhecida.", sections: [], sources: [] }, 400);
          }
          // Track usage
          try {
            const { noxPool } = await import("@/lib/db");
            const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
            const results = countResults(r);
            await noxPool.query(
              `INSERT INTO search_usage (user_id, day, searches, results) VALUES ($1, $2, 1, $3)
                 ON CONFLICT (user_id, day) DO UPDATE SET searches = search_usage.searches + 1, results = search_usage.results + $3, updated_at = NOW()`,
              [tokenPayload.userId, today, results]
            );
          } catch (e) {
            console.error("Failed to track usage:", e);
          }
          return json(r);
        } catch (err) {
          return json({
            ok: false,
            tool,
            query,
            error: err instanceof Error ? err.message : "Erro desconhecido",
            sections: [],
            sources: [],
          }, 500);
        }
      },
    },
  },
});
