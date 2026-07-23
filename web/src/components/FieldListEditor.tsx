import type { PassField } from "../types";

interface FieldListEditorProps {
  title: string;
  fields: PassField[];
  maxFields?: number;
  onChange: (fields: PassField[]) => void;
}

function slugify(label: string, index: number): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || `field_${index}`;
}

export function FieldListEditor({ title, fields, maxFields = 4, onChange }: FieldListEditorProps) {
  function updateField(index: number, patch: Partial<PassField>) {
    const next: PassField[] = fields.map((f, i) => (i === index ? { ...f, ...patch } : f));
    const current = next[index];
    if (current && patch.label !== undefined) {
      next[index] = { ...current, key: slugify(patch.label, index) };
    }
    onChange(next);
  }

  function addField() {
    if (fields.length >= maxFields) return;
    onChange([...fields, { key: slugify("", fields.length), label: "", value: "" }]);
  }

  function removeField(index: number) {
    onChange(fields.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {fields.length < maxFields && (
          <button
            type="button"
            onClick={addField}
            className="text-sm text-blue-600 hover:underline py-1.5 px-1 -mr-1"
          >
            + Add field
          </button>
        )}
      </div>
      {fields.map((field, i) => (
        <div key={i} className="flex gap-2">
          <input
            className="w-2/5 sm:w-1/3 rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            placeholder="Label"
            value={field.label}
            onChange={(e) => updateField(i, { label: e.target.value })}
          />
          <input
            className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            placeholder="Value"
            value={field.value}
            onChange={(e) => updateField(i, { value: e.target.value })}
          />
          <button
            type="button"
            onClick={() => removeField(i)}
            className="shrink-0 w-11 h-11 flex items-center justify-center text-gray-400 hover:text-red-500 active:bg-gray-100 rounded-lg"
            aria-label={`Remove ${title} field ${i + 1}`}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
