"use client";

import { useMemo, useState } from "react";
import { BarChart3, Search } from "lucide-react";
import { DashboardRow } from "@/components/dashboard-row";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export type DashboardItem = {
  code: string;
  targetUrl: string;
  title: string | null;
  scanCount: number;
  createdAt: string;
  updatedAt: string;
  lastScanAt: string | null;
  expiresAt: string | null;
  archivedAt: string | null;
  isExpired: boolean;
  shortUrl: string;
};

type SortMode = "newest" | "scans" | "last-scan" | "title";

export function DashboardList({ items }: { items: DashboardItem[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");
  const [showArchived, setShowArchived] = useState(false);

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items
      .filter((item) => showArchived || !item.archivedAt)
      .filter((item) => {
        if (!needle) return true;
        return [item.code, item.title, item.targetUrl, item.shortUrl]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(needle));
      })
      .sort((a, b) => compareItems(a, b, sort));
  }, [items, query, showArchived, sort]);

  if (items.length === 0) {
    return (
      <Card className="grid min-h-56 place-items-center border-dashed p-8 text-center">
        <div>
          <BarChart3 className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">Noch keine dynamischen Codes</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Erstelle den ersten Code und die Scans erscheinen hier.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Card className="mb-4 border-border bg-card p-3 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-8"
              placeholder="Suchen nach Titel, Slug oder URL"
            />
          </div>
          <Select value={sort} onValueChange={(value) => setSort(value as SortMode)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Neueste zuerst</SelectItem>
              <SelectItem value="scans">Meiste Scans</SelectItem>
              <SelectItem value="last-scan">Letzter Scan</SelectItem>
              <SelectItem value="title">Titel A-Z</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 md:justify-start">
            <Label htmlFor="show-archived" className="text-sm">
              Archiv anzeigen
            </Label>
            <Switch
              id="show-archived"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
          </div>
        </div>
      </Card>

      {filteredItems.length === 0 ? (
        <Card className="border-dashed p-8 text-center text-sm text-muted-foreground">
          Keine Codes passen zu deiner Suche.
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <DashboardRow key={item.code} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function compareItems(a: DashboardItem, b: DashboardItem, sort: SortMode) {
  switch (sort) {
    case "scans":
      return b.scanCount - a.scanCount;
    case "last-scan":
      return dateValue(b.lastScanAt) - dateValue(a.lastScanAt);
    case "title":
      return (a.title || a.code).localeCompare(b.title || b.code, "de");
    default:
      return dateValue(b.createdAt) - dateValue(a.createdAt);
  }
}

function dateValue(value: string | null) {
  return value ? new Date(value).getTime() : 0;
}
