import {
  TEMPLATE_VARIABLES,
  type TemplateVariables,
} from "@/lib/marketing/template-types";

const PLACEHOLDER_REGEX = /\{([a-z_][a-z0-9_]*)\}/gi;

export type RenderTemplateResult = {
  html: string;
  subject: string;
};

export type ValidateTemplateInput = {
  name: string;
  subject: string;
  html_content: string;
};

export type ValidateTemplateResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

function replacePlaceholders(
  text: string,
  variables: TemplateVariables
): string {
  return text.replace(PLACEHOLDER_REGEX, (match, key: string) => {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey in variables) {
      return variables[normalizedKey] ?? "";
    }
    return match;
  });
}

export function extractPlaceholders(text: string): string[] {
  const found = new Set<string>();
  const regex = new RegExp(PLACEHOLDER_REGEX.source, "gi");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    found.add(match[1].toLowerCase());
  }

  return Array.from(found).sort();
}

export function renderTemplate(
  html: string,
  subject: string,
  variables: TemplateVariables
): RenderTemplateResult {
  return {
    html: replacePlaceholders(html, variables),
    subject: replacePlaceholders(subject, variables),
  };
}

function hasMismatchedBraces(text: string): boolean {
  let depth = 0;

  for (const char of text) {
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth < 0) {
        return true;
      }
    }
  }

  return depth !== 0;
}

export function validateTemplate(
  input: ValidateTemplateInput
): ValidateTemplateResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input.name.trim()) {
    errors.push("Template name is required.");
  }

  if (!input.subject.trim()) {
    errors.push("Subject is required.");
  }

  if (!input.html_content.trim()) {
    errors.push("HTML content is required.");
  }

  if (hasMismatchedBraces(input.subject)) {
    errors.push("Mismatched curly braces in subject.");
  }

  if (hasMismatchedBraces(input.html_content)) {
    errors.push("Mismatched curly braces in HTML content.");
  }

  const placeholders = [
    ...extractPlaceholders(input.subject),
    ...extractPlaceholders(input.html_content),
  ];
  const uniquePlaceholders = Array.from(new Set(placeholders));
  const known = new Set<string>(TEMPLATE_VARIABLES);

  for (const placeholder of uniquePlaceholders) {
    if (!known.has(placeholder)) {
      warnings.push(`Unknown variable: {${placeholder}}`);
    }
  }

  const unusedVariables = TEMPLATE_VARIABLES.filter(
    (variable) => !uniquePlaceholders.includes(variable)
  );

  if (unusedVariables.length > 0 && input.html_content.trim()) {
    warnings.push(
      `Supported variables not used: ${unusedVariables.map((v) => `{${v}}`).join(", ")}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function detectUsedVariables(
  subject: string,
  htmlContent: string
): string[] {
  return Array.from(
    new Set([...extractPlaceholders(subject), ...extractPlaceholders(htmlContent)])
  );
}
