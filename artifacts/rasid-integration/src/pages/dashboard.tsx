import { useGetAuthConfig, useGetOperationHistory, getGetOperationHistoryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Activity, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/language-context";

export default function Dashboard() {
  const { data: authConfig, isLoading: authLoading } = useGetAuthConfig();
  const { data: history, isLoading: historyLoading } = useGetOperationHistory({
    query: { queryKey: getGetOperationHistoryQueryKey() }
  });
  const { t } = useLanguage();

  const needsConfig = authConfig && !authConfig.hasPassword;

  const totalOps = history?.length || 0;
  const successOps = history?.filter(op => op.success).length || 0;
  const failOps = totalOps - successOps;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
      </div>

      {authLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : needsConfig ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="ms-2">{t("dashboard.configAlertTitle")}</AlertTitle>
          <AlertDescription className="ms-2 mt-2 flex items-center justify-between gap-4">
            <span>{t("dashboard.configAlertDesc")}</span>
            <Link href="/settings">
              <Button size="sm" variant="outline" className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shrink-0">
                {t("dashboard.goToSettings")}
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.totalOps")}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{totalOps}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.successOps")}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{successOps}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.failedOps")}</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-destructive">{failOps}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("dashboard.latestOps")}</CardTitle>
              <CardDescription>{t("dashboard.latestOpsDesc")}</CardDescription>
            </div>
            <Link href="/history">
              <Button variant="outline" size="sm" className="gap-2">
                <Clock className="h-4 w-4" />
                {t("dashboard.viewAll")}
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : history?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("dashboard.noOps")}
            </div>
          ) : (
            <div className="space-y-4">
              {history?.slice(0, 5).map((op) => (
                <div key={op.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    {op.success ? (
                      <div className="rounded-full bg-green-100 p-1 dark:bg-green-900/30">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                      </div>
                    ) : (
                      <div className="rounded-full bg-red-100 p-1 dark:bg-red-900/30">
                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-500" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{op.operation}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {new Date(op.createdAt).toLocaleString('en-SA')}
                      </p>
                    </div>
                  </div>
                  {op.notificationId && (
                    <div className="text-sm font-mono text-muted-foreground" dir="ltr">
                      ID: {op.notificationId}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
