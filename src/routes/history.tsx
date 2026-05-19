import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getHistory,
  clearHistory,
  type SearchHistoryEntry,
} from "@/lib/search-history";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "검색 기록 — 원문공개 문서 일괄 다운로더" },
      { name: "description", content: "과거 검색 조건과 결과 기록을 확인합니다." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<SearchHistoryEntry[]>([]);

  useEffect(() => {
    setItems(getHistory());
  }, []);

  function reuse(e: SearchHistoryEntry) {
    navigate({
      to: "/",
      search: {
        agency: e.agency,
        from: e.startDate,
        to: e.endDate,
        t: String(Date.now()),
      },
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            검색 기록
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            과거 검색 조건을 클릭하면 동일한 조건으로 다시 검색합니다.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            clearHistory();
            setItems([]);
          }}
          disabled={items.length === 0}
        >
          전체 삭제
        </Button>
      </div>

      <Card className="p-6">
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>기관명</TableHead>
                <TableHead className="w-64">기간</TableHead>
                <TableHead className="w-28 text-right">결과건수</TableHead>
                <TableHead className="w-48">검색시각</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-32 text-center text-sm text-muted-foreground"
                  >
                    검색 기록이 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                items.map((e) => (
                  <TableRow
                    key={e.id}
                    className="cursor-pointer"
                    onClick={() => reuse(e)}
                  >
                    <TableCell className="font-medium">{e.agency}</TableCell>
                    <TableCell>
                      {e.startDate} ~ {e.endDate}
                    </TableCell>
                    <TableCell className="text-right">
                      {e.resultCount}
                    </TableCell>
                    <TableCell>
                      {format(new Date(e.searchedAt), "yyyy-MM-dd HH:mm")}
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
