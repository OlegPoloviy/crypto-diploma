"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
          error instanceof Error ? error.message : "Failed to load jobs",
        );
      } finally {
        setIsRefreshing(false);
      }
    },
    [selectParsedText],
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
      selectParsedText(created.id);
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
    setSelectedId: selectParsedText,
    hasActiveJobs,
    refresh,
    createFromText,
    createFromFile,
  };
}
