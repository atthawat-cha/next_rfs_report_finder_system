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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import type { TicketPriority, TicketRow, TicketStatus } from "../../components/ticketTypes";

interface AssigneeOption {
  id: string;
  label: string;
}

/**
 * Controlled edit dialog for the admin ticket queue — status/priority/
 * assignment only, matching PUT /api/tickets/[id]'s allowed fields.
 */
export function TicketEditDialog({
  ticket,
  onOpenChange,
  onSaved,
}: {
  ticket: TicketRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = React.useState<TicketStatus>("OPEN");
  const [priority, setPriority] = React.useState<TicketPriority>("MEDIUM");
  const [assignedTo, setAssignedTo] = React.useState<string>("__unassigned__");
  const [assignees, setAssignees] = React.useState<AssigneeOption[] | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!ticket) return;
    setStatus(ticket.status);
    setPriority(ticket.priority);
    setAssignedTo(ticket.assigned_to ?? "__unassigned__");
  }, [ticket]);

  React.useEffect(() => {
    if (!ticket || assignees !== null) return;
    fetch("/api/users/user", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success) {
          setAssignees(
            json.data.map((u: { id: string; first_name: string; last_name: string; username: string }) => ({
              id: u.id,
              label: `${u.first_name} ${u.last_name}`.trim() || u.username,
            }))
          );
        }
      })
      .catch(() => setAssignees([]));
  }, [ticket, assignees]);

  const handleSubmit = async () => {
    if (!ticket) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status,
          priority,
          assigned_to: assignedTo === "__unassigned__" ? null : assignedTo,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        const message = Array.isArray(json?.error) ? json.error[0]?.message : json?.error;
        toast.error(message ?? "บันทึกไม่สำเร็จ");
        return;
      }
      toast.success("อัปเดต ticket เรียบร้อย");
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={ticket !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{ticket?.ticket_number}</DialogTitle>
          <DialogDescription>{ticket?.subject}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket?.description}</p>

          <div className="space-y-1.5">
            <Label htmlFor="ticket_edit_status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TicketStatus)} disabled={saving}>
              <SelectTrigger id="ticket_edit_status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ticket_edit_priority">Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)} disabled={saving}>
              <SelectTrigger id="ticket_edit_priority">
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
            <Label htmlFor="ticket_edit_assignee">Assigned To</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo} disabled={saving || assignees === null}>
              <SelectTrigger id="ticket_edit_assignee">
                <SelectValue placeholder="เลือกผู้รับผิดชอบ" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="__unassigned__">ยังไม่มอบหมาย</SelectItem>
                  {(assignees ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
