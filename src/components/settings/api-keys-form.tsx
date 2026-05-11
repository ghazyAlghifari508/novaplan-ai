"use client";

import { useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createApiKey, revokeApiKey } from "@/app/actions/api-keys";
import type { ApiKey } from "@/types/database";

interface ApiKeysFormProps {
  apiKeys: ApiKey[];
}

export const ApiKeysForm = memo(function ApiKeysForm({ apiKeys }: ApiKeysFormProps) {
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const activeKeys = apiKeys.filter((k) => !k.revoked_at);

  const handleCreate = async () => {
    if (!keyName.trim()) return;
    setCreating(true);
    setError("");
    const result = await createApiKey(keyName.trim());
    setCreating(false);
    if (result.error) {
      setError(result.error);
    } else {
      setNewKey(result.key || null);
      setKeyName("");
    }
  };

  const handleRevoke = async (id: string) => {
    await revokeApiKey(id);
  };

  const handleCopy = async (key: string) => {
    await navigator.clipboard.writeText(key);
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-fustat text-base font-bold">Buat API Key Baru</h3>
        <p className="mt-1 text-sm text-text-gray">
          API key untuk akses REST API NovaPlan. Maksimal 5 key aktif.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Input
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="Nama API key (contoh: Production)"
            className="max-w-sm"
          />
          <Button onClick={handleCreate} disabled={creating || !keyName.trim()}>
            {creating ? "Membuat..." : "Buat Key"}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {newKey && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5">
          <h4 className="font-fustat text-base font-bold text-amber-800">
            API Key Berhasil Dibuat
          </h4>
          <p className="mt-1 text-sm text-amber-700">
            Salin key ini sekarang. Key tidak akan ditampilkan lagi.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="rounded-lg bg-white px-3 py-2 text-sm font-mono text-amber-900 border border-amber-200">
              {newKey}
            </code>
            <Button size="sm" variant="secondary" onClick={() => handleCopy(newKey)}>
              Copy
            </Button>
          </div>
          <button
            className="mt-3 text-sm text-amber-700 hover:text-amber-900"
            onClick={() => setNewKey(null)}
          >
            Tutup
          </button>
        </div>
      )}

      <hr className="border-border-subtle" />

      <div>
        <h3 className="font-fustat text-base font-bold">API Key Aktif ({activeKeys.length})</h3>
        {activeKeys.length === 0 ? (
          <p className="mt-2 text-sm text-text-gray">Belum ada API key.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {activeKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between rounded-lg border border-border-subtle bg-white p-4"
              >
                <div>
                  <p className="font-medium text-sm">{key.name}</p>
                  <p className="text-xs text-text-gray">
                    {key.key_prefix}***** • Dibuat {" "}
                    {new Date(key.created_at).toLocaleDateString("id-ID")}
                    {key.last_used_at && ` • Terakhir dipakai ${new Date(key.last_used_at).toLocaleDateString("id-ID")}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevoke(key.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
