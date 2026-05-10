"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface PreferenceFormProps {
  onSubmit: (preferences: Record<string, unknown>) => void;
}

const PLATFORMS = ["Web", "Mobile", "Desktop", "All"];
const TEAM_SIZES = ["Solo", "2-5 orang", "5-20 orang", "Enterprise"];
const TIMELINES = ["1 bulan", "3 bulan", "6 bulan", "1 tahun+"];
const LANGUAGES = ["Indonesia", "English"];

export function PreferenceForm({ onSubmit }: PreferenceFormProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState<string[]>([]);
  const [features, setFeatures] = useState("");
  const [references, setReferences] = useState("");
  const [techStack, setTechStack] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [timeline, setTimeline] = useState("");
  const [language, setLanguage] = useState("Indonesia");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    onSubmit({
      name,
      description,
      platform,
      features,
      references,
      techStack,
      teamSize,
      timeline,
      language,
      notes,
    });
  };

  const togglePlatform = (p: string) => {
    setPlatform((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-h-[60vh] space-y-6 overflow-y-auto rounded-xl border border-border-subtle bg-white p-6"
    >
      <div className="flex items-center gap-2">
        {[0, 1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-all ${
              s <= step ? "bg-primary-black" : "bg-light-gray-bg"
            }`}
          />
        ))}
      </div>

      {step === 0 && (
        <motion.div
          key="step0"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium">
              Nama Aplikasi
            </label>
            <Input
              placeholder="Contoh: TaskFlow, EatsApp"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Deskripsi Singkat
            </label>
            <Textarea
              placeholder="Jelaskan produkmu dalam 2-3 kalimat..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </motion.div>
      )}

      {step === 1 && (
        <motion.div
          key="step1"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="space-y-4"
        >
          <div>
            <label className="mb-2 block text-sm font-medium">
              Target Platform
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`rounded-lg border px-4 py-2 text-sm transition-all ${
                    platform.includes(p)
                      ? "border-primary-black bg-primary-black text-white"
                      : "border-border-subtle hover:border-primary-black/30"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Fitur Utama
            </label>
            <Input
              placeholder="Contoh: real-time chat, payment gateway, analytics"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Referensi Design / Competitor
            </label>
            <Input
              placeholder="Contoh: mirip Trello, terinspirasi Notion"
              value={references}
              onChange={(e) => setReferences(e.target.value)}
            />
          </div>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div
          key="step2"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium">
              Tech Stack Preference
            </label>
            <Input
              placeholder="Contoh: React, Node.js, PostgreSQL"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">
              Skala Tim
            </label>
            <div className="flex flex-wrap gap-2">
              {TEAM_SIZES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTeamSize(t)}
                  className={`rounded-lg border px-4 py-2 text-sm transition-all ${
                    teamSize === t
                      ? "border-primary-black bg-primary-black text-white"
                      : "border-border-subtle hover:border-primary-black/30"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">
              Target Timeline
            </label>
            <div className="flex flex-wrap gap-2">
              {TIMELINES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeline(t)}
                  className={`rounded-lg border px-4 py-2 text-sm transition-all ${
                    timeline === t
                      ? "border-primary-black bg-primary-black text-white"
                      : "border-border-subtle hover:border-primary-black/30"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div
          key="step3"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="space-y-4"
        >
          <div>
            <label className="mb-2 block text-sm font-medium">
              Bahasa PRD
            </label>
            <div className="flex gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  className={`rounded-lg border px-4 py-2 text-sm transition-all ${
                    language === l
                      ? "border-primary-black bg-primary-black text-white"
                      : "border-border-subtle hover:border-primary-black/30"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Catatan Tambahan
            </label>
            <Textarea
              placeholder="Ada yang mau ditambahkan? Budget, preferensi hosting, dll..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </motion.div>
      )}

      <div className="flex justify-between">
        {step > 0 ? (
          <Button
            variant="ghost"
            onClick={() => setStep((s) => s - 1)}
          >
            Kembali
          </Button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <Button onClick={() => setStep((s) => s + 1)}>Lanjut</Button>
        ) : (
          <Button onClick={handleSubmit}>Generate PRD</Button>
        )}
      </div>
    </motion.div>
  );
}