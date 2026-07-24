"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Copy, Download, Bot, Check, Loader2 } from "lucide-react";
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

### Sitemap
{sitemapContent}

## Instruksi Implementasi
1. Baca dan pahami semua dokumen di atas
2. Kerjakan task satu per satu sesuai urutan
3. Setiap selesai task/subtask, tandai sebagai completed
4. Jika ada kendala, catat dan lanjutkan ke task berikutnya
5. Lanjutkan sampai semua task selesai`;

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
  const router = useRouter();
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
        data.sitemap && `# Sitemap\n\n${data.sitemap}`,
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
      const prompt = AI_AGENT_PROMPT_TEMPLATE.replace(
        "{projectName}",
        data.projectName || projectName,
      )
        .replace("{prdContent}", data.prd || "(Belum ada PRD)")
        .replace("{acContent}", data.ac || "(Belum ada AC)")
        .replace("{tasksContent}", data.tasks || "(Belum ada tasks)")
        .replace("{sitemapContent}", data.sitemap || "(Belum ada sitemap)");

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

  const handleStartImplementation = useCallback(() => {
    router.push(`/kanban/${projectId}`);
  }, [router, projectId]);

  // After selection: show "Mulai Implementasi" button
  if (choice !== null) {
    return (
      <Button
        variant="default"
        size="sm"
        onClick={handleStartImplementation}
        className="gap-1.5"
      >
        <Check size={14} />
        Mulai Implementasi
      </Button>
    );
  }

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
