"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { listParsedTexts } from "@/features/text-parser/lib/api";
import { ParsedText } from "@/features/text-parser/types/parsed-text";

import { createCipherJob, listCipherJobs } from "../lib/api";
import {
  CipherMode,
  ClassicalCipherJob,
} from "../types/classical-cipher";

export function useCipherWorkspace() {
  const [parsedTexts, setParsedTexts] = useState<ParsedText[]>([]);
  const [jobs, setJobs] = useState<ClassicalCipherJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedParsedTextId, setSelectedParsedTextId] = useState<string | null>(
    null,
  );
  const [mode, setMode] = useState<CipherMode>("caesar");
  const [shift, setShift] = useState(3);
  const [key, setKey] = useState("KEY");
  const [keyLengthsText, setKeyLengthsText] = useState("1, 3, 5, 10, 20");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const selectedJobIdRef = useRef<string | null>(null);
  const selectedParsedTextIdRef = useRef<string | null>(null);
  const parsedTextsRef = useRef<ParsedText[]>([]);
  const jobsRef = useRef<ClassicalCipherJob[]>([]);

  const completedParsedTexts = useMemo(
    () => parsedTexts.filter((item) => item.status === "completed"),
    [parsedTexts],
  );
  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? jobs[0] ?? null,
    [jobs, selectedJobId],
  );
  const selectedParsedText = useMemo(
    () =>
      parsedTexts.find((item) => item.id === selectedParsedTextId) ??
      completedParsedTexts[0] ??
      null,
    [completedParsedTexts, parsedTexts, selectedParsedTextId],
  );
  const hasActiveJobs = useMemo(
    () =>
      jobs.some((job) => job.status === "queued" || job.status === "processing"),
    [jobs],
  );

  useEffect(() => {
    selectedJobIdRef.current = selectedJobId;
  }, [selectedJobId]);

  useEffect(() => {
    selectedParsedTextIdRef.current = selectedParsedTextId;
  }, [selectedParsedTextId]);

  useEffect(() => {
    parsedTextsRef.current = parsedTexts;
  }, [parsedTexts]);

  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  const selectJob = useCallback((id: string | null) => {
    selectedJobIdRef.current = id;
    setSelectedJobId(id);
  }, []);

  const selectParsedText = useCallback((id: string | null) => {
    selectedParsedTextIdRef.current = id;
    setSelectedParsedTextId(id);
  }, []);

  const refresh = useCallback(async (showSpinner = false) => {
      if (showSpinner) {
        setIsRefreshing(true);
      }

      try {
        const [textsResult, jobsResult] = await Promise.allSettled([
          listParsedTexts(),
          listCipherJobs(),
        ]);

        const texts =
          textsResult.status === "fulfilled"
            ? textsResult.value
            : parsedTextsRef.current;
        const cipherJobs =
          jobsResult.status === "fulfilled" ? jobsResult.value : jobsRef.current;

        setParsedTexts(texts);
        setJobs(cipherJobs);

        const firstCompleted = texts.find((item) => item.status === "completed");
        if (!selectedParsedTextIdRef.current && firstCompleted) {
          selectParsedText(firstCompleted.id);
        }
        if (!selectedJobIdRef.current && cipherJobs.length > 0) {
          selectJob(cipherJobs[0].id);
        }

        if (textsResult.status === "rejected" || jobsResult.status === "rejected") {
          const failed = [
            textsResult.status === "rejected" ? "parsed texts" : null,
            jobsResult.status === "rejected" ? "cipher jobs" : null,
          ]
            .filter(Boolean)
            .join(" and ");
          setMessage(`Failed to load ${failed}. Check API deployment.`);
        }
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Failed to load cipher data",
        );
      } finally {
        setIsRefreshing(false);
      }
    }, [selectJob, selectParsedText]);

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

  async function submitJob() {
    if (!selectedParsedText) {
      setMessage("No completed parsed text selected.");
      return null;
    }

    const keyLengths = parseKeyLengths(keyLengthsText);
    if (mode === "vigenere-key-lengths" && keyLengths.length === 0) {
      setMessage("Enter at least one key length.");
      return null;
    }

    setMessage(null);
    setIsSubmitting(true);

    try {
      const created = await createCipherJob({
        mode,
        parsedTextId: selectedParsedText.id,
        shift,
        key,
        keyLengths,
      });
      selectJob(created.id);
      setMessage("Cipher job queued.");
      await refresh();
      return created;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to queue job");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    parsedTexts,
    completedParsedTexts,
    jobs,
    selectedJob,
    selectedJobId,
    selectedParsedText,
    selectedParsedTextId,
    mode,
    shift,
    key,
    keyLengthsText,
    isRefreshing,
    isSubmitting,
    message,
    setSelectedJobId: selectJob,
    setSelectedParsedTextId: selectParsedText,
    setMode,
    setShift,
    setKey,
    setKeyLengthsText,
    hasActiveJobs,
    refresh,
    submitJob,
  };
}

function parseKeyLengths(value: string): number[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => Number.parseInt(item.trim(), 10))
        .filter((item) => Number.isFinite(item) && item > 0),
    ),
  ).sort((a, b) => a - b);
}
