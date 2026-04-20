import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  useGetOperationHistory, 
  getGetOperationHistoryQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, History as HistoryIcon, CheckCircle2, XCircle } from "lucide-react";

export default function HistoryPage() {
  const { data: history, isLoading } = useGetOperationHistory({ 
    query: { queryKey: getGetOperationHistoryQueryKey() } 
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">سجل العمليات</h1>
        <p className="text-muted-foreground mt-1">تاريخ العمليات المنفذة على نظام رصد وحالتها</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HistoryIcon className="h-5 w-5 text-primary" />
            <CardTitle>جميع العمليات السابقة</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : history?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-md">
              لا توجد عمليات مسجلة في النظام
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">تاريخ العملية</TableHead>
                    <TableHead className="text-right">نوع العملية</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">رقم الإشعار</TableHead>
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
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            <span>ناجحة</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-destructive">
                            <XCircle className="mr-1 h-4 w-4" />
                            <span>فاشلة</span>
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