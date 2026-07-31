import React, { useState, useEffect } from "react";
import { Customer, CustomerIdConfig, DailyRequest, DeletedCustomerRecord, DeletedTransactionRecord, StoreData, Transaction, TransactionType, UserProfile } from "./types";
import { USERS } from "./data/initialData";
import { generateUID, loadData, saveData, todayISO, loadDraftTransaction, clearDraftTransaction, DraftTransaction, DEFAULT_CUSTOMER_ID_CONFIG, generateNextCustomerId } from "./utils/storage";
import { RotateCcw } from "lucide-react";
import { loginWithGoogle, logoutUser, subscribeToAuth, subscribeToCloudStore, saveToCloud } from "./lib/firebase";
import { User } from "firebase/auth";
import {
  AppSecurityStore,
  UserSecurityConfig,
  SecurityFailedLog,
  getDefaultUserSecurityConfig,
  loadSecurityStore,
  saveSecurityStore,
} from "./utils/security";

import { HeaderBar } from "./components/HeaderBar";
import { BottomNav, NavTab } from "./components/BottomNav";
import { UserSelectionView } from "./components/UserSelectionView";
import { StatsOverview } from "./components/StatsOverview";
import { CustomerList } from "./components/CustomerList";
import { StatsView } from "./components/StatsView";
import { SettingsView } from "./components/SettingsView";
import { DailyRequestsView } from "./components/DailyRequestsView";
import { DailyDebtView } from "./components/DailyDebtView";
import { HomeLaunchpad } from "./components/HomeLaunchpad";

import { CustomerDetailModal } from "./components/CustomerDetailModal";
import { AddCustomerModal } from "./components/AddCustomerModal";
import { AddTransactionModal } from "./components/AddTransactionModal";
import { AddUserModal } from "./components/AddUserModal";
import { ReceiptModal } from "./components/ReceiptModal";
import { BackupModal } from "./components/BackupModal";
import { RecycleBinModal } from "./components/RecycleBinModal";
import { SendReminderModal } from "./components/SendReminderModal";
import { VoiceModeModal } from "./components/VoiceModeModal";
import { ExportReportModal } from "./components/ExportReportModal";
import { SecurityLockModal } from "./components/SecurityLockModal";

export default function App() {
  const [data, setData] = useState<StoreData>({
    customers: [],
    transactions: [],
    lastUserId: null,
    savedItems: [],
    dailyRequests: [],
  });

  const [undoHistory, setUndoHistory] = useState<StoreData[]>([]);
  const [showUndoToast, setShowUndoToast] = useState(false);

  const [usersList, setUsersList] = useState<UserProfile[]>(USERS);
  const [activeUser, setActiveUser] = useState<UserProfile>(USERS[0]);
  const [activeTab, setActiveTab] = useState<NavTab>("user" as any);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Firebase Auth & Cloud Sync State
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [cloudStatus, setCloudStatus] = useState<"synced" | "syncing" | "offline" | "logged_out" | "error">("logged_out");

  // Modals
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [txPreCustomerId, setTxPreCustomerId] = useState<string | undefined>(undefined);
  const [txDefaultType, setTxDefaultType] = useState<TransactionType>("daily_debt");
  const [draftNotice, setDraftNotice] = useState<DraftTransaction | null>(null);

  // Unsaved Draft Transaction Auto-Detection Checker
  useEffect(() => {
    const draft = loadDraftTransaction();
    if (draft && (draft.amount || draft.note || draft.customerId)) {
      setDraftNotice(draft);
    } else {
      setDraftNotice(null);
    }
  }, [isAddTransactionOpen, activeTab]);

  // Receipt Modal
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);
  const [receiptCustomer, setReceiptCustomer] = useState<Customer | null>(null);

  // Backup Modal
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  // Recycle Bin Modal
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);

  // Global Voice Mode Modal State
  const [isGlobalVoiceOpen, setIsGlobalVoiceOpen] = useState(false);

  // Send Reminder Modal State
  const [reminderTarget, setReminderTarget] = useState<{
    customer: Customer;
    balance: number;
    overdueDays: number;
  } | null>(null);

  const handleOpenSendReminder = (customer: Customer, balance: number, overdueDays: number) => {
    setReminderTarget({ customer, balance, overdueDays });
  };

  const handleChangeOverdueThresholdDays = (days: number) => {
    const updated = {
      ...data,
      overdueThresholdDays: days,
    };
    updateData(updated);
  };

  const handleChangeCustomerIdConfig = (newConfig: CustomerIdConfig) => {
    const updated = {
      ...data,
      customerIdConfig: newConfig,
    };
    updateData(updated);
  };

  // Export & Print Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportCustomerId, setExportCustomerId] = useState<string | "all">("all");
  const [exportSectionType, setExportSectionType] = useState<"all" | "general_debt" | "daily_debt" | "daily_request">("all");

  const handleOpenExportReport = (customerId: string = "all", sectionType: any = "all") => {
    setExportCustomerId(customerId);
    setExportSectionType(sectionType);
    setIsExportModalOpen(true);
  };

  // Debtors Filter State
  const [filterDebtorsOnly, setFilterDebtorsOnly] = useState(false);

  // Paper Mode toggle
  const [paperMode, setPaperMode] = useState(false);

  // Security System State
  const [securityStore, setSecurityStore] = useState<AppSecurityStore>(() => loadSecurityStore());
  const [isAppLocked, setIsAppLocked] = useState<boolean>(true);
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now());

  const getUserSecurityConfig = (userId: string): UserSecurityConfig => {
    return securityStore.userConfigs[userId] || getDefaultUserSecurityConfig(userId);
  };

  const activeUserConfig = getUserSecurityConfig(activeUser.id);

  const handleUpdateUserSecurityConfig = (updatedConfig: UserSecurityConfig) => {
    const updatedStore: AppSecurityStore = {
      ...securityStore,
      userConfigs: {
        ...securityStore.userConfigs,
        [updatedConfig.userId]: updatedConfig,
      },
    };
    setSecurityStore(updatedStore);
    saveSecurityStore(updatedStore);
  };

  // User activity listeners for inactivity auto-lock
  useEffect(() => {
    const handleUserInteraction = () => {
      setLastActivityTime(Date.now());
    };

    window.addEventListener("mousemove", handleUserInteraction);
    window.addEventListener("keydown", handleUserInteraction);
    window.addEventListener("touchstart", handleUserInteraction);
    window.addEventListener("click", handleUserInteraction);
    window.addEventListener("scroll", handleUserInteraction);

    return () => {
      window.removeEventListener("mousemove", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("scroll", handleUserInteraction);
    };
  }, []);

  // Auto-lock inactivity timer interval check
  useEffect(() => {
    const timeoutMinutes = activeUserConfig.autoLockMinutes || 5;
    const checkInterval = setInterval(() => {
      if (!isAppLocked) {
        const elapsedMinutes = (Date.now() - lastActivityTime) / (1000 * 60);
        if (elapsedMinutes >= timeoutMinutes) {
          setIsAppLocked(true);
        }
      }
    }, 10000);

    return () => clearInterval(checkInterval);
  }, [isAppLocked, lastActivityTime, activeUserConfig.autoLockMinutes]);

  // Load Initial Local Data
  useEffect(() => {
    async function init() {
      const loaded = await loadData();
      setData(loaded);

      if (loaded.lastUserId) {
        const found = USERS.find((u) => u.id === loaded.lastUserId);
        if (found) setActiveUser(found);
      }
      setLoading(false);
    }
    init();
  }, []);

  // Firebase Auth Subscription & Realtime Firestore Sync Listener
  useEffect(() => {
    let cloudUnsub: (() => void) | null = null;

    const authUnsub = subscribeToAuth((user) => {
      setCloudUser(user);

      if (user) {
        setCloudStatus("syncing");
        // Subscribe to real-time Cloud updates from user's Firestore document
        cloudUnsub = subscribeToCloudStore(
          user.uid,
          (cloudData) => {
            if (cloudData && (cloudData.customers.length > 0 || cloudData.transactions.length > 0)) {
              setData(cloudData);
              saveData(cloudData);
            } else {
              // If Cloud is empty for new user, push current local state to Cloud so data is safe!
              saveToCloud(user.uid, data).catch((e) => console.error(e));
            }
            setCloudStatus("synced");
          },
          (err) => {
            console.error("Cloud listener error:", err);
            setCloudStatus("error");
          }
        );
      } else {
        setCloudStatus("logged_out");
        if (cloudUnsub) cloudUnsub();
      }
    });

    return () => {
      authUnsub();
      if (cloudUnsub) cloudUnsub();
    };
  }, []);

  // Save changes with automatic undo history stack & Cloud sync
  const updateData = async (newData: StoreData, saveHistory = true) => {
    if (saveHistory) {
      setUndoHistory((prev) => [data, ...prev].slice(0, 10));
      setShowUndoToast(true);
    }
    setData(newData);
    await saveData(newData);

    if (cloudUser) {
      setCloudStatus("syncing");
      try {
        await saveToCloud(cloudUser.uid, newData);
        setCloudStatus("synced");
      } catch (err) {
        console.error("Failed to sync to cloud:", err);
        setCloudStatus("error");
      }
    }
  };

  // Google Login Handler
  const handleLoginGoogle = async () => {
    try {
      setCloudStatus("syncing");
      const user = await loginWithGoogle();
      setCloudUser(user);
      // Immediately push existing local data to Cloud upon login
      await saveToCloud(user.uid, data);
      setCloudStatus("synced");
    } catch (err) {
      console.error("Login failed:", err);
      setCloudStatus("error");
    }
  };

  // Logout Google Handler
  const handleLogoutGoogle = async () => {
    try {
      await logoutUser();
      setCloudUser(null);
      setCloudStatus("logged_out");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Force Cloud Sync Handler
  const handleForceCloudSync = async () => {
    if (!cloudUser) return;
    setCloudStatus("syncing");
    try {
      await saveToCloud(cloudUser.uid, data);
      setCloudStatus("synced");
    } catch (err) {
      console.error("Force sync failed:", err);
      setCloudStatus("error");
    }
  };


  // Handle Undo Last Operation
  const handleUndo = async () => {
    if (undoHistory.length === 0) return;
    const previousState = undoHistory[0];
    setUndoHistory((prev) => prev.slice(1));
    setData(previousState);
    await saveData(previousState);
    if (undoHistory.length <= 1) {
      setShowUndoToast(false);
    }
  };

  // Save Autocomplete item permanently
  const handleSaveNewSavedItem = (item: string) => {
    if (!item || !item.trim()) return;
    const trimmed = item.trim();
    const current = data.savedItems || [];
    if (!current.includes(trimmed)) {
      updateData({ ...data, savedItems: [...current, trimmed] }, false);
    }
  };

  // Save Daily Requests
  const handleSaveDailyRequests = (updatedRequests: DailyRequest[]) => {
    updateData({ ...data, dailyRequests: updatedRequests });
  };

  // Switch Active Shopkeeper User
  const handleSelectUser = (user: UserProfile) => {
    setActiveUser(user);
    updateData({ ...data, lastUserId: user.id });
    const userConfig = getUserSecurityConfig(user.id);
    if (userConfig.isPasswordSet || userConfig.enableFingerprint || userConfig.enableFaceUnlock) {
      setIsAppLocked(true);
    }
  };

  // Add New User to list
  const handleAddUser = (name: string, role: string) => {
    const newUser: UserProfile = {
      id: generateUID(),
      name,
      role,
      color: "#008767",
      initial: name.charAt(0),
    };
    const updatedUsers = [...usersList, newUser];
    setUsersList(updatedUsers);
    setActiveUser(newUser);
  };

  // Add New Customer
  const handleAddCustomer = (customerInput: {
    name: string;
    phone: string;
    code?: string;
    address?: string;
    notes?: string;
    initialDebt?: number;
    visitDays?: string[];
  }): Customer => {
    const config = data.customerIdConfig || DEFAULT_CUSTOMER_ID_CONFIG;
    const { newCode, updatedConfig } = generateNextCustomerId(data.customers, data.deletedCustomers, config);
    const finalCode = customerInput.code && customerInput.code.trim() ? customerInput.code.trim() : newCode;

    const newCustId = generateUID();
    const newCustomer: Customer = {
      id: newCustId,
      name: customerInput.name,
      phone: customerInput.phone,
      code: finalCode,
      address: customerInput.address,
      notes: customerInput.notes,
      createdAt: todayISO(),
      visitDays: customerInput.visitDays,
    };

    const newCustomers = [newCustomer, ...data.customers];
    let newTransactions = [...data.transactions];

    if (customerInput.initialDebt && customerInput.initialDebt > 0) {
      const initGeneralTx: Transaction = {
        id: generateUID(),
        customerId: newCustId,
        type: "general_debt",
        amount: customerInput.initialDebt,
        date: todayISO(),
        category: "general_debt",
        note: "قەرزی کۆنی پێشوو",
        createdByUserId: activeUser.id,
        createdByName: activeUser.name,
        createdAt: new Date().toISOString(),
      };
      newTransactions = [initGeneralTx, ...newTransactions];
    }

    // Save name into savedItems array for autocomplete
    const currentSaved = data.savedItems || [];
    const updatedSaved = currentSaved.includes(customerInput.name)
      ? currentSaved
      : [...currentSaved, customerInput.name];

    const updated = {
      ...data,
      customers: newCustomers,
      transactions: newTransactions,
      savedItems: updatedSaved,
      customerIdConfig: updatedConfig,
    };
    updateData(updated);
    setActiveTab("daily_debt");
    return newCustomer;
  };

  // Update Existing Customer
  const handleUpdateCustomer = (updatedCustomer: Customer) => {
    const updatedCustomers = data.customers.map((c) =>
      c.id === updatedCustomer.id ? updatedCustomer : c
    );
    updateData({ ...data, customers: updatedCustomers });
    if (selectedCustomer && selectedCustomer.id === updatedCustomer.id) {
      setSelectedCustomer(updatedCustomer);
    }
  };

  // Add Transaction (General Debt, Daily Debt, Daily Receivable, or Payment)
  const handleAddTransaction = (txInput: {
    customerId: string;
    type: TransactionType;
    amount: number;
    date: string;
    category?: any;
    note?: string;
  }) => {
    const newTx: Transaction = {
      id: generateUID(),
      customerId: txInput.customerId,
      type: txInput.type,
      amount: txInput.amount,
      date: txInput.date,
      category: txInput.category,
      note: txInput.note,
      createdByUserId: activeUser.id,
      createdByName: activeUser.name,
      createdAt: new Date().toISOString(),
    };

    if (txInput.type === "daily_debt") {
      newTx.category = txInput.category || "daily_debt";
    } else if (txInput.type === "payment" && (txInput.category === "daily_debt" || activeTab === "daily_debt")) {
      newTx.category = "daily_debt";
    }

    // Save note into savedItems array for autocomplete
    const currentSaved = data.savedItems || [];
    let updatedSaved = currentSaved;
    if (txInput.note && !currentSaved.includes(txInput.note)) {
      updatedSaved = [...currentSaved, txInput.note];
    }

    const updated = {
      ...data,
      transactions: [newTx, ...data.transactions],
      savedItems: updatedSaved,
    };
    updateData(updated);
  };

  // Soft Delete single transaction -> moves to deletedTransactions (تەنەکەی زبڵ)
  const handleDeleteTransaction = (txId: string) => {
    const txToDelete = data.transactions.find((t) => t.id === txId);
    if (!txToDelete) return;

    const cust = data.customers.find((c) => c.id === txToDelete.customerId);

    const newDeletedTxRecord: DeletedTransactionRecord = {
      transaction: txToDelete,
      customerName: cust?.name || "کڕیاری سڕاوە",
      deletedAt: new Date().toISOString(),
      deletedBy: activeUser.name,
    };

    const updated = {
      ...data,
      transactions: data.transactions.filter((t) => t.id !== txId),
      deletedTransactions: [newDeletedTxRecord, ...(data.deletedTransactions || [])],
    };
    updateData(updated);
  };

  // Soft Delete customer & ALL their transactions -> moves to deletedCustomers (تەنەکەی زبڵ)
  const handleDeleteCustomer = (customerId: string) => {
    const custToDelete = data.customers.find((c) => c.id === customerId);
    if (!custToDelete) return;

    const custTxToDelete = data.transactions.filter((t) => t.customerId === customerId);

    const newDeletedRecord: DeletedCustomerRecord = {
      customer: custToDelete,
      transactions: custTxToDelete,
      deletedAt: new Date().toISOString(),
      deletedBy: activeUser.name,
    };

    const updated = {
      ...data,
      customers: data.customers.filter((c) => c.id !== customerId),
      transactions: data.transactions.filter((t) => t.customerId !== customerId),
      deletedCustomers: [newDeletedRecord, ...(data.deletedCustomers || [])],
    };
    updateData(updated);
    setSelectedCustomer(null);
  };

  // Restore Customer along with ALL their transactions back to active list
  const handleRestoreCustomer = (customerId: string) => {
    const record = (data.deletedCustomers || []).find((dc) => dc.customer.id === customerId);
    if (!record) return;

    const updatedCustomers = data.customers.some((c) => c.id === customerId)
      ? data.customers
      : [...data.customers, record.customer];

    const existingTxIds = new Set(data.transactions.map((t) => t.id));
    const restoredTx = record.transactions.filter((t) => !existingTxIds.has(t.id));
    const updatedTransactions = [...restoredTx, ...data.transactions];

    const updatedDeletedCustomers = (data.deletedCustomers || []).filter(
      (dc) => dc.customer.id !== customerId
    );

    updateData({
      ...data,
      customers: updatedCustomers,
      transactions: updatedTransactions,
      deletedCustomers: updatedDeletedCustomers,
    });
  };

  // Restore single transaction back to active transactions
  const handleRestoreTransaction = (txId: string) => {
    const record = (data.deletedTransactions || []).find((dt) => dt.transaction.id === txId);
    if (!record) return;

    const txToRestore = record.transaction;

    let updatedCustomers = data.customers;
    let updatedDeletedCustomers = data.deletedCustomers || [];

    const custExists = data.customers.some((c) => c.id === txToRestore.customerId);
    if (!custExists) {
      const deletedCustRecord = updatedDeletedCustomers.find(
        (dc) => dc.customer.id === txToRestore.customerId
      );
      if (deletedCustRecord) {
        updatedCustomers = [...data.customers, deletedCustRecord.customer];
        updatedDeletedCustomers = updatedDeletedCustomers.filter(
          (dc) => dc.customer.id !== txToRestore.customerId
        );
      }
    }

    const updatedTransactions = [txToRestore, ...data.transactions];
    const updatedDeletedTransactions = (data.deletedTransactions || []).filter(
      (dt) => dt.transaction.id !== txId
    );

    updateData({
      ...data,
      customers: updatedCustomers,
      transactions: updatedTransactions,
      deletedCustomers: updatedDeletedCustomers,
      deletedTransactions: updatedDeletedTransactions,
    });
  };

  // Permanent Delete Customer from Trash
  const handlePermanentDeleteCustomer = (customerId: string) => {
    const updatedDeletedCustomers = (data.deletedCustomers || []).filter(
      (dc) => dc.customer.id !== customerId
    );
    updateData({
      ...data,
      deletedCustomers: updatedDeletedCustomers,
    });
  };

  // Permanent Delete Transaction from Trash
  const handlePermanentDeleteTransaction = (txId: string) => {
    const updatedDeletedTransactions = (data.deletedTransactions || []).filter(
      (dt) => dt.transaction.id !== txId
    );
    updateData({
      ...data,
      deletedTransactions: updatedDeletedTransactions,
    });
  };

  // Empty Entire Recycle Bin
  const handleEmptyRecycleBin = () => {
    updateData({
      ...data,
      deletedCustomers: [],
      deletedTransactions: [],
    });
  };

  // Restore or Reset Data
  const handleRestoreData = (newData: StoreData) => {
    updateData(newData);
  };

  // Helper to open Add Transaction modal for specific customer
  const handleOpenTransactionFor = (customerId: string, type: TransactionType) => {
    setTxPreCustomerId(customerId);
    setTxDefaultType(type);
    setIsAddTransactionOpen(true);
  };

  // Open receipt modal
  const handleOpenReceipt = (tx: Transaction, cust: Customer) => {
    setReceiptTx(tx);
    setReceiptCustomer(cust);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F5] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#008767] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-bold text-stone-600 font-display">
            چاودێری و باری دفتەری حسابی دوکان دەکەوێتە کار...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen text-stone-800 ${paperMode ? "paper-lines" : "bg-[#F8F8F5]"}`}>
      
      {/* Top Header matching exact screenshot bar */}
      <HeaderBar
        activeUser={activeUser}
        cloudUser={cloudUser}
        cloudStatus={cloudStatus}
        searchQuery={searchQuery}
        trashCount={(data.deletedCustomers?.length || 0) + (data.deletedTransactions?.length || 0)}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (q.trim() && activeTab !== "daily_debt" && activeTab !== "customers") {
            setActiveTab("daily_debt");
          }
        }}
        onExportExcel={() => setIsBackupOpen(true)}
        onPrintReport={() => handleOpenExportReport()}
        onOpenExportReport={() => handleOpenExportReport()}
        onOpenCalculator={() => {}}
        onOpenRecycleBin={() => setIsRecycleBinOpen(true)}
        onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
        onOpenUserSwitch={() => setActiveTab("user" as any)}
        onLoginGoogle={handleLoginGoogle}
        onOpenBackup={() => setIsBackupOpen(true)}
        onOpenVoiceMode={() => setIsGlobalVoiceOpen(true)}
      />

      {/* Unsaved Draft Transaction Recovery Banner */}
      {draftNotice && !isAddTransactionOpen && (
        <div className="bg-amber-900 text-amber-50 px-4 py-3 shadow-lg border-b border-amber-700/80 flex flex-wrap items-center justify-between gap-3 text-xs font-bold animate-in slide-in-from-top duration-200 z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-800 text-amber-200 flex items-center justify-center shrink-0 border border-amber-700">
              <RotateCcw className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <span className="font-extrabold text-white text-sm block">
                مامەڵەیەکی ناتەواوت هەیە، دەتەوێت بەردەوام بیت؟
              </span>
              <span className="text-[11px] text-amber-200/90 font-medium dir-rtl">
                {draftNotice.amount ? `• بڕی پارە: ${parseFloat(draftNotice.amount).toLocaleString()} د.ع ` : ""}
                {draftNotice.note ? `• وەسف: ${draftNotice.note}` : ""}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (draftNotice.customerId) setTxPreCustomerId(draftNotice.customerId);
                if (draftNotice.type) setTxDefaultType(draftNotice.type);
                setIsAddTransactionOpen(true);
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
            >
              <span>بەردەوام بە (Continue)</span>
            </button>
            <button
              onClick={() => {
                clearDraftTransaction();
                setDraftNotice(null);
              }}
              className="px-3.5 py-2 bg-amber-800 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition"
            >
              هەڵوەشاندنەوە (Discard)
            </button>
          </div>
        </div>
      )}

      {/* Main Screen Views based on Active Tab */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        
        {/* User Selection View */}
        {(activeTab as any) === "user" && (
          <UserSelectionView
            users={usersList}
            activeUser={activeUser}
            onSelectUser={handleSelectUser}
            onOpenAddUser={() => setIsAddUserOpen(true)}
            onConfirmEnter={() => setActiveTab("home")}
          />
        )}

        {/* Home / Simple Main Screen (تەنها سێ بەشە سەرەکییەکە) */}
        {activeTab === "home" && (
          <HomeLaunchpad
            onSelectTab={(tab) => setActiveTab(tab)}
            userName={activeUser.name}
          />
        )}

        {/* General Debt / Customers Section (قەرزی گشتی) - Uses identical reusable DailyDebtView */}
        {activeTab === "customers" && (
          <DailyDebtView
            customers={data.customers}
            transactions={data.transactions}
            activeUser={activeUser}
            searchQuery={searchQuery}
            overdueThresholdDays={data.overdueThresholdDays || 30}
            sectionTitle="قەرزی گشتی"
            accentColor="purple"
            defaultTxType="general_debt"
            onSelectCustomer={(c) => setSelectedCustomer(c)}
            onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
            onQuickAddDebt={(c) => handleOpenTransactionFor(c.id, "general_debt")}
            onQuickAddPayment={(c) => handleOpenTransactionFor(c.id, "payment")}
            onAddTransaction={(tx) => handleAddTransaction(tx)}
            onDeleteTransaction={handleDeleteTransaction}
            onOpenReceipt={handleOpenReceipt}
            onOpenSendReminder={handleOpenSendReminder}
            onOpenExportReport={(cId, sec) => handleOpenExportReport(cId || "all", sec || "general_debt")}
          />
        )}

        {/* Temporary Debt Section (قەرزی کاتی) - Dedicated Amber Theme View */}
        {activeTab === "daily_debt" && (
          <DailyDebtView
            customers={data.customers}
            transactions={data.transactions}
            activeUser={activeUser}
            searchQuery={searchQuery}
            overdueThresholdDays={data.overdueThresholdDays || 30}
            sectionTitle="قەرزی کاتی"
            onSelectCustomer={(c) => setSelectedCustomer(c)}
            onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
            onQuickAddDebt={(c) => handleOpenTransactionFor(c.id, "daily_debt")}
            onQuickAddPayment={(c) => handleOpenTransactionFor(c.id, "payment")}
            onAddTransaction={(tx) => handleAddTransaction(tx)}
            onDeleteTransaction={handleDeleteTransaction}
            onOpenReceipt={handleOpenReceipt}
            onOpenSendReminder={handleOpenSendReminder}
            onOpenExportReport={(cId, sec) => handleOpenExportReport(cId || "all", sec || "daily_debt")}
          />
        )}

        {/* Daily Requests Section (داواکاری ڕۆژانە) */}
        {activeTab === "daily_requests" && (
          <DailyRequestsView
            dailyRequests={data.dailyRequests || []}
            customers={data.customers}
            activeUser={activeUser}
            savedItems={data.savedItems}
            onSaveDailyRequests={handleSaveDailyRequests}
            onSaveNewSavedItem={handleSaveNewSavedItem}
          />
        )}

        {/* Reports / Stats View */}
        {(activeTab === "reports" || (activeTab as any) === "stats") && (
          <StatsView
            customers={data.customers}
            transactions={data.transactions}
            onSelectCustomer={(c) => {
              setSelectedCustomer(c);
              setActiveTab("daily_debt");
            }}
          />
        )}

        {/* Settings View */}
        {activeTab === "settings" && (
          <SettingsView
            activeUser={activeUser}
            allUsers={usersList}
            paperMode={paperMode}
            customers={data.customers}
            transactions={data.transactions}
            trashCount={(data.deletedCustomers?.length || 0) + (data.deletedTransactions?.length || 0)}
            cloudUser={cloudUser}
            cloudStatus={cloudStatus}
            overdueThresholdDays={data.overdueThresholdDays || 30}
            customerIdConfig={data.customerIdConfig || DEFAULT_CUSTOMER_ID_CONFIG}
            userSecurityConfig={activeUserConfig}
            securityLogs={securityStore.failedLogs}
            onTogglePaperMode={() => setPaperMode(!paperMode)}
            onOpenBackup={() => setIsBackupOpen(true)}
            onOpenRecycleBin={() => setIsRecycleBinOpen(true)}
            onLoginGoogle={handleLoginGoogle}
            onLogoutGoogle={handleLogoutGoogle}
            onChangeOverdueThresholdDays={handleChangeOverdueThresholdDays}
            onChangeCustomerIdConfig={handleChangeCustomerIdConfig}
            onSelectTab={(tab) => setActiveTab(tab)}
            onOpenExportReport={(cId, sec) => handleOpenExportReport(cId || "all", sec || "all")}
            onUpdateUserSecurityConfig={handleUpdateUserSecurityConfig}
            onLockAppNow={() => setIsAppLocked(true)}
          />
        )}

      </main>

      {/* Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenQuickRecord={() => setIsAddTransactionOpen(true)}
      />

      {/* Customer Detailed Statement Modal */}
      <CustomerDetailModal
        customer={selectedCustomer}
        transactions={data.transactions}
        deletedTransactions={data.deletedTransactions}
        allCustomers={data.customers}
        deletedCustomers={data.deletedCustomers}
        activeUser={activeUser}
        overdueThresholdDays={data.overdueThresholdDays || 30}
        onClose={() => setSelectedCustomer(null)}
        onOpenAddTransaction={(cId, type) => handleOpenTransactionFor(cId, type)}
        onDeleteTransaction={handleDeleteTransaction}
        onRestoreTransaction={handleRestoreTransaction}
        onDeleteCustomer={handleDeleteCustomer}
        onOpenReceipt={handleOpenReceipt}
        onOpenSendReminder={handleOpenSendReminder}
        onOpenExportReport={(cId) => handleOpenExportReport(cId || selectedCustomer?.id || "all")}
        onUpdateCustomer={handleUpdateCustomer}
      />

      {/* Add New Customer Modal */}
      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        customers={data.customers}
        deletedCustomers={data.deletedCustomers}
        customerIdConfig={data.customerIdConfig}
        activeUser={activeUser}
        savedItems={data.savedItems}
        onClose={() => setIsAddCustomerOpen(false)}
        onAddCustomer={handleAddCustomer}
      />

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddTransactionOpen}
        customers={data.customers}
        transactions={data.transactions}
        preSelectedCustomerId={txPreCustomerId}
        defaultType={txDefaultType}
        activeUser={activeUser}
        savedItems={data.savedItems}
        onClose={() => setIsAddTransactionOpen(false)}
        onAddTransaction={handleAddTransaction}
        onAddCustomer={handleAddCustomer}
      />

      {/* Add New User Modal */}
      <AddUserModal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        onAddUser={handleAddUser}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        transaction={receiptTx}
        customer={receiptCustomer}
        allTransactions={data.transactions}
        onClose={() => {
          setReceiptTx(null);
          setReceiptCustomer(null);
        }}
      />

      {/* Backup & Import Modal */}
      <BackupModal
        isOpen={isBackupOpen}
        data={data}
        cloudUser={cloudUser}
        cloudStatus={cloudStatus}
        onClose={() => setIsBackupOpen(false)}
        onRestoreData={handleRestoreData}
        onLoginGoogle={handleLoginGoogle}
        onLogoutGoogle={handleLogoutGoogle}
        onForceCloudSync={handleForceCloudSync}
      />

      {/* Export & Print Report Modal */}
      <ExportReportModal
        isOpen={isExportModalOpen}
        customers={data.customers}
        transactions={data.transactions}
        initialCustomerId={exportCustomerId}
        initialSectionType={exportSectionType}
        onClose={() => setIsExportModalOpen(false)}
      />

      {/* Send Reminder Modal (ناردنی بیرخستنەوە) */}
      <SendReminderModal
        customer={reminderTarget?.customer || null}
        balance={reminderTarget?.balance || 0}
        overdueDays={reminderTarget?.overdueDays || 0}
        onClose={() => setReminderTarget(null)}
      />

      {/* Recycle Bin Modal (تەنەکەی زبڵ) */}
      <RecycleBinModal
        isOpen={isRecycleBinOpen}
        deletedCustomers={data.deletedCustomers}
        deletedTransactions={data.deletedTransactions}
        onClose={() => setIsRecycleBinOpen(false)}
        onRestoreCustomer={handleRestoreCustomer}
        onRestoreTransaction={handleRestoreTransaction}
        onPermanentDeleteCustomer={handlePermanentDeleteCustomer}
        onPermanentDeleteTransaction={handlePermanentDeleteTransaction}
        onEmptyRecycleBin={handleEmptyRecycleBin}
      />

      {/* Floating Undo Toast Banner */}
      {showUndoToast && undoHistory.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-auto z-40 bg-stone-900 text-white p-3.5 rounded-2xl shadow-2xl border border-stone-700 flex items-center justify-between gap-4 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-xs font-bold font-display">گۆڕانکاری ئەنجامدرا</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              className="px-3 py-1.5 bg-[#008767] hover:bg-[#007256] text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
            >
              ↩️ گەڕانەوە (Undo)
            </button>
            <button
              onClick={() => setShowUndoToast(false)}
              className="text-stone-400 hover:text-white text-xs px-1.5 py-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Global Voice Mode Modal */}
      <VoiceModeModal
        isOpen={isGlobalVoiceOpen}
        onClose={() => setIsGlobalVoiceOpen(false)}
        customers={data.customers}
        sectionTitle={
          activeTab === "daily_requests"
            ? "داواکاری ڕۆژانە"
            : "قەرزی کاتی"
        }
        onApplyVoiceInput={({ transcript, matchedCustomer, extractedAmount, transactionType, customerNotFound, spokenCustomerQuery }) => {
          if (matchedCustomer && extractedAmount && transactionType) {
            let finalTxType: TransactionType = transactionType;
            if (transactionType === "debt") {
              if (activeTab === "daily_requests") finalTxType = "daily_receivable";
              else finalTxType = "daily_debt";
            } else if (transactionType === "payment") {
              finalTxType = "payment";
            }

            handleAddTransaction({
              customerId: matchedCustomer.id,
              type: finalTxType,
              amount: extractedAmount,
              date: todayISO(),
              note: transcript || "تۆمارکراو لە ڕێگەی دەنگەوە",
            });

            setSelectedCustomer(matchedCustomer);
          } else if (matchedCustomer) {
            setSelectedCustomer(matchedCustomer);
            setSearchQuery(matchedCustomer.name);
          } else if (customerNotFound) {
            alert(`⚠️ کڕیارێک بە ناوی (${spokenCustomerQuery || "دەنگەکە"}) لە داتابەیسدا نەدۆزرایەوە!\nهیچ مامەڵەیەک ساڤ نەکرا.`);
            if (transcript) setSearchQuery(transcript);
          } else if (transcript) {
            setSearchQuery(transcript);
          }
        }}
        initialPrompt="دەق، ناوی کڕیار، یان داواکارییەکەت بە دەنگ بڵێ..."
      />

    </div>
  );
}
