import {
  useGetOperationHistory,
  getGetOperationHistoryQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, History as HistoryIcon, CheckCircle2, XCircle } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export default function HistoryPage() {
  const { data: history, isLoading } = useGetOperationHistory({
    query: { queryKey: getGetOperationHistoryQueryKey() }
  });
  const { t } = useLanguage();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">{t("history.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("history.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HistoryIcon className="h-5 w-5 text-primary" />
            <CardTitle>{t("history.allOps")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : history?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-md">
              {t("history.noOps")}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">{t("history.colDate")}</TableHead>
                    <TableHead className="text-start">{t("history.colType")}</TableHead>
                    <TableHead className="text-start">{t("history.colStatus")}</TableHead>
                    <TableHead className="text-start">{t("history.colNotifId")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history?.map((op) => (
                    <TableRow key={op.id}>
                      <TableCell className="font-mono text-xs" dir="ltr">
                        {new Date(op.createdAt).toLocaleString('en-SA')}
                      </TableCell>
                      <TableCell className="font-medium">{op.operation}</TableCell>
                      <TableCell>
                        {op.success ? (
                          <div className="flex items-center text-green-600 dark:text-green-500">
                            <CheckCircle2 className="me-1 h-4 w-4" />
                            <span>{t("history.success")}</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-destructive">
                            <XCircle className="me-1 h-4 w-4" />
                            <span>{t("history.failed")}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs" dir="ltr">
                        {op.notificationId || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
