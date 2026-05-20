import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { format, subMonths, parse, isValid } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { addHistory } from "@/lib/search-history";
import { searchDocuments } from "@/lib/search-documents.functions";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  agency: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  kwd: z.string().optional(),
  t: z.string().optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "원문공개 문서 일괄 다운로더" },
      {
        name: "description",
        content:
          "정보공개포털의 원문공개 문서를 기관명과 기간으로 검색하고 일괄 다운로드합니다.",
      },
    ],
  }),
  component: SearchPage,
});

type Row = {
  id: string;
  title: string;
  department: string;
  producedAt: string;
  fileCount: number;
  prdn_dt: string;
  prdn_nst_regist_no: string;
};

function parseDate(s?: string): Date | undefined {
  if (!s) return undefined;
  const d = parse(s, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
}

function SearchPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const searchFn = useServerFn(searchDocuments);

  const defaultStart = useMemo(() => subMonths(new Date(), 6), []);
  const defaultEnd = useMemo(() => new Date(), []);

  const [agency, setAgency] = useState(search.agency ?? "");
  const [startDate, setStartDate] = useState<Date | undefined>(
    parseDate(search.from) ?? defaultStart,
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    parseDate(search.to) ?? defaultEnd,
  );

  const [kwd, setKwd] = useState(search.kwd ?? "");

  const [results, setResults] = useState<Row[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [statusText, setStatusText] = useState("대기 중");
  const [notice, setNotice] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    agency: string;
    from: string;
    to: string;
    kwd: string;
    total: number;
  } | null>(null);

  async function runSearch() {
    if (!agency.trim() || !startDate || !endDate) return;
    const instt = agency.trim();
    const sd = format(startDate, "yyyyMMdd");
    const ed = format(endDate, "yyyyMMdd");

    setIsSearching(true);
    setStatusText("검색 중…");
    setNotice(null);
    setResults([]);
    setSelected(new Set());
    setHasSearched(true);

    try {
      const res = await searchFn({
        data: { insttNm: instt, startDate: sd, endDate: ed },
      });

      const items = res.items ?? [];
      const rows: Row[] = items.map((it, idx) => ({
        id: `${it.prdn_nst_regist_no || "row"}-${idx}`,
        title: it.title,
        department: it.dept,
        producedAt: it.doc_date,
        fileCount: 0,
        prdn_dt: it.prdn_dt,
        prdn_nst_regist_no: it.prdn_nst_regist_no,
      }));
      setResults(rows);

      // searches insert
      const { data: searchRow, error: sErr } = await supabase
        .from("searches")
        .insert({
          instt_nm: instt,
          start_date: sd,
          end_date: ed,
          total_count: rows.length,
        })
        .select()
        .single();

      if (!sErr && searchRow && rows.length > 0) {
        const payload = items.map((it) => ({
          search_id: searchRow.id,
          title: it.title,
          dept: it.dept,
          doc_date: it.doc_date,
          prdn_dt: it.prdn_dt,
          prdn_nst_regist_no: it.prdn_nst_regist_no,
          file_count: 0,
        }));
        await supabase.from("documents").insert(payload);
      }

      addHistory({
        agency: instt,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        resultCount: rows.length,
      });

      if (res.error || rows.length === 0) {
        setNotice("검색 결과가 없거나 일시적으로 가져올 수 없습니다");
        setStatusText("완료");
      } else {
        setStatusText(`${rows.length}건 수신`);
      }
    } catch (e) {
      setNotice("검색 결과가 없거나 일시적으로 가져올 수 없습니다");
      setStatusText("오류");
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  }

  // 기록에서 들어온 경우 자동 검색
  useEffect(() => {
    if (search.agency && search.from && search.to) {
      void runSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.t]);

  const allChecked =
    results.length > 0 && selected.size === results.length;
  const someChecked = selected.size > 0 && !allChecked;

  function toggleAll(v: boolean) {
    setSelected(v ? new Set(results.map((r) => r.id)) : new Set());
  }
  function toggleOne(id: string, v: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (v) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          원문공개 문서 일괄 다운로더
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          정보공개포털(open.go.kr)의 원문공개 문서를 기관명과 기간으로
          검색하여 일괄 다운로드합니다.
        </p>
      </div>

      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="agency">기관명</Label>
            <Input
              id="agency"
              placeholder="한국국제협력단"
              value={agency}
              onChange={(e) => setAgency(e.target.value)}
              disabled={isSearching}
            />
          </div>
          <div className="space-y-2">
            <Label>시작일</Label>
            <DateField date={startDate} onChange={setStartDate} disabled={isSearching} />
          </div>
          <div className="space-y-2">
            <Label>종료일</Label>
            <DateField date={endDate} onChange={setEndDate} disabled={isSearching} />
          </div>
          <Button
            disabled={isSearching || !agency.trim() || !startDate || !endDate}
            onClick={() => {
              if (agency.trim() && startDate && endDate) {
                navigate({
                  to: "/",
                  search: {
                    agency: agency.trim(),
                    from: format(startDate, "yyyy-MM-dd"),
                    to: format(endDate, "yyyy-MM-dd"),
                    t: String(Date.now()),
                  },
                });
              }
            }}
          >
            {isSearching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            검색
          </Button>
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {hasSearched
              ? `검색 결과 ${results.length}건${
                  selected.size ? ` · 선택 ${selected.size}건` : ""
                }`
              : "검색 조건을 입력하고 검색을 눌러주세요."}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{statusText}</span>
            <Button variant="default" disabled={selected.size === 0}>
              선택 항목 ZIP 다운로드
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      allChecked ? true : someChecked ? "indeterminate" : false
                    }
                    onCheckedChange={(v) => toggleAll(Boolean(v))}
                    aria-label="전체 선택"
                  />
                </TableHead>
                <TableHead>제목</TableHead>
                <TableHead className="w-40">담당부서</TableHead>
                <TableHead className="w-32">생산일자</TableHead>
                <TableHead className="w-24 text-right">본문파일수</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-sm text-muted-foreground"
                  >
                    {isSearching
                      ? "검색 중…"
                      : hasSearched
                        ? (notice ?? "검색 결과가 없습니다")
                        : "—"}
                  </TableCell>
                </TableRow>
              ) : (
                results.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={(v) => toggleOne(r.id, Boolean(v))}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell>{r.department}</TableCell>
                    <TableCell>{r.producedAt}</TableCell>
                    <TableCell className="text-right">{r.fileCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </main>
  );
}

function DateField({
  date,
  onChange,
  disabled,
}: {
  date: Date | undefined;
  onChange: (d: Date | undefined) => void;
  disabled?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "yyyy-MM-dd") : <span>날짜 선택</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onChange}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
