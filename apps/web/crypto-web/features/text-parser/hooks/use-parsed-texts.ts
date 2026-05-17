"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  createBaselineSetFromFile,
  createBaselineSetFromText,
  createParsedTextFromFile,
  createParsedTextFromRaw,
  createRandomBaseline,
  listParsedTexts,
  TextFileType,
} from "../lib/api";
import { BaselineSetResult, ParsedText, TextPreprocessMode } from "../types/parsed-text";

export function useParsedTexts() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ParsedText[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0],
    [items, selectedId],
  );
  const hasActiveJobs = useMemo(
    () =>
      items.some(
        (item) => item.status === "queued" || item.status === "processing",
      ),
    [items],
  );

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const selectParsedText = useCallback((id: string | null) => {
    selectedIdRef.current = id;
    setSelectedId(id);
  }, []);

  const refresh = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) {
        setIsRefreshing(true);
      }

      try {
        const data = await listParsedTexts();
        setItems(data);
        if (!selectedIdRef.current && data.length > 0) {
          selectParsedText(data[0].id);
        }
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : t("Failed to load jobs"),
        );
      } finally {
        setIsRefreshing(false);
      }
    },
    [selectParsedText, t],
  );

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refresh(true), 0);
    return () => {
      window.clearTimeout(initialLoad);
    };
  }, [refresh]);

  useEffect(() => {
    if (!hasActiveJobs) {
      return;
    }

    const interval = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(interval);
  }, [hasActiveJobs, refresh]);

  async function createFromText(input: {
    title: string;
    text: string;
    preprocess?: TextPreprocessMode;
  }) {
    return submit(() => createParsedTextFromRaw(input), input.title);
  }

  async function createFromFile(input: {
    title: string;
    files: File[];
    fileType: TextFileType;
    preprocess?: TextPreprocessMode;
  }) {
    return submit(() => createParsedTextFromFile(input), input.title);
  }

  async function createRandom(input: {
    title: string;
    byteLength: number;
    seed?: number;
  }) {
    return submit(() => createRandomBaseline(input), input.title);
  }

  async function createBaselineSet(input: {
    title: string;
    text?: string;
    file?: File;
    preprocess?: TextPreprocessMode;
    randomByteLength?: number;
    seed?: number;
  }) {
    return submit(async () => {
      if (input.file) {
        return createBaselineSetFromFile({
          title: input.title,
          file: input.file,
          preprocess: input.preprocess,
          seed: input.seed,
        });
      }

      if (!input.text?.trim()) {
        throw new Error(t("Text or file is required for baseline pair"));
      }

      return createBaselineSetFromText({
        title: input.title,
        text: input.text,
        preprocess: input.preprocess,
        randomByteLength: input.randomByteLength,
        seed: input.seed,
      });
    }, input.title);
  }

  async function submit(
    factory: () => Promise<ParsedText | ParsedText[] | BaselineSetResult>,
    title: string,
  ) {
    setMessage(null);
    setIsSubmitting(true);

    try {
      const result = await factory();
      const created = Array.isArray(result)
        ? result
        : "natural" in result && "random" in result
          ? [result.natural, result.random]
          : [result as ParsedText];

      selectParsedText(created[0]?.id ?? null);
      setMessage(
        created.length === 1
          ? t('Saved "{{title}}" with metrics.', { title: created[0].title })
          : t("Saved {{count}} corpora for {{title}}.", {
              count: created.length,
              title,
            }),
      );
      await refresh();
      return result;
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : t("Failed to save corpus"),
      );
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    items,
    selected,
    selectedId,
    isRefreshing,
    isSubmitting,
    message,
    setSelectedId: selectParsedText,
    hasActiveJobs,
    refresh,
    createFromText,
    createFromFile,
    createRandom,
    createBaselineSet,
  };
}
