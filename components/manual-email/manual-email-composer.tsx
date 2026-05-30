"use client";

import { useState, useTransition } from "react";
import { Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendManualEmail } from "@/app/(dashboard)/manual-email/actions";
import { MANUAL_EMAIL_TEMPLATES } from "@/lib/email/manual-email-templates";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ManualEmailComposer() {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [ccAdmin, setCcAdmin] = useState(true);
  const [templateId, setTemplateId] = useState("custom");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function applyTemplate(id: string) {
    setTemplateId(id);
    const template = MANUAL_EMAIL_TEMPLATES.find((entry) => entry.id === id);
    if (!template || id === "custom") {
      return;
    }
    setSubject(template.subject);
    setHtmlBody(template.html);
  }

  function handlePreview() {
    if (!recipientEmail.trim() || !subject.trim() || !htmlBody.trim()) {
      toast.error("Recipient, subject, and body are required.");
      return;
    }
    setPreviewOpen(true);
  }

  function handleSendFromPreview() {
    startTransition(async () => {
      const result = await sendManualEmail({
        recipientEmail,
        subject,
        htmlBody,
        ccAdmin,
        companyName: companyName || undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result.success ?? "Email sent.");
      setPreviewOpen(false);
      setRecipientEmail("");
      setCompanyName("");
      setSubject("");
      setHtmlBody("");
      setTemplateId("custom");
    });
  }

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Compose email</CardTitle>
            <CardDescription>
              One-off emails use the renewal SMTP account and do not count
              toward the marketing daily limit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template">Quick template</Label>
              <Select value={templateId} onValueChange={applyTemplate}>
                <SelectTrigger id="template">
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_EMAIL_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient email *</Label>
              <Input
                id="recipient"
                type="email"
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                placeholder="client@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company name</Label>
              <Input
                id="company"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Optional — used in logs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Email subject"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">HTML body *</Label>
              <Textarea
                id="body"
                value={htmlBody}
                onChange={(event) => setHtmlBody(event.target.value)}
                rows={14}
                className="font-mono text-xs"
                placeholder="<p>Dear client,</p>"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={ccAdmin}
                onCheckedChange={(checked) => setCcAdmin(checked === true)}
              />
              CC admin@cncservices.net
            </label>

            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={handlePreview}>
                <Eye className="h-4 w-4" />
                Preview & send
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live preview</CardTitle>
            <CardDescription>
              To: {recipientEmail || "—"}
              {ccAdmin ? " · CC: admin@cncservices.net" : ""}
              <br />
              Subject: {subject || "—"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm max-w-none min-h-[320px] rounded-lg border bg-white p-4 text-foreground"
              dangerouslySetInnerHTML={{
                __html:
                  htmlBody ||
                  "<p class='text-muted-foreground'>Enter HTML content to preview.</p>",
              }}
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm send</DialogTitle>
            <DialogDescription>
              Review the email before sending via renewal@cncservices.net.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">To:</span> {recipientEmail}
            </p>
            {ccAdmin && (
              <p>
                <span className="text-muted-foreground">CC:</span>{" "}
                admin@cncservices.net
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Subject:</span> {subject}
            </p>
          </div>

          <div
            className="prose prose-sm max-w-none rounded-lg border bg-white p-4 text-foreground"
            dangerouslySetInnerHTML={{ __html: htmlBody }}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Edit
            </Button>
            <Button onClick={handleSendFromPreview} disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Sending...
                </>
              ) : (
                "Confirm & send"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
