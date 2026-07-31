import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  X,
  RotateCcw,
  User,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  Save,
  Search,
  Sparkles,
  CheckCircle2,
  Zap,
  Check,
  Brain,
  Plus,
  Trash2,
  Lock,
  SlidersHorizontal,
} from "lucide-react";
import { Customer, TransactionType } from "../types";

export interface VoiceParsedResult {
  transcript: string;
  matchedCustomer?: Customer;
  extractedAmount?: number;
  transactionType?: TransactionType;
  customerNotFound?: boolean;
  spokenCustomerQuery?: string;
}

export interface VoiceLocalMemory {
  customerAliases: Record<string, string>; // e.g. "مام حەمە" -> customerId or customerName
  customAmountMappings: Record<string, number>; // e.g. "20" -> 20000
  enableShorthandThousands: boolean; // if true, raw small numbers e.g. 20 -> 20,000
  totalLearnedCount: number;
}

const LOCAL_LEARNING_STORAGE_KEY = "voice_local_learning_v1";

const getDefaultLocalMemory = (): VoiceLocalMemory => {
  try {
    const saved = localStorage.getItem(LOCAL_LEARNING_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        customerAliases: parsed.customerAliases || {},
        customAmountMappings: parsed.customAmountMappings || {},
        enableShorthandThousands: parsed.enableShorthandThousands ?? true,
        totalLearnedCount: parsed.totalLearnedCount || 0,
      };
    }
  } catch (e) {
    console.warn("Failed to load local voice learning memory:", e);
  }
  return {
    customerAliases: {},
    customAmountMappings: {},
    enableShorthandThousands: true,
    totalLearnedCount: 0,
  };
};

const saveLocalMemory = (mem: VoiceLocalMemory) => {
  try {
    localStorage.setItem(LOCAL_LEARNING_STORAGE_KEY, JSON.stringify(mem));
  } catch (e) {
    console.warn("Failed to save local voice learning memory:", e);
  }
};

interface VoiceModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionTitle: string; // "قەرزی گشتی" | "قەرزی ڕۆژانە" | "داواکاری ڕۆژانە"
  customers?: Customer[];
  onApplyVoiceInput: (result: VoiceParsedResult) => void;
  initialPrompt?: string;
}

export const VoiceModeModal: React.FC<VoiceModeModalProps> = ({
  isOpen,
  onClose,
  sectionTitle,
  customers = [],
  onApplyVoiceInput,
  initialPrompt = "تکایە بە روونی ناوی کڕیار و بڕی پارە بڵێ (نموونە: هەژار 20 هەزار)...",
}) => {
  // Voice Mode: "quick" (Default ultra-fast) vs "detailed"
  const [voiceMode, setVoiceMode] = useState<"quick" | "detailed">("quick");

  // Step State: "recording" | "confirmation" | "learning_manager"
  const [step, setStep] = useState<"recording" | "confirmation" | "learning_manager">("recording");

  // Local Learning Engine Memory State (Strictly client-side localStorage)
  const [localMemory, setLocalMemory] = useState<VoiceLocalMemory>(getDefaultLocalMemory);
  const [showLearnedToast, setShowLearnedToast] = useState<boolean>(false);
  const [learnedMessage, setLearnedMessage] = useState<string>("");

  // Manual Learning Add Form State
  const [manualPhraseInput, setManualPhraseInput] = useState<string>("");
  const [manualCustomerSelect, setManualCustomerSelect] = useState<string>("");

  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [interimText, setInterimText] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Parsed Entities
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | undefined>(undefined);
  const [candidateCustomers, setCandidateCustomers] = useState<Customer[]>([]);
  const [extractedAmount, setExtractedAmount] = useState<number | undefined>(undefined);
  const [transactionType, setTransactionType] = useState<TransactionType | undefined>(undefined);
  const [customerNotFound, setCustomerNotFound] = useState<boolean>(false);
  const [spokenCustomerQuery, setSpokenCustomerQuery] = useState<string>("");

  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Convert Eastern Arabic numerals to standard Latin digits
  const normalizeDigits = (text: string): string => {
    return text.replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d) =>
      "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString()
    );
  };

  // Comprehensive AI Number Parser (Supports Local Learnt Mappings & Shorthand Thousands e.g. "20" -> 20,000)
  const extractAmountFromText = (rawText: string, memory: VoiceLocalMemory): number | undefined => {
    if (!rawText) return undefined;
    const text = normalizeDigits(rawText.toLowerCase());

    // 1. Check multiplier patterns e.g. "1.5 ملیۆن", "2 ملیۆن", "2.5m"
    const millionDigitMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:ملیۆن|ملێۆن|million|m)/i);
    if (millionDigitMatch && millionDigitMatch[1]) {
      const num = parseFloat(millionDigitMatch[1]);
      if (!isNaN(num) && num > 0) return Math.round(num * 1000000);
    }

    // 2. Check multiplier patterns e.g. "20 هەزار", "150 هەزار", "250 هەزار", "20k"
    const thousandDigitMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:هەزار|هزار|k)/i);
    if (thousandDigitMatch && thousandDigitMatch[1]) {
      const num = parseFloat(thousandDigitMatch[1]);
      if (!isNaN(num) && num > 0) return Math.round(num * 1000);
    }

    // 3. Kurdish Number Words Exact Matchers (Millions & Half Millions)
    if (text.includes("پێنج ملیۆن")) return 5000000;
    if (text.includes("چوار ملیۆن")) return 4000000;
    if (text.includes("سێ ملیۆن")) return 3000000;
    if (text.includes("دوو ملیۆن") || text.includes("دوملیۆن")) return 2000000;
    if (text.includes("ملیۆنێک") || text.includes("یەک ملیۆن")) return 1000000;
    if (text.includes("نیو ملیۆن") || text.includes("پێنج سەد هەزار")) return 500000;

    // 4. Kurdish Number Words (Hundreds of Thousands)
    if (text.includes("چوار سەد هەزار")) return 400000;
    if (text.includes("سێ سەد هەزار")) return 300000;
    if (text.includes("دوو سەد هەزار")) return 200000;
    if (text.includes("سەد هەزار")) return 100000;

    // 5. Kurdish Number Words (Tens of Thousands)
    if (text.includes("نەوەد هەزار")) return 90000;
    if (text.includes("هەشتا هەزار")) return 80000;
    if (text.includes("حەفتا هەزار")) return 70000;
    if (text.includes("شەست هەزار")) return 60000;
    if (text.includes("پەنجا هەزار")) return 50000;
    if (text.includes("چل هەزار")) return 40000;
    if (text.includes("سی هەزار") || text.includes("سیی هەزار")) return 30000;
    if (text.includes("بیست و پێنج") || text.includes("بیست وپێنج")) return 25000;
    if (text.includes("بیست هەزار")) return 20000;
    if (text.includes("پانزە هەزار") || text.includes("پازدە هەزار")) return 15000;
    if (text.includes("دە هەزار") || text.includes("دەی هەزار")) return 10000;

    // 6. Kurdish Number Words (Units of Thousands)
    if (text.includes("نۆ هەزار")) return 9000;
    if (text.includes("هەشت هەزار")) return 8000;
    if (text.includes("حەوت هەزار")) return 7000;
    if (text.includes("شەش هەزار")) return 6000;
    if (text.includes("پێنج هەزار")) return 5000;
    if (text.includes("چوار هەزار")) return 4000;
    if (text.includes("سێ هەزار")) return 3000;
    if (text.includes("دوو هەزار") || text.includes("دوهەزار")) return 2000;
    if (text.includes("هەزار") && !text.includes("سەد") && !text.includes("ملیۆن")) {
      const beforeThousandMatch = text.match(/(\d+)\s*هەزار/);
      if (beforeThousandMatch && beforeThousandMatch[1]) {
        return parseInt(beforeThousandMatch[1], 10) * 1000;
      }
      return 1000;
    }

    // 7. Kurdish Number Words (Hundreds)
    if (text.includes("پێنج سەد")) return 500;
    if (text.includes("چوار سەد")) return 400;
    if (text.includes("سێ سەد")) return 300;
    if (text.includes("دوو سەد")) return 200;
    if (text.includes("سەد")) return 100;

    // 8. Standalone Digits (with Local Memory Learning & Shorthand Thousands)
    const digitMatch = text.match(/\b\d[\d,\.]*\b/g);
    if (digitMatch && digitMatch.length > 0) {
      for (const rawNumStr of digitMatch) {
        const parsedNum = parseFloat(rawNumStr.replace(/,/g, ""));
        if (!isNaN(parsedNum) && parsedNum > 0) {
          // Check if custom local mapping exists in localStorage
          if (memory.customAmountMappings[rawNumStr]) {
            return memory.customAmountMappings[rawNumStr];
          }
          if (memory.customAmountMappings[parsedNum.toString()]) {
            return memory.customAmountMappings[parsedNum.toString()];
          }

          // Shorthand Thousands Rule: if e.g. "20" or "50" or "250" is spoken without "هەزار", auto convert to x1000 (e.g. 20,000)
          if (memory.enableShorthandThousands && parsedNum < 1000 && !text.includes("سەد") && !text.includes("ملیۆن")) {
            return Math.round(parsedNum * 1000);
          }

          return parsedNum;
        }
      }
    }

    return undefined;
  };

  // Sentence Understanding for Transaction Type
  const extractTransactionTypeFromText = (rawText: string): TransactionType => {
    if (!rawText) return "debt";
    const lower = rawText.toLowerCase();

    // Explicit PAYMENT phrases
    if (
      lower.includes("وەسڵ") ||
      lower.includes("پارەدان") ||
      lower.includes("پارە دانی") ||
      lower.includes("دایەوە") ||
      lower.includes("هێناویەتی") ||
      lower.includes("وەریگرت") ||
      lower.includes("گەڕاندنەوە") ||
      lower.includes("کەم بکە") ||
      lower.includes("کەمبکە") ||
      lower.includes("وەرگرە") ||
      lower.includes("وەرگرتم") ||
      lower.includes("لە ")
    ) {
      return "payment";
    }

    // Explicit DEBT phrases
    if (
      lower.includes("قەرز") ||
      lower.includes("سەرکڕیار") ||
      lower.includes("بردوویەتی") ||
      lower.includes("بردی") ||
      lower.includes("کڕینی") ||
      lower.includes("کڕی") ||
      lower.includes("دەین") ||
      lower.includes("زیاد بکە") ||
      lower.includes("زیادبکە") ||
      lower.includes("داواکاری") ||
      lower.includes("بۆ ")
    ) {
      return "debt";
    }

    return "debt";
  };

  // Smart Customer Recognition (with Local Learnt Aliases e.g. "مام حەمە" -> "محمد")
  const extractCustomerFromText = (
    rawText: string,
    customerList: Customer[],
    memory: VoiceLocalMemory
  ): {
    matched?: Customer;
    candidates: Customer[];
    notFound: boolean;
    nameAttempt?: string;
  } => {
    if (!rawText || !customerList.length) {
      return { matched: undefined, candidates: [], notFound: false };
    }

    const cleanedText = rawText.trim().toLowerCase();

    // 0. FIRST CHECK LOCAL LEARNED ALIASES (e.g. "مام حەمە" -> customerId or customerName)
    for (const [aliasPhrase, targetCustomerRef] of Object.entries(memory.customerAliases)) {
      if (cleanedText.includes(aliasPhrase.toLowerCase())) {
        const aliasMatch = customerList.find(
          (c) =>
            c.id === targetCustomerRef ||
            c.name.trim().toLowerCase() === targetCustomerRef.trim().toLowerCase()
        );
        if (aliasMatch) {
          return { matched: aliasMatch, candidates: [], notFound: false };
        }
      }
    }

    // Remove noise words
    const textWithoutKeywords = cleanedText
      .replace(/(?:قەرز|وەسڵ|پارەدان|هەزار|ملیۆن|دینار|د\.ع|زیاد|کەم|بکە|وەرگرە|داواکاری|وەریگرت|بردوویەتی|لە|بۆ|کاک|مام|کڕیار)/g, " ")
      .replace(/\d+/g, " ")
      .trim();

    // 1. Direct Full Name or Customer Code Match
    const exactMatches = customerList.filter((c) =>
      cleanedText.includes(c.name.trim().toLowerCase()) ||
      (c.code && c.code.trim() && cleanedText.includes(c.code.trim().toLowerCase()))
    );

    if (exactMatches.length === 1) {
      return { matched: exactMatches[0], candidates: [], notFound: false };
    } else if (exactMatches.length > 1) {
      const sorted = [...exactMatches].sort((a, b) => b.name.length - a.name.length);
      return { matched: sorted[0], candidates: sorted, notFound: false };
    }

    // 2. Token / Prefix Substring Match
    const words = textWithoutKeywords.split(/\s+/).filter((w) => w.length >= 1);
    let matchedList: Customer[] = [];

    for (const word of words) {
      if (!word) continue;
      const matches = customerList.filter((c) => {
        const cName = c.name.toLowerCase();
        return cName.includes(word) || word.includes(cName);
      });

      matches.forEach((m) => {
        if (!matchedList.some((c) => c.id === m.id)) {
          matchedList.push(m);
        }
      });
    }

    if (matchedList.length === 1) {
      return { matched: matchedList[0], candidates: [], notFound: false };
    } else if (matchedList.length > 1) {
      return { matched: matchedList[0], candidates: matchedList, notFound: false };
    }

    // 3. Spoken Name Attempt Extraction
    const nameKeywordsMatch = cleanedText.match(/(?:بۆ|کڕیار|ناوی|لە|کاک|مام)\s+([^\s\d\.\,\+]+)/i);
    let spokenAttempt = "";
    if (nameKeywordsMatch && nameKeywordsMatch[1]) {
      spokenAttempt = nameKeywordsMatch[1];
    } else if (words.length > 0) {
      spokenAttempt = words[0];
    }

    const isNotFound = spokenAttempt.length >= 1;

    return {
      matched: undefined,
      candidates: [],
      notFound: isNotFound,
      nameAttempt: spokenAttempt,
    };
  };

  // Process text whenever speech recognition emits output
  const parseSpeechEntities = (fullText: string) => {
    if (!fullText) {
      setMatchedCustomer(undefined);
      setCandidateCustomers([]);
      setExtractedAmount(undefined);
      setTransactionType(undefined);
      setCustomerNotFound(false);
      setSpokenCustomerQuery("");
      return;
    }

    // Amount (using local memory rules)
    const amt = extractAmountFromText(fullText, localMemory);
    setExtractedAmount(amt);

    // Transaction Type
    const txType = extractTransactionTypeFromText(fullText);
    setTransactionType(txType);

    // Customer Disambiguation (using local memory rules)
    const custResult = extractCustomerFromText(fullText, customers, localMemory);
    setMatchedCustomer(custResult.matched);
    setCandidateCustomers(custResult.candidates);
    setCustomerNotFound(custResult.notFound);
    setSpokenCustomerQuery(custResult.nameAttempt || "");
  };

  // Start Audio Visualizer
  const startAudioMeter = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioContextRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateVolume = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            animFrameRef.current = requestAnimationFrame(updateVolume);
          };
          updateVolume();
        }
      }
    } catch (e) {
      // Mic permission error or unavailable
    }
  };

  const stopAudioMeter = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  // Start Speech Recognition
  const startListening = () => {
    setErrorMsg("");
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg("مۆبایل یان وێبگەڕەکەت پشتگیری وەرگێڕانی دەنگ ناکات. دەتوانیت دەقەکە بە دەست بنووسیت.");
      startAudioMeter();
      setIsListening(true);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "ckb-IQ"; // Central Kurdish

      recognition.onstart = () => {
        setIsListening(true);
        startAudioMeter();
      };

      recognition.onresult = (event: any) => {
        let finalTrans = "";
        let interimTrans = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTrans += res[0].transcript + " ";
          } else {
            interimTrans += res[0].transcript;
          }
        }

        setInterimText(interimTrans);

        let currentFull = "";
        if (finalTrans) {
          currentFull = (transcript + " " + finalTrans).trim();
          setTranscript(currentFull);
        } else {
          currentFull = (transcript + " " + interimTrans).trim();
        }

        parseSpeechEntities(currentFull);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setErrorMsg("مۆڵەتی بەکارهێنانی مایکرۆفۆن ڕەتکرایەوە. تکایە لە ڕێکخستنەکان مۆڵەت بدە.");
        } else if (event.error !== "no-speech") {
          setErrorMsg("کێشەیەک ڕوویدا لە وەرگرتنی دەنگ.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        stopAudioMeter();
      };

      recognition.start();
    } catch (err) {
      console.error(err);
      setErrorMsg("نەتوانرا مایکرۆفۆن چالاک بکرێت.");
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    stopAudioMeter();
    setIsListening(false);
  };

  useEffect(() => {
    if (isOpen) {
      const loadedMem = getDefaultLocalMemory();
      setLocalMemory(loadedMem);
      setStep("recording");
      setTranscript("");
      setInterimText("");
      setErrorMsg("");
      setMatchedCustomer(undefined);
      setCandidateCustomers([]);
      setExtractedAmount(undefined);
      setTransactionType(undefined);
      setCustomerNotFound(false);
      setSpokenCustomerQuery("");
      startListening();
    } else {
      stopListening();
    }
    return () => {
      stopListening();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Check if transaction is 100% ready for instant 1-tap confirmation
  const isFullyReady =
    matchedCustomer !== undefined &&
    extractedAmount !== undefined &&
    extractedAmount > 0 &&
    transactionType !== undefined &&
    !customerNotFound;

  // Clear Clarifying Question for User when confidence is < 100%
  const getClarifyingQuestion = (): string | null => {
    if (isFullyReady) return null;
    if (!transcript && !interimText) return "تکایە بە دەنگ بڵێ: ناوی کڕیار، بڕی پارە، و جۆری مامەڵە (قەرز یان وەسڵ)...";
    if (customerNotFound && !matchedCustomer) {
      return `❓ پرس: کڕیار بە ناوی (${spokenCustomerQuery}) لە داتابەیسدا نەدۆزرایەوە! تکایە ناوی تەواوی کڕیارەکە دووبارە بکەرەوە یان دەستکاری بکە.`;
    }
    if (candidateCustomers.length > 1 && !matchedCustomer) {
      return "❓ پرس: ناوی زیاتر لە کڕیارێک لە قسەکەتدا هەیە. تکایە کڕیارە دروستەکە لە خوارەوە دیاری بکە.";
    }
    if (!matchedCustomer) {
      return "❓ پرس: ناوی کڕیار دیاری نەکراوە. تکایە ناوی کڕیارەکە بڵێ.";
    }
    if (extractedAmount === undefined || extractedAmount <= 0) {
      return `❓ پرس: کڕیار (${matchedCustomer.name}) دیاریکرا. تکایە بڕی پارەکە بڵێ (نموونە: ٢٠ هەزار).`;
    }
    if (transactionType === undefined) {
      return "❓ پرس: ئایا ئەم مامەڵەیە (قەرز)ـە یان (وەسڵ/پارەدان)؟";
    }
    return "❓ پرس: تکایە بە ڕوونی دەنگەکە دووبارە بکەرەوە.";
  };

  // Move to Confirmation Screen
  const handleProceedToConfirmation = () => {
    stopListening();
    setStep("confirmation");
  };

  // Final Confirmed Execution + Auto Quiet Local Learning
  const handleFinalConfirmSave = () => {
    const fullText = (transcript + " " + interimText).trim();

    // QUIET LOCAL LEARNING (0% Firebase - strictly stored in user's localStorage)
    if (matchedCustomer && fullText) {
      const updatedMem = { ...localMemory };
      let updated = false;

      // Extract spoken name words or aliases (e.g. if spoken text contains "مام حەمە")
      const lowerText = fullText.toLowerCase();
      const words = lowerText
        .replace(/(?:قەرز|وەسڵ|پارەدان|هەزار|ملیۆن|دینار|د\.ع|زیاد|کەم|بکە|وەرگرە|داواکاری|وەریگرت|بردوویەتی|لە|بۆ|کاک|مام)/g, " ")
        .replace(/\d+/g, " ")
        .trim()
        .split(/\s+/)
        .filter((w) => w.length >= 2);

      // Check if user spoke an alias that is different from exact full name
      if (words.length > 0) {
        const spokenPhrase = words.slice(0, 2).join(" ");
        if (spokenPhrase && spokenPhrase !== matchedCustomer.name.toLowerCase()) {
          updatedMem.customerAliases[spokenPhrase] = matchedCustomer.id;
          updatedMem.totalLearnedCount += 1;
          updated = true;
        }
      }

      // Learn raw number shorthand (e.g. if user said "20" and saved 20,000)
      const digitMatch = lowerText.match(/\b\d[\d,\.]*\b/g);
      if (digitMatch && digitMatch.length > 0 && extractedAmount) {
        const rawNumStr = digitMatch[0];
        const parsedNum = parseFloat(rawNumStr.replace(/,/g, ""));
        if (!isNaN(parsedNum) && parsedNum < 1000 && extractedAmount === parsedNum * 1000) {
          updatedMem.customAmountMappings[rawNumStr] = extractedAmount;
          updatedMem.totalLearnedCount += 1;
          updated = true;
        }
      }

      if (updated) {
        setLocalMemory(updatedMem);
        saveLocalMemory(updatedMem);
        setLearnedMessage(`🧠 AI لە شێوازی قسەکردنت فێربوو (پاشەکەوتکرا لەسەر ئامێرەکەت)`);
        setShowLearnedToast(true);
      }
    }

    onApplyVoiceInput({
      transcript: fullText,
      matchedCustomer,
      extractedAmount,
      transactionType,
      customerNotFound: customerNotFound && !matchedCustomer,
      spokenCustomerQuery,
    });

    onClose();
  };

  // Manual Alias Add Handler
  const handleAddManualAlias = () => {
    if (!manualPhraseInput.trim() || !manualCustomerSelect) return;
    const cleanPhrase = manualPhraseInput.trim().toLowerCase();
    const updatedMem = {
      ...localMemory,
      customerAliases: {
        ...localMemory.customerAliases,
        [cleanPhrase]: manualCustomerSelect,
      },
      totalLearnedCount: localMemory.totalLearnedCount + 1,
    };
    setLocalMemory(updatedMem);
    saveLocalMemory(updatedMem);
    setManualPhraseInput("");
    setManualCustomerSelect("");
  };

  // Delete Learned Alias
  const handleDeleteAlias = (phrase: string) => {
    const newAliases = { ...localMemory.customerAliases };
    delete newAliases[phrase];
    const updatedMem = {
      ...localMemory,
      customerAliases: newAliases,
    };
    setLocalMemory(updatedMem);
    saveLocalMemory(updatedMem);
  };

  // Reset Local Memory
  const handleResetLocalMemory = () => {
    if (window.confirm("ئایا دڵنیایت لە سڕینەوەی هەموو تێگەیشتن و فێربوونە ناوخۆییەکانی دەنگ لەسەر ئەم ئامێرە؟")) {
      const freshMem: VoiceLocalMemory = {
        customerAliases: {},
        customAmountMappings: {},
        enableShorthandThousands: true,
        totalLearnedCount: 0,
      };
      setLocalMemory(freshMem);
      saveLocalMemory(freshMem);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-stone-200 space-y-4 text-right font-sans relative overflow-hidden dir-rtl">
        
        {/* Background Ambient Glow when listening */}
        {isListening && step === "recording" && (
          <div className="absolute -top-20 -right-20 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-xs ${
              isFullyReady ? "bg-emerald-600 text-white" : "bg-red-100 text-red-600"
            }`}>
              {isFullyReady ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5 animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-base flex items-center gap-1.5">
                <span>
                  {voiceMode === "quick" ? "دۆخی دەنگی خێرا ⚡ (Quick Voice)" : "یارمەتیدەری زانیاری دەنگی (AI Voice)"}
                </span>
              </h3>
              <p className="text-xs text-stone-500 font-medium">
                بەشی تۆمارکردن: <span className="font-bold text-emerald-700">{sectionTitle}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Voice Mode Selector Tabs & Local AI Learning Engine Drawer Toggle */}
        <div className="grid grid-cols-3 gap-1.5 bg-stone-100 p-1 rounded-2xl border border-stone-200 text-xs font-extrabold">
          <button
            type="button"
            onClick={() => {
              setVoiceMode("quick");
              if (step === "learning_manager") setStep("recording");
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1 transition ${
              voiceMode === "quick" && step !== "learning_manager"
                ? "bg-emerald-700 text-white shadow-sm"
                : "text-stone-600 hover:bg-stone-200/70"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>⚡ خێرا</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              setVoiceMode("detailed");
              if (step === "learning_manager") setStep("recording");
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1 transition ${
              voiceMode === "detailed" && step !== "learning_manager"
                ? "bg-stone-800 text-white shadow-sm"
                : "text-stone-600 hover:bg-stone-200/70"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>🎙️ وردەکاری</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopListening();
              setStep("learning_manager");
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1 transition ${
              step === "learning_manager"
                ? "bg-purple-700 text-white shadow-sm"
                : "text-purple-800 bg-purple-50 border border-purple-200 hover:bg-purple-100"
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-purple-600" />
            <span>🧠 فێربوون ({Object.keys(localMemory.customerAliases).length})</span>
          </button>
        </div>

        {/* STEP 1: RECORDING & LIVE EXTRACTION */}
        {step === "recording" && (
          <>
            {/* Microphone Visualizer Circle */}
            <div className="flex flex-col items-center justify-center py-1 space-y-2">
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                  isListening
                    ? "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white scale-105"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {isListening && (
                  <span
                    className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping"
                    style={{ animationDuration: "1.5s" }}
                  />
                )}
                {isListening ? (
                  <Mic className="w-8 h-8 relative z-10 animate-bounce" />
                ) : (
                  <MicOff className="w-8 h-8 relative z-10" />
                )}
              </button>

              {/* Sound Level Audio Bars */}
              {isListening && (
                <div className="flex items-center gap-1.5 h-4">
                  {[40, 70, 100, 60, 90, 50, 80].map((h, idx) => (
                    <div
                      key={idx}
                      className="w-1.5 bg-emerald-500 rounded-full transition-all duration-75"
                      style={{
                        height: `${Math.max(4, (audioLevel * h) / 100)}px`,
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="text-center">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    isListening
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {isListening
                    ? voiceMode === "quick"
                      ? 'بڵێ "هەژار 20" یان "مام حەمە 20 هزار"'
                      : "گوێبیست دەبم... ناوی کڕیار، بڕ، و جۆری مامەڵە بڵێ"
                    : "داگیراوە - کلیک بکە بۆ چالاککردنەوە"}
                </span>
              </div>
            </div>

            {/* Live Transcript Display Box */}
            <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200 min-h-[65px] flex flex-col justify-between space-y-1">
              <div className="text-xs font-semibold text-stone-800 leading-relaxed dir-rtl min-h-[32px]">
                {transcript || interimText ? (
                  <span>
                    <span className="font-bold text-stone-900">{transcript}</span>{" "}
                    <span className="text-stone-400 italic">{interimText}</span>
                  </span>
                ) : (
                  <span className="text-stone-400 font-normal">
                    {voiceMode === "quick"
                      ? 'تەنها بڵێ: "مام حەمە 20" (AI فێردەبێت)'
                      : initialPrompt}
                  </span>
                )}
              </div>
            </div>

            {/* 100% READY HIGHLIGHT BANNER IN QUICK VOICE MODE */}
            {isFullyReady ? (
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-3.5 rounded-2xl shadow-lg space-y-2 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-black text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                    <span>✅ مامەڵە ئامادەیە (Transaction Ready)</span>
                  </div>
                  <span className="bg-emerald-800/80 text-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    100% تێگەیشت
                  </span>
                </div>

                {/* Data Summary Badges */}
                <div className="grid grid-cols-3 gap-2 text-xs font-bold pt-1">
                  <div className="bg-white/15 backdrop-blur-xs p-2 rounded-xl text-center">
                    <span className="block text-[10px] text-emerald-200 font-normal">کڕیار:</span>
                    <span className="truncate block font-black">{matchedCustomer.name}</span>
                  </div>
                  <div className="bg-white/15 backdrop-blur-xs p-2 rounded-xl text-center">
                    <span className="block text-[10px] text-emerald-200 font-normal">بڕی پارە:</span>
                    <span className="font-black text-amber-300">
                      {extractedAmount.toLocaleString()} د.ع
                    </span>
                  </div>
                  <div className="bg-white/15 backdrop-blur-xs p-2 rounded-xl text-center">
                    <span className="block text-[10px] text-emerald-200 font-normal">جۆری مامەڵە:</span>
                    <span className="font-black">
                      {transactionType === "debt" ? "قەرز 🔴" : "وەسڵ 🟢"}
                    </span>
                  </div>
                </div>

                {/* Instant 1-Tap Save Button */}
                <button
                  type="button"
                  onClick={handleFinalConfirmSave}
                  className="w-full mt-1 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 font-black rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2 border border-emerald-200"
                >
                  <Save className="w-4 h-4 text-emerald-700" />
                  <span>پشتڕاستکردنەوە و ساڤکردن (Save Transaction)</span>
                </button>
              </div>
            ) : (
              /* Entity Extraction Badges when NOT fully ready */
              <div className="space-y-2.5 bg-stone-100/80 p-3 rounded-2xl border border-stone-200 text-xs">
                
                {/* PROMINENT CLARIFYING QUESTION TO USER WHEN CONFIDENCE < 100% */}
                {getClarifyingQuestion() && (
                  <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl text-amber-950 font-extrabold text-xs shadow-xs animate-in fade-in duration-150 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="text-[10px] uppercase tracking-wider text-amber-700 block font-black">
                        پرس لە بەکارهێنەر (Clarifying Question):
                      </span>
                      <span>{getClarifyingQuestion()}</span>
                    </div>
                  </div>
                )}

                <div className="font-bold text-stone-700 text-[11px] flex items-center justify-between">
                  <span>تێگەیشتنی زیرەکی AI لە دەنگەکەدا:</span>
                  <span className="text-[10px] text-purple-700 font-bold flex items-center gap-1">
                    <Brain className="w-3 h-3 text-purple-600" />
                    فێربوونی ناوخۆیی چالاکە
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Customer Status */}
                  <div className="bg-white p-2.5 rounded-xl border border-stone-200 flex flex-col gap-0.5">
                    <span className="text-stone-400 text-[10px] flex items-center gap-1 font-semibold">
                      <User className="w-3 h-3 text-stone-500" />
                      کڕیاری دۆزراوە:
                    </span>
                    {matchedCustomer ? (
                      <span className="font-black text-emerald-700 truncate">
                        ✅ {matchedCustomer.name}
                      </span>
                    ) : customerNotFound ? (
                      <span className="font-black text-red-600 truncate">
                        ❌ نەدۆزرایەوە ({spokenCustomerQuery})
                      </span>
                    ) : (
                      <span className="text-stone-400 italic">دیاری نەکراوە</span>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="bg-white p-2.5 rounded-xl border border-stone-200 flex flex-col gap-0.5">
                    <span className="text-stone-400 text-[10px] flex items-center gap-1 font-semibold">
                      <DollarSign className="w-3 h-3 text-stone-500" />
                      بڕی پارە:
                    </span>
                    {extractedAmount !== undefined ? (
                      <span className="font-black text-emerald-700">
                        {extractedAmount.toLocaleString()} د.ع
                      </span>
                    ) : (
                      <span className="text-stone-400 italic">دیاری نەکراوە</span>
                    )}
                  </div>

                  {/* Transaction Type */}
                  <div className="bg-white p-2.5 rounded-xl border border-stone-200 flex flex-col gap-0.5">
                    <span className="text-stone-400 text-[10px] flex items-center gap-1 font-semibold">
                      🔄 جۆری مامەڵە:
                    </span>
                    {transactionType === "debt" ? (
                      <span className="font-extrabold text-red-600 flex items-center gap-1">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        قەرز 🔴
                      </span>
                    ) : transactionType === "payment" ? (
                      <span className="font-extrabold text-emerald-600 flex items-center gap-1">
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        وەسڵ 🟢
                      </span>
                    ) : (
                      <span className="text-stone-400 italic">دیاری نەکراوە</span>
                    )}
                  </div>
                </div>

                {/* CANDIDATE CUSTOMER DISAMBIGUATION CHIPS */}
                {candidateCustomers.length > 1 && (
                  <div className="bg-amber-50/90 border border-amber-200/90 p-2.5 rounded-xl space-y-1.5">
                    <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                      <Search className="w-3.5 h-3.5 text-amber-600" />
                      <span>ناوی چەند کڕیارێک لێک نزیکن، تکایە هەڵبژێرە:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {candidateCustomers.map((cand) => {
                        const isSelected = matchedCustomer?.id === cand.id;
                        return (
                          <button
                            key={cand.id}
                            type="button"
                            onClick={() => {
                              setMatchedCustomer(cand);
                              setCustomerNotFound(false);
                            }}
                            className={`px-2.5 py-1 rounded-lg font-extrabold text-xs transition flex items-center gap-1 border ${
                              isSelected
                                ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                                : "bg-white text-stone-800 border-stone-200 hover:bg-stone-100"
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                            <span>{cand.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Warning Banner if Customer Spoken But Not Found */}
                {customerNotFound && !matchedCustomer && (
                  <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl text-red-700 font-bold text-[11px] flex items-start gap-2 mt-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      کڕیارێک بەم ناوە ({spokenCustomerQuery}) لە داتابەیسدا نەدۆزرایەوە!
                      <br />
                      <span className="font-normal text-[10px] text-red-600">
                        ⚠️ بۆ پاراستنی داتا، هیچ مامەڵەیەک بە بێ دۆزینەوە یان هەڵبژاردنی ناو پاشەکەوت (Save) ناکرێت.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error message if microphone is disabled */}
            {errorMsg && (
              <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                {errorMsg}
              </p>
            )}

            {/* Step 1 Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  setTranscript("");
                  setInterimText("");
                  setMatchedCustomer(undefined);
                  setCandidateCustomers([]);
                  setExtractedAmount(undefined);
                  setTransactionType(undefined);
                  setCustomerNotFound(false);
                  setSpokenCustomerQuery("");
                }}
                className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>سڕینەوە</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition"
                >
                  پاشگەزبوونەوە
                </button>

                {!isFullyReady && (
                  <button
                    type="button"
                    onClick={handleProceedToConfirmation}
                    disabled={!transcript && !interimText && extractedAmount === undefined && !matchedCustomer}
                    className="px-4 py-2 bg-[#008767] hover:bg-[#007256] disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-md transition flex items-center gap-1.5"
                  >
                    <span>پیشاندانی وردەکاری</span>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* STEP 2: CONFIRMATION PREVIEW WINDOW BEFORE SAVING */}
        {step === "confirmation" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>تکایە پێش پاشەکەوتکردن (Save)، زانیارییە دۆزراوەکان بپشکنە:</span>
            </div>

            {/* Confirmation Data Summary Table Card */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-3 text-xs">
              
              {/* Section */}
              <div className="flex items-center justify-between pb-2 border-b border-stone-200/70">
                <span className="text-stone-500 font-semibold">بەشی سەرەکی:</span>
                <span className="font-extrabold text-stone-900 bg-stone-200/80 px-2.5 py-0.5 rounded-lg">
                  {sectionTitle}
                </span>
              </div>

              {/* Customer Match Status */}
              <div className="flex items-center justify-between pb-2 border-b border-stone-200/70">
                <span className="text-stone-500 font-semibold">کڕیاری بەستراوە:</span>
                {matchedCustomer ? (
                  <span className="font-black text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                    ✅ {matchedCustomer.name}
                  </span>
                ) : customerNotFound ? (
                  <span className="font-extrabold text-red-600 bg-red-100/80 px-2.5 py-0.5 rounded-lg">
                    ❌ کڕیار نەدۆزرایەوە ({spokenCustomerQuery})
                  </span>
                ) : (
                  <span className="text-stone-400 italic">دیاری نەکراوە</span>
                )}
              </div>

              {/* Candidate buttons in confirmation screen if multiple */}
              {candidateCustomers.length > 1 && (
                <div className="bg-amber-50 p-2 rounded-xl border border-amber-200 space-y-1">
                  <span className="text-[10px] text-amber-800 font-bold block">
                    گۆڕینی کڕیار بۆ ناوی تری لەیەکچوو:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {candidateCustomers.map((cand) => (
                      <button
                        key={cand.id}
                        type="button"
                        onClick={() => {
                          setMatchedCustomer(cand);
                          setCustomerNotFound(false);
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border transition ${
                          matchedCustomer?.id === cand.id
                            ? "bg-emerald-600 text-white border-emerald-700"
                            : "bg-white text-stone-700 border-stone-300"
                        }`}
                      >
                        {cand.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Amount */}
              <div className="flex items-center justify-between pb-2 border-b border-stone-200/70">
                <span className="text-stone-500 font-semibold">بڕی پارە:</span>
                {extractedAmount !== undefined ? (
                  <span className="font-black text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                    {extractedAmount.toLocaleString()} د.ع
                  </span>
                ) : (
                  <span className="text-stone-400 italic">دیاری نەکراوە</span>
                )}
              </div>

              {/* Transaction Type */}
              <div className="flex items-center justify-between pb-2 border-b border-stone-200/70">
                <span className="text-stone-500 font-semibold">جۆری مامەڵە:</span>
                {transactionType === "debt" ? (
                  <span className="font-extrabold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    قەرز (Debt) 🔴
                  </span>
                ) : transactionType === "payment" ? (
                  <span className="font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    وەسڵ (Payment) 🟢
                  </span>
                ) : (
                  <span className="text-stone-400 italic">دیاری نەکراوە</span>
                )}
              </div>

              {/* Full Text Transcript */}
              <div className="pt-1">
                <span className="text-stone-500 font-semibold block mb-1">دەقی تۆمارکراو:</span>
                <p className="text-stone-800 bg-white p-2.5 rounded-xl border border-stone-200 font-medium leading-relaxed">
                  "{transcript}"
                </p>
              </div>

            </div>

            {/* Warning if Customer is Not Found */}
            {customerNotFound && !matchedCustomer && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-red-700 font-bold text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>
                  ⚠️ کڕیار لە داتابەیسدا نەدۆزرایەوە! هیچ داتایەک پاشەکەوت (Save) ناکرێت تا کڕیارەکە بە ڕاستی هەڵنەبژێردرێت.
                </span>
              </div>
            )}

            {/* Confirmation Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setStep("recording")}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition flex items-center gap-1"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>دەستکاری / وەرگرتنەوە</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition"
                >
                  پاشگەزبوونەوە
                </button>
                
                <button
                  type="button"
                  onClick={handleFinalConfirmSave}
                  disabled={customerNotFound && !matchedCustomer}
                  className="px-4 py-2 bg-[#008767] hover:bg-[#007256] disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-md transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>پشتڕاستکردنەوە و ساڤکردن</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: LOCAL LEARNING ENGINE MANAGER DRAWER */}
        {step === "learning_manager" && (
          <div className="space-y-3.5 animate-in fade-in duration-150 text-xs dir-rtl">
            
            {/* Privacy Assurance Banner */}
            <div className="bg-purple-50 border border-purple-200 p-3 rounded-2xl space-y-1 text-purple-900">
              <div className="flex items-center gap-1.5 font-black text-xs text-purple-800">
                <Lock className="w-4 h-4 text-purple-600" />
                <span>🔒 تایبەتمەندی و ئاسایشی داتا (0% Firebase Sync)</span>
              </div>
              <p className="text-[11px] font-medium leading-relaxed text-purple-700">
                هەموو فێربوونەکان و ناوی خوازراوەکانی قسەکردنت (وەک "مام حەمە" ➔ "محمد") تەنها لەسەر بیرگەی ناوخۆیی وێبگەڕەکەت (localStorage) لەم ئامێرە پاشەکەوت دەبن. هیچ زانیارییەک بۆ Firebase یان هیچ سێرڤەرێک ناچێت.
              </p>
            </div>

            {/* Quick Toggle for Shorthand Thousands (e.g. "20" -> 20,000) */}
            <div className="bg-stone-50 border border-stone-200 p-3 rounded-2xl flex items-center justify-between gap-2">
              <div>
                <span className="font-extrabold text-stone-900 block text-xs">
                  ⚡ لێکدانەوەی کورتبڕی ژمارەكان (20 ➔ 20,000 د.ع)
                </span>
                <span className="text-[10px] text-stone-500 font-medium block">
                  کاتێک دەڵێیت "20"، بە شێوەی خۆکار وەکو "20,000" وەربگیرێت.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const updatedMem = {
                    ...localMemory,
                    enableShorthandThousands: !localMemory.enableShorthandThousands,
                  };
                  setLocalMemory(updatedMem);
                  saveLocalMemory(updatedMem);
                }}
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                  localMemory.enableShorthandThousands ? "bg-emerald-600" : "bg-stone-300"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                    localMemory.enableShorthandThousands ? "right-0.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Manual Add Custom Name Alias Form */}
            <div className="bg-stone-50 border border-stone-200 p-3 rounded-2xl space-y-2">
              <span className="font-extrabold text-stone-900 block text-xs flex items-center gap-1">
                <Plus className="w-4 h-4 text-emerald-600" />
                دیاریکردنی ناوی دەنگی خوازراو (Custom Voice Alias)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-stone-500 block mb-1">
                    ئەو وشەیەی دەیڵێیت:
                  </label>
                  <input
                    type="text"
                    value={manualPhraseInput}
                    onChange={(e) => setManualPhraseInput(e.target.value)}
                    placeholder='نموونە: "مام حەمە"'
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-xl font-bold text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-500 block mb-1">
                    کڕیاری راستەقینە:
                  </label>
                  <select
                    value={manualCustomerSelect}
                    onChange={(e) => setManualCustomerSelect(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-xl font-bold text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="">-- هەڵبژاردنی کڕیار --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddManualAlias}
                disabled={!manualPhraseInput.trim() || !manualCustomerSelect}
                className="w-full py-1.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>زیادکردنی تێگەیشتنی نوێ</span>
              </button>
            </div>

            {/* List of Learned Aliases */}
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              <span className="font-bold text-stone-600 text-[11px] block">
                لیستی ئەو وشانەی AI فێریان بووە ({Object.keys(localMemory.customerAliases).length}):
              </span>

              {Object.keys(localMemory.customerAliases).length === 0 ? (
                <div className="text-center py-4 bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400 font-medium">
                  هێشتا هیچ ناوێکی خوازراو فێر نەبووە. کاتێک بە دەنگ دەڵێیت "مام حەمە" و هەڵیدەبژێریت، بە شێوەی خۆکار لێرە پاشەکەوت دەبێت!
                </div>
              ) : (
                Object.entries(localMemory.customerAliases).map(([phrase, custIdOrName]) => {
                  const targetCust = customers.find((c) => c.id === custIdOrName || c.name === custIdOrName);
                  const custDisplayName = targetCust ? targetCust.name : custIdOrName;

                  return (
                    <div
                      key={phrase}
                      className="bg-white p-2.5 rounded-xl border border-stone-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-black text-purple-900 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                          "{phrase}"
                        </span>
                        <span className="text-stone-400 font-bold">➔</span>
                        <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                          {custDisplayName}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteAlias(phrase)}
                        className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="سڕینەوەی ئەم فێربوونە"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Actions for Manager Drawer */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={handleResetLocalMemory}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl text-xs transition flex items-center gap-1 border border-red-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ڕیسێتکردنی بیرگە</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("recording");
                  startListening();
                }}
                className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-black rounded-xl text-xs transition flex items-center gap-1"
              >
                <span>گەڕانەوە بۆ دەنگ</span>
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
