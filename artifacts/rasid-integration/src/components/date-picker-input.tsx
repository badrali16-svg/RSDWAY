import { forwardRef, useEffect, useRef, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  formatDateValue,
  maskDateValue,
  normalizeDateValue,
  parseDateValue,
} from "@/lib/date-format";
import { cn } from "@/lib/utils";

type DatePickerInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "defaultValue" | "onChange"
> & {
  value?: string | null;
  onChange: (value: string) => void;
};

export const DatePickerInput = forwardRef<HTMLInputElement, DatePickerInputProps>(
  ({ value, onChange, onBlur, className, disabled, ...props }, forwardedRef) => {
    const normalizedValue = normalizeDateValue(value);
    const [text, setText] = useState(normalizedValue);
    const [open, setOpen] = useState(false);
    const selectedDate = parseDateValue(normalizedValue);
    const [month, setMonth] = useState<Date>(selectedDate ?? new Date());
    const popupInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      setText(normalizedValue);
      const parsed = parseDateValue(normalizedValue);
      if (parsed) setMonth(parsed);
    }, [normalizedValue]);

    const updateText = (rawValue: string) => {
      const directlyParsed = parseDateValue(rawValue);
      const nextText = directlyParsed
        ? formatDateValue(directlyParsed)
        : maskDateValue(rawValue);

      setText(nextText);
      const parsed = parseDateValue(nextText);
      if (parsed) {
        const formatted = formatDateValue(parsed);
        onChange(formatted);
        setMonth(parsed);
      } else if (!nextText) {
        onChange("");
      }
    };

    const handleBlur: React.FocusEventHandler<HTMLInputElement> = (event) => {
      if (text && !parseDateValue(text)) {
        setText(normalizedValue);
      }
      onBlur?.(event);
    };

    const handleSelect = (date?: Date) => {
      if (!date) return;
      const formatted = formatDateValue(date);
      setText(formatted);
      setMonth(date);
      onChange(formatted);
      setOpen(false);
    };

    return (
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen) {
            const parsed = parseDateValue(text);
            if (parsed) setMonth(parsed);
          }
        }}
      >
        <div className={cn("relative", className)}>
          <Input
            {...props}
            ref={forwardedRef}
            type="text"
            inputMode="numeric"
            dir="ltr"
            value={text}
            disabled={disabled}
            placeholder="DD-MM-YYYY"
            maxLength={10}
            className="pe-11 text-left"
            onChange={(event) => updateText(event.target.value)}
            onBlur={handleBlur}
          />
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              aria-label="اختيار التاريخ"
              className="absolute end-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </div>
        <PopoverContent
          align="start"
          className="w-auto p-0"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            requestAnimationFrame(() => {
              popupInputRef.current?.focus();
              popupInputRef.current?.select();
            });
          }}
        >
          <div className="border-b p-3">
            <Input
              ref={popupInputRef}
              type="text"
              inputMode="numeric"
              dir="ltr"
              value={text}
              placeholder="DD-MM-YYYY"
              maxLength={10}
              className="font-medium text-left"
              aria-label="التاريخ بصيغة يوم شهر سنة"
              onChange={(event) => updateText(event.target.value)}
              onBlur={handleBlur}
              onKeyDown={(event) => {
                if (event.key === "Enter" && parseDateValue(text)) {
                  event.preventDefault();
                  setOpen(false);
                }
              }}
            />
          </div>
          <Calendar
            mode="single"
            selected={selectedDate}
            month={month}
            onMonthChange={setMonth}
            onSelect={handleSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  },
);

DatePickerInput.displayName = "DatePickerInput";