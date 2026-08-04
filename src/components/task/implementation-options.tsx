"use client";

import { useState, useCallback, useEffect } from "react";
import { ChevronDown, Copy, Download, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useUIStore } from "@/store";

type ImplementationChoice = "copy_prd" | "download_zip" | "prompt_ai" | null;

interface ImplementationOptionsProps {
  projectId: string;
  projectName: string;
  hasContent: boolean; // true if PRD or tasks exist
}

const AI_AGENT_PROMPT_TEMPLATE = `Kamu adalah NovaPlan Coding Agent.

Tugasmu: implementasikan aplikasi berdasarkan dokumen perencanaan berikut.

## Project: {projectName}

### PRD (Product Requirements Document)
{prdContent}

### Acceptance Criteria
{acContent}

### Features & Tasks
{tasksContent}

## Setup NovaPlan CLI

Pertama, install dan konfigurasi NovaPlan CLI:

\`\`\`bash
npm install -g novaplan
novaplan login --api-key {apiKey} --api-url http://localhost:3000
\`\`\`

## Perintah CLI

### Lihat task berikutnya yang harus dikerjakan:
\`\`\`bash
novaplan task next {projectId}
\`\`\`

### Lihat semua task:
\`\`\`bash
novaplan task list {projectId}
\`\`\`

### Mulai mengerjakan task:
\`\`\`bash
novaplan task update <taskId> --status in_progress
\`\`\`

### Tandai task selesai:
\`\`\`bash
novaplan task update <taskId> --status completed
\`\`\`

### Tandai task gagal:
\`\`\`bash
novaplan task update <taskId> --status failed
\`\`\`

### Update status subtask:
\`\`\`bash
novaplan subtask update <taskId> --index <subtaskIndex> --status in_progress
\`\`\`

## Instruksi Implementasi
1. Jalankan \`novaplan task next {projectId}\` untuk lihat task berikutnya
2. Jalankan \`novaplan task update <taskId> --status in_progress\` untuk mulai
3. Kerjakan task sesuai deskripsi dan subtask
4. Setiap selesai subtask, update: \`novaplan subtask update <taskId> --index <i> --status completed\`
5. Setelah semua subtask selesai: \`novaplan task update <taskId> --status completed\`
6. Ulangi dari langkah 1 sampai semua task selesai
7. Jika ada kendala: \`novaplan task update <taskId> --status failed\` lalu lanjut ke task berikutnya`;

/**
 * PRD-07: Implementation Options dropdown + modal.
 * Three options: Copy PRD, Download ZIP, Prompt AI Agent.
 * After selection → button changes to "Mulai Implementasi" → redirect to kanban.
 */
export function ImplementationOptions({
  projectId,
  projectName,
  hasContent,
}: ImplementationOptionsProps) {
  const showToast = useUIStore((s) => s.showToast);

  const [choice, setChoice] = useState<ImplementationChoice>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptText, setPromptText] = useState("");

  // Restore choice from sessionStorage on mount (per-project)
  useEffect(() => {
    const stored = sessionStorage.getItem(`novaplan:impl-choice:${projectId}`);
    if (stored === "copy_prd" || stored === "download_zip" || stored === "prompt_ai") {
      setChoice(stored);
    }
  }, [projectId]);

  const setAndPersistChoice = (c: ImplementationChoice) => {
    setChoice(c);
    if (c) sessionStorage.setItem(`novaplan:impl-choice:${projectId}`, c);
  };

  const fetchContent = useCallback(async () => {
    const res = await fetch("/api/export/prd", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    if (!res.ok) throw new Error("Gagal mengambil data project");
    return res.json();
  }, [projectId]);

  const handleCopyPrd = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchContent();
      const text = [
        data.prd && `# PRD\n\n${data.prd}`,
        data.ac && `# Acceptance Criteria\n\n${data.ac}`,
        data.tasks && `# Tasks\n\n${data.tasks}`,
      ]
        .filter(Boolean)
        .join("\n\n---\n\n");

      await navigator.clipboard.writeText(text);
      showToast("PRD berhasil disalin ke clipboard", "success");
      setAndPersistChoice("copy_prd");
    } catch {
      showToast("Gagal menyalin PRD", "error");
    } finally {
      setIsLoading(false);
    }
  }, [fetchContent, showToast]);

  const handleDownloadZip = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/export/zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal mendownload ZIP");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Extract filename from Content-Disposition or use fallback
      const cd = res.headers.get("Content-Disposition");
      const match = cd?.match(/filename="?([^"]+)"?/);
      a.download = match?.[1] || `novaplan-${projectId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast("ZIP berhasil didownload", "success");
      setAndPersistChoice("download_zip");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Gagal mendownload ZIP",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId, showToast]);

  const handlePromptAi = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchContent();
      const prompt = AI_AGENT_PROMPT_TEMPLATE
        .replace(/{projectName}/g, data.projectName || projectName)
        .replace(/{prdContent}/g, data.prd || "(Belum ada PRD)")
        .replace(/{acContent}/g, data.ac || "(Belum ada AC)")
        .replace(/{tasksContent}/g, data.tasks || "(Belum ada tasks)")
        .replace(/{projectId}/g, projectId)
        .replace(/{apiKey}/g, "<GANTI_DENGAN_API_KEY_KAMU>");

      setPromptText(prompt);
      setShowPromptModal(true);
    } catch {
      showToast("Gagal mengambil data project", "error");
    } finally {
      setIsLoading(false);
    }
  }, [fetchContent, projectName, showToast]);

  const handleCopyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      showToast("Prompt disalin. Buka AI coding agent untuk paste.", "success");
      setAndPersistChoice("prompt_ai");
      setShowPromptModal(false);
    } catch {
      showToast("Gagal menyalin prompt", "error");
    }
  }, [promptText, showToast]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasContent || isLoading}
            className="gap-1.5"
          >
            {isLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ChevronDown size={14} />
            )}
            {isLoading ? "Memproses..." : "Pilih Implementasi"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={handleCopyPrd} disabled={isLoading}>
            <Copy size={14} className="mr-2 shrink-0" />
            Copy PRD
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownloadZip} disabled={isLoading}>
            <Download size={14} className="mr-2 shrink-0" />
            Download ZIP
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePromptAi} disabled={isLoading}>
            <Bot size={14} className="mr-2 shrink-0" />
            Prompt AI Agent
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Prompt AI Agent Modal */}
      <Dialog open={showPromptModal} onOpenChange={setShowPromptModal}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot size={20} />
              Prompt AI Agent
            </DialogTitle>
            <DialogDescription>
              Salin prompt berikut dan paste ke AI coding agent kamu.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Step 1 */}
            <div>
              <p className="mb-2 text-sm font-[510] text-snow">
                Langkah 1: Copy prompt dibawah
              </p>
              <textarea
                readOnly
                aria-label="Salin prompt berikut"
                value={promptText}
                onFocus={(e) => e.target.select()}
                className="h-48 w-full resize-none rounded-md border border-graphite bg-onyx p-3 font-mono text-xs text-fog focus:border-indigo focus:outline-none"
              />
            </div>

            {/* Step 2 */}
            <div>
              <p className="text-sm font-[510] text-snow">
                Langkah 2: Buka AI coding agent kamu
              </p>
              <p className="text-xs text-fog">
                Claude Code, Cursor, Copilot, Windsurf, atau AI agent lainnya.
              </p>
            </div>

            {/* Step 3 */}
            <div>
              <p className="text-sm font-[510] text-snow">
                Langkah 3: Paste prompt dan mulai implementasi
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="default" onClick={handleCopyPrompt} className="gap-1.5">
              <Copy size={14} />
              Copy & Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
