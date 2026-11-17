// 24-hour cache for AI fundamental reports.
//
// Primary storage: Supabase table `ai_stock_reports` (see supabase/ai_stock_reports.sql).
// Development fallback: local SQLite when Supabase is missing/unreachable.
// Cache access is best-effort: a missing table must never break the report.

import type { StockReportResult } from "@/lib/stock-report";
import { getDb } from "./db";
import { readSupabaseEnv } from "./env";
import { pgSelect, pgUpsert } from "./rest";

type SupabaseRow = {
  symbol: string;
  report: StockReportResult["report"];
  financials: StockReportResult["financials"];
  model: string;
  generated_at: string;
  expires_at: string;
};

function allowLocalFallback(): boolean {
  return process.env.NODE_ENV !== "production";
}

function fromSupabase(row: SupabaseRow): StockReportResult {
  return {
    symbol: row.symbol,
    report: row.report,
    financials: row.financials,
    model: row.model,
    generatedAt: row.generated_at,
    expiresAt: row.expires_at,
  };
}

function localDb() {
  const db = getDb();
  db.exec(`
    create table if not exists ai_stock_reports (
      symbol text primary key,
      report text not null,
      financials text not null,
      model text not null,
      generated_at text not null,
      expires_at text not null,
      updated_at text not null
    );
  `);
  return db;
}

function readLocal(symbol: string): StockReportResult | null {
  try {
    const row = localDb()
      .prepare(
        `select symbol, report, financials, model, generated_at, expires_at
         from ai_stock_reports
         where symbol = ? and expires_at > ?`
      )
      .get(symbol, new Date().toISOString()) as
      | {
          symbol: string;
          report: string;
          financials: string;
          model: string;
          generated_at: string;
          expires_at: string;
        }
      | undefined;
    if (!row) return null;
    return {
      symbol: row.symbol,
      report: JSON.parse(row.report) as StockReportResult["report"],
      financials: JSON.parse(row.financials) as StockReportResult["financials"],
      model: row.model,
      generatedAt: row.generated_at,
      expiresAt: row.expires_at,
    };
  } catch {
    return null;
  }
}

function writeLocal(result: StockReportResult): void {
  try {
    localDb()
      .prepare(
        `insert into ai_stock_reports
           (symbol, report, financials, model, generated_at, expires_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?)
         on conflict (symbol) do update set
           report = excluded.report,
           financials = excluded.financials,
           model = excluded.model,
           generated_at = excluded.generated_at,
           expires_at = excluded.expires_at,
           updated_at = excluded.updated_at`
      )
      .run(
        result.symbol,
        JSON.stringify(result.report),
        JSON.stringify(result.financials),
        result.model,
        result.generatedAt,
        result.expiresAt,
        new Date().toISOString()
      );
  } catch {
    // cache is best-effort
  }
}

export async function readStockReportCache(
  symbol: string
): Promise<StockReportResult | null> {
  const env = readSupabaseEnv();
  if (env?.secretKey) {
    try {
      const nowIso = new Date().toISOString();
      const rows = await pgSelect<SupabaseRow>(
        env,
        "ai_stock_reports",
        `symbol=eq.${encodeURIComponent(
          symbol
        )}&expires_at=gt.${encodeURIComponent(
          nowIso
        )}&select=symbol,report,financials,model,generated_at,expires_at&limit=1`
      );
      return rows[0] ? fromSupabase(rows[0]) : null;
    } catch (error) {
      console.error("[ai/stock-report] cache read failed", error);
      if (!allowLocalFallback()) return null;
    }
  }

  if (!allowLocalFallback()) return null;
  return readLocal(symbol);
}

export async function writeStockReportCache(
  result: StockReportResult
): Promise<void> {
  const env = readSupabaseEnv();
  if (env?.secretKey) {
    try {
      await pgUpsert(
        env,
        "ai_stock_reports",
        {
          symbol: result.symbol,
          report: result.report,
          financials: result.financials,
          model: result.model,
          generated_at: result.generatedAt,
          expires_at: result.expiresAt,
          updated_at: new Date().toISOString(),
        },
        "symbol"
      );
      return;
    } catch (error) {
      console.error("[ai/stock-report] cache write failed", error);
      if (!allowLocalFallback()) return;
    }
  }

  if (!allowLocalFallback()) return;
  writeLocal(result);
}