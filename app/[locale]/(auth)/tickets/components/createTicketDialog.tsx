"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import type { TicketPriority } from "./ticketTypes";

const EMPTY_FORM = { subject: "", description: "", category: "", priority: "MEDIUM" as TicketPriority };

export function CreateTicketDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setForm(EMPTY_FORM);
  }, [open]);

  const handleSubmit = async () => {
    if (!form.subject.trim() || !form.description.trim() || !form.category.trim()) {
      toast.error("กรุณากรอกหัวข้อ รายละเอียด และหมวดหมู่");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        const message = Array.isArray(json?.error) ? json.error[0]?.message : json?.error;
        toast.error(message ?? "ส่งคำขอไม่สำเร็จ");
        return;
      }
      toast.success(`สร้าง Ticket ${json.data.ticket_number} เรียบร้อย`);
      onOpenChange(false);
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>แจ้งปัญหา / ขอรายงานใหม่</DialogTitle>
          <DialogDescription>ทีมผู้ดูแลระบบจะได้รับการแจ้งเตือนทันที</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ticket_subject">หัวข้อ</Label>
            <Input
              id="ticket_subject"
              value={form.subject}
              onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ticket_category">หมวดหมู่</Label>
            <Input
              id="ticket_category"
              placeholder="เช่น รายงานผิด, ขอรายงานใหม่, ปัญหาการเข้าถึง"
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ticket_priority">ความสำคัญ</Label>
            <Select
              value={form.priority}
              onValueChange={(value) => setForm((prev) => ({ ...prev, priority: value as TicketPriority }))}
              disabled={saving}
            >
              <SelectTrigger id="ticket_priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ticket_description">รายละเอียด</Label>
            <Textarea
              id="ticket_description"
              rows={4}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              disabled={saving}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            ส่งคำขอ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
