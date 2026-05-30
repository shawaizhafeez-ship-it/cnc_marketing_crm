"use client";

import { useMemo, useState } from "react";
import { renderTemplate, validateTemplate } from "@/lib/email/template-renderer";
import {
  DEFAULT_PREVIEW_VARIABLES,
  TEMPLATE_VARIABLES,
  type TemplateVariables,
} from "@/lib/marketing/template-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type TemplatePreviewPanelProps = {
  subject: string;
  htmlContent: string;
};

export function TemplatePreviewPanel({
  subject,
  htmlContent,
}: TemplatePreviewPanelProps) {
  const [variables, setVariables] = useState<TemplateVariables>({
    ...DEFAULT_PREVIEW_VARIABLES,
  });

  const rendered = useMemo(
    () => renderTemplate(htmlContent, subject, variables),
    [htmlContent, subject, variables]
  );

  const validation = useMemo(
    () =>
      validateTemplate({
        name: "preview",
        subject,
        html_content: htmlContent,
      }),
    [subject, htmlContent]
  );

  function updateVariable(key: string, value: string) {
    setVariables((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Test variables</CardTitle>
          <CardDescription>
            Edit values to preview how placeholders render in the email.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {TEMPLATE_VARIABLES.map((variable) => (
            <div key={variable} className="space-y-1.5">
              <Label htmlFor={`var-${variable}`} className="font-mono text-xs">
                {`{${variable}}`}
              </Label>
              <Input
                id={`var-${variable}`}
                value={variables[variable] ?? ""}
                onChange={(event) =>
                  updateVariable(variable, event.target.value)
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="space-y-2 text-sm">
          {validation.errors.map((error) => (
            <p key={error} className="text-destructive">
              {error}
            </p>
          ))}
          {validation.warnings.map((warning) => (
            <p key={warning} className="text-amber-700">
              {warning}
            </p>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Live preview</CardTitle>
          <CardDescription className="font-medium text-foreground">
            Subject: {rendered.subject || "—"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="prose prose-sm max-w-none rounded-lg border bg-white p-4 text-foreground"
            dangerouslySetInnerHTML={{
              __html:
                rendered.html ||
                "<p class='text-muted-foreground'>Enter HTML content to preview.</p>",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
