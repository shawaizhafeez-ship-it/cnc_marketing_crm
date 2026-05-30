"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  detectUsedVariables,
  validateTemplate,
} from "@/lib/email/template-renderer";
import { DEFAULT_MARKETING_TEMPLATES } from "@/lib/marketing/default-templates";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_VARIABLES,
  type MarketingTemplate,
  type TemplateCategory,
} from "@/lib/marketing/template-types";
import { createClient } from "@/lib/supabase/server";

export type TemplateActionState = {
  error?: string;
  success?: string;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  return { supabase, userId: user.id };
}

function parseCategory(value: string): TemplateCategory {
  if ((TEMPLATE_CATEGORIES as string[]).includes(value)) {
    return value as TemplateCategory;
  }
  throw new Error("Invalid template category.");
}

function parseTemplateForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    category: parseCategory(String(formData.get("category") ?? "")),
    subject: String(formData.get("subject") ?? "").trim(),
    html_content: String(formData.get("html_content") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    is_active: formData.get("is_active") === "on",
  };
}

export async function getTemplates(options?: {
  category?: string | null;
  activeOnly?: boolean;
}): Promise<MarketingTemplate[]> {
  const { supabase } = await requireUser();

  let query = supabase
    .from("marketing_templates")
    .select("*")
    .order("updated_at", { ascending: false });

  if (options?.category && options.category !== "all") {
    query = query.eq("category", options.category);
  }

  if (options?.activeOnly !== false) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MarketingTemplate[];
}

export async function getTemplate(id: string): Promise<MarketingTemplate> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("marketing_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    throw new Error("Template not found.");
  }

  return data as MarketingTemplate;
}

export async function createTemplate(
  _prev: TemplateActionState,
  formData: FormData
): Promise<TemplateActionState> {
  const input = parseTemplateForm(formData);
  const validation = validateTemplate(input);

  if (!validation.valid) {
    return { error: validation.errors.join(" ") };
  }

  const { supabase, userId } = await requireUser();
  const variables = detectUsedVariables(input.subject, input.html_content);

  const { data, error } = await supabase
    .from("marketing_templates")
    .insert({
      name: input.name,
      category: input.category,
      subject: input.subject,
      html_content: input.html_content,
      description: input.description || null,
      is_active: input.is_active,
      variables: variables.length > 0 ? variables : [...TEMPLATE_VARIABLES],
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/marketing/templates");
  redirect(`/marketing/templates/${data.id}/edit`);
}

export async function updateTemplate(
  id: string,
  _prev: TemplateActionState,
  formData: FormData
): Promise<TemplateActionState> {
  const input = parseTemplateForm(formData);
  const validation = validateTemplate(input);

  if (!validation.valid) {
    return { error: validation.errors.join(" ") };
  }

  const { supabase } = await requireUser();
  const variables = detectUsedVariables(input.subject, input.html_content);

  const { error } = await supabase
    .from("marketing_templates")
    .update({
      name: input.name,
      category: input.category,
      subject: input.subject,
      html_content: input.html_content,
      description: input.description || null,
      is_active: input.is_active,
      variables: variables.length > 0 ? variables : [...TEMPLATE_VARIABLES],
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/marketing/templates");
  revalidatePath(`/marketing/templates/${id}/edit`);
  return { success: "Template saved." };
}

export async function deleteTemplate(id: string): Promise<TemplateActionState> {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("marketing_templates")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/marketing/templates");
  return { success: "Template deleted." };
}

export async function createDefaultTemplates(): Promise<TemplateActionState> {
  const { supabase, userId } = await requireUser();

  const { data: existing } = await supabase
    .from("marketing_templates")
    .select("name")
    .in(
      "name",
      DEFAULT_MARKETING_TEMPLATES.map((template) => template.name)
    );

  const existingNames = new Set((existing ?? []).map((row) => row.name));
  const toInsert = DEFAULT_MARKETING_TEMPLATES.filter(
    (template) => !existingNames.has(template.name)
  );

  if (toInsert.length === 0) {
    return { success: "Default templates already exist." };
  }

  const rows = toInsert.map((template) => ({
    name: template.name,
    category: template.category,
    subject: template.subject,
    html_content: template.html_content,
    description: template.description,
    is_active: true,
    variables: [...TEMPLATE_VARIABLES],
    created_by: userId,
  }));

  const { error } = await supabase.from("marketing_templates").insert(rows);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/marketing/templates");
  return {
    success: `Created ${toInsert.length} default template${toInsert.length === 1 ? "" : "s"}.`,
  };
}
