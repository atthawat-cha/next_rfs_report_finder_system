"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";

type Step = "idle" | "loading" | "qr" | "backup-codes" | "disable";

export function TwoFactorSettings() {
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
        toast.error(json.error || "เกิดข้อผิดพลาด");
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
        toast.error(json.error || "รหัสไม่ถูกต้อง");
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
    toast.success("เปิดใช้งาน 2FA แล้ว");
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
        toast.error(json.error || "รหัสผ่านไม่ถูกต้อง");
        return;
      }
      setEnabled(false);
      setStep("idle");
      setPassword("");
      toast.success("ปิดใช้งาน 2FA แล้ว");
    } finally {
      setBusy(false);
    }
  };

  if (enabled === null) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด...
      </div>
    );
  }

  if (step === "qr") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          สแกน QR code นี้ด้วยแอปยืนยันตัวตน (Google Authenticator, Authy ฯลฯ) แล้วกรอกรหัส 6 หลักเพื่อยืนยัน
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrCodeDataUrl} alt="2FA QR code" className="w-48 h-48" />
        <p className="text-xs text-muted-foreground break-all">Secret: {secret}</p>
        <div className="space-y-2">
          <Label htmlFor="confirm-code">รหัสยืนยัน</Label>
          <Input id="confirm-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
        </div>
        <div className="flex gap-2">
          <Button onClick={confirmSetup} disabled={busy || code.length !== 6}>ยืนยัน</Button>
          <Button variant="outline" onClick={() => setStep("idle")}>ยกเลิก</Button>
        </div>
      </div>
    );
  }

  if (step === "backup-codes") {
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium">บันทึก backup code เหล่านี้ไว้ในที่ปลอดภัย — จะไม่แสดงอีก</p>
        <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-md font-mono text-sm">
          {backupCodes.map((c) => <div key={c}>{c}</div>)}
        </div>
        <Button onClick={finishBackupCodes}>ฉันบันทึกโค้ดเหล่านี้แล้ว</Button>
      </div>
    );
  }

  if (step === "disable") {
    return (
      <div className="space-y-4">
        <Label htmlFor="disable-password">ยืนยันรหัสผ่านปัจจุบันเพื่อปิดใช้งาน 2FA</Label>
        <Input id="disable-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="flex gap-2">
          <Button variant="destructive" onClick={disable2fa} disabled={busy || !password}>ปิดใช้งาน 2FA</Button>
          <Button variant="outline" onClick={() => { setStep("idle"); setPassword(""); }}>ยกเลิก</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {enabled ? <ShieldCheck className="h-5 w-5 text-green-600" /> : <ShieldOff className="h-5 w-5 text-muted-foreground" />}
        <span className="text-sm">{enabled ? "เปิดใช้งาน 2FA อยู่" : "ยังไม่ได้เปิดใช้งาน 2FA"}</span>
      </div>
      {enabled ? (
        <Button variant="outline" onClick={() => setStep("disable")}>ปิดใช้งาน</Button>
      ) : (
        <Button onClick={startSetup} disabled={busy}>เปิดใช้งาน 2FA</Button>
      )}
    </div>
  );
}
