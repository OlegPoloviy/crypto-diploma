"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createParsedTextFromFile,
  createParsedTextFromRaw,
  listParsedTexts,
} from "../lib/api";
import { ParsedText } from "../types/parsed-text";

export function useParsedTexts() {
  const [items, setItems] = useState<ParsedText[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0],
    [items, selectedId],
  );

  const refresh = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) {
        setIsRefreshing(true);
      }

      try {
        const data = await listParsedTexts();
        setItems(data);
        if (!selectedId && data.length > 0) {
          setSelectedId(data[0].id);
        }
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Failed to load jobs",
        );
      } finally {
        setIsRefreshing(false);
      }
    },
    [selectedId],
  );

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refresh(true), 0);
    const interval = window.setInterval(() => void refresh(), 2500);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [refresh]);

  async function createFromText(input: { title: string; text: string }) {
    return submit(() => createParsedTextFromRaw(input));
  }

  async function createFromFile(input: { title: string; file: File | null }) {
    return submit(() => createParsedTextFromFile(input));
  }

  async function submit(factory: () => Promise<ParsedText>) {
    setMessage(null);
    setIsSubmitting(true);

    try {
      const created = await factory();
      setSelectedId(created.id);
      setMessage(`Queued "${created.title}" for parsing.`);
      await refresh();
      return created;
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to queue text",
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
    setSelectedId,
    refresh,
    createFromText,
    createFromFile,
  };
}
