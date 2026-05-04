"use client";

import { FormEvent, useState } from "react";
import { FileUp, Send, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

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
    file: File | null;
  }) => Promise<unknown>;
  onCreateFromText: (input: {
    title: string;
    text: string;
  }) => Promise<unknown>;
}) {
  const [mode, setMode] = useState<"file" | "text">("file");
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const created =
      mode === "file"
        ? await onCreateFromFile({ title, file })
        : await onCreateFromText({ title, text: rawText });

    if (created) {
      setTitle("");
      setRawText("");
      setFile(null);
      event.currentTarget.reset();
    }
  }

  return (
    <Card className="min-w-0 border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
            Configuration
          </p>
          <CardTitle className="mt-2 text-lg text-slate-950 dark:text-slate-50">
            Create corpus
          </CardTitle>
        </div>
        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
          Draft
        </span>
      </CardHeader>

      <CardContent>
        <form onSubmit={submit} className="space-y-5">
          <Tabs
            value={mode}
            onValueChange={(value) => setMode(value as "file" | "text")}
          >
            <TabsList className="border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-[#080b16]">
              <TabsTrigger value="file">File upload</TabsTrigger>
              <TabsTrigger value="text">Raw text</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-300">
              Corpus title
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
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">
                Input file
              </Label>
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#080b16]">
                <label className="flex h-12 cursor-pointer items-center gap-3 rounded-md border border-slate-200 bg-white px-3 text-sm transition hover:border-cyan-300 dark:border-white/10 dark:bg-[#111424] dark:hover:border-cyan-400/30">
                  <span className="inline-flex h-8 shrink-0 items-center gap-2 rounded-md bg-cyan-50 px-3 font-medium text-cyan-800 dark:bg-cyan-400/15 dark:text-cyan-100">
                    <Upload className="size-4" />
                    Browse...
                  </span>
                  <span className="min-w-0 truncate text-slate-600 dark:text-slate-300">
                    {file?.name ?? "No file selected."}
                  </span>
                  <Input
                    type="file"
                    accept=".txt,text/plain"
                    required={mode === "file"}
                    onChange={(event) =>
                      setFile(event.target.files?.[0] ?? null)
                    }
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">
                Input text
              </Label>
              <Textarea
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                placeholder="Paste Project Gutenberg text here..."
                required={mode === "text"}
                className="min-h-48 border-slate-200 bg-slate-50 text-slate-950 placeholder:text-slate-400 dark:border-white/10 dark:bg-[#080b16] dark:text-slate-100 dark:placeholder:text-slate-600"
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-cyan-600 text-white hover:bg-cyan-700 dark:bg-cyan-400/20 dark:text-cyan-100 dark:hover:bg-cyan-400/30"
            >
              {mode === "file" ? <FileUp /> : <Send />}
              {isSubmitting ? "Queueing..." : "Save & queue"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-md border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              Compare preset
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
