import { useState } from "react";
import {
  useListClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  getListClientsQueryKey,
  type Client,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, UserPlus, Pencil, Trash2, Users2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";

export default function ClientsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: clients = [], isLoading } = useListClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const { t, dir } = useLanguage();

  const [search, setSearch] = useState("");
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: getListClientsQueryKey() });

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.gln.toLowerCase().includes(q) ||
      (c.glnOwnerName ?? "").toLowerCase().includes(q)
    );
  });

  const handleCreate = (data: { name: string; gln: string; glnOwnerName: string | null }) => {
    createClient.mutate(
      { data },
      {
        onSuccess: (c: Client) => {
          toast({ title: t("clients.addedMsg"), description: c.name });
          invalidate();
          setShowCreate(false);
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : t("common.error");
          toast({ title: t("common.error"), description: msg, variant: "destructive" });
        },
      },
    );
  };

  const handleUpdate = (data: { name: string; gln: string; glnOwnerName: string | null }) => {
    if (!editClient) return;
    updateClient.mutate(
      { id: editClient.id, data },
      {
        onSuccess: (c: Client) => {
          toast({ title: t("clients.updatedMsg"), description: c.name });
          invalidate();
          setEditClient(null);
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : t("common.error");
          toast({ title: t("common.error"), description: msg, variant: "destructive" });
        },
      },
    );
  };

  const handleDelete = (id: number, name: string) => {
    deleteClient.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: t("clients.deletedMsg"), description: name });
          invalidate();
        },
        onError: () =>
          toast({ title: t("common.error"), description: t("clients.failDelete"), variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">{t("clients.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("clients.subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pe-9"
            placeholder={t("clients.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          {t("clients.add")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users2 className="h-5 w-5 text-primary" />
            <CardTitle>{t("clients.listTitle")}</CardTitle>
          </div>
          <CardDescription>
            {clients.length === 0
              ? t("clients.countZero")
              : `${clients.length} ${t("clients.count")}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              {search ? t("clients.noResults") : t("clients.empty")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">{t("clients.colName")}</TableHead>
                  <TableHead className="text-start">{t("clients.colGln")}</TableHead>
                  <TableHead className="text-start">{t("clients.colOwner")}</TableHead>
                  <TableHead className="text-start">{t("clients.colDate")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {client.gln}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {client.glnOwnerName ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs" dir="ltr">
                      {new Date(client.createdAt).toLocaleDateString("en-SA")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditClient(client)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent dir={dir}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("clients.deleteTitle")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("clients.deleteDesc")} «{client.name}» (GLN: {client.gln})
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(client.id, client.name)}
                                disabled={deleteClient.isPending}
                              >
                                {t("common.delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ClientFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSave={handleCreate}
        saving={createClient.isPending}
      />

      <ClientFormDialog
        open={!!editClient}
        onOpenChange={(v) => { if (!v) setEditClient(null); }}
        initial={editClient ?? undefined}
        onSave={handleUpdate}
        saving={updateClient.isPending}
      />
    </div>
  );
}

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Client;
  onSave: (data: { name: string; gln: string; glnOwnerName: string | null }) => void;
  saving: boolean;
}

function ClientFormDialog({ open, onOpenChange, initial, onSave, saving }: ClientFormDialogProps) {
  const { t, dir } = useLanguage();
  const [name, setName] = useState(initial?.name ?? "");
  const [gln, setGln] = useState(initial?.gln ?? "");
  const [glnOwnerName, setGlnOwnerName] = useState(initial?.glnOwnerName ?? "");

  const reset = () => {
    setName(initial?.name ?? "");
    setGln(initial?.gln ?? "");
    setGlnOwnerName(initial?.glnOwnerName ?? "");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !gln.trim()) return;
    onSave({ name: name.trim(), gln: gln.trim(), glnOwnerName: glnOwnerName.trim() || null });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent dir={dir} className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {initial ? t("clients.formEditTitle") : t("clients.formAddTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="cf-name">{t("clients.nameLabel")}</Label>
            <Input
              id="cf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("clients.namePlaceholder")}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-gln">{t("clients.glnLabel")}</Label>
            <Input
              id="cf-gln"
              dir="ltr"
              className="text-left font-mono"
              value={gln}
              onChange={(e) => setGln(e.target.value)}
              placeholder={t("clients.glnPlaceholder")}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-owner">
              {t("clients.ownerLabel")}
              <span className="ms-1 text-xs text-muted-foreground">({t("common.optional")})</span>
            </Label>
            <Input
              id="cf-owner"
              value={glnOwnerName}
              onChange={(e) => setGlnOwnerName(e.target.value)}
              placeholder={t("clients.ownerPlaceholder")}
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saving || !name.trim() || !gln.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {initial ? t("clients.btnSave") : t("clients.btnAdd")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
