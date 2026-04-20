import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "./ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { Plus, Trash2 } from "lucide-react";

export function ProductListInput({ name = "products" }: { name?: string }) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <FormLabel className="text-base font-semibold">قائمة المنتجات (Products)</FormLabel>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ GTIN: "", SN: "", BN: "", XD: "", QUANTITY: undefined })}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          إضافة منتج
        </Button>
      </div>

      {fields.length === 0 && (
        <div className="text-center p-4 border border-dashed rounded-md text-muted-foreground bg-muted/20">
          لم يتم إضافة أي منتجات
        </div>
      )}

      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="relative p-4 border rounded-md bg-card space-y-4">
            <div className="absolute top-2 left-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="font-medium text-sm text-muted-foreground pb-2 border-b mb-4">
              المنتج {index + 1}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <FormField
                control={control}
                name={`${name}.${index}.GTIN`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GTIN</FormLabel>
                    <FormControl>
                      <Input dir="ltr" className="text-left" placeholder="Global Trade Item Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`${name}.${index}.SN`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SN</FormLabel>
                    <FormControl>
                      <Input dir="ltr" className="text-left" placeholder="Serial Number" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`${name}.${index}.BN`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BN</FormLabel>
                    <FormControl>
                      <Input dir="ltr" className="text-left" placeholder="Batch Number" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`${name}.${index}.XD`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>XD</FormLabel>
                    <FormControl>
                      <Input dir="ltr" className="text-left" type="date" placeholder="YYYY-MM-DD" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`${name}.${index}.QUANTITY`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>QUANTITY</FormLabel>
                    <FormControl>
                      <Input 
                        dir="ltr" 
                        className="text-left" 
                        type="number" 
                        placeholder="Quantity" 
                        {...field} 
                        value={field.value || ""} 
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}