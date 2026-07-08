// Decodificador de Pix (padrão EMV-QRCPS / BR Code do BCB)
// Baseado no padrão EMVCo e especificações do Banco Central (Manual BR Code).
// Implementação client-side, sem dependência de serviços externos.

export type PixField = {
  id: string;
  label: string;
  value: string;
  subfields?: PixField[];
};

export type PixDecodeResult = {
  ok: boolean;
  error?: string;
  fields: PixField[];
  info: {
    tipo: "Estático" | "Dinâmico" | "Desconhecido";
    chavePix?: string;
    nome?: string;
    cidade?: string;
    valor?: string;
    moeda?: string;
    descricao?: string;
    gui?: string;
    url?: string;
  };
  crcValid: boolean;
};

const FIELD_LABELS: Record<string, string> = {
  "00": "Payload Format Indicator",
  "01": "Point of Initiation Method",
  "26": "Merchant Account Information",
  "27": "Merchant Account Information",
  "52": "Merchant Category Code",
  "53": "Transaction Currency",
  "54": "Transaction Amount",
  "58": "Country Code",
  "59": "Merchant Name",
  "60": "Merchant City",
  "61": "Postal Code",
  "62": "Additional Data Field",
  "63": "CRC",
  "80": "Unreserved Templates",
};

const SUBFIELD_LABELS: Record<string, string> = {
  "00": "GUI (Globally Unique Identifier)",
  "01": "Chave Pix",
  "02": "Informação adicional",
  "03": "URL do banco",
  "04": "Valor",
  "05": "Referência (txid)",
  "25": "Payment System Specific",
};

const CURRENCY_CODES: Record<string, string> = {
  "986": "BRL (Real brasileiro)",
  "840": "USD (Dólar americano)",
  "978": "EUR (Euro)",
};

function parseTLV(payload: string, start: number, end: number): PixField[] {
  const fields: PixField[] = [];
  let i = start;
  while (i + 4 <= end) {
    const id = payload.slice(i, i + 2);
    const len = parseInt(payload.slice(i + 2, i + 4), 10);
    if (Number.isNaN(len)) break;
    const value = payload.slice(i + 4, i + 4 + len);
    i += 4 + len;
    fields.push({ id, label: FIELD_LABELS[id] || `Campo ${id}`, value });
  }
  return fields;
}

function parseSubfields(value: string): PixField[] {
  const subs: PixField[] = [];
  let i = 0;
  while (i + 4 <= value.length) {
    const id = value.slice(i, i + 2);
    const len = parseInt(value.slice(i + 2, i + 4), 10);
    if (Number.isNaN(len)) break;
    const subValue = value.slice(i + 4, i + 4 + len);
    i += 4 + len;
    subs.push({ id, label: SUBFIELD_LABELS[id] || `Subcampo ${id}`, value: subValue });
  }
  return subs;
}

// CRC16-CCITT (0x1021) com XOR inicial 0xFFFF — usado no padrão Pix (campo 63)
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
      else crc = crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function decodePix(raw: string): PixDecodeResult {
  const payload = raw.replace(/\s+/g, "").trim();
  if (!payload) {
    return {
      ok: false,
      error: "Cole um código Pix para decodificar.",
      fields: [],
      crcValid: false,
      info: { tipo: "Desconhecido" },
    };
  }

  const fields = parseTLV(payload, 0, payload.length);

  // Validação de CRC (campo 63)
  let crcValid = false;
  const crcField = fields.find((f) => f.id === "63");
  if (crcField) {
    const crcIndex = payload.lastIndexOf("6304");
    if (crcIndex >= 0) {
      const dataPart = payload.slice(0, crcIndex + 4);
      const declared = payload.slice(crcIndex + 4, crcIndex + 8);
      crcValid = crc16(dataPart) === declared;
    }
  }

  const get = (id: string) => fields.find((f) => f.id === id)?.value;

  const info: PixDecodeResult["info"] = {
    tipo:
      get("01") === "11"
        ? "Estático"
        : get("01") === "12"
        ? "Dinâmico"
        : "Desconhecido",
    moeda: CURRENCY_CODES[get("53") || ""] || get("53") || undefined,
    valor: get("54") || undefined,
    nome: get("59") || undefined,
    cidade: get("60") || undefined,
    descricao: undefined,
    gui: undefined,
    chavePix: undefined,
    url: undefined,
  };

  // Merchant Account Information (26/27) — contém a chave Pix e GUI
  const merchant = fields.find((f) => f.id === "26" || f.id === "27");
  if (merchant) {
    const subs = parseSubfields(merchant.value);
    merchant.subfields = subs;
    const gui = subs.find((s) => s.id === "00")?.value;
    const chave = subs.find((s) => s.id === "01")?.value;
    const url = subs.find((s) => s.id === "03")?.value;
    const extra = subs.find((s) => s.id === "02")?.value;
    if (gui) info.gui = gui;
    if (chave) info.chavePix = chave;
    if (url) info.url = url;
    if (extra && !info.descricao) info.descricao = extra;
  }

  // Additional Data Field (62) — referência / txid
  const additional = fields.find((f) => f.id === "62");
  if (additional) {
    const subs = parseSubfields(additional.value);
    additional.subfields = subs;
    const ref = subs.find((s) => s.id === "05")?.value;
    if (ref) info.descricao = ref;
  }

  return { ok: true, fields, info, crcValid };
}
