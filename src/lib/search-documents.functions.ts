import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const BASE = "https://www.open.go.kr";
const LIST_URL = `${BASE}/othicInfo/infoList/orginlInfoList.do`;
const AJAX_URL = `${BASE}/othicInfo/infoList/orginlInfoList.ajax`;

type CookieJar = Map<string, string>;

function extractSetCookies(headers: Headers): string[] {
  const anyHeaders = headers as unknown as { getSetCookie?: () => string[] };
  if (typeof anyHeaders.getSetCookie === "function") {
    return anyHeaders.getSetCookie();
  }
  const raw = headers.get("set-cookie");
  if (!raw) return [];
  // best-effort split on comma not inside expires=
  return raw.split(/,(?=\s*[A-Za-z0-9_\-]+=)/);
}

function mergeCookies(jar: CookieJar, headers: Headers) {
  for (const c of extractSetCookies(headers)) {
    const first = c.split(";")[0];
    const eq = first.indexOf("=");
    if (eq <= 0) continue;
    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1).trim();
    if (name) jar.set(name, value);
  }
}

function cookieHeader(jar: CookieJar): string {
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function baseHeaders(jar: CookieJar, extra: Record<string, string> = {}): HeadersInit {
  const h: Record<string, string> = {
    "User-Agent": UA,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    ...extra,
  };
  const cookie = cookieHeader(jar);
  if (cookie) h["Cookie"] = cookie;
  return h;
}

type Doc = {
  title: string;
  dept: string;
  doc_date: string;
  prdn_dt: string;
  prdn_nst_regist_no: string;
};

const inputSchema = z.object({
  insttNm: z.string().min(1).max(200),
  startDate: z.string().regex(/^\d{8}$/),
  endDate: z.string().regex(/^\d{8}$/),
  titleKwd: z.string().max(200).optional(),
});

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractResultJson(html: string): { rtnTotal?: number; rtnList?: any[] } | null {
  const m = html.match(/var\s+result\s*=\s*(\{[\s\S]*?\});/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

export const searchDocuments = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const { insttNm, startDate, endDate, titleKwd } = data;
    const kwd = titleKwd?.trim();
    const jar: CookieJar = new Map();
    const items: Doc[] = [];

    try {
      // Warmup 1: GET list page
      const r1 = await fetch(LIST_URL, {
        method: "GET",
        headers: baseHeaders(jar),
      });
      mergeCookies(jar, r1.headers);

      // Warmup 2: POST ajax
      const r2 = await fetch(AJAX_URL, {
        method: "POST",
        headers: baseHeaders(jar, {
          "X-Requested-With": "XMLHttpRequest",
          Referer: LIST_URL,
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        }),
        body: "viewPage=1&rowPage=10",
      });
      mergeCookies(jar, r2.headers);

      let total = Infinity;
      const MAX_PAGES = 50;

      for (let page = 1; page <= MAX_PAGES; page++) {
        const qs = new URLSearchParams({
          searchInsttCdNmPop: insttNm,
          insttCdNm: insttNm,
          startDate,
          endDate,
          rowPage: "100",
          viewPage: String(page),
          sort: "d",
        });
        if (kwd) qs.set("kwd", kwd);
        const url = `${LIST_URL}?${qs.toString()}`;
        const res = await fetch(url, {
          method: "GET",
          headers: baseHeaders(jar, { Referer: LIST_URL }),
        });
        mergeCookies(jar, res.headers);
        const html = await res.text();
        const result = extractResultJson(html);
        if (!result) {
          if (page === 1) {
            return {
              items: [],
              total: 0,
              error: "결과 파싱 실패",
            };
          }
          break;
        }
        if (typeof result.rtnTotal === "number") total = result.rtnTotal;
        const list = Array.isArray(result.rtnList) ? result.rtnList : [];
        if (list.length === 0) break;

        for (const it of list) {
          items.push({
            title: String(it.INFO_SJ ?? ""),
            dept: String(it.NFLST_CHRG_DEPT_NM ?? it.CHRG_DEPT_NM ?? ""),
            doc_date: String(it.P_DATE ?? it.R_DATE ?? ""),
            prdn_dt: String(it.PRDCTN_DT ?? ""),
            prdn_nst_regist_no: String(it.PRDCTN_INSTT_REGIST_NO ?? ""),
          });
        }

        if (items.length >= total) break;
        await sleep(300);
      }

      return { items, total: items.length, error: null as string | null };
    } catch (e) {
      return {
        items: [] as Doc[],
        total: 0,
        error: e instanceof Error ? e.message : "검색 실패",
      };
    }
  });
