import { Router, type IRouter } from "express";
import { db, clientsTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

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
