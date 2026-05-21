import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const BASE = "https://www.open.go.kr";
const LIST_URL = `${BASE}/othicInfo/infoList/orginlInfoList.do`;
const AJAX_URL = `${BASE}/othicInfo/infoList/orginlInfoList.ajax`;
const DETL_URL = `${BASE}/othicInfo/infoList/infoListDetl.do`;
const FILE_REQ_URL = `${BASE}/util/wonmunUtils/wonmunFileRequest.ajax`;
const FILE_DL_URL = `${BASE}/util/wonmunUtils/wonmunFileDownload.down`;

type CookieJar = Map<string, string>;

function extractSetCookies(headers: Headers): string[] {
  const anyH = headers as unknown as { getSetCookie?: () => string[] };
  if (typeof anyH.getSetCookie === "function") return anyH.getSetCookie();
  const raw = headers.get("set-cookie");
  if (!raw) return [];
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
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
}

function baseHeaders(jar: CookieJar, extra: Record<string, string> = {}): HeadersInit {
  const h: Record<string, string> = {
    "User-Agent": UA,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    ...extra,
  };
  const cookie = cookieHeader(jar);
  if (cookie) h["Cookie"] = cookie;
  return h;
}

function extractResultJson(html: string): any | null {
  const m = html.match(/var\s+result\s*=\s*(\{[\s\S]*?\});/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

function toBase64(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString("base64");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const docSchema = z.object({
  prdnDt: z.string().regex(/^\d+$/).max(20),
  prdnNstRgstNo: z.string().min(1).max(100),
});

// 한 번에 처리할 수 있는 문서 수 한도 (서버리스 응답 시간 보호)
const MAX_DOCS_PER_BATCH = 30;

const inputSchema = z.object({
  docs: z.array(docSchema).min(1).max(MAX_DOCS_PER_BATCH),
});

type DocFile = { fileName: string; contentBase64: string };
type DocResult = {
  prdnNstRgstNo: string;
  prdnDt: string;
  files: DocFile[];
  error?: string;
};

async function warmup(jar: CookieJar) {
  const r1 = await fetch(LIST_URL, { method: "GET", headers: baseHeaders(jar) });
  mergeCookies(jar, r1.headers);
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
}

// 단일 문서 처리 (jar는 호출자에서 유지)
async function fetchOneDoc(
  jar: CookieJar,
  prdnDt: string,
  prdnNstRgstNo: string,
): Promise<DocResult> {
  const xsrf = jar.get("XSRF-TOKEN") ?? "";
  const files: DocFile[] = [];

  try {
    const detlQs = new URLSearchParams({ prdnDt, prdnNstRgstNo });
    const detlUrl = `${DETL_URL}?${detlQs.toString()}`;
    const detlRes = await fetch(detlUrl, {
      method: "GET",
      headers: baseHeaders(jar, {
        "X-XSRF-TOKEN": xsrf,
        Referer: LIST_URL,
      }),
    });
    mergeCookies(jar, detlRes.headers);
    const detlHtml = await detlRes.text();
    const result = extractResultJson(detlHtml);
    const vo = result?.openCateSearchVO;
    if (!vo) {
      return { prdnNstRgstNo, prdnDt, files: [], error: "상세 조회 실패" };
    }

    const docNo = String(vo.docNo ?? "");
    const nstCd = String(vo.nstCd ?? "");
    const chrgDeptNm = String(vo.chrgDeptNm ?? "");
    const oppSeCd = String(vo.oppSeCd ?? "");
    const fileList: any[] = Array.isArray(vo.fileList) ? vo.fileList : [];
    const bodyFiles = fileList.filter((f) => f?.fileSeDc === "본문");

    for (const f of bodyFiles) {
      const fileId = String(f.fileId ?? "");
      const fileNm = String(f.fileNm ?? "");
      if (!fileId) continue;

      const reqBody = new URLSearchParams({
        fileId,
        esbFileName: fileNm,
        docId: docNo,
        ctDate: prdnDt,
        orgCd: nstCd,
        prdnNstRgstNo,
        oppSeCd,
        isPdf: "N",
        chrgDeptNm,
      });
      const reqRes = await fetch(FILE_REQ_URL, {
        method: "POST",
        headers: baseHeaders(jar, {
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": xsrf,
          Referer: detlUrl,
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        }),
        body: reqBody.toString(),
      });
      mergeCookies(jar, reqRes.headers);
      const reqJson: any = await reqRes.json().catch(() => null);
      const r = reqJson?.result ?? reqJson;
      const esbFilePath = r?.esbFilePath;
      const esbFileName = r?.esbFileName;
      const fileName = r?.fileName ?? fileNm;
      if (!esbFilePath || !esbFileName) continue;

      const dlBody = new URLSearchParams({
        esbFilePath: String(esbFilePath),
        esbFileName: String(esbFileName),
        fileName: String(fileName),
        isPdf: "N",
        prdnNstRgstNo,
        prdnDt,
        fileId,
        gubun: String(esbFilePath),
      });
      const dlRes = await fetch(FILE_DL_URL, {
        method: "POST",
        headers: baseHeaders(jar, {
          "X-XSRF-TOKEN": xsrf,
          Referer: detlUrl,
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        }),
        body: dlBody.toString(),
      });
      mergeCookies(jar, dlRes.headers);
      const ct = dlRes.headers.get("content-type") ?? "";
      if (ct.includes("text/html")) continue;
      const buf = await dlRes.arrayBuffer();
      files.push({ fileName: String(fileName), contentBase64: toBase64(buf) });
    }

    return { prdnNstRgstNo, prdnDt, files };
  } catch (e) {
    return {
      prdnNstRgstNo,
      prdnDt,
      files: [],
      error: e instanceof Error ? e.message : "처리 실패",
    };
  }
}

export const downloadDocument = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const { docs } = data;
    const jar: CookieJar = new Map();
    const results: DocResult[] = [];

    try {
      // 워밍업: 배치 전체에 단 1번만
      await warmup(jar);
    } catch (e) {
      return {
        results: docs.map((d) => ({
          prdnNstRgstNo: d.prdnNstRgstNo,
          prdnDt: d.prdnDt,
          files: [] as DocFile[],
          error: "워밍업 실패",
        })) satisfies DocResult[],
        error: e instanceof Error ? e.message : "워밍업 실패",
      };
    }

    for (let i = 0; i < docs.length; i++) {
      const d = docs[i];
      const r = await fetchOneDoc(jar, d.prdnDt, d.prdnNstRgstNo);
      results.push(r);
      if (i < docs.length - 1) {
        // 문서 사이 약간 대기 (open.go.kr 부담 완화)
        await sleep(500);
      }
    }

    return { results, error: null as string | null };
  });
