import { Transaction } from "./types";

export const INITIAL_TRANSACTIONS: Transaction[] = [
  // --- JULHO 2026 (Mês principal do relatório que o usuário está começando) ---
  // Tabela Esquerda (Gastos Mensais de Julho 2026)
  {
    id: "jul-1",
    description: "Cartão",
    amount: 106.40,
    date: "2026-07-05",
    type: "expense",
    tableSection: "left",
    category: "Lazer"
  },
  {
    id: "jul-2",
    description: "whey",
    amount: 20.00,
    date: "2026-07-08",
    type: "expense",
    tableSection: "left",
    category: "Alimentação"
  },
  {
    id: "jul-3",
    description: "Memoria Ram",
    amount: 50.00,
    date: "2026-07-10",
    type: "expense",
    tableSection: "left",
    category: "Tecnologia",
    isOrangeHighlight: true
  },
  {
    id: "jul-4",
    description: "Academia",
    amount: 80.00,
    date: "2026-07-12",
    type: "expense",
    tableSection: "left",
    category: "Saúde",
    isOrangeHighlight: true
  },
  {
    id: "jul-5",
    description: "Celular",
    amount: 100.00,
    date: "2026-07-15",
    type: "expense",
    tableSection: "left",
    category: "Outros",
    isOrangeHighlight: true
  },
  {
    id: "jul-6",
    description: "Cartão de Mãe",
    amount: 243.00,
    date: "2026-07-18",
    type: "expense",
    tableSection: "left",
    category: "Família",
    isOrangeHighlight: true
  },
  {
    id: "jul-7",
    description: "Viagem",
    amount: 50.00,
    date: "2026-07-20",
    type: "expense",
    tableSection: "left",
    category: "Lazer",
    isOrangeHighlight: true
  },
  {
    id: "jul-8",
    description: "Assinatura",
    amount: 15.00,
    date: "2026-07-25",
    type: "expense",
    tableSection: "left",
    category: "Outros",
    isOrangeHighlight: true
  },
  {
    id: "jul-9",
    description: "Descontos",
    amount: 40.00,
    date: "2026-07-28",
    type: "expense",
    tableSection: "left",
    category: "Outros",
    isDiscount: true
  },

  // Tabela Direita (Planejamento & Compras Futuras - Julho 2026)
  {
    id: "spec-1",
    description: "Controle - G5",
    amount: 0,
    date: "2026-07-02",
    type: "expense",
    tableSection: "right",
    category: "Tecnologia",
    note: "KARINNE"
  },
  {
    id: "spec-2",
    description: "Kit Ryzen",
    amount: 980.00,
    date: "2026-07-03",
    type: "expense",
    tableSection: "right",
    category: "Tecnologia"
  },
  {
    id: "spec-3",
    description: "Tatuagem",
    amount: 60.00,
    date: "2026-07-10",
    type: "expense",
    tableSection: "right",
    category: "Lazer"
  },
  {
    id: "spec-4",
    description: "Alexa",
    amount: 250.00,
    date: "2026-07-12",
    type: "expense",
    tableSection: "right",
    category: "Tecnologia"
  },
  {
    id: "spec-5",
    description: "LG UltraGear",
    amount: 780.00,
    date: "2026-07-15",
    type: "expense",
    tableSection: "right",
    category: "Tecnologia"
  },
  {
    id: "spec-6",
    description: "RTX 5060 8gb",
    amount: 2100.00,
    date: "2026-07-20",
    type: "expense",
    tableSection: "right",
    category: "Tecnologia"
  },
  {
    id: "spec-7",
    description: "Bonsai",
    amount: 20.00,
    date: "2026-07-22",
    type: "expense",
    tableSection: "right",
    category: "Outros"
  },
  {
    id: "spec-8",
    description: "Mousepad",
    amount: 0,
    date: "2026-07-24",
    type: "expense",
    tableSection: "right",
    category: "Tecnologia",
    note: "KARINNE"
  },
  {
    id: "spec-9",
    description: "Suporte p/ placa",
    amount: 0,
    date: "2026-07-26",
    type: "expense",
    tableSection: "right",
    category: "Tecnologia",
    note: "3D"
  },

  // Tabela Parcelas (Bottom Section - Mostra quanto falta para terminar de pagar)
  {
    id: "part-1",
    description: "Pai - Celular",
    amount: 100.00,
    startDate: "2026-07",
    date: "2026-12-01", // Quitação em Dezembro 2026 (6 parcelas: Jul a Dez)
    type: "expense",
    tableSection: "bottom_left",
    category: "Outros"
  },
  {
    id: "part-2",
    description: "Notebook - Mãe",
    amount: 243.00,
    startDate: "2026-07",
    date: "2026-09-01", // Quitação em Setembro 2026 (3 parcelas: Jul a Set)
    type: "expense",
    tableSection: "bottom_left",
    category: "Família"
  },
  {
    id: "part-3",
    description: "Memoria ram - Pai",
    amount: 50.00,
    startDate: "2026-07",
    date: "2027-01-01", // Quitação em Janeiro 2027 (7 parcelas: Jul a Jan)
    type: "expense",
    tableSection: "bottom_left",
    category: "Tecnologia"
  },
  {
    id: "part-4",
    description: "Viagem - Karinne",
    amount: 50.00,
    startDate: "2026-07",
    date: "2027-01-01", // Quitação em Janeiro 2027 (7 parcelas: Jul a Jan)
    type: "expense",
    tableSection: "bottom_left",
    category: "Lazer"
  }
];

export const INITIAL_BUDGETS: Record<string, number> = {
  "2026-07": 843.15, // Orçamento inicial de Julho que bate com o print
  "2026-08": 800.00,
  "2026-09": 800.00,
  "2026-10": 1000.00,
  "2026-11": 800.00,
  "2026-12": 843.15,
  "2027-01": 900.00
};
