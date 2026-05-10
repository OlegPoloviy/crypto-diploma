"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { listParsedTexts } from "@/features/text-parser/lib/api";
import { ParsedText } from "@/features/text-parser/types/parsed-text";

import {
  createAesJob,
  decryptAes,
  encryptAes,
  listComplexCipherJobs,
} from "../lib/api";
import {
  AesMode,
  AesOperation,
  AesResponse,
  BinaryEncoding,
  ComplexCipherJob,
} from "../types/aes-cipher";

export function useAesWorkspace() {
  const [operation, setOperation] = useState<AesOperation>("encrypt");
  const [mode, setMode] = useState<AesMode>("cbc");
  const [plaintext, setPlaintext] = useState("hello AES");
  const [ciphertext, setCiphertext] = useState("");
  const [key, setKey] = useState("000102030405060708090a0b0c0d0e0f");
  const [iv, setIv] = useState("101112131415161718191a1b1c1d1e1f");
  const [inputEncoding, setInputEncoding] = useState<BinaryEncoding>("utf8");
  const [cipherInputEncoding, setCipherInputEncoding] =
    useState<BinaryEncoding>("hex");
  const [keyEncoding, setKeyEncoding] = useState<BinaryEncoding>("hex");
  const [outputEncoding, setOutputEncoding] = useState<BinaryEncoding>("hex");
  const [plainOutputEncoding, setPlainOutputEncoding] =
    useState<BinaryEncoding>("utf8");
  const [ivEncoding, setIvEncoding] = useState<BinaryEncoding>("hex");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQueueingJob, setIsQueueingJob] = useState(false);
  const [isRefreshingJobs, setIsRefreshingJobs] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<AesResponse | null>(null);
  const [parsedTexts, setParsedTexts] = useState<ParsedText[]>([]);
  const [jobs, setJobs] = useState<ComplexCipherJob[]>([]);
  const [selectedParsedTextId, setSelectedParsedTextId] = useState<string | null>(
    null,
  );
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const selectedParsedTextIdRef = useRef<string | null>(null);
  const selectedJobIdRef = useRef<string | null>(null);
  const parsedTextsRef = useRef<ParsedText[]>([]);
  const jobsRef = useRef<ComplexCipherJob[]>([]);

  const inputLabel = operation === "encrypt" ? "Plaintext" : "Ciphertext";
  const activeInput = operation === "encrypt" ? plaintext : ciphertext;
  const activeInputEncoding =
    operation === "encrypt" ? inputEncoding : cipherInputEncoding;
  const activeOutputEncoding =
    operation === "encrypt" ? outputEncoding : plainOutputEncoding;

  const keySizeHint = useMemo(() => describeKeySize(key, keyEncoding), [
    key,
    keyEncoding,
  ]);
  const completedParsedTexts = useMemo(
    () => parsedTexts.filter((item) => item.status === "completed"),
    [parsedTexts],
  );
  const selectedParsedText = useMemo(
    () =>
      parsedTexts.find((item) => item.id === selectedParsedTextId) ??
      completedParsedTexts[0] ??
      null,
    [completedParsedTexts, parsedTexts, selectedParsedTextId],
  );
  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? jobs[0] ?? null,
    [jobs, selectedJobId],
  );
  const hasActiveJobs = useMemo(
    () =>
      jobs.some((job) => job.status === "queued" || job.status === "processing"),
    [jobs],
  );

  useEffect(() => {
    selectedParsedTextIdRef.current = selectedParsedTextId;
  }, [selectedParsedTextId]);

  useEffect(() => {
    selectedJobIdRef.current = selectedJobId;
  }, [selectedJobId]);

  useEffect(() => {
    parsedTextsRef.current = parsedTexts;
  }, [parsedTexts]);

  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  const selectParsedText = useCallback((id: string | null) => {
    selectedParsedTextIdRef.current = id;
    setSelectedParsedTextId(id);
  }, []);

  const selectJob = useCallback((id: string | null) => {
    selectedJobIdRef.current = id;
    setSelectedJobId(id);
  }, []);

  const refreshJobs = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) {
        setIsRefreshingJobs(true);
      }

      try {
        const [textsResult, jobsResult] = await Promise.allSettled([
          listParsedTexts(),
          listComplexCipherJobs(),
        ]);

        const texts =
          textsResult.status === "fulfilled"
            ? textsResult.value
            : parsedTextsRef.current;
        const complexJobs =
          jobsResult.status === "fulfilled" ? jobsResult.value : jobsRef.current;

        setParsedTexts(texts);
        setJobs(complexJobs);

        const firstCompleted = texts.find((item) => item.status === "completed");
        if (!selectedParsedTextIdRef.current && firstCompleted) {
          selectParsedText(firstCompleted.id);
        }
        if (!selectedJobIdRef.current && complexJobs.length > 0) {
          selectJob(complexJobs[0].id);
        }

        if (textsResult.status === "rejected" || jobsResult.status === "rejected") {
          const failed = [
            textsResult.status === "rejected" ? "parsed texts" : null,
            jobsResult.status === "rejected" ? "AES jobs" : null,
          ]
            .filter(Boolean)
            .join(" and ");
          setMessage(`Failed to load ${failed}. Check API deployment.`);
        }
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Failed to load AES jobs",
        );
      } finally {
        setIsRefreshingJobs(false);
      }
    },
    [selectJob, selectParsedText],
  );

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refreshJobs(true), 0);
    return () => {
      window.clearTimeout(initialLoad);
    };
  }, [refreshJobs]);

  useEffect(() => {
    if (!hasActiveJobs) {
      return;
    }

    const interval = window.setInterval(() => void refreshJobs(), 5000);
    return () => window.clearInterval(interval);
  }, [hasActiveJobs, refreshJobs]);

  async function submit() {
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response =
        operation === "encrypt"
          ? await encryptAes({
              plaintext,
              key,
              inputEncoding,
              keyEncoding,
              outputEncoding,
              mode,
              iv: mode === "cbc" ? iv : undefined,
              ivEncoding,
            })
          : await decryptAes({
              ciphertext,
              key,
              inputEncoding: cipherInputEncoding,
              keyEncoding,
              outputEncoding: plainOutputEncoding,
              mode,
              iv: mode === "cbc" ? iv : undefined,
              ivEncoding,
            });

      setResult(response);
      if (response.operation === "encrypt") {
        setCiphertext(response.result);
        setCipherInputEncoding(response.outputEncoding);
      }
      setMessage(
        response.operation === "encrypt"
          ? "AES encryption completed."
          : "AES decryption completed.",
      );
      return response;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AES request failed");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitJob() {
    if (!selectedParsedText) {
      setMessage("No completed parsed text selected.");
      return null;
    }

    setMessage(null);
    setIsQueueingJob(true);

    try {
      const created = await createAesJob({
        parsedTextId: selectedParsedText.id,
        key,
        keyEncoding,
        outputEncoding,
        mode,
        iv: mode === "cbc" ? iv : undefined,
        ivEncoding,
      });
      selectJob(created.id);
      setMessage("AES corpus job queued.");
      await refreshJobs();
      return created;
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to queue AES job",
      );
      return null;
    } finally {
      setIsQueueingJob(false);
    }
  }

  function loadFipsVector() {
    setOperation("encrypt");
    setMode("ecb");
    setPlaintext("00112233445566778899aabbccddeeff");
    setInputEncoding("hex");
    setKey("000102030405060708090a0b0c0d0e0f");
    setKeyEncoding("hex");
    setOutputEncoding("hex");
    setResult(null);
    setMessage("Loaded AES-128 block test vector.");
  }

  function swapToDecrypt() {
    setOperation("decrypt");
    setPlainOutputEncoding("utf8");
    if (result?.operation === "encrypt") {
      setCiphertext(result.result);
      setCipherInputEncoding(result.outputEncoding);
    }
  }

  return {
    operation,
    mode,
    plaintext,
    ciphertext,
    key,
    iv,
    inputEncoding,
    cipherInputEncoding,
    keyEncoding,
    outputEncoding,
    plainOutputEncoding,
    ivEncoding,
    activeInput,
    activeInputEncoding,
    activeOutputEncoding,
    inputLabel,
    keySizeHint,
    isSubmitting,
    isQueueingJob,
    isRefreshingJobs,
    message,
    result,
    parsedTexts,
    completedParsedTexts,
    jobs,
    selectedParsedText,
    selectedParsedTextId,
    selectedJob,
    selectedJobId,
    hasActiveJobs,
    setOperation,
    setMode,
    setPlaintext,
    setCiphertext,
    setKey,
    setIv,
    setInputEncoding,
    setCipherInputEncoding,
    setKeyEncoding,
    setOutputEncoding,
    setPlainOutputEncoding,
    setIvEncoding,
    setSelectedParsedTextId: selectParsedText,
    setSelectedJobId: selectJob,
    submit,
    submitJob,
    refreshJobs,
    loadFipsVector,
    swapToDecrypt,
  };
}

function describeKeySize(key: string, encoding: BinaryEncoding) {
  if (!key) {
    return "No key";
  }

  if (encoding === "hex" && /^[\da-f]*$/i.test(key) && key.length % 2 === 0) {
    return `${(key.length / 2) * 8} bits`;
  }

  if (encoding === "utf8") {
    return `${new TextEncoder().encode(key).length * 8} bits`;
  }

  if (encoding === "base64") {
    const normalized = key.replace(/=+$/, "");
    return `~${Math.floor((normalized.length * 3) / 4) * 8} bits`;
  }

  return "Check key format";
}
