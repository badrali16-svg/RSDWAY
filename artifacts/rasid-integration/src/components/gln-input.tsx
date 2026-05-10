import { useState } from "react";
import { Check, ChevronsUpDown, Plus, UserPlus } from "lucide-react";
import {
  useListClients,
  useCreateClient,
  getListClientsQueryKey,
  type Client,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";

interface GlnInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function GlnInput({
  value,
  onChange,
  label,
  placeholder = "Global Location Number",
  className,
}: GlnInputProps) {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { t, dir } = useLanguage();

  const { data: clients = [] } = useListClients();

  const selectedClient = clients.find((c) => c.gln === value);

  return (
    <div className={cn("space-y-1", className)}>
      {label && <Label>{label}</Label>}
      <div className="flex gap-2 max-w-sm">
        <div className="relative flex-1">
          <Input
            dir="ltr"
            className="text-left pe-8"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {selectedClient && (
            <span className="absolute start-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground truncate max-w-[120px]">
              {selectedClient.glnOwnerName || selectedClient.name}
            </span>
          )}
        </div>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1 text-xs"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
              {t("gln.searchBtn")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start" dir={dir}>
            <Command>
              <CommandInput placeholder={t("gln.searchPlaceholder")} />
              <CommandList>
                <CommandEmpty>
                  <div className="py-3 text-center text-sm text-muted-foreground">
                    <p>{t("gln.noResults")}</p>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="mt-1 h-auto p-0 text-xs"
                      onClick={() => { setOpen(false); setDialogOpen(true); }}
                    >
                      <Plus className="h-3 w-3 me-1" />
                      {t("gln.addNew")}
                    </Button>
                  </div>
                </CommandEmpty>
                <CommandGroup heading={t("gln.groupLabel")}>
                  {clients.map((client) => (
                    <CommandItem
                      key={client.id}
                      value={`${client.gln} ${client.name} ${client.glnOwnerName ?? ""}`}
                      onSelect={() => {
                        onChange(client.gln);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "me-2 h-4 w-4 shrink-0",
                          value === client.gln ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{client.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{client.gln}</div>
                        {client.glnOwnerName && (
                          <div className="text-xs text-muted-foreground truncate">{client.glnOwnerName}</div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => { setOpen(false); setDialogOpen(true); }}
                    className="text-primary"
                  >
                    <Plus className="me-2 h-4 w-4" />
                    {t("gln.addNew")}
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {selectedClient && (
        <p className="text-xs text-muted-foreground">
          {selectedClient.name}
          {selectedClient.glnOwnerName && ` — ${selectedClient.glnOwnerName}`}
        </p>
      )}

      <QuickAddClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(gln) => { onChange(gln); setDialogOpen(false); }}
      />
    </div>
  );
}

function QuickAddClientDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (gln: string) => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const createClient = useCreateClient();
  const { t, dir } = useLanguage();

  const [name, setName] = useState("");
  const [gln, setGln] = useState("");
  const [glnOwnerName, setGlnOwnerName] = useState("");

  const reset = () => { setName(""); setGln(""); setGlnOwnerName(""); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !gln.trim()) return;
    createClient.mutate(
      { data: { name: name.trim(), gln: gln.trim(), glnOwnerName: glnOwnerName.trim() || null } },
      {
        onSuccess: (created: Client) => {
          toast({ title: t("clients.addedMsg"), description: created.name });
          qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
          onCreated(created.gln);
          reset();
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : t("common.error");
          toast({ title: t("common.error"), description: msg, variant: "destructive" });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent dir={dir} className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {t("gln.quickAddTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="qac-name">{t("clients.nameLabel")}</Label>
            <Input
              id="qac-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("clients.namePlaceholder")}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qac-gln">{t("clients.glnLabel")}</Label>
            <Input
              id="qac-gln"
              dir="ltr"
              className="text-left font-mono"
              value={gln}
              onChange={(e) => setGln(e.target.value)}
              placeholder={t("clients.glnPlaceholder")}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qac-owner">
              {t("clients.ownerLabel")}
              <span className="ms-1 text-xs text-muted-foreground">({t("common.optional")})</span>
            </Label>
            <Input
              id="qac-owner"
              value={glnOwnerName}
              onChange={(e) => setGlnOwnerName(e.target.value)}
              placeholder={t("clients.ownerPlaceholder")}
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="ghost" onClick={() => { onOpenChange(false); reset(); }}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={createClient.isPending || !name.trim() || !gln.trim()}>
              {createClient.isPending ? t("gln.saving") : t("gln.saveBtn")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
