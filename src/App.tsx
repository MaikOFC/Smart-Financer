import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Wallet,
  Calendar,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  FileSpreadsheet,
  LineChart,
  BrainCircuit,
  PiggyBank,
  Download,
  Upload,
  LogOut,
  User as UserIcon,
  Database,
  ChevronLeft,
  ChevronRight,
  Settings,
  Crown,
  Lock,
  MoreVertical,
  SlidersHorizontal,
  Layers,
  Table2,
  TrendingDown,
  TrendingUp,
  PlusCircle,
  ArrowUpCircle,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Menu,
  Eye,
  EyeOff,
} from "lucide-react";
import { Transaction } from "./types";
import { INITIAL_TRANSACTIONS, INITIAL_BUDGETS } from "./initialData";
import { processImportFile } from "./utils/fileParser";
import MetricCards from "./components/MetricCards";
import TransactionTable from "./components/TransactionTable";
import FinanceCharts from "./components/FinanceCharts";
import AccountsBalanceCard from "./components/AccountsBalanceCard";
import SpreadsheetUpload from "./components/SpreadsheetUpload";
import AuthScreen from "./components/AuthScreen";
import AddTransactionModal from "./components/AddTransactionModal";
import AdminSettingsModal from "./components/AdminSettingsModal";
import WelcomeOnboardingModal from "./components/WelcomeOnboardingModal";
import UserMenuDrawer from "./components/UserMenuDrawer";
import FocusedSectionModal from "./components/FocusedSectionModal";
import HomeSectionTabs, { HomeSectionTab } from "./components/HomeSectionTabs";
import BottomNavigationDock, { AppNavTab } from "./components/BottomNavigationDock";
import SharedReceiptModal from "./components/SharedReceiptModal";
import { getPendingSharedPayloads, SharedPayloadItem } from "./utils/shareTargetStorage";
import { getMonthlyInstallmentsTotal, getActiveInstallmentsForMonth, getRemainingInstallments } from "./utils/installmentUtils";
import { isUserAdmin, ADMIN_EMAIL, ADMIN_USERNAME } from "./lib/admin";
import { ThemeMode, getStoredThemeMode, saveThemeMode, applyTheme } from "./lib/theme";
import { checkServerVersion, forceReloadApp, CURRENT_CLIENT_VERSION } from "./lib/updateManager";
import {
  isSupabaseConfigured,
  getSupabaseTransactions,
  addSupabaseTransaction,
  addSupabaseTransactionsBatch,
  updateSupabaseTransaction,
  deleteSupabaseTransaction,
  deleteSupabaseTransactionsBatch,
  getSupabaseBudgets,
  setSupabaseBudget,
  getUserDefaultSalary,
  updateUserDefaultSalary,
  signOutSupabase,
  seedUserIfNeeded,
  getSupabaseCategories,
  addSupabaseCategory,
  deleteSupabaseCategory,
} from "./lib/supabaseService";
import { supabase } from "./lib/supabase";

export default function App() {
  // Authentication states
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("finances_token"));
  const [user, setUser] = useState<{ id: string; name: string; email: string; defaultSalary?: number } | null>(() => {
    const saved = localStorage.getItem("finances_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [defaultSalary, setDefaultSalary] = useState<number>(() => {
    const saved = localStorage.getItem("finances_user");
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u.defaultSalary && typeof u.defaultSalary === "number") return u.defaultSalary;
      } catch {}
    }
    return 2500;
  });

  // Client states loaded from the database
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<string[]>([]);
  
  const [dataLoading, setDataLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });
  const [slideDirection, setSlideDirection] = useState<number>(1);

  const changeMonth = (newMonth: string) => {
    if (!newMonth || newMonth === selectedMonth) return;
    const dir = newMonth > selectedMonth ? 1 : -1;
    setSlideDirection(dir);
    setSelectedMonth(newMonth);
  };
  const [supabaseUserId, setSupabaseUserId] = useState<string>(() => {
    return localStorage.getItem("supabase_user_id") || "1703bc04-af6d-4bfa-9d6f-422fa3b077a6";
  });

  // AI Advisor state
  const [advisorQuery, setAdvisorQuery] = useState("");
  const [advisorResponse, setAdvisorResponse] = useState<string | null>(null);
  const [advisorLoading, setAdvisorLoading] = useState(false);

  // Add Transaction Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalSection, setAddModalSection] = useState<"left" | "right" | "bottom_left">("left");

  // Shared Receipt state (Web Share Target / PWA / Nubank / Bancos)
  const [sharedPayload, setSharedPayload] = useState<SharedPayloadItem | null>(null);
  const [isSharedModalOpen, setIsSharedModalOpen] = useState(false);

  // Auto-detect receipts shared to SmartFin via Android Share menu (PWA / APK)
  useEffect(() => {
    const checkShares = async () => {
      try {
        const items = await getPendingSharedPayloads();
        if (items && items.length > 0) {
          setSharedPayload(items[0]);
          setIsSharedModalOpen(true);
        }
      } catch (err) {
        console.warn("Erro ao ler comprovantes compartilhados:", err);
      }
    };

    checkShares();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkShares();
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", checkShares);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", checkShares);
    };
  }, []);

  const handleSimulateNubankReceipt = () => {
    const today = new Date().toISOString().split("T")[0];
    const sampleItem: SharedPayloadItem = {
      id: "simulated_" + Date.now(),
      timestamp: Date.now(),
      title: "Comprovante de transferência Pix",
      text: `Comprovante de transferência Pix realizada com sucesso.\nValor: R$ 145,90\nPara: Restaurante e Pizzaria Bella Itália\nData: ${today}\nInstituição: Nu Pagamentos S.A. (Nubank)\nID da Transação: E182361202609151230456`,
      url: "",
      files: [],
    };
    setSharedPayload(sampleItem);
    setIsSharedModalOpen(true);
  };

  // Admin / Settings Modal state
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminModalMode, setAdminModalMode] = useState<"salary" | "admin">("salary");

  const handleOpenSettingsModal = (mode: "salary" | "admin" = "salary") => {
    setAdminModalMode(mode);
    setIsAdminModalOpen(true);
  };

  // Welcome / Onboarding Modal state (Triggered right after registration)
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);

  // Mobile & Global User Menu Drawer (3 pontinhos)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Modo de Visualização: "compact" (Modo 1: Focado/Cards Interativos) vs "full" (Modo 2: Padrão/Planilha Aberta)
  const [viewMode, setViewMode] = useState<"compact" | "full">(() => {
    const saved = localStorage.getItem("smartfinancer_view_mode");
    return saved === "compact" || saved === "full" ? saved : "compact";
  });

  const handleSetViewMode = (mode: "compact" | "full") => {
    setViewMode(mode);
    localStorage.setItem("smartfinancer_view_mode", mode);
  };

  // Modo de Aparência e Tema: "system" (Padrão do Celular), "dark" (Escuro) ou "light" (Claro)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getStoredThemeMode());

  useEffect(() => {
    applyTheme(themeMode);

    if (themeMode === "system" && typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleMediaChange = () => {
        applyTheme("system");
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", handleMediaChange);
        return () => mediaQuery.removeEventListener("change", handleMediaChange);
      } else if ((mediaQuery as any).addListener) {
        (mediaQuery as any).addListener(handleMediaChange);
        return () => (mediaQuery as any).removeListener(handleMediaChange);
      }
    }
  }, [themeMode]);

  const handleSetThemeMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    saveThemeMode(mode);
  };

  // Verificação de Atualização em Segundo Plano (OTA)
  const [pendingUpdateVersion, setPendingUpdateVersion] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkServerVersion().then((res) => {
        if (res.hasUpdate) {
          setPendingUpdateVersion(res.serverVersion);
        }
      }).catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Aba / Tela Principal Ativa (Início / Despesas / Metas / Parcelas)
  const [currentNavTab, setCurrentNavTab] = useState<AppNavTab>("home");

  // Modal de Seção Focada (Legado / fallback se necessário)
  const [isFocusedSectionOpen, setIsFocusedSectionOpen] = useState(false);
  const [focusedSectionType, setFocusedSectionType] = useState<"expenses" | "planning" | "installments">("expenses");

  // Gesto de Arrastar / Deslizar (Swipe) para trocar de mês na Tela Inicial
  const touchStartXRef = React.useRef<number | null>(null);
  const touchStartYRef = React.useRef<number | null>(null);
  const touchStartTimeRef = React.useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Não intercepta se houver modais abertos
    if (isAddModalOpen || isAdminModalOpen || isWelcomeModalOpen || isUserMenuOpen || isFocusedSectionOpen) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    touchStartTimeRef.current = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = endX - touchStartXRef.current;
    const diffY = endY - touchStartYRef.current;
    const timeElapsed = Date.now() - touchStartTimeRef.current;

    // Garante que o movimento horizontal seja preponderante sobre a rolagem vertical
    const isHorizontalDominant = Math.abs(diffX) > Math.abs(diffY) * 1.25;
    const isSignificantDistance = Math.abs(diffX) > 40;

    if (isHorizontalDominant && isSignificantDistance && timeElapsed < 800) {
      if (diffX > 0) {
        // Arrasta da esquerda para a direita (dedo vai para a direita) -> Mês anterior
        handlePrevMonth();
      } else {
        // Arrasta da direita para a esquerda (dedo vai para a esquerda) -> Mês subsequente
        handleNextMonth();
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const handleOpenExpensesModal = () => {
    setCurrentNavTab("expenses");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenPlanningModal = (tab: "planning" | "installments" = "planning") => {
    setCurrentNavTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Auth Success Handler
  const handleAuthSuccess = (
    newToken: string,
    newUser: { id: string; name: string; email: string; defaultSalary?: number },
    isNewRegistration?: boolean
  ) => {
    localStorage.setItem("finances_token", newToken);
    localStorage.setItem("finances_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    if (newUser.defaultSalary && typeof newUser.defaultSalary === "number") {
      setDefaultSalary(newUser.defaultSalary);
    }
    if (isNewRegistration) {
      setIsWelcomeModalOpen(true);
    }
  };

  // Synchronize Supabase configurations from backend server dynamically on mount
  useEffect(() => {
    const syncConfig = async () => {
      try {
        const res = await fetch("/api/config");
        if (!res.ok) return;
        const config = await res.json();
        
        const cleanUrl = (url: string) => {
          let cleaned = (url || "").trim();
          if (cleaned.endsWith("/rest/v1/")) {
            cleaned = cleaned.slice(0, -9);
          } else if (cleaned.endsWith("/rest/v1")) {
            cleaned = cleaned.slice(0, -8);
          }
          return cleaned;
        };

        const currentUrl = cleanUrl(localStorage.getItem("VITE_SUPABASE_URL") || import.meta.env.VITE_SUPABASE_URL || "");
        const currentKey = (localStorage.getItem("VITE_SUPABASE_ANON_KEY") || import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
        
        const newUrl = cleanUrl(config.supabaseUrl);
        const newKey = (config.supabaseKey || "").trim();
        
        if (newUrl && newKey && (currentUrl !== newUrl || currentKey !== newKey)) {
          console.log("Configuração do Supabase atualizada pelo servidor. Sincronizando e recarregando...");
          localStorage.setItem("VITE_SUPABASE_URL", newUrl);
          localStorage.setItem("VITE_SUPABASE_ANON_KEY", newKey);
          
          const { updateSupabaseClient } = await import("./lib/supabase");
          updateSupabaseClient(newUrl, newKey);
        }
      } catch (err) {
        console.error("Erro ao sincronizar configurações do Supabase:", err);
      }
    };
    
    syncConfig();
  }, []);

  // Escuta alterações de estado de autenticação do Supabase para manter sessão sincronizada automaticamente
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    // Busca a sessão inicial para auto-login se já estiver logado
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const userObj = {
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Usuário",
          email: session.user.email || "",
        };
        const currentToken = localStorage.getItem("finances_token");
        if (currentToken !== session.access_token) {
          localStorage.setItem("finances_token", session.access_token);
          localStorage.setItem("finances_user", JSON.stringify(userObj));
          setToken(session.access_token);
          setUser(userObj);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Quando registrar ou logar, executa o seed se necessário para garantir tabelas preenchidas
        try {
          await seedUserIfNeeded(session.user.id);
        } catch (e) {
          console.error("Erro ao rodar seed pós alteração de auth:", e);
        }

        const userObj = {
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Usuário",
          email: session.user.email || "",
        };
        
        const currentToken = localStorage.getItem("finances_token");
        if (currentToken !== session.access_token) {
          localStorage.setItem("finances_token", session.access_token);
          localStorage.setItem("finances_user", JSON.stringify(userObj));
          setToken(session.access_token);
          setUser(userObj);
        }
      } else if (event === "SIGNED_OUT") {
        localStorage.removeItem("finances_token");
        localStorage.removeItem("finances_user");
        setToken(null);
        setUser(null);
        setTransactions([]);
        setBudgets({});
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const isDemoUser = user?.email === "miqueias@demo.com";
  const supabaseActive = isSupabaseConfigured() && !isDemoUser;

  // Logout Handler
  const handleLogout = async () => {
    if (token) {
      try {
        if (supabaseActive) {
          await signOutSupabase();
        } else if (!isDemoUser) {
          await fetch("/api/auth/logout", {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
          });
        }
      } catch (err) {
        console.error("Erro ao efetuar logout:", err);
      }
    }
    localStorage.removeItem("finances_token");
    localStorage.removeItem("finances_user");
    setToken(null);
    setUser(null);
    setTransactions([]);
    setBudgets({});
    setAdvisorResponse(null);
  };

  // Fetch transactions and budgets from server when token is active
  useEffect(() => {
    if (!token || !user) return;

    const fetchData = async () => {
      setDataLoading(true);
      setFetchError(null);
      try {
        let loadedTransactions: Transaction[] = [];

        if (isDemoUser) {
          // --- LOCAL STORAGE PERSISTENCE FOR DEMO USER ---
          const savedTransactions = localStorage.getItem("demo_transactions");
          const savedBudgets = localStorage.getItem("demo_budgets");
          const savedCategories = localStorage.getItem("demo_categories");
          const savedSalary = localStorage.getItem("demo_default_salary");

          if (savedSalary) {
            setDefaultSalary(parseFloat(savedSalary));
          }

          if (savedTransactions) {
            loadedTransactions = JSON.parse(savedTransactions);
          } else {
            // First time demo user: initialize with default data
            loadedTransactions = INITIAL_TRANSACTIONS;
            localStorage.setItem("demo_transactions", JSON.stringify(INITIAL_TRANSACTIONS));
          }
          setTransactions(loadedTransactions);

          if (savedBudgets) {
            setBudgets(JSON.parse(savedBudgets));
          } else {
            setBudgets(INITIAL_BUDGETS);
            localStorage.setItem("demo_budgets", JSON.stringify(INITIAL_BUDGETS));
          }

          if (savedCategories) {
            setCategories(JSON.parse(savedCategories));
          } else {
            const defaultCats = ["Moradia", "Alimentação", "Transporte", "Lazer", "Tecnologia", "Saúde", "Família", "Outros"];
            setCategories(defaultCats);
            localStorage.setItem("demo_categories", JSON.stringify(defaultCats));
          }
        } else if (supabaseActive) {
          // --- FETCH DIRECT FROM SUPABASE ---
          const tList = await getSupabaseTransactions(user.id);
          const bMap = await getSupabaseBudgets(user.id);
          const cList = await getSupabaseCategories(user.id);
          const sal = await getUserDefaultSalary(user.id);
          if (sal) {
            setDefaultSalary(sal);
          }
          loadedTransactions = tList;
          setTransactions(tList);
          setBudgets(bMap);
          setCategories(cList.length > 0 ? cList : ["Moradia", "Alimentação", "Transporte", "Lazer", "Tecnologia", "Saúde", "Família", "Outros"]);
        } else {
          // --- FETCH FROM LOCAL EXPRESS SERVER ---
          const tRes = await fetch("/api/transactions", {
            headers: { "Authorization": `Bearer ${token}` },
          });
          if (tRes.status === 401) {
            handleLogout();
            return;
          }
          const tData = await tRes.json();
          
          const bRes = await fetch("/api/budgets", {
            headers: { "Authorization": `Bearer ${token}` },
          });
          const bData = await bRes.json();

          if (user.defaultSalary) {
            setDefaultSalary(user.defaultSalary);
          }

          loadedTransactions = tData.transactions || [];
          setTransactions(loadedTransactions);
          setBudgets(bData.budgets || {});
          setCategories(["Moradia", "Alimentação", "Transporte", "Lazer", "Tecnologia", "Saúde", "Família", "Outros"]);
        }

        // Auto-select latest month with data if current selected month is empty
        if (loadedTransactions.length > 0) {
          setSelectedMonth((current) => {
            const hasInCurrent = loadedTransactions.some(
              (t) => t.date && t.date.startsWith(current)
            );
            if (!hasInCurrent) {
              const allDates = loadedTransactions
                .map((t) => t.date?.slice(0, 7))
                .filter((m): m is string => Boolean(m && m.length === 7))
                .sort();
              if (allDates.length > 0) {
                return allDates[allDates.length - 1];
              }
            }
            return current;
          });
        }
      } catch (err: any) {
        console.error("Erro ao buscar dados:", err);
        setFetchError(err.message || String(err));
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [token, user]);

  // Handle active budget setting for the current selected month
  const activeBudget = budgets[selectedMonth] !== undefined ? budgets[selectedMonth] : defaultSalary;

  const handleUpdateDefaultSalary = async (newSalary: number, applyToFutureMonths: boolean, fromMonth: string) => {
    setDefaultSalary(newSalary);

    if (user) {
      const updatedUser = { ...user, defaultSalary: newSalary };
      setUser(updatedUser);
      localStorage.setItem("finances_user", JSON.stringify(updatedUser));
    }

    let newBudgetsMap: Record<string, number> = { ...budgets };
    if (applyToFutureMonths) {
      const [yearStr, monthStr] = fromMonth.split("-");
      const baseYear = parseInt(yearStr, 10);
      const baseMonth = parseInt(monthStr, 10);

      for (let i = 0; i <= 12; i++) {
        const d = new Date(baseYear, baseMonth - 1 + i, 1);
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        newBudgetsMap[mKey] = newSalary;
      }
      setBudgets(newBudgetsMap);
    }

    if (!token || !user) return;

    try {
      if (isDemoUser) {
        localStorage.setItem("demo_default_salary", String(newSalary));
        if (applyToFutureMonths) {
          localStorage.setItem("demo_budgets", JSON.stringify(newBudgetsMap));
        }
      } else if (supabaseActive) {
        const updatedMap = await updateUserDefaultSalary(user.id, newSalary, applyToFutureMonths ? fromMonth : undefined);
        if (applyToFutureMonths) {
          setBudgets((prev) => ({ ...prev, ...updatedMap }));
        }
      } else {
        const res = await fetch("/api/user/salary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ salary: newSalary, fromMonth: applyToFutureMonths ? fromMonth : undefined }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.updatedBudgets) {
            setBudgets((prev) => ({ ...prev, ...data.updatedBudgets }));
          }
        }
      }
    } catch (e) {
      console.error("Erro ao atualizar salário:", e);
    }
  };

  const handleSetBudget = async (val: number) => {
    // Optimistic update
    setBudgets((prev) => ({
      ...prev,
      [selectedMonth]: val,
    }));

    if (!token || !user) return;
    try {
      if (isDemoUser) {
        const updatedBudgets = {
          ...budgets,
          [selectedMonth]: val,
        };
        localStorage.setItem("demo_budgets", JSON.stringify(updatedBudgets));
      } else if (supabaseActive) {
        await setSupabaseBudget(user.id, selectedMonth, val);
      } else {
        const response = await fetch("/api/budgets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ month: selectedMonth, amount: val }),
        });
        if (!response.ok) {
          throw new Error("Erro ao salvar orçamento.");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isLeftSec = (sec: string) => sec === "left" || sec === "esquerda" || sec === "despesas";
  const isRightSec = (sec: string) => sec === "right" || sec === "direito" || sec === "direita" || sec === "planejamento";
  const isBottomSec = (sec: string) => sec === "bottom_left" || sec === "bottom" || sec === "parcelas" || sec === "devedores" || sec === "recebiveis";

  // Calculations for active filtered month
  const currentMonthTransactions = transactions.filter(
    (t) => !!t.date && t.date.startsWith(selectedMonth) && !isBottomSec(t.tableSection)
  );

  // Despesas diretas do mês corrente (contas de consumo, etc.)
  const directLeftExpensesTotal = currentMonthTransactions
    .filter((t) => isLeftSec(t.tableSection))
    .reduce((acc, t) => {
      if (t.isDiscount) return acc - t.amount;
      return acc + t.amount;
    }, 0);

  // Valor total das parcelas ativas devidas no mês selecionado
  const monthlyInstallmentsTotal = getMonthlyInstallmentsTotal(transactions, selectedMonth);

  // Total de gastos do mês = contas mensais diretas + parcelas ativas do mês
  const leftExpensesTotal = directLeftExpensesTotal + monthlyInstallmentsTotal;

  // Right total (Planejamento Futuro / Compras Futuras - visível em todas as datas)
  const rightExpensesTotal = transactions
    .filter((t) => isRightSec(t.tableSection))
    .reduce((acc, t) => acc + t.amount, 0);

  // Active installments for selected month
  const activeInstallmentsThisMonth = getActiveInstallmentsForMonth(transactions, selectedMonth);

  // Bottom left total remaining balance (sum of each active installment value * remaining installments in selected month)
  const bottomIncomesTotal = activeInstallmentsThisMonth
    .reduce((acc, t) => {
      const remainingCount = getRemainingInstallments(t, selectedMonth);
      return acc + (t.amount * remainingCount);
    }, 0);

  // Sobra = Orçamento - Gastos totais do mês (contas + parcelas ativas)
  const sobra = activeBudget - leftExpensesTotal;

  // Contagens para a barra de abas inferior
  const homeExpensesCount =
    currentMonthTransactions.filter((t) => isLeftSec(t.tableSection)).length +
    activeInstallmentsThisMonth.length;
  const homePlanningCount = transactions.filter((t) => isRightSec(t.tableSection)).length;
  const homeInstallmentsCount = activeInstallmentsThisMonth.length;

  // Add a new transaction (called from the AddTransactionModal)
  const handleAddTransaction = async (newTransaction: Omit<Transaction, "id">) => {
    if (!token || !user) return;

    // Strict duplicate check to ensure no duplicates can be inserted
    const isDup = transactions.some((t) => {
      if (t.tableSection !== newTransaction.tableSection) return false;
      if (newTransaction.tableSection === "left") {
        const matchesMonth = !t.date || t.date.startsWith(selectedMonth);
        if (!matchesMonth) return false;
      }
      return t.description.trim().toLowerCase() === newTransaction.description.trim().toLowerCase();
    });

    if (isDup) {
      console.warn("Tentativa de adicionar item duplicado bloqueada:", newTransaction.description);
      return;
    }

    try {
      if (isDemoUser) {
        const created: Transaction = {
          ...newTransaction,
          id: `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        } as Transaction;
        const updated = [...transactions, created];
        setTransactions(updated);
        localStorage.setItem("demo_transactions", JSON.stringify(updated));
      } else if (supabaseActive) {
        const created = await addSupabaseTransaction(user.id, newTransaction);
        setTransactions((prev) => [...prev, created]);
      } else {
        const response = await fetch("/api/transactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(newTransaction),
        });
        const data = await response.json();
        if (!response.ok || data.error) {
          throw new Error(data.error || "Erro ao adicionar transação.");
        }
        setTransactions((prev) => [...prev, data.transaction]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add a new category dynamically
  const handleAddCategory = async (newCatName: string): Promise<string> => {
    const trimmed = newCatName.trim();
    if (!trimmed) return "Outros";

    // Evitar duplicados locais
    if (categories.includes(trimmed)) {
      return trimmed;
    }

    try {
      if (isDemoUser) {
        const updated = [...categories, trimmed];
        setCategories(updated);
        localStorage.setItem("demo_categories", JSON.stringify(updated));
        return trimmed;
      } else if (supabaseActive) {
        if (!user) return trimmed;
        const inserted = await addSupabaseCategory(user.id, trimmed);
        setCategories((prev) => [...prev, inserted]);
        return inserted;
      } else {
        // Fallback local express
        setCategories((prev) => [...prev, trimmed]);
        return trimmed;
      }
    } catch (err) {
      console.error("Erro ao adicionar categoria:", err);
      // Fallback local
      setCategories((prev) => [...prev, trimmed]);
      return trimmed;
    }
  };

  // Update transaction row
  const handleUpdateTransaction = async (id: string, updatedFields: Partial<Transaction>) => {
    // Optimistic update
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updatedFields } : t))
    );

    if (!token || !user) return;
    try {
      if (isDemoUser) {
        const updated = transactions.map((t) => (t.id === id ? { ...t, ...updatedFields } : t));
        localStorage.setItem("demo_transactions", JSON.stringify(updated));
      } else if (supabaseActive) {
        await updateSupabaseTransaction(user.id, id, updatedFields);
      } else {
        const response = await fetch(`/api/transactions/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(updatedFields),
        });
        if (!response.ok) {
          throw new Error("Erro ao atualizar transação no servidor.");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete transaction row
  const handleDeleteTransaction = async (id: string) => {
    // Functional state update ensuring latest reference is saved to storage
    let remaining: Transaction[] = [];
    setTransactions((prev) => {
      remaining = prev.filter((t) => t.id !== id);
      return remaining;
    });

    if (!token || !user) return;
    try {
      if (isDemoUser) {
        localStorage.setItem("demo_transactions", JSON.stringify(remaining));
      } else if (supabaseActive) {
        await deleteSupabaseTransaction(user.id, id);
      } else {
        const response = await fetch(`/api/transactions/${id}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error("Erro ao excluir transação no servidor.");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // One-click permanent deduplication for a table section
  const handleDeduplicateSection = async (section: "left" | "right" | "bottom_left") => {
    const filterByMonth = (t: Transaction) => {
      if (t.tableSection === "bottom_left" || t.tableSection === "right") return true;
      return !t.date || t.date.startsWith(selectedMonth);
    };

    const sectionTxs = transactions.filter((t) => t.tableSection === section && filterByMonth(t));
    const seen = new Set<string>();
    const idsToDelete: string[] = [];

    sectionTxs.forEach((t) => {
      const key = t.description.trim().toLowerCase();
      if (seen.has(key)) {
        idsToDelete.push(t.id);
      } else {
        seen.add(key);
      }
    });

    if (idsToDelete.length === 0) return;

    const idsToDeleteSet = new Set(idsToDelete);
    const remainingTransactions = transactions.filter((t) => !idsToDeleteSet.has(t.id));

    // 1. Immediately update React state with non-duplicate transactions
    setTransactions(remainingTransactions);

    // 2. Persist definitively to storage/database so reloads stay clean
    if (!token || !user) return;

    try {
      if (isDemoUser) {
        localStorage.setItem("demo_transactions", JSON.stringify(remainingTransactions));
      } else if (supabaseActive) {
        await deleteSupabaseTransactionsBatch(user.id, idsToDelete);
      } else {
        // Express backend batch deletion
        await fetch("/api/transactions/delete-batch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ ids: idsToDelete }),
        });
      }
    } catch (err) {
      console.error("Erro ao apagar duplicatas definitivamente:", err);
    }
  };

  // Import transactions from file parsing or AI image analysis
  const handleImportTransactions = async (imported: Transaction[]) => {
    const parsedImported = imported.map((item) => ({
      description: item.description,
      amount: item.amount,
      date: item.date || `${selectedMonth}-01`,
      type: item.type,
      tableSection: item.tableSection,
      category: item.category || "Outros",
      isOrangeHighlight: !!item.isOrangeHighlight,
      isDiscount: !!item.isDiscount,
      note: item.note || "",
    }));

    if (!token || !user) return;
    try {
      if (isDemoUser) {
        const createdList = parsedImported.map((t, idx) => ({
          ...t,
          id: `demo-import-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        })) as Transaction[];
        const updated = [...transactions, ...createdList];
        setTransactions(updated);
        localStorage.setItem("demo_transactions", JSON.stringify(updated));
      } else if (supabaseActive) {
        const createdList = await addSupabaseTransactionsBatch(user.id, parsedImported);
        setTransactions((prev) => [...prev, ...createdList]);
      } else {
        const response = await fetch("/api/transactions/batch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ transactions: parsedImported }),
        });
        const data = await response.json();
        if (!response.ok || data.error) {
          throw new Error(data.error || "Erro ao importar transações.");
        }
        setTransactions((prev) => [...prev, ...(data.transactions || [])]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Importação Direta e Rápida de Arquivos (sem telas intermediárias)
  const [isImportingDirectly, setIsImportingDirectly] = useState(false);
  const [importStatusStep, setImportStatusStep] = useState<string>("");
  const [importFeedbackToast, setImportFeedbackToast] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  const handleDirectFileImport = async (file: File) => {
    setIsImportingDirectly(true);
    setImportStatusStep("Iniciando leitura do arquivo...");
    setImportFeedbackToast(null);

    try {
      const imported = await processImportFile(file, (step) => setImportStatusStep(step));
      if (!imported || imported.length === 0) {
        throw new Error("Nenhuma transação foi identificada no arquivo.");
      }
      await handleImportTransactions(imported);
      setImportFeedbackToast({
        type: "success",
        title: "Importação Concluída com Sucesso!",
        message: `${imported.length} transações foram importadas e salvas na sua planilha.`,
      });
      setTimeout(() => {
        setImportFeedbackToast(null);
      }, 5000);
    } catch (err: any) {
      console.error("Erro na importação direta:", err);
      setImportFeedbackToast({
        type: "error",
        title: "Não foi possível importar",
        message: err.message || "Erro ao ler a planilha/extrato. Verifique o formato do arquivo.",
      });
      setTimeout(() => {
        setImportFeedbackToast(null);
      }, 7000);
    } finally {
      setIsImportingDirectly(false);
      setImportStatusStep("");
    }
  };

  // Ask AI Advisor
  const handleAskAdvisor = async (customPrompt?: string) => {
    const promptToSend = customPrompt || advisorQuery;
    if (!promptToSend.trim()) return;

    if (customPrompt) {
      setAdvisorQuery(customPrompt);
    }

    setAdvisorLoading(true);
    setAdvisorResponse(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch("/api/ask-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: promptToSend,
          transactions: transactions.filter((t) => t.date.startsWith(selectedMonth)),
          budget: activeBudget,
          selectedMonth,
        }),
      });

      clearTimeout(timeoutId);
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Erro ao consultar IA.");
      }

      setAdvisorResponse(data.answer);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error(err);
      if (err.name === "AbortError") {
        setAdvisorResponse("A requisição demorou muito para responder. Por favor, tente novamente em instantes.");
      } else {
        setAdvisorResponse(`Erro ao contatar o consultor de IA: ${err.message || "Tente novamente mais tarde."}`);
      }
    } finally {
      setAdvisorLoading(false);
    }
  };

  const isAdmin = isUserAdmin(user);

  // Export data as JSON file for manual backup
  const handleExportData = () => {
    if (!isAdmin) {
      alert("Acesso restrito: A exportação de dados é permitida apenas para o usuário administrador cadastrado (miqueias2300nik).");
      return;
    }
    const dataStr = JSON.stringify({ transactions, budgets }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `controle_financeiro_backup_${user?.name.toLowerCase().replace(/\s+/g, "_")}.json`;
    link.click();
  };

  // Export active user's data as Supabase compatible CSVs
  const handleExportSupabaseCSV = (type: "transactions" | "budgets") => {
    if (!isAdmin) {
      alert("Acesso restrito: A exportação de tabelas do banco de dados é permitida apenas para o administrador (miqueias2300nik).");
      return;
    }
    const trimmedId = supabaseUserId.trim();
    if (!trimmedId) {
      const confirmUseDefault = window.confirm(
        "Aviso: Você não configurou seu User ID do Supabase.\n\n" +
        "Como a tabela do Supabase exige que cada registro pertença a um usuário real da tabela auth.users " +
        "para passar pela chave estrangeira (Foreign Key), você deve copiar seu UUID do Supabase e colar no campo verde do topo antes de exportar.\n\n" +
        "Quer exportar mesmo assim usando um ID provisório de teste?"
      );
      if (!confirmUseDefault) return;
    }

    const userId = trimmedId || user?.id || "00000000-0000-0000-0000-000000000000";
    let csvContent = "";

    if (type === "transactions") {
      const headers = [
        "user_id",
        "description",
        "amount",
        "date",
        "type",
        "table_section",
        "category",
        "is_orange_highlight",
        "is_discount",
        "note",
        "seed_key"
      ];
      const rows = transactions.map((t) => {
        const description = (t.description || "").replace(/"/g, '""');
        const amount = (t.amount || 0).toFixed(2);
        const date = t.date || "";
        const txType = t.type || "expense";
        const table_section = t.tableSection || "left";
        const category = (t.category || "Outros").replace(/"/g, '""');
        const is_orange_highlight = t.isOrangeHighlight ? "TRUE" : "FALSE";
        const is_discount = t.isDiscount ? "TRUE" : "FALSE";
        const note = (t.note || "").replace(/"/g, '""');
        // If it was a preloaded seed, keep its seed_key, else empty
        const seed_key = t.id && !t.id.startsWith("manual") && !t.id.startsWith("imported") ? t.id : "";

        return [
          userId,
          `"${description}"`,
          amount,
          date,
          txType,
          table_section,
          `"${category}"`,
          is_orange_highlight,
          is_discount,
          `"${note}"`,
          `"${seed_key}"`
        ].join(",");
      });
      csvContent = [headers.join(","), ...rows].join("\n");
    } else {
      const headers = ["user_id", "month", "amount"];
      const rows = Object.entries(budgets).map(([month, amount]) => {
        return [
          userId,
          month,
          (Number(amount) || 0).toFixed(2)
        ].join(",");
      });
      csvContent = [headers.join(","), ...rows].join("\n");
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `supabase_${type}_${user?.name.toLowerCase().replace(/\s+/g, "_")}.csv`;
    link.click();
  };

  // Clear all data to restart
  const handleResetAll = async () => {
    if (!isAdmin) {
      alert("Acesso restrito: Somente o usuário administrador cadastrado (miqueias2300nik) pode realizar o reset geral da base de dados.");
      return;
    }
    if (window.confirm("Deseja realmente redefinir todos os dados para o modelo original do print?")) {
      if (!token || !user) return;
      setDataLoading(true);
      try {
        if (isDemoUser) {
          // --- RESET LOCALLY FOR DEMO ---
          setTransactions(INITIAL_TRANSACTIONS);
          setBudgets(INITIAL_BUDGETS);
          localStorage.setItem("demo_transactions", JSON.stringify(INITIAL_TRANSACTIONS));
          localStorage.setItem("demo_budgets", JSON.stringify(INITIAL_BUDGETS));
        } else if (supabaseActive) {
          // --- RESET DIRECTLY ON SUPABASE ---
          const { supabase } = await import("./lib/supabase");
          
          // Delete user rows
          await supabase.from("transactions").delete().eq("user_id", user.id);
          await supabase.from("budgets").delete().eq("user_id", user.id);
          await supabase.from("user_seeded").delete().eq("user_id", user.id);
          
          // Run the seed again
          await seedUserIfNeeded(user.id);
          
          // Fetch fresh data
          const tList = await getSupabaseTransactions(user.id);
          const bMap = await getSupabaseBudgets(user.id);
          setTransactions(tList);
          setBudgets(bMap);
        } else {
          // --- RESET ON LOCAL SERVER ---
          const response = await fetch("/api/auth/reset", {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
          });
          const data = await response.json();
          if (!response.ok || data.error) {
            throw new Error(data.error || "Erro ao resetar dados.");
          }
          
          // Reload fresh data from server
          const tRes = await fetch("/api/transactions", {
            headers: { "Authorization": `Bearer ${token}` },
          });
          const tData = await tRes.json();
          
          const bRes = await fetch("/api/budgets", {
            headers: { "Authorization": `Bearer ${token}` },
          });
          const bData = await bRes.json();

          setTransactions(tData.transactions || []);
          setBudgets(bData.budgets || {});
        }
        
        setSelectedMonth("2026-07");
        setAdvisorResponse(null);
      } catch (err: any) {
        alert(`Erro ao redefinir dados: ${err.message}`);
      } finally {
        setDataLoading(false);
      }
    }
  };

  // Months list helper for Month/Year selection
  const MONTHS_LIST = [
    { value: "01", label: "Janeiro" },
    { value: "02", label: "Fevereiro" },
    { value: "03", label: "Março" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Maio" },
    { value: "06", label: "Junho" },
    { value: "07", label: "Julho" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const [currentYear = "2026", currentMonthNum = "07"] = (selectedMonth || "2026-07").split("-");

  const availableYears = Array.from(
    new Set([
      "2023",
      "2024",
      "2025",
      "2026",
      "2027",
      "2028",
      "2029",
      "2030",
      ...transactions.map((t) => t.date?.substring(0, 4)).filter(Boolean),
    ])
  ).sort();

  const handlePrevMonth = () => {
    const [y, m] = (selectedMonth || "2026-07").split("-").map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = String(prevDate.getMonth() + 1).padStart(2, "0");
    setSlideDirection(-1);
    setSelectedMonth(`${prevYear}-${prevMonth}`);
  };

  const handleNextMonth = () => {
    const [y, m] = (selectedMonth || "2026-07").split("-").map(Number);
    const nextDate = new Date(y, m, 1);
    const nextYear = nextDate.getFullYear();
    const nextMonth = String(nextDate.getMonth() + 1).padStart(2, "0");
    setSlideDirection(1);
    setSelectedMonth(`${nextYear}-${nextMonth}`);
  };

  if (!token || !user) {
    return <AuthScreen onSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-[max(3rem,calc(env(safe-area-inset-bottom,0px)+1.5rem))] selection:bg-indigo-500/35 selection:text-white">
      {/* HEADER PRINCIPAL */}
      <header className="bg-slate-900/80 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-50 pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-7xl mx-auto px-3 py-2 sm:px-6 sm:py-3.5 lg:px-8">
          {/* LAYOUT MOBILE (md:hidden) - LINHA ÚNICA COMPACTA ESTILO BANCO DIGITAL */}
          <div className="flex items-center justify-between gap-2 md:hidden">
            {/* CANTO ESQUERDO: Botão Menu Lateral (Ícone Hambúrguer) */}
            <button
              id="btn-mobile-menu"
              onClick={() => setIsUserMenuOpen(true)}
              className="p-2 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center active:scale-95 shrink-0"
              title="Menu & Opções da Conta"
            >
              <Menu className="w-5 h-5 text-slate-200" />
            </button>

            {/* SELETOR DE PERÍODO (MÊS E ANO) CENTRALIZADO COM CHEVRONS ESTILO SCREENSHOT */}
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                <select
                  value={currentMonthNum}
                  onChange={(e) => changeMonth(`${currentYear}-${e.target.value}`)}
                  className="bg-transparent text-xs font-black uppercase tracking-wider text-slate-100 py-1 cursor-pointer focus:outline-none"
                >
                  {MONTHS_LIST.map((m) => (
                    <option key={m.value} value={m.value} className="bg-slate-900 text-slate-200 uppercase font-sans">
                      {m.label}
                    </option>
                  ))}
                </select>

                <span className="text-xs text-slate-400 font-bold">,</span>

                <select
                  value={currentYear}
                  onChange={(e) => changeMonth(`${e.target.value}-${currentMonthNum}`)}
                  className="bg-transparent text-xs font-black font-mono text-slate-100 py-1 cursor-pointer focus:outline-none"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr} className="bg-slate-900 text-slate-200 font-sans">
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleNextMonth}
                className="p-1 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* ESPAÇADOR DIREITO PARA EQUILÍBRIO VISUAL DO SELETOR CENTRAL */}
            <div className="w-9 shrink-0 pointer-events-none" aria-hidden="true" />
          </div>

          {/* LAYOUT DESKTOP (hidden md:flex) */}
          <div className="hidden md:flex justify-between items-center gap-3.5">
            {/* LOGO & TITULO */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 shadow-sm">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight flex items-center gap-1.5 text-white">
                  Smart<span className="text-emerald-400">Financer</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                  Controle financeiro inteligente, gráficos e relatórios automatizados
                </p>
              </div>
            </div>

            {/* SELETOR DE PERÍODO NO TOPO */}
            <div className="flex items-center gap-1.5">
              <div className="hidden lg:flex items-center gap-1.5 px-2 text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Período:</span>
              </div>

              <button
                onClick={handlePrevMonth}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all cursor-pointer"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={currentMonthNum}
                onChange={(e) => changeMonth(`${currentYear}-${e.target.value}`)}
                className="bg-slate-900 border border-slate-800/80 text-xs font-bold text-slate-200 px-3 py-1.5 rounded-xl hover:border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {MONTHS_LIST.map((m) => (
                  <option key={m.value} value={m.value} className="bg-slate-900 text-slate-200">
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                value={currentYear}
                onChange={(e) => changeMonth(`${e.target.value}-${currentMonthNum}`)}
                className="bg-slate-900 border border-slate-800/80 text-xs font-bold font-mono text-slate-200 px-2.5 py-1.5 rounded-xl hover:border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr} className="bg-slate-900 text-slate-200">
                    {yr}
                  </option>
                ))}
              </select>

              <button
                onClick={handleNextMonth}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all cursor-pointer"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* BOTÃO RÁPIDO: ADICIONAR GASTO (ÍCONE GASTOS DO MÊS) */}
            <div className="flex items-center gap-2">
              <button
                id="btn-header-add-expense"
                onClick={() => {
                  setAddModalSection("left");
                  setIsAddModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 px-3 py-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-emerald-500/20 border border-emerald-400/40"
                title="Adicionar Novo Gasto do Mês"
              >
                <TrendingDown className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline">Adicionar Gasto</span>
              </button>

              {/* BOTÃO DO USUÁRIO NO DESKTOP (ABRE O MENU LATERAL / DISPENSA OS 3 PONTINHOS NO PC) */}
              <button
                id="btn-desktop-user-menu"
                onClick={() => setIsUserMenuOpen(true)}
                className={`flex items-center gap-2.5 border px-3.5 py-1.5 rounded-2xl transition-all cursor-pointer shadow-sm group ${
                  isAdmin 
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400/50"
                    : "bg-slate-950/70 border-slate-800/90 text-slate-200 hover:bg-slate-900 hover:border-indigo-500/50"
                }`}
                title="Clique para abrir o menu de opções da conta"
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                  isAdmin 
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30" 
                    : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                }`}>
                  {isAdmin ? <Crown className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] leading-none font-bold uppercase tracking-wider opacity-70">
                    {isAdmin ? "Admin Master" : "Usuário"}
                  </span>
                  <span className="text-xs font-bold leading-tight max-w-[120px] truncate" title={user.name}>{user.name}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* BANNER FLUTUANTE DE NOVA VERSÃO DISPONÍVEL (OTA UPDATE) */}
      <AnimatePresence>
        {pendingUpdateVersion && (
          <motion.aside
            aria-label="Atualização disponível"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed bottom-4 left-3 right-3 sm:bottom-auto sm:top-20 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-indigo-950/95 border border-indigo-500/50 text-white p-3.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl shrink-0">
                <ArrowUpCircle className="w-5 h-5 animate-pulse text-indigo-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">Atualização disponível (v{pendingUpdateVersion})</p>
                <p className="text-[10px] text-indigo-200">Toque para carregar as novas melhorias.</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => forceReloadApp()}
                className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-colors"
              >
                Atualizar
              </button>
              <button
                onClick={() => setPendingUpdateVersion(null)}
                className="p-1 text-indigo-300 hover:text-white cursor-pointer"
                title="Fechar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* OVERLAY DE PROCESSAMENTO DE ARQUIVO DIRETO (IA) */}
      <AnimatePresence>
        {isImportingDirectly && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Importando Planilha / Extrato</h3>
                <p className="text-xs text-purple-300/90 font-medium mt-1">
                  {importStatusStep || "Analisando comprovante e estruturando lançamentos com IA..."}
                </p>
              </div>

              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full w-2/3 animate-pulse rounded-full" />
              </div>

              <p className="text-[11px] text-slate-500">
                Aguarde alguns instantes enquanto organizamos seus dados.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOAST DE FEEDBACK DE IMPORTAÇÃO */}
      <AnimatePresence>
        {importFeedbackToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 p-4 rounded-2xl shadow-2xl backdrop-blur-md border flex items-start gap-3 ${
              importFeedbackToast.type === "success"
                ? "bg-emerald-950/95 border-emerald-500/50 text-emerald-100"
                : "bg-rose-950/95 border-rose-500/50 text-rose-100"
            }`}
          >
            <div className={`p-2 rounded-xl shrink-0 ${
              importFeedbackToast.type === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
            }`}>
              {importFeedbackToast.type === "success" ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold">{importFeedbackToast.title}</h4>
              <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">{importFeedbackToast.message}</p>
            </div>

            <button
              onClick={() => setImportFeedbackToast(null)}
              className="p-1 opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTÊINER GERAL COM GESTO DE DESLIZE DE MÊS */}
      <main
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="max-w-7xl mx-auto px-3 py-4 sm:px-6 sm:py-8 lg:px-8 pb-32 sm:pb-36"
      >
        {fetchError ? (
          <div className="max-w-3xl mx-auto my-12 bg-slate-900 border border-red-500/30 rounded-3xl p-8 shadow-2xl text-slate-200">
            <div className="flex items-center gap-4 mb-6 text-red-400">
              <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
                <Database className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-sans">Erro de Banco de Dados (Supabase)</h3>
                <p className="text-sm text-slate-400 font-medium font-sans">
                  Não foi possível comunicar ou ler os dados das tabelas do seu projeto Supabase.
                </p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-red-400 mb-6 overflow-auto max-h-40 leading-relaxed whitespace-pre-wrap">
              {fetchError}
            </div>

            {fetchError.toLowerCase().includes("relation") || fetchError.toLowerCase().includes("does not exist") || fetchError.toLowerCase().includes("undefined") ? (
              <div className="space-y-4 text-sm text-slate-300">
                <p className="font-semibold text-white">💡 Como resolver esse erro em 1 minuto:</p>
                <p>
                  As tabelas do banco de dados (como <code>transactions</code>, <code>budgets</code> e <code>user_seeded</code>) ainda não foram criadas no seu projeto do Supabase. Para criá-las automaticamente:
                </p>
                <ol className="list-decimal list-inside space-y-2.5 text-slate-400 font-sans ml-1">
                  <li>Acesse o seu <strong>Painel do Supabase</strong> em <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline hover:text-indigo-300">supabase.com</a>.</li>
                  <li>Selecione o seu projeto e vá na aba <strong>SQL Editor</strong> (ícone de prompt de comando no menu lateral esquerdo).</li>
                  <li>Clique em <strong>New Query</strong> para abrir uma folha de comandos em branco.</li>
                  <li>Abra o arquivo <strong className="text-slate-200">supabase_schema.sql</strong> do seu projeto e copie todo o seu conteúdo.</li>
                  <li>Cole o script copiado no editor SQL do Supabase e clique em <strong>Run</strong> (no canto inferior direito) para executá-lo.</li>
                  <li>Pronto! Recarregue a página do aplicativo e faça o login novamente. Seu banco de dados agora está configurado e seguro!</li>
                </ol>
              </div>
            ) : (
              <div className="space-y-4 text-sm text-slate-300">
                <p className="font-semibold text-white">💡 Dicas de Configuração:</p>
                <ul className="list-disc list-inside space-y-2.5 text-slate-400 ml-1">
                  <li>Verifique se as credenciais <strong>VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_ANON_KEY</strong> estão preenchidas corretamente no seu painel da Render ou no arquivo <code>.env</code>.</li>
                  <li>Garanta que não há aspas extras ou espaços nas variáveis.</li>
                  <li>Certifique-se de que o seu projeto do Supabase não está pausado.</li>
                </ul>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap gap-3">
              <button
                onClick={handleLogout}
                className="px-6 py-2.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 rounded-xl text-xs font-bold text-red-400 transition-all cursor-pointer"
              >
                Voltar à Tela de Login / Sair
              </button>
              <button
                onClick={() => {
                  setFetchError(null);
                  window.location.reload();
                }}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 transition-all cursor-pointer"
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        ) : dataLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <RefreshCw className="w-10 h-10 animate-spin text-indigo-500" />
            <p className="text-sm text-slate-400 font-medium font-sans">Carregando seus dados financeiros...</p>
          </div>
        ) : (
          <>
            {/* CONTEÚDO MENSAL COM ANIMAÇÃO FLUIDA DE DESLIZE */}
            <div className="overflow-hidden">
              <AnimatePresence mode="wait" custom={slideDirection} initial={false}>
                <motion.div
                  key={selectedMonth}
                  custom={slideDirection}
                  variants={{
                    enter: (dir: number) => ({
                      x: dir > 0 ? 40 : -40,
                      opacity: 0,
                    }),
                    center: {
                      x: 0,
                      opacity: 1,
                    },
                    exit: (dir: number) => ({
                      x: dir > 0 ? -40 : 40,
                      opacity: 0,
                    }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    duration: 0.22,
                    ease: [0.25, 1, 0.5, 1], // easeOutCubic (leve e 100% acelerado por GPU)
                  }}
                  className="space-y-8"
                >
                  {/* RENDERIZAÇÃO CONDICIONAL POR ABA: INÍCIO (DASHBOARD) VS TELAS SEPARADAS (DESPESAS / METAS / PARCELAS) */}
                  {currentNavTab === "home" ? (
                    <div className="space-y-8">
                      {/* RESUMOS / METRICS (INTERATIVOS) */}
                      <MetricCards
                        budget={activeBudget}
                        setBudget={handleSetBudget}
                        leftExpensesTotal={leftExpensesTotal}
                        rightExpensesTotal={rightExpensesTotal}
                        bottomIncomesTotal={bottomIncomesTotal}
                        sobra={sobra}
                        viewMode={viewMode}
                        onOpenExpensesModal={handleOpenExpensesModal}
                        onOpenPlanningModal={handleOpenPlanningModal}
                      />

                      {/* MODO PLANILHA COMPLETA (SE ESCOLHIDO) */}
                      {viewMode === "full" && (
                        <TransactionTable
                          transactions={transactions}
                          onAddTransaction={(section) => {
                            setAddModalSection(section);
                            setIsAddModalOpen(true);
                          }}
                          onUpdateTransaction={handleUpdateTransaction}
                          onDeleteTransaction={handleDeleteTransaction}
                          onDeduplicateSection={handleDeduplicateSection}
                          selectedMonth={selectedMonth}
                          categories={categories}
                          onSelectMonth={(m) => changeMonth(m)}
                        />
                      )}

                      {/* VISUALIZAÇÃO GRÁFICA / CHARTS */}
                      <FinanceCharts
                        transactions={transactions}
                        budgets={budgets}
                        selectedMonth={selectedMonth}
                        defaultSalary={defaultSalary}
                      />

                      {/* CAIXA ENQUADRAMENTO DE CONTAS E PARCELAS ATIVAS */}
                      <AccountsBalanceCard
                        transactions={transactions}
                        selectedMonth={selectedMonth}
                        budget={activeBudget}
                        onOpenPlanningModal={handleOpenPlanningModal}
                        onOpenAddModal={(sec) => {
                          setAddModalSection(sec);
                          setIsAddModalOpen(true);
                        }}
                      />
                    </div>
                  ) : (
                    /* TELA SEPARADA PARA A ABA SELECIONADA: DESPESAS, METAS OU PARCELAS */
                    <HomeSectionTabs
                      transactions={transactions}
                      selectedMonth={selectedMonth}
                      categories={categories}
                      activeTab={currentNavTab as HomeSectionTab}
                      onTabChange={(tab) => {
                        setCurrentNavTab(tab);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      onBackToHome={() => {
                        setCurrentNavTab("home");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      onAddTransaction={(section) => {
                        setAddModalSection(section);
                        setIsAddModalOpen(true);
                      }}
                      onUpdateTransaction={handleUpdateTransaction}
                      onDeleteTransaction={handleDeleteTransaction}
                      onDeduplicateSection={handleDeduplicateSection}
                      defaultSalary={defaultSalary}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

        {/* MODAL DE ADICIONAR TRANSAÇÃO */}
        <AddTransactionModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddTransaction}
          section={addModalSection}
          selectedMonth={selectedMonth}
          categories={categories}
          onAddCategory={handleAddCategory}
          existingTransactions={transactions}
        />

        {/* MODAL DE COMPROVANTE BANCÁRIO COMPARTILHADO (NUBANK / PIX / SHARE TARGET) */}
        <SharedReceiptModal
          isOpen={isSharedModalOpen}
          payload={sharedPayload}
          onClose={() => {
            setIsSharedModalOpen(false);
            setSharedPayload(null);
          }}
          onAddTransaction={(tx) => {
            handleAddTransaction(tx);
          }}
          selectedMonth={selectedMonth}
          categories={categories}
        />

        {/* MODAL DE ADMINISTRAÇÃO E CONFIGURAÇÕES */}
        <AdminSettingsModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          user={user || { id: "", name: "Usuário", email: "" }}
          defaultSalary={defaultSalary}
          onUpdateDefaultSalary={handleUpdateDefaultSalary}
          selectedMonth={selectedMonth}
          supabaseActive={supabaseActive}
          supabaseUserId={supabaseUserId}
          setSupabaseUserId={setSupabaseUserId}
          onExportJson={handleExportData}
          onExportSupabaseCSV={handleExportSupabaseCSV}
          onResetAll={handleResetAll}
          transactionsCount={transactions.length}
          budgetsCount={Object.keys(budgets).length}
          modalMode={adminModalMode}
        />

        {/* MODAL DE BOAS-VINDAS / ONBOARDING APÓS REGISTRO */}
        <WelcomeOnboardingModal
          isOpen={isWelcomeModalOpen}
          onClose={() => setIsWelcomeModalOpen(false)}
          onImportTransactions={handleImportTransactions}
          userName={user?.name || ""}
          selectedMonth={selectedMonth}
          defaultSalary={defaultSalary}
          onUpdateDefaultSalary={handleUpdateDefaultSalary}
        />

        {/* MENU LATERAL / BARRA LATERAL (3 PONTINHOS) */}
        <UserMenuDrawer
          isOpen={isUserMenuOpen}
          onClose={() => setIsUserMenuOpen(false)}
          user={user}
          isAdmin={isAdmin}
          defaultSalary={defaultSalary}
          selectedMonth={selectedMonth}
          onOpenSettings={handleOpenSettingsModal}
          onOpenAddModal={() => {
            setAddModalSection("left");
            setIsAddModalOpen(true);
          }}
          onLogout={handleLogout}
          onScrollToAi={() => {
            const el = document.getElementById("ai-consultant-section");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
          viewMode={viewMode}
          onSetViewMode={handleSetViewMode}
          themeMode={themeMode}
          onSetThemeMode={handleSetThemeMode}
          onDirectImportFile={handleDirectFileImport}
          onSimulateNubank={handleSimulateNubankReceipt}
        />

        {/* MODAL DE SEÇÃO FOCADA (GASTOS DO MÊS / PLANEJAMENTO / PARCELAS) */}
        <FocusedSectionModal
          isOpen={isFocusedSectionOpen}
          onClose={() => setIsFocusedSectionOpen(false)}
          sectionType={focusedSectionType}
          transactions={transactions}
          selectedMonth={selectedMonth}
          categories={categories}
          onAddTransaction={(section) => {
            setAddModalSection(section);
            setIsAddModalOpen(true);
          }}
          onUpdateTransaction={handleUpdateTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          onDeduplicateSection={handleDeduplicateSection}
          defaultSalary={defaultSalary}
        />

        {/* CONSULTOR DE IA FINANCEIRO */}
        <div id="ai-consultant-section" className="mt-8 sm:mt-12 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl hover:border-slate-700/60 transition-all">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
              <BrainCircuit className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Consultor Financeiro de IA</h3>
              <p className="text-xs text-slate-400 font-medium">Faça perguntas sobre seus gastos para obter conselhos personalizados de economia</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4 md:col-span-1">
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Perguntas Sugeridas:</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleAskAdvisor("Faça uma análise geral das minhas despesas deste mês e aponte as 3 maiores fontes de gastos.")}
                  className="text-left text-xs bg-slate-950/40 hover:bg-slate-950 hover:border-slate-700 p-3 rounded-xl border border-slate-800/80 transition-all text-slate-300"
                >
                  🔍 Onde estou gastando mais?
                </button>
                <button
                  onClick={() => handleAskAdvisor("Com base nas minhas tabelas e na sobra de R$ " + sobra.toFixed(2) + ", dê 4 sugestões práticas de economia de gastos.")}
                  className="text-left text-xs bg-slate-950/40 hover:bg-slate-950 hover:border-slate-700 p-3 rounded-xl border border-slate-800/80 transition-all text-slate-300"
                >
                  💡 Dicas para aumentar a sobra do mês
                </button>
                <button
                  onClick={() => handleAskAdvisor("Analise minhas compras especiais da tabela direita. O que você recomenda em termos de planejamento financeiro de eletrônicos?")}
                  className="text-left text-xs bg-slate-950/40 hover:bg-slate-950 hover:border-slate-700 p-3 rounded-xl border border-slate-800/80 transition-all text-slate-300"
                >
                  ⚙️ Analisar compras especiais (Direita)
                </button>
              </div>
            </div>

            <div className="md:col-span-2 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    id="input-ai-query"
                    type="text"
                    value={advisorQuery}
                    onChange={(e) => setAdvisorQuery(e.target.value)}
                    placeholder="Digite sua própria pergunta sobre suas finanças..."
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 w-full"
                  />
                  <button
                    id="btn-ask-ai"
                    onClick={() => handleAskAdvisor()}
                    disabled={advisorLoading || !advisorQuery.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/10 flex-shrink-0 border border-indigo-500/20"
                  >
                    Perguntar
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {advisorLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-5 bg-slate-950/40 border border-slate-800/80 rounded-2xl flex items-center justify-center gap-3"
                    >
                      <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                      <span className="text-xs text-indigo-300 font-mono">A IA Gemini está analisando suas tabelas financeiras...</span>
                    </motion.div>
                  )}

                  {advisorResponse && !advisorLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 bg-slate-950 border border-slate-800/80 rounded-2xl max-h-64 overflow-y-auto text-xs sm:text-sm leading-relaxed text-slate-300"
                    >
                      <div className="font-bold text-indigo-400 mb-2 flex items-center gap-1 text-xs uppercase tracking-wider font-sans">
                        <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" /> Resposta do Assessor Financeiro de IA:
                      </div>
                      <p className="whitespace-pre-line font-sans text-slate-300">{advisorResponse}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
          </>
        )}
      </main>

      {/* BARRA DE NAVEGAÇÃO FLUTUANTE (DOCK) COM AS 4 ABAS (INÍCIO, DESPESAS, METAS, PARCELAS) E BOTÃO (+) INTEGRADO */}
      <BottomNavigationDock
        activeTab={currentNavTab}
        onTabChange={(tab) => {
          setCurrentNavTab(tab);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onOpenAddModal={() => {
          const section =
            currentNavTab === "expenses"
              ? "left"
              : currentNavTab === "planning"
              ? "right"
              : currentNavTab === "installments"
              ? "bottom_left"
              : "left";
          setAddModalSection(section);
          setIsAddModalOpen(true);
        }}
        expensesCount={homeExpensesCount}
        planningCount={homePlanningCount}
        installmentsCount={homeInstallmentsCount}
      />
    </div>
  );
}
