"use client";

import { useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTemplate, deleteTemplate } from "@/app/actions/templates";
import type { PrdTemplate } from "@/types/database";

interface TemplatesFormProps {
  templates: PrdTemplate[];
}

const DEFAULT_SECTIONS = [
  "Overview",
  "Goals & Success Metrics",
  "Requirements",
  "Core Features",
  "User Flow",
  "Architecture",
  "Database Schema",
  "Design & Technical Constraints",
  "Pricing & Subscription",
  "Fase Pengerjaan",
  "Risiko & Mitigasi",
];

export const TemplatesForm = memo(function TemplatesForm({ templates }: TemplatesFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSections, setSelectedSections] = useState<string[]>(DEFAULT_SECTIONS);
  const [error, setError] = useState("");

  const toggleSection = (section: string) => {
    setSelectedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section],
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Nama template harus diisi");
      return;
    }
    setError("");

    const fd = new FormData();
    fd.append("name", name.trim());
    fd.append("description", description.trim());
    fd.append("structure", JSON.stringify(
      selectedSections.map((s) => ({ name: s, required: false }))
    ));

    const result = await createTemplate(fd);
    if (result?.error) {
      setError(result.error);
    } else {
      setName("");
      setDescription("");
      setSelectedSections(DEFAULT_SECTIONS);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border-subtle bg-light-gray-bg p-5">
        <h3 className="font-fustat text-base font-bold">Buat Template Baru</h3>
        <p className="mt-1 text-sm text-text-gray">
          Pilih section PRD yang ingin kamu gunakan sebagai struktur template.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nama Template</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: My Custom PRD Template"
              className="max-w-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Deskripsi</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Template PRD untuk projek mobile..."
              className="max-w-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Section ({selectedSections.length} terpilih)
            </label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_SECTIONS.map((section) => (
                <button
                  key={section}
                  type="button"
                  onClick={() => toggleSection(section)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedSections.includes(section)
                      ? "border-primary-black bg-primary-black text-white"
                      : "border-border-subtle bg-white text-text-gray hover:border-primary-black"
                  }`}
                >
                  {section}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button onClick={handleCreate} disabled={!name.trim()}>
            Simpan Template
          </Button>
        </div>
      </div>

      <hr className="border-border-subtle" />

      <div>
        <h3 className="font-fustat text-base font-bold">
          Template Tersimpan ({templates.length})
        </h3>

        {templates.length === 0 ? (
          <p className="mt-2 text-sm text-text-gray">Belum ada template.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-border-subtle bg-white p-4"
              >
                <div>
                  <p className="font-medium text-sm">{t.name}</p>
                  {t.description && (
                    <p className="text-xs text-text-gray mt-0.5">{t.description}</p>
                  )}
                  <p className="text-xs text-text-gray mt-1">
                    {t.structure?.length || 0} section
                  </p>
                </div>
                <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    onClick={async () => { await deleteTemplate(t.id); }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Hapus
                  </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});