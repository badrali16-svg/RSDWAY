import { useRef, useCallback, useState, useEffect } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button } from "./ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "./ui/form";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Plus, Trash2, Upload, FileSpreadsheet, X, CheckCircle2, Download, ScanLine, AlertCircle, AlertTriangle, Camera, Loader2, SwitchCamera, Focus, ZoomIn, ZoomOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/use-language";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { BrowserDatamatrixCodeReader, type IScannerControls } from "@zxing/browser";
import { DecodeHintType } from "@zxing/library";
import * as XLSX from "xlsx";

// ─── GS1 Data Matrix parser ──────────────────────────────────────────────────

type ParsedGS1 = {
  gtin?: string;
  sn?: string;
  bn?: string;
  xd?: string;   // YYYY-MM-DD
  qty?: number;
};

/** Convert GS1 YYMMDD to YYYY-MM-DD. Day=00 → last day of month. */
function gs1DateToIso(raw: string): string {
  if (raw.length !== 6) return "";
  const yy = parseInt(raw.slice(0, 2), 10);
  const mm = parseInt(raw.slice(2, 4), 10);
  let dd = parseInt(raw.slice(4, 6), 10);
  const year = yy < 50 ? 2000 + yy : 1900 + yy;
  if (dd === 0) {
    // Last day of month
    dd = new Date(year, mm, 0).getDate();
  }
  return `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/** Parse GS1 Data Matrix with parentheses notation e.g. (01)GTIN(17)DATE(10)BN(21)SN */
function parseParentheses(s: string): ParsedGS1 {
  const result: ParsedGS1 = {};
  const re = /\((\d{2,4})\)([^(]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const ai = m[1];
    const val = m[2].trim();
    if (ai === "01" && val.length >= 13) result.gtin = val.slice(0, 14);
    else if (ai === "17" && val.length >= 6) result.xd = gs1DateToIso(val.slice(0, 6));
    else if (ai === "10") result.bn = val || undefined;
    else if (ai === "21") result.sn = val || undefined;
    else if (ai === "30" || ai === "37") { const q = parseInt(val, 10); if (!isNaN(q)) result.qty = q; }
  }
  return result;
}

/** Parse raw GS1 sequential string (no parentheses).
 *  Uses GS (char 29 / \x1d) as variable-field separator.
 *  Fixed AIs: 01→14 chars, 17→6 chars, 310x→6 chars.
 */
function parseRaw(s: string): ParsedGS1 {
  const GS = "\x1d";
  const result: ParsedGS1 = {};
  let i = 0;

  // Skip leading FNC1 indicator ]d2 or ]C1
  s = s.replace(/^\](?:d2|C1|Q3|e0)/i, "");

  while (i < s.length) {
    const remaining = s.slice(i);
    const ai2 = remaining.slice(0, 2);
    const ai3 = remaining.slice(0, 3);
    const ai4 = remaining.slice(0, 4);

    if (ai2 === "01" && remaining.length >= 16) {
      result.gtin = remaining.slice(2, 16);
      i += 16;
    } else if (ai2 === "17" && remaining.length >= 8) {
      result.xd = gs1DateToIso(remaining.slice(2, 8));
      i += 8;
    } else if (ai2 === "10") {
      i += 2;
      const rest10 = remaining.slice(2);
      const gsPos10 = rest10.indexOf(GS);
      let end10: number;
      if (gsPos10 >= 0) {
        end10 = gsPos10;
      } else {
        // No GS separator: look for AI "21" (serial) as terminator
        const ai21pos = rest10.indexOf("21");
        end10 = ai21pos >= 0 ? ai21pos : rest10.length;
      }
      result.bn = rest10.slice(0, end10) || undefined;
      i += end10;
      if (s[i] === GS) i++;
    } else if (ai2 === "21") {
      i += 2;
      const rest21 = remaining.slice(2);
      const gsPos21 = rest21.indexOf(GS);
      result.sn = (gsPos21 >= 0 ? rest21.slice(0, gsPos21) : rest21) || undefined;
      i += gsPos21 >= 0 ? gsPos21 : rest21.length;
      if (s[i] === GS) i++;
    } else if (ai2 === "30") {
      i += 2;
      const end = remaining.indexOf(GS, 2);
      const qStr = end === -1 ? remaining.slice(2) : remaining.slice(2, end);
      const q = parseInt(qStr, 10);
      if (!isNaN(q)) result.qty = q;
      i += end === -1 ? remaining.length - 2 : end - 2;
      if (end !== -1) i++;
    } else if (ai4.startsWith("310") || ai4.startsWith("311") || ai4.startsWith("312") || ai4.startsWith("316")) {
      // Net weight / quantity fields, 6 digits
      const raw6 = remaining.slice(4, 10);
      const decimals = parseInt(ai4[3], 10);
      const q = parseInt(raw6, 10) / Math.pow(10, decimals);
      if (!isNaN(q)) result.qty = Math.round(q);
      i += 10;
    } else if (ai3 === "337" || ai3 === "339") {
      i += 10; // skip 6-digit net
    } else if (remaining[0] === GS) {
      i++; // skip stray GS
    } else {
      i++; // unknown, advance
    }
  }
  return result;
}

export function parseGS1DataMatrix(raw: string): ParsedGS1 | null {
  const s = raw.trim();
  if (!s) return null;
  const parsed = s.includes("(") ? parseParentheses(s) : parseRaw(s);
  if (!parsed.gtin && !parsed.sn && !parsed.bn) return null;
  return parsed;
}

// ─── DataMatrix scanner widget ────────────────────────────────────────────────

type ScanFlash = "ok" | "err" | null;
type CameraFacing = "environment" | "user";
type ExtendedCameraCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
  focusDistance?: { min: number; max: number; step: number };
  zoom?: { min: number; max: number; step: number };
};
type ExtendedCameraConstraints = MediaTrackConstraintSet & {
  focusMode?: string;
  focusDistance?: number;
  zoom?: number;
};
type CameraZoomRange = { min: number; max: number; step: number };

function scoreCameraDevice(device: MediaDeviceInfo, facing: CameraFacing): number {
  const label = device.label.toLowerCase();

  if (facing === "user") {
    let score = 0;
    if (/\b(front|user|selfie)\b/.test(label)) score += 200;
    if (/\b(back|rear|environment|world)\b/.test(label)) score -= 300;
    return score;
  }

  let score = 0;
  if (/\b(back|rear|environment|world)\b/.test(label)) score += 100;
  if (/\b(main|primary)\b/.test(label)) score += 250;
  if (/\bwide\b/.test(label) && !/\bultra[\s-]?wide\b/.test(label)) score += 180;
  if (/\b1[.,]?0?x\b|\(1x\)/.test(label)) score += 180;
  if (/camera2\s*0\b/.test(label)) score += 120;

  if (/\bultra[\s-]?wide\b|\b0[.,]5x\b|\b0[.,]6x\b/.test(label)) score -= 500;
  if (/\bmacro\b|\btele(photo)?\b|\bzoom\b|\bdepth\b/.test(label)) score -= 300;
  if (/\b(front|user|selfie)\b/.test(label)) score -= 500;

  return score;
}

async function openPreferredCamera(facing: CameraFacing): Promise<MediaStream> {
  const baseVideoConstraints: MediaTrackConstraints = {
    facingMode: { ideal: facing },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
  };

  const initialStream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: baseVideoConstraints,
  });

  try {
    const devices = (await navigator.mediaDevices.enumerateDevices())
      .filter((device) => device.kind === "videoinput" && device.deviceId);
    const preferredDevice = [...devices]
      .sort((a, b) => scoreCameraDevice(b, facing) - scoreCameraDevice(a, facing))[0];
    const currentDeviceId = initialStream.getVideoTracks()[0]?.getSettings().deviceId;
    const preferredScore = preferredDevice ? scoreCameraDevice(preferredDevice, facing) : 0;

    if (!preferredDevice || preferredScore <= 0 || preferredDevice.deviceId === currentDeviceId) {
      return initialStream;
    }

    initialStream.getTracks().forEach((track) => track.stop());

    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          ...baseVideoConstraints,
          facingMode: undefined,
          deviceId: { exact: preferredDevice.deviceId },
        },
      });
    } catch {
      return await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: baseVideoConstraints,
      });
    }
  } catch {
    return initialStream;
  }
}

async function applyCameraConstraints(
  track: MediaStreamTrack,
  constraints: MediaTrackConstraints,
  timeoutMs = 1200,
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      track.applyConstraints(constraints),
      new Promise<void>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Camera constraint timed out")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function optimizeCameraTrack(track: MediaStreamTrack) {
  const capabilities = track.getCapabilities?.() as ExtendedCameraCapabilities | undefined;
  if (!capabilities) return;

  if (capabilities.focusMode?.includes("continuous")) {
    try {
      await applyCameraConstraints(track, {
        advanced: [{ focusMode: "continuous" } as ExtendedCameraConstraints],
      });
    } catch {
      // Unsupported combinations are ignored; the camera's default focus remains active.
    }
  }

}

function DataMatrixScanner({ mode, name, append, getValues, setFormValue }: {
  mode: "sn" | "batch";
  name: string;
  append: (row: object) => void;
  getValues: (n: string) => unknown;
  setFormValue: (n: string, v: unknown) => void;
}) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [value, setValue] = useState("");
  const [flash, setFlash] = useState<ScanFlash>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraFocusing, setCameraFocusing] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>("environment");
  const [cameraZoom, setCameraZoom] = useState(1);
  const [cameraZoomRange, setCameraZoomRange] = useState<CameraZoomRange | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const zoomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const scanSucceededRef = useRef(false);
  const failureShownRef = useRef(false);

  const triggerFlash = (type: ScanFlash) => {
    setFlash(type);
    setTimeout(() => setFlash(null), 1200);
  };

  const addParsedProduct = useCallback((parsed: ParsedGS1): boolean => {
    if (!parsed || !parsed.gtin) {
      triggerFlash("err");
      toast({
        title: t("products.dmErrTitle"),
        description: t("products.dmErrDesc"),
        variant: "destructive",
      });
      return false;
    }

    if (mode === "batch") {
      const rows = (getValues(name) as Array<{ GTIN: string; BN?: string; XD?: string; QUANTITY?: number }>) ?? [];
      const scanGtin = parsed.gtin;
      const scanBn = parsed.bn ?? "";
      const scanXd = parsed.xd ?? "";
      const idx = rows.findIndex(
        r => r.GTIN === scanGtin && (r.BN ?? "") === scanBn && (r.XD ?? "") === scanXd
      );
      if (idx >= 0) {
        const updated = rows.map((r, i) =>
          i === idx ? { ...r, QUANTITY: (r.QUANTITY ?? 1) + 1 } : r
        );
        setFormValue(name, updated);
        toast({ title: t("products.dmQtyTitle"), description: `${t("products.dmQtyDesc")} ${updated[idx].QUANTITY}` });
      } else {
        append({ GTIN: parsed.gtin, BN: scanBn, XD: scanXd, QUANTITY: parsed.qty ?? 1 });
      }
    } else {
      // SN mode — check for duplicate SN before appending
      const snValue = parsed.sn?.trim() ?? "";
      if (snValue) {
        const rows = (getValues(name) as Array<{ SN?: string }>) ?? [];
        const isDup = rows.some(r => (r.SN?.trim() ?? "") === snValue);
        if (isDup) {
          triggerFlash("err");
          toast({
            title: t("import.dmDupTitle"),
            description: `${t("import.dmDupDesc")} ${snValue}`,
            variant: "destructive",
          });
          return false;
        }
      }
      append({
        GTIN: parsed.gtin,
        SN: snValue,
        BN: parsed.bn ?? "",
        XD: parsed.xd ?? "",
        QUANTITY: parsed.qty ?? 1,
      });
    }

    triggerFlash("ok");
    return true;
  }, [mode, name, append, getValues, setFormValue, toast, t]);

  const handleScan = useCallback(() => {
    const raw = value.trim();
    if (!raw) return;
    const parsed = parseGS1DataMatrix(raw);
    if (!parsed || !addParsedProduct(parsed)) {
      setValue("");
      return;
    }
    setValue("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [value, addParsedProduct]);

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (zoomTimerRef.current) {
      clearTimeout(zoomTimerRef.current);
      zoomTimerRef.current = null;
    }
    videoTrackRef.current = null;
    setCameraZoomRange(null);
    setCameraZoom(1);
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraStarting(false);
    setCameraFocusing(false);
  }, []);

  const refocusCamera = useCallback(async () => {
    const track = videoTrackRef.current;
    if (!track || track.readyState !== "live") return;

    const capabilities = track.getCapabilities?.() as ExtendedCameraCapabilities | undefined;
    if (!capabilities) return;

    setCameraFocusing(true);
    try {
      if (capabilities.focusMode?.includes("single-shot")) {
        await applyCameraConstraints(track, {
          advanced: [{ focusMode: "single-shot" } as ExtendedCameraConstraints],
        });
      } else if (
        capabilities.focusMode?.includes("manual") &&
        capabilities.focusDistance &&
        capabilities.focusDistance.max > capabilities.focusDistance.min
      ) {
        const { min, max } = capabilities.focusDistance;
        const closeFocusDistance = min + (max - min) * 0.75;
        await applyCameraConstraints(track, {
          advanced: [{
            focusMode: "manual",
            focusDistance: closeFocusDistance,
          } as ExtendedCameraConstraints],
        });
      } else if (capabilities.focusMode?.includes("continuous")) {
        await applyCameraConstraints(track, {
          advanced: [{ focusMode: "continuous" } as ExtendedCameraConstraints],
        });
      }
    } catch {
      // Some Android camera drivers report focus modes they cannot apply.
    } finally {
      window.setTimeout(() => setCameraFocusing(false), 700);
    }
  }, []);

  const changeCameraZoom = useCallback((requestedZoom: number) => {
    const track = videoTrackRef.current;
    const range = cameraZoomRange;
    if (!track || !range || track.readyState !== "live") return;

    const zoom = Math.min(range.max, Math.max(range.min, requestedZoom));
    setCameraZoom(zoom);

    if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
    zoomTimerRef.current = setTimeout(() => {
      void applyCameraConstraints(track, {
        advanced: [{ zoom } as ExtendedCameraConstraints],
      }).catch(() => {
        // Keep the camera running if an Android driver rejects one zoom value.
      });
    }, 80);
  }, [cameraZoomRange]);

  const adjustCameraZoom = useCallback((direction: -1 | 1) => {
    if (!cameraZoomRange) return;
    const increment = Math.max(cameraZoomRange.step || 0.1, 0.1);
    changeCameraZoom(cameraZoom + direction * increment);
  }, [cameraZoom, cameraZoomRange, changeCameraZoom]);

  const closeCamera = useCallback((showFailure = false) => {
    stopCamera();
    setCameraOpen(false);
    if (showFailure && !scanSucceededRef.current && !failureShownRef.current) {
      failureShownRef.current = true;
      toast({
        title: t("products.dmCameraFailure"),
        variant: "destructive",
      });
    }
  }, [stopCamera, toast, t]);

  const openCamera = () => {
    scanSucceededRef.current = false;
    failureShownRef.current = false;
    setCameraFacing("environment");
    setCameraOpen(true);
  };

  useEffect(() => {
    if (!cameraOpen) return;

    let cancelled = false;
    let guidanceTimer: ReturnType<typeof setTimeout> | undefined;
    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserDatamatrixCodeReader(hints, {
      delayBetweenScanAttempts: 100,
      delayBetweenScanSuccess: 500,
    });

    const start = async () => {
      setCameraStarting(true);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera API unavailable");
        }

        const stream = await openPreferredCamera(cameraFacing);

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((track) => track.stop());
          throw new Error("Video element unavailable");
        }

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrackRef.current = videoTrack;
        }

        video.srcObject = stream;
        video.muted = true;
        video.setAttribute("autoplay", "true");
        video.setAttribute("playsinline", "true");
        await video.play();
        setCameraStarting(false);

        if (videoTrack) {
          const capabilities = videoTrack.getCapabilities?.() as ExtendedCameraCapabilities | undefined;
          const zoomCapabilities = capabilities?.zoom;
          if (zoomCapabilities && zoomCapabilities.max > zoomCapabilities.min) {
            const settings = videoTrack.getSettings() as MediaTrackSettings & { zoom?: number };
            const initialZoom = Math.min(
              zoomCapabilities.max,
              Math.max(zoomCapabilities.min, settings.zoom ?? zoomCapabilities.min),
            );
            setCameraZoomRange(zoomCapabilities);
            setCameraZoom(initialZoom);
          } else {
            setCameraZoomRange(null);
          }
          void optimizeCameraTrack(videoTrack);
        }

        const controls = await reader.decodeFromStream(
          stream,
          video,
          (result, _error, scannerControls) => {
            if (!result || cancelled || scanSucceededRef.current) return;
            const parsed = parseGS1DataMatrix(result.getText());
            if (!parsed?.gtin) return;
            if (!addParsedProduct(parsed)) return;

            scanSucceededRef.current = true;
            scannerControls.stop();
            controlsRef.current = null;
            if (guidanceTimer) clearTimeout(guidanceTimer);
            toast({
              title: t("products.dmCameraSuccess"),
              className: "border-green-500 bg-green-50 text-green-900 dark:border-green-700 dark:bg-green-950 dark:text-green-100",
            });
            setCameraOpen(false);
          },
        );

        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        guidanceTimer = setTimeout(() => {
          if (!scanSucceededRef.current && !failureShownRef.current) {
            failureShownRef.current = true;
            toast({
              title: t("products.dmCameraFailure"),
              variant: "destructive",
            });
          }
        }, 12000);
      } catch {
        if (cancelled) return;
        setCameraStarting(false);
        failureShownRef.current = true;
        toast({
          title: t("products.dmCameraFailure"),
          variant: "destructive",
        });
        setCameraOpen(false);
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (guidanceTimer) clearTimeout(guidanceTimer);
      stopCamera();
    };
  }, [cameraOpen, cameraFacing, addParsedProduct, stopCamera, toast, t]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleScan();
    }
  };

  const borderClass =
    flash === "ok"
      ? "border-green-500 bg-green-50 dark:bg-green-950/30"
      : flash === "err"
      ? "border-destructive bg-destructive/5"
      : "border-border";

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-sm font-medium">
        <ScanLine className="h-4 w-4 text-primary" />
        {t("products.dmLabel")}
      </Label>
      <div className="relative flex flex-col gap-2 sm:flex-row">
        <div className={`flex-1 relative flex items-center rounded-md border transition-colors ${borderClass}`}>
          <Input
            ref={inputRef}
            dir="ltr"
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent font-mono text-sm"
            placeholder={t("products.dmPlaceholder")}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {flash === "ok" && (
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 me-3 animate-in fade-in" />
          )}
          {flash === "err" && (
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 me-3 animate-in fade-in" />
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          disabled={!value.trim()}
          onClick={handleScan}
        >
          {t("products.dmAdd")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={openCamera}
        >
          <Camera className="h-4 w-4" />
          {t("products.dmCamera")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("products.dmHint")}</p>

      <Dialog
        open={cameraOpen}
        onOpenChange={(open) => {
          if (!open) closeCamera(true);
        }}
      >
        <DialogContent className="w-[calc(100%-1rem)] max-w-xl overflow-hidden p-0 sm:rounded-xl">
          <DialogHeader className="space-y-2 px-5 pt-5 text-start">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              {t("products.dmCameraTitle")}
            </DialogTitle>
            <DialogDescription>{t("products.dmCameraHint")}</DialogDescription>
            <div className="grid grid-cols-2 gap-2 pt-2" dir="rtl">
              <Button
                type="button"
                size="sm"
                variant={cameraFacing === "environment" ? "default" : "outline"}
                className="gap-1.5"
                aria-pressed={cameraFacing === "environment"}
                onClick={() => setCameraFacing("environment")}
              >
                <Camera className="h-4 w-4" />
                {t("products.dmRearCamera")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={cameraFacing === "user" ? "default" : "outline"}
                className="gap-1.5"
                aria-pressed={cameraFacing === "user"}
                onClick={() => setCameraFacing("user")}
              >
                <SwitchCamera className="h-4 w-4" />
                {t("products.dmFrontCamera")}
              </Button>
            </div>
            {cameraZoomRange && (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-2 py-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 shrink-0"
                  aria-label={t("products.dmCameraZoomOut")}
                  onClick={() => adjustCameraZoom(-1)}
                  disabled={cameraZoom <= cameraZoomRange.min}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <input
                  type="range"
                  className="h-2 min-w-0 flex-1 cursor-pointer accent-primary"
                  min={cameraZoomRange.min}
                  max={cameraZoomRange.max}
                  step={cameraZoomRange.step || 0.1}
                  value={cameraZoom}
                  aria-label={t("products.dmCameraZoom")}
                  onChange={(event) => changeCameraZoom(Number(event.target.value))}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 shrink-0"
                  aria-label={t("products.dmCameraZoomIn")}
                  onClick={() => adjustCameraZoom(1)}
                  disabled={cameraZoom >= cameraZoomRange.max}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <span className="w-12 shrink-0 text-center text-xs font-semibold tabular-nums">
                  {cameraZoom.toFixed(1)}×
                </span>
              </div>
            )}
          </DialogHeader>
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-black sm:aspect-video">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full cursor-crosshair object-cover"
              onClick={() => void refocusCamera()}
            />
            <div className="pointer-events-none absolute inset-[12%] rounded-2xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.28)]">
              <span className="absolute -left-0.5 -top-0.5 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-primary" />
              <span className="absolute -right-0.5 -top-0.5 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-primary" />
              <span className="absolute -bottom-0.5 -left-0.5 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-primary" />
              <span className="absolute -bottom-0.5 -right-0.5 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-primary" />
            </div>
            {cameraStarting && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/65 text-sm font-medium text-white">
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("products.dmCameraStarting")}
              </div>
            )}
            {!cameraStarting && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 gap-1.5 bg-white/90 text-slate-900 shadow-lg hover:bg-white"
                onClick={() => void refocusCamera()}
              >
                <Focus className={`h-4 w-4 ${cameraFocusing ? "animate-pulse text-primary" : ""}`} />
                {cameraFocusing ? t("products.dmCameraFocusing") : t("products.dmCameraRefocus")}
              </Button>
            )}
          </div>
          <div className="px-5 pb-5">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => closeCamera(true)}
            >
              {t("products.dmCameraClose")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

type ProductRow = {
  GTIN: string;
  SN?: string;
  BN?: string;
  XD?: string;
  QUANTITY?: number;
};

/** Canonical key for duplicate detection — all 5 fields must match */
function productRowKey(row: ProductRow): string {
  return [
    (row.GTIN     ?? "").trim(),
    (row.SN       ?? "").trim(),
    (row.BN       ?? "").trim(),
    (row.XD       ?? "").trim(),
    String(row.QUANTITY ?? ""),
  ].join("|");
}

/** Returns a Set of indices that are duplicates (second+ occurrence of same key) */
function findDuplicateIndices(rows: ProductRow[]): Set<number> {
  const seen = new Map<string, number>();
  const dups = new Set<number>();
  rows.forEach((row, i) => {
    const k = productRowKey(row);
    if (!k || k === "||||") return; // skip empty rows
    if (seen.has(k)) {
      dups.add(i);
      dups.add(seen.get(k)!);
    } else {
      seen.set(k, i);
    }
  });
  return dups;
}

function normalizeKey(k: string) {
  return k.trim().toUpperCase();
}

function findCol(row: Record<string, unknown>, names: string[]): string {
  for (const name of names) {
    const key = Object.keys(row).find(k => normalizeKey(k) === name);
    if (key !== undefined) return String(row[key] ?? "").trim();
  }
  return "";
}

function parseProductsFromSheet(data: ArrayBuffer): ProductRow[] {
  const workbook = XLSX.read(data, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const raw = XLSX.utils.sheet_to_csv(sheet, { FS: "\t" });
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const delimiter = headerLine.includes(";") ? ";" : headerLine.includes("\t") ? "\t" : ",";
  const headers = headerLine.split(delimiter).map(h => h.trim());

  const rows: ProductRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(c => c.trim());
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => { obj[h] = cols[idx] ?? ""; });

    const GTIN = findCol(obj, ["GTIN", "BARCODE"]);
    if (!GTIN) continue;

    const XD_raw = findCol(obj, ["XD", "EXPIRY", "EXPIRY DATE", "EXP DATE"]);
    let XD = XD_raw;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(XD_raw)) {
      const [d, m, y] = XD_raw.split("/");
      XD = `${y}-${m}-${d}`;
    }

    const QUANTITY_raw = findCol(obj, ["QUANTITY", "QTY", "AMOUNT"]);
    const QUANTITY = QUANTITY_raw ? Number(QUANTITY_raw) || undefined : undefined;

    rows.push({
      GTIN,
      SN: findCol(obj, ["SN", "SERIAL", "SERIAL NUMBER"]) || undefined,
      BN: findCol(obj, ["BN", "BATCH", "BATCH NUMBER", "LOT"]) || undefined,
      XD: XD || undefined,
      QUANTITY,
    });
  }
  return rows;
}

// ─── ProductListInput ─────────────────────────────────────────────────────────

export function ProductListInput({ name = "products", mode = "sn" }: { name?: string; mode?: "sn" | "batch" }) {
  const { control, setValue, getValues } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  const { toast } = useToast();
  const { t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; count: number } | null>(null);
  const isBatch = mode === "batch";

  // ── Real-time duplicate detection ────────────────────────────────────────────
  const watchedRows = useWatch({ control, name }) as ProductRow[] | undefined;
  const duplicateIndices: Set<number> = watchedRows ? findDuplicateIndices(watchedRows) : new Set();

  useEffect(() => {
    if (fields.length === 0) {
      isBatch
        ? append({ GTIN: "", BN: undefined, XD: undefined, QUANTITY: 1 })
        : append({ GTIN: "", SN: undefined, BN: undefined, XD: undefined, QUANTITY: undefined });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadTemplate = () => {
    const headers = isBatch
      ? [["GTIN", "BN", "XD", "QUANTITY"]]
      : [["GTIN", "SN", "BN", "XD"]];
    const exampleRow = isBatch
      ? [["74637840842700", "BATCH001", "2026-12-31", 100]]
      : [["74637840842700", "SN0000001", "BATCH001", "2026-12-31"]];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...exampleRow]);
    ws["!cols"] = headers[0].map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    const filename = isBatch ? "template_batch.xlsx" : "template_sn.xlsx";
    XLSX.writeFile(wb, filename);
  };

  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const products = parseProductsFromSheet(data);
        if (products.length === 0) {
          toast({ title: t("products.noDataTitle"), description: t("products.noDataDesc"), variant: "destructive" });
          return;
        }
        // Deduplicate rows from file
        const seen = new Set<string>();
        const unique: ProductRow[] = [];
        for (const p of products) {
          const k = productRowKey(p);
          if (!seen.has(k)) { seen.add(k); unique.push(p); }
        }
        const removedCount = products.length - unique.length;
        if (removedCount > 0) {
          toast({ title: t("products.dupFileRemoved"), description: `${t("products.dupFileRemovedDesc")} ${removedCount}`, variant: "destructive" });
        }
        setValue(name, unique);
        setUploadedFile({ name: file.name, count: unique.length });
        toast({ title: t("products.uploadedTitle"), description: `${unique.length} ${t("products.uploadedDesc")}` });
      } catch {
        toast({ title: t("products.uploadErrTitle"), description: t("products.uploadErrDesc"), variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [name, setValue, toast, t]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const clearUpload = () => {
    setUploadedFile(null);
    setValue(name, []);
  };

  return (
    <div className="space-y-4">
      {/* ── Data Matrix Scanner ── */}
      <DataMatrixScanner mode={mode} name={name} append={append} getValues={getValues} setFormValue={setValue} />

      {/* ── Header row ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Label className="text-base font-semibold">{t("products.listLabel")}</Label>
        <div className="flex items-center gap-2 flex-wrap">
          {fields.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              {fields.length} {t("products.count")}
            </Badge>
          )}
          <Button
            type="button" variant="ghost" size="sm"
            className="gap-2 text-muted-foreground hover:text-primary"
            onClick={downloadTemplate}
            title={isBatch ? `${t("products.downloadTemplate")} (Batch)` : `${t("products.downloadTemplate")} (SN)`}
          >
            <Download className="h-3.5 w-3.5" />
            {t("products.downloadTemplate")}
          </Button>

          {uploadedFile ? (
            <div className="flex items-center gap-2 text-sm border rounded-md px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
              <FileSpreadsheet className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-xs font-medium truncate max-w-[140px]">{uploadedFile.name}</span>
              <Button
                type="button" variant="ghost" size="icon"
                className="h-5 w-5 text-muted-foreground hover:text-destructive"
                onClick={clearUpload}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              type="button" variant="outline" size="sm"
              className="gap-2"
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={isDragging ? { borderColor: "hsl(var(--primary))", background: "hsl(var(--primary)/0.05)" } : {}}
            >
              <Upload className="h-3.5 w-3.5" />
              {t("products.uploadFile")}
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button" variant="outline" size="sm"
            onClick={() => {
              const currentRows = (getValues(name) ?? []) as ProductRow[];
              const emptyRow: ProductRow = isBatch
                ? { GTIN: "", BN: undefined, XD: undefined, QUANTITY: 1 }
                : { GTIN: "", SN: undefined, BN: undefined, XD: undefined, QUANTITY: undefined };
              // Warn if the last filled row would be a duplicate after adding
              if (currentRows.length > 0) {
                const last = currentRows[currentRows.length - 1];
                const k = productRowKey(last);
                if (k && k !== "||||") {
                  const prevMatch = currentRows.slice(0, -1).some(r => productRowKey(r) === k);
                  if (prevMatch) {
                    toast({ title: t("products.dupRowWarning"), variant: "destructive" });
                  }
                }
              }
              append(emptyRow);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {t("products.addManual")}
          </Button>
        </div>
      </div>

      {/* Upload hint */}
      {!uploadedFile && fields.length === 0 && (
        <div className="rounded-md border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          <FileSpreadsheet className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p>{t("products.uploadHint")}</p>
          {isBatch ? (
            <p dir="ltr" className="font-mono font-bold mt-1 tracking-wider">GTIN ; BN ; XD ; QUANTITY</p>
          ) : (
            <>
              <p dir="ltr" className="font-mono font-bold mt-1 tracking-wider">GTIN ; SN ; BN ; XD</p>
              <p dir="ltr" className="font-mono font-bold tracking-wider text-muted-foreground">GTIN ; QUANTITY ; BN ; XD</p>
            </>
          )}
          <p className="mt-1">{t("products.separatorHint")}</p>
          <p className="mt-1">{t("products.manualHint")}</p>
        </div>
      )}

      {/* Products list */}
      {fields.length > 0 && (
        <div className="space-y-3">
          {fields.map((field, index) => {
            const isDup = duplicateIndices.has(index);
            return (
            <div key={field.id} className={`relative p-4 border rounded-md bg-card space-y-4 transition-colors ${isDup ? "border-destructive bg-destructive/5" : ""}`}>
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-muted-foreground">{t("products.item")} {index + 1}</span>
                  {isDup && (
                    <Badge variant="destructive" className="gap-1 text-xs py-0">
                      <AlertTriangle className="h-3 w-3" />
                      {t("products.dupRowWarning")}
                    </Badge>
                  )}
                </div>
                <Button
                  type="button" variant="ghost" size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className={`grid grid-cols-1 gap-4 ${isBatch ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-2 lg:grid-cols-5"}`}>
                <FormField control={control} name={`${name}.${index}.GTIN`} render={({ field }) => (
                  <FormItem>
                    <FormLabel>GTIN</FormLabel>
                    <FormControl><Input dir="ltr" className="text-left" placeholder="Global Trade Item Number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                {!isBatch && (
                  <FormField control={control} name={`${name}.${index}.SN`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>SN</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left" placeholder="Serial Number" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
                <FormField control={control} name={`${name}.${index}.BN`} render={({ field }) => (
                  <FormItem>
                    <FormLabel>BN {isBatch && <span className="text-muted-foreground text-xs">{t("products.bnRequired")}</span>}</FormLabel>
                    <FormControl><Input dir="ltr" className="text-left" placeholder="Batch Number" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={control} name={`${name}.${index}.XD`} render={({ field }) => (
                  <FormItem>
                    <FormLabel>XD</FormLabel>
                    <FormControl><Input dir="ltr" className="text-left" type="date" placeholder="YYYY-MM-DD" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={control} name={`${name}.${index}.QUANTITY`} render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("products.quantityLabel")}{isBatch && <span className="text-destructive ms-1">*</span>}
                    </FormLabel>
                    <FormControl>
                      <Input
                        dir="ltr" className={`text-left font-semibold${isBatch ? " border-primary/50" : ""}`}
                        type="number" placeholder={isBatch ? "1" : "0"} min="1"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value !== "" ? Number(e.target.value) : undefined)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
