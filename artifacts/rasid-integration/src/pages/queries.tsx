import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  useCheckStatus, 
  useDispatchDetail, 
  useGetCountryList, 
  useGetCityList, 
  useGetDrugList, 
  useGetErrorCodeList, 
  useGetStakeholderList,
  SoapResponse
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Info, Globe, MapPin, Pill, AlertTriangle, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SoapResponseViewer } from "@/components/soap-response-viewer";
import { ProductListInput } from "@/components/product-list-input";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/lib/language-context";

const checkStatusSchema = z.object({
  products: z.array(z.object({
    GTIN: z.string().min(1, "GTIN مطلوب"),
    SN: z.string().optional(),
    BN: z.string().optional(),
    XD: z.string().optional(),
    QUANTITY: z.number().optional()
  })).min(1, "يجب إضافة منتج واحد على الأقل")
});

const dispatchDetailSchema = z.object({
  dispatchNotificationId: z.string().min(1, "رقم الإشعار مطلوب")
});

const drugListSchema = z.object({
  drugStatus: z.number().optional()
});

const stakeholderSchema = z.object({
  stakeholderType: z.number().optional(),
  getAll: z.boolean().default(false),
  cityId: z.number().optional()
});

export default function QueriesPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [response, setResponse] = useState<SoapResponse | null>(null);

  const checkStatusMutation = useCheckStatus();
  const dispatchDetailMutation = useDispatchDetail();
  const countryListMutation = useGetCountryList();
  const cityListMutation = useGetCityList();
  const drugListMutation = useGetDrugList();
  const errorCodeListMutation = useGetErrorCodeList();
  const stakeholderListMutation = useGetStakeholderList();

  const checkStatusForm = useForm<z.infer<typeof checkStatusSchema>>({
    resolver: zodResolver(checkStatusSchema),
    defaultValues: { products: [] }
  });

  const dispatchDetailForm = useForm<z.infer<typeof dispatchDetailSchema>>({
    resolver: zodResolver(dispatchDetailSchema),
    defaultValues: { dispatchNotificationId: "" }
  });

  const drugListForm = useForm<z.infer<typeof drugListSchema>>({
    resolver: zodResolver(drugListSchema)
  });

  const stakeholderForm = useForm<z.infer<typeof stakeholderSchema>>({
    resolver: zodResolver(stakeholderSchema),
    defaultValues: { getAll: false }
  });

  const runMutation = (mutation: any, payload?: any) => {
    mutation.mutate(payload ? { data: payload } : undefined, {
      onSuccess: (res: SoapResponse) => {
        setResponse(res);
        toast({ title: t("common.saved"), description: "تم الاستعلام بنجاح" });
      },
      onError: () => toast({ title: t("common.error"), description: "حدث خطأ أثناء الاستعلام", variant: "destructive" })
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">{t("queries.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("queries.subtitle")}</p>
      </div>

      <Tabs defaultValue="status" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 h-auto">
          <TabsTrigger value="status" className="py-2">{t("queries.tabCheckStatus")}</TabsTrigger>
          <TabsTrigger value="dispatch" className="py-2">{t("queries.tabDispatchDetail")}</TabsTrigger>
          <TabsTrigger value="stakeholders" className="py-2">{t("queries.tabStakeholder")}</TabsTrigger>
          <TabsTrigger value="drugs" className="py-2">{t("queries.tabDrug")}</TabsTrigger>
          <TabsTrigger value="countries" className="py-2">{t("queries.tabCountry")}</TabsTrigger>
          <TabsTrigger value="cities" className="py-2">{t("queries.tabCity")}</TabsTrigger>
          <TabsTrigger value="errors" className="py-2">{t("queries.tabError")}</TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                <CardTitle>الاستعلام عن حالة المنتجات</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...checkStatusForm}>
                <form onSubmit={checkStatusForm.handleSubmit((v) => runMutation(checkStatusMutation, v))} className="space-y-6">
                  <ProductListInput />
                  <Button type="submit" disabled={checkStatusMutation.isPending}>
                    {checkStatusMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    {t("queries.executeStatus")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dispatch">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                <CardTitle>تفاصيل إشعار الإرسال</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...dispatchDetailForm}>
                <form onSubmit={dispatchDetailForm.handleSubmit((v) => runMutation(dispatchDetailMutation, v))} className="space-y-6">
                  <FormField control={dispatchDetailForm.control} name="dispatchNotificationId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("queries.notifId")}</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder="ID..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={dispatchDetailMutation.isPending}>
                    {dispatchDetailMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    {t("queries.executeDetail")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stakeholders">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>قائمة الجهات</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...stakeholderForm}>
                <form onSubmit={stakeholderForm.handleSubmit((v) => runMutation(stakeholderListMutation, v))} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={stakeholderForm.control} name="stakeholderType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>نوع الجهة (اختياري)</FormLabel>
                        <FormControl>
                          <Input dir="ltr" className="text-left" type="number" placeholder="مثال: 1" {...field} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={stakeholderForm.control} name="cityId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>معرف المدينة (اختياري)</FormLabel>
                        <FormControl>
                          <Input dir="ltr" className="text-left" type="number" placeholder="مثال: 101" {...field} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={stakeholderForm.control} name="getAll" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} className="me-2" />
                      </FormControl>
                      <div className="space-y-1 leading-none me-2">
                        <FormLabel>جلب كافة الجهات</FormLabel>
                      </div>
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={stakeholderListMutation.isPending}>
                    {stakeholderListMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    {t("queries.executeStakeholder")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drugs">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-primary" />
                <CardTitle>قائمة الأدوية</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...drugListForm}>
                <form onSubmit={drugListForm.handleSubmit((v) => runMutation(drugListMutation, v))} className="space-y-6">
                  <FormField control={drugListForm.control} name="drugStatus" render={({ field }) => (
                    <FormItem>
                      <FormLabel>حالة الدواء (اختياري)</FormLabel>
                      <FormControl>
                        <Input dir="ltr" className="text-left max-w-sm" type="number" placeholder="مثال: 1 (فعال)" {...field} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={drugListMutation.isPending}>
                    {drugListMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    {t("queries.executeDrug")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="countries">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle>قائمة الدول المعتمدة</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Button onClick={() => runMutation(countryListMutation)} disabled={countryListMutation.isPending}>
                {countryListMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("queries.executeCountry")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cities">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <CardTitle>قائمة مدن المملكة</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Button onClick={() => runMutation(cityListMutation)} disabled={cityListMutation.isPending}>
                {cityListMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("queries.executeCity")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <CardTitle>رموز الأخطاء (Error Codes)</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Button onClick={() => runMutation(errorCodeListMutation)} disabled={errorCodeListMutation.isPending}>
                {errorCodeListMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("queries.executeError")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      <SoapResponseViewer response={response} />
    </div>
  );
}
