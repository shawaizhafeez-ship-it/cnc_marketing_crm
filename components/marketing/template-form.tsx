"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { TemplateActionState } from "@/app/(dashboard)/marketing/templates/actions";
import { TemplatePreviewPanel } from "@/components/marketing/template-preview-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_VARIABLES,
  type MarketingTemplate,
  type TemplateCategory,
} from "@/lib/marketing/template-types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type TemplateFormProps = {
  template?: MarketingTemplate;
  action: (
    prev: TemplateActionState,
    formData: FormData
  ) => Promise<TemplateActionState>;
  submitLabel: string;
};

const initialState: TemplateActionState = {};

export function TemplateForm({ template, action, submitLabel }: TemplateFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [category, setCategory] = useState<TemplateCategory>(
    template?.category ?? "general_marketing"
  );
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [htmlContent, setHtmlContent] = useState(template?.html_content ?? "");

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
    if (state.success) {
      toast.success(state.success);
    }
  }, [state.error, state.success]);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{template ? "Edit template" : "New template"}</CardTitle>
          <CardDescription>
            HTML email with {"{variable}"} placeholders. Supported:{" "}
            {TEMPLATE_VARIABLES.map((v) => `{${v}}`).join(", ")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={template?.name ?? ""}
                required
                placeholder="Product Update Notification"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={category}
                onValueChange={(value) => setCategory(value as TemplateCategory)}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {TEMPLATE_CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="category" value={category} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                defaultValue={template?.description ?? ""}
                placeholder="Short description for internal reference"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                name="subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                required
                placeholder="Important Updates for {item} - {company_name}"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="html_content">HTML content</Label>
              <Textarea
                id="html_content"
                name="html_content"
                value={htmlContent}
                onChange={(event) => setHtmlContent(event.target.value)}
                required
                rows={16}
                className="font-mono text-xs"
                placeholder="<p>Dear {contact_person},</p>"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="is_active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive templates are hidden from campaign creation.
                </p>
              </div>
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <input type="hidden" name="is_active" value={isActive ? "on" : "off"} />
            </div>

            {state.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}

            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <TemplatePreviewPanel subject={subject} htmlContent={htmlContent} />
    </div>
  );
}
