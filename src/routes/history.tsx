import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format, parse, isValid } from "date-fns";
import { Loader2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "검색 기록 — 원문공개 문서 일괄 다운로더" },
      {
        name: "description",
        content: "과거 검색 조건과 결과 기록을 확인합니다.",
      },
    ],
  }),
  component: HistoryPage,
});

type SearchRow = {
  id: string;
  instt_nm: string;
  start_date: string;
  end_date: string;
  total_count: number;
  created_at: string;
};

function fmtDate(yyyymmdd: string): string {
  const d = parse(yyyymmdd, "yyyyMMdd", new Date());
  return isValid(d) ? format(d, "yyyy-MM-dd") : yyyymmdd;
}

function HistoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<SearchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("searches")
        .select("id, instt_nm, start_date, end_date, total_count, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (cancelled) return;
      if (error) setError(error.message);
      else setItems((data ?? []) as SearchRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function reuse(r: SearchRow) {
    navigate({
      to: "/",
      search: {
        agency: r.instt_nm,
        from: fmtDate(r.start_date),
        to: fmtDate(r.end_date),
        t: String(Date.now()),
      },
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          검색 기록
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          과거 검색 조건을 클릭하면 동일한 조건으로 다시 검색합니다.
        </p>
      </div>

      <Card className="p-4 md:p-6">
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>기관명</TableHead>
                <TableHead className="w-56 whitespace-nowrap">기간</TableHead>
                <TableHead className="w-28 text-right whitespace-nowrap">
                  결과건수
                </TableHead>
                <TableHead className="w-44 whitespace-nowrap">
                  검색시각
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-32 text-center text-sm text-muted-foreground"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      불러오는 중…
                    </span>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-32 text-center text-sm text-destructive"
                  >
                    기록을 불러오지 못했습니다
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-32 text-center text-sm text-muted-foreground"
                  >
                    아직 검색 기록이 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                items.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-accent/40"
                    onClick={() => reuse(r)}
                  >
                    <TableCell className="font-medium">{r.instt_nm}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {fmtDate(r.start_date)} ~ {fmtDate(r.end_date)}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.total_count}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(r.created_at), "yyyy-MM-dd HH:mm")}
                    </TableCell>
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
