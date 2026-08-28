import { isDbConfigured } from "@/db";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDbConfigured) {
    return Response.json({ ok: true, mode: "memory" });
  }
  try {
    await db!.execute(sql`select 1`);
    return Response.json({ ok: true, mode: "postgres" });
  } catch {
    return Response.json({ ok: false, mode: "postgres" }, { status: 500 });
  }
}
