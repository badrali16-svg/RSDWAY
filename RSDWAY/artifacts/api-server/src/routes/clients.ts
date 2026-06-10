import { Router, type IRouter } from "express";
import { db, clientsTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import multer from "multer";
import * as XLSX from "xlsx";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router: IRouter = Router();

// ── Excel template download ─────────────────────────────────────────────────
router.get("/clients/template", requireAuth, (_req, res): void => {
  const wb = XLSX.utils.book_new();
  const headers = ["اسم العميل *", "رقم GLN *", "الجوال (اختياري)"];
  const example = [
    ["شركة الأمل للأدوية", "1234567890123", "0512345678"],
    ["مستشفى النور", "9876543210987", ""],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...example]);
  ws["!cols"] = [{ wch: 35 }, { wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, "العملاء");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="clients-template.xlsx"');
  res.send(buf);
});

// ── Excel bulk import ────────────────────────────────────────────────────────
router.post("/clients/import", requireAuth, upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const userId = req.session!.user!.id;
  const wb = XLSX.read(req.file.buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" }) as unknown[][];

  let added = 0;
  let skipped = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  // skip header row (index 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const name = String(row[0] ?? "").trim();
    const gln = String(row[1] ?? "").trim();
    const glnOwnerName = String(row[2] ?? "").trim() || null;

    // skip fully blank rows
    if (!name && !gln) continue;

    if (!name || !gln) {
      errors++;
      errorDetails.push(`الصف ${i + 1}: اسم العميل ورقم GLN مطلوبان`);
      continue;
    }

    const existing = await db
      .select()
      .from(clientsTable)
      .where(and(eq(clientsTable.userId, userId), eq(clientsTable.gln, gln)))
      .limit(1);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    try {
      await db.insert(clientsTable).values({ userId, name, gln, glnOwnerName });
      added++;
    } catch {
      errors++;
      errorDetails.push(`الصف ${i + 1}: خطأ أثناء الإضافة`);
    }
  }

  res.json({ added, skipped, errors, errorDetails });
});

router.get("/clients", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session!.user!.id;
  const rows = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.userId, userId))
    .orderBy(asc(clientsTable.name));
  res.json(rows.map(toSummary));
});

router.post("/clients", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session!.user!.id;
  const { name, gln, glnOwnerName } = req.body as {
    name?: string;
    gln?: string;
    glnOwnerName?: string | null;
  };
  if (!name || !gln) {
    res.status(400).json({ error: "name and gln are required" });
    return;
  }
  const existing = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.userId, userId), eq(clientsTable.gln, gln.trim())))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "رقم GLN مسجّل مسبقاً" });
    return;
  }
  const [row] = await db
    .insert(clientsTable)
    .values({ userId, name: name.trim(), gln: gln.trim(), glnOwnerName: glnOwnerName?.trim() || null })
    .returning();
  res.json(toSummary(row));
});

router.put("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session!.user!.id;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const existing = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.id, id), eq(clientsTable.userId, userId)))
    .limit(1);
  if (existing.length === 0) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  const { name, gln, glnOwnerName } = req.body as {
    name?: string;
    gln?: string;
    glnOwnerName?: string | null;
  };
  if (!name || !gln) {
    res.status(400).json({ error: "name and gln are required" });
    return;
  }
  const conflict = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.userId, userId), eq(clientsTable.gln, gln.trim())))
    .limit(1);
  if (conflict.length > 0 && conflict[0].id !== id) {
    res.status(409).json({ error: "رقم GLN مستخدم من عميل آخر" });
    return;
  }
  const [row] = await db
    .update(clientsTable)
    .set({ name: name.trim(), gln: gln.trim(), glnOwnerName: glnOwnerName?.trim() || null, updatedAt: new Date() })
    .where(and(eq(clientsTable.id, id), eq(clientsTable.userId, userId)))
    .returning();
  res.json(toSummary(row));
});

router.delete("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session!.user!.id;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const existing = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.id, id), eq(clientsTable.userId, userId)))
    .limit(1);
  if (existing.length === 0) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  await db.delete(clientsTable).where(and(eq(clientsTable.id, id), eq(clientsTable.userId, userId)));
  res.json({ ok: true });
});

function toSummary(row: typeof clientsTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    gln: row.gln,
    glnOwnerName: row.glnOwnerName ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export default router;
