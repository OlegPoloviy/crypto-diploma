"use client";

import { FormEvent, useState } from "react";
import { FileStack, FileUp, Send, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TextFileType } from "../lib/api";

const FILE_TYPE_OPTIONS: {
  value: TextFileType;
  label: string;
  accept: string;
}[] = [
  { value: "plain-text", label: "Plain text", accept: ".txt,.text,text/plain" },
  { value: "markdown", label: "Markdown", accept: ".md,.markdown,text/markdown" },
  { value: "csv", label: "CSV", accept: ".csv,text/csv" },
  { value: "json", label: "JSON", accept: ".json,application/json" },
  { value: "binary", label: "Binary", accept: "" },
];

export function ParserFormCard({
  isSubmitting,
  message,
  onCreateFromFile,
  onCreateFromText,
}: {
  isSubmitting: boolean;
  message: string | null;
  onCreateFromFile: (input: {
    title: string;
    files: File[];
    fileType: TextFileType;
  }) => Promise<unknown>;
  onCreateFromText: (input: {
    title: string;
    text: string;
  }) => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"file" | "text">("file");
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileType, setFileType] = useState<TextFileType>("plain-text");
  const selectedFileType = FILE_TYPE_OPTIONS.find(
    (option) => option.value === fileType,
  );
  const fileLabel =
    files.length === 0
      ? t("No files selected.")
      : files.length === 1
        ? files[0].name
        : t("{{count}} files selected", { count: files.length });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const created =
      mode === "file"
        ? await onCreateFromFile({ title, files, fileType })
        : await onCreateFromText({ title, text: rawText });

    if (created) {
      setTitle("");
      setRawText("");
      setFiles([]);
      event.currentTarget.reset();
    }
  }

  return (
    <Card className="min-w-0 border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
            {t("Configuration")}
          </p>
          <CardTitle className="mt-2 text-lg text-slate-950 dark:text-slate-50">
            {t("Create corpus")}
          </CardTitle>
        </div>
        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
          {t("Draft")}
        </span>
      </CardHeader>

      <CardContent>
        <form onSubmit={submit} className="space-y-5">
          <Tabs
            value={mode}
            onValueChange={(value) => setMode(value as "file" | "text")}
          >
            <TabsList className="h-auto min-h-10 border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-[#080b16]">
              <TabsTrigger
                value="file"
                className="min-h-8 whitespace-normal px-2 text-center leading-4"
              >
                {t("File upload")}
              </TabsTrigger>
              <TabsTrigger
                value="text"
                className="min-h-8 whitespace-normal px-2 text-center leading-4"
              >
                {t("Raw text")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-300">
              {t("Corpus title")}
            </Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Moby Dick"
              maxLength={150}
              required
              className="border-slate-200 bg-slate-50 text-slate-950 placeholder:text-slate-400 dark:border-white/10 dark:bg-[#080b16] dark:text-slate-100 dark:placeholder:text-slate-600"
            />
          </div>

          {mode === "file" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">
                  {t("File type")}
                </Label>
                <select
                  value={fileType}
                  onChange={(event) =>
                    setFileType(event.target.value as TextFileType)
                  }
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 dark:border-white/10 dark:bg-[#080b16] dark:text-slate-100"
                >
                  {FILE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.label)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">
                  {t("Input files")}
                </Label>
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#080b16]">
                  <label className="flex min-h-12 cursor-pointer flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition hover:border-cyan-300 dark:border-white/10 dark:bg-[#111424] dark:hover:border-cyan-400/30">
                    <span className="inline-flex min-h-8 shrink-0 items-center gap-2 rounded-md bg-cyan-50 px-3 py-1 font-medium text-cyan-800 dark:bg-cyan-400/15 dark:text-cyan-100">
                      <Upload className="size-4" />
                      {t("Browse...")}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">
                      {fileLabel}
                    </span>
                    <Input
                      type="file"
                      accept={selectedFileType?.accept}
                      multiple
                      required={mode === "file"}
                      onChange={(event) =>
                        setFiles(Array.from(event.target.files ?? []))
                      }
                      className="sr-only"
                    />
                  </label>
                  {files.length > 1 ? (
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <FileStack className="size-3.5" />
                      <span className="truncate">
                        {files
                          .map((selectedFile) => selectedFile.name)
                          .join(", ")}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">
                {t("Input text")}
              </Label>
              <Textarea
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                placeholder={t("Paste Project Gutenberg text here...")}
                required={mode === "text"}
                className="min-h-48 border-slate-200 bg-slate-50 text-slate-950 placeholder:text-slate-400 dark:border-white/10 dark:bg-[#080b16] dark:text-slate-100 dark:placeholder:text-slate-600"
              />
            </div>
          )}

          <div className="grid gap-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-h-10 h-auto w-full whitespace-normal rounded-md bg-cyan-600 px-3 py-2 text-center leading-5 text-white hover:bg-cyan-700 dark:bg-cyan-400/20 dark:text-cyan-100 dark:hover:bg-cyan-400/30"
            >
              {mode === "file" ? <FileUp /> : <Send />}
              {isSubmitting ? t("Queueing...") : t("Save & queue")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-10 h-auto w-full whitespace-normal rounded-md border-slate-200 bg-white px-3 py-2 text-center leading-5 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              {t("Compare preset")}
            </Button>
          </div>

          {message ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              {message}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
