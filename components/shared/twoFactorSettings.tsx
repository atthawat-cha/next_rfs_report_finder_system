"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { useTranslations } from "next-intl";

type Step = "idle" | "loading" | "qr" | "backup-codes" | "disable";

export function TwoFactorSettings() {
  const t = useTranslations("auth.twoFactorSetup");
  const [enabled, setEnabled] = React.useState<boolean | null>(null);
  const [step, setStep] = React.useState<Step>("idle");
  const [qrCodeDataUrl, setQrCodeDataUrl] = React.useState("");
  const [secret, setSecret] = React.useState("");
  const [code, setCode] = React.useState("");
  const [backupCodes, setBackupCodes] = React.useState<string[]>([]);
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/auth/2fa/status", { credentials: "include" })
      .then((res) => res.json())
      .then((json) => setEnabled(json?.data?.enabled ?? false));
  }, []);

  const startSetup = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST", credentials: "include" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || t("genericError"));
        return;
      }
      setQrCodeDataUrl(json.data.qrCodeDataUrl);
      setSecret(json.data.secret);
      setStep("qr");
    } finally {
      setBusy(false);
    }
  };

  const confirmSetup = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/2fa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || t("invalidCode"));
        return;
      }
      setBackupCodes(json.data.backupCodes);
      setStep("backup-codes");
      setEnabled(true);
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const finishBackupCodes = () => {
    setStep("idle");
    setBackupCodes([]);
    toast.success(t("enabledToast"));
  };

  const disable2fa = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || t("invalidPassword"));
        return;
      }
      setEnabled(false);
      setStep("idle");
      setPassword("");
      toast.success(t("disabledToast"));
    } finally {
      setBusy(false);
    }
  };

  if (enabled === null) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
      </div>
    );
  }

  if (step === "qr") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("qrInstructions")}
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrCodeDataUrl} alt="2FA QR code" className="w-48 h-48" />
        <p className="text-xs text-muted-foreground break-all">{t("secretLabel")}: {secret}</p>
        <div className="space-y-2">
          <Label htmlFor="confirm-code">{t("confirmCodeLabel")}</Label>
          <Input id="confirm-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
        </div>
        <div className="flex gap-2">
          <Button onClick={confirmSetup} disabled={busy || code.length !== 6}>{t("confirm")}</Button>
          <Button variant="outline" onClick={() => setStep("idle")}>{t("cancel")}</Button>
        </div>
      </div>
    );
  }

  if (step === "backup-codes") {
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium">{t("backupCodesNotice")}</p>
        <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-md font-mono text-sm">
          {backupCodes.map((c) => <div key={c}>{c}</div>)}
        </div>
        <Button onClick={finishBackupCodes}>{t("backupCodesSaved")}</Button>
      </div>
    );
  }

  if (step === "disable") {
    return (
      <div className="space-y-4">
        <Label htmlFor="disable-password">{t("disablePasswordLabel")}</Label>
        <Input id="disable-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="flex gap-2">
          <Button variant="destructive" onClick={disable2fa} disabled={busy || !password}>{t("disableConfirm")}</Button>
          <Button variant="outline" onClick={() => { setStep("idle"); setPassword(""); }}>{t("cancel")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {enabled ? <ShieldCheck className="h-5 w-5 text-green-600" /> : <ShieldOff className="h-5 w-5 text-muted-foreground" />}
        <span className="text-sm">{enabled ? t("statusEnabled") : t("statusDisabled")}</span>
      </div>
      {enabled ? (
        <Button variant="outline" onClick={() => setStep("disable")}>{t("disable")}</Button>
      ) : (
        <Button onClick={startSetup} disabled={busy}>{t("enable")}</Button>
      )}
    </div>
  );
}
