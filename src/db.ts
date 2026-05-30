/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  TransactionRecord,
  MonthlyFinanceConfig,
  UserFinanceSettings,
  MortgageInfo,
  MortgageMonthlyRecord,
  SalaryBenefitRecord
} from './types';

const STORAGE_KEYS = {
  TRANSACTIONS: 'finance_helper_transactions',
  MONTHLY_CONFIGS: 'finance_helper_monthly_configs',
  SETTINGS: 'finance_helper_settings',
  MORTGAGE_INFO: 'finance_helper_mortgage_info',
  MORTGAGE_MONTHLY: 'finance_helper_mortgage_monthly',
  SALARY_BENEFITS: 'finance_helper_salary_benefits',
  INITIALIZED: 'finance_helper_initialized'
};

// Seeding standard initial test data so the platform preview is visually appealing right away
function seedInitialData() {
  if (localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
    return;
  }

  // 1. Initial Savings Settings
  const settings: UserFinanceSettings = {
    openingDeposit: 250000 // 一开始有25万
  };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));

  // 2. Default Mortgage Setup
  const mortgage: MortgageInfo = {
    totalMortgageAmount: 1500000, // 房贷 150万
    downPayment: 600000,          // 首付 60万
    totalMonths: 360,             // 30年
    paidMonths: 48,              // 已还 4年
    note: "商业贷款，年化利率 3.8%"
  };
  localStorage.setItem(STORAGE_KEYS.MORTGAGE_INFO, JSON.stringify(mortgage));

  // 3. Transactions for May and April 2026
  const transactions: TransactionRecord[] = [
    {
      id: 'seed-tx-工资-05',
      date: '2026-05-05',
      month: '2026-05',
      type: 'income',
      category: '工资',
      amount: 18500,
      note: '5月份常规税后实发工资（附奖金）',
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'seed-tx-基金-05',
      date: '2026-05-12',
      month: '2026-05',
      type: 'income',
      category: '基金/股票',
      amount: 850,
      note: '半导体基金红利季度分红',
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'seed-tx-房贷-05',
      date: '2026-05-15',
      month: '2026-05',
      type: 'expense',
      category: '房贷',
      amount: 5800,
      note: '5月银行房贷自动扣款扣除',
      source: 'mortgage',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'seed-tx-吃饭-05-01',
      date: '2026-05-06',
      month: '2026-05',
      type: 'expense',
      category: '吃饭',
      amount: 185,
      note: '跟朋友去吃重庆火锅',
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'seed-tx-买菜-05-01',
      date: '2026-05-08',
      month: '2026-05',
      type: 'expense',
      category: '买菜',
      amount: 68.5,
      note: '盒马鲜生买水果蔬菜排骨',
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'seed-tx-购物-05-01',
      date: '2026-05-10',
      month: '2026-05',
      type: 'expense',
      category: '购物',
      amount: 399,
      note: '买夏天穿的舒适短袖',
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'seed-tx-哪里物品-05-01',
      date: '2026-05-18',
      month: '2026-05',
      type: 'expense',
      category: '家里物品',
      amount: 125,
      note: '超滤净水器替换滤网一对',
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    // April Data to show historical shifts
    {
      id: 'seed-tx-工资-04',
      date: '2026-04-05',
      month: '2026-04',
      type: 'income',
      category: '工资',
      amount: 18000,
      note: '4月份常规实发工资',
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'seed-tx-房贷-04',
      date: '2026-04-15',
      month: '2026-04',
      type: 'expense',
      category: '房贷',
      amount: 5800,
      note: '4月自动代扣除房贷账户',
      source: 'mortgage',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'seed-tx-逛街-04',
      date: '2026-04-18',
      month: '2026-04',
      type: 'expense',
      category: '逛街',
      amount: 1200,
      note: '商场购买春季新款小白鞋一套',
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));

  // 4. Monthly Budget Limits and Goals
  const monthlyConfigs: MonthlyFinanceConfig[] = [
    {
      month: '2026-05',
      monthlyIncomeTarget: 22000, // 想赚2万2
      monthlyExpenseLimit: 9000    // 最多花9000
    },
    {
      month: '2026-04',
      monthlyIncomeTarget: 18000, // 想赚1万8
      monthlyExpenseLimit: 10000   // 最多花1万
    }
  ];
  localStorage.setItem(STORAGE_KEYS.MONTHLY_CONFIGS, JSON.stringify(monthlyConfigs));

  // 5. Monthly Mortgage Status tracking
  const mortgageMonthly: MortgageMonthlyRecord[] = [
    {
      month: '2026-05',
      currentMonthDue: 5800,
      currentMonthPaid: 5800,
      currentMonthStatus: 'paid',
      repaymentDate: '2026-05-15',
      remainingMortgageAmount: 1216000, // 1.5M - 48*5800 - 5800
      remainingMonths: 311,
      availableAfterMortgage: 13550, // 18500 + 850 - 5800
      syncedToExpense: true,
      relatedTransactionId: 'seed-tx-房贷-05'
    },
    {
      month: '2026-04',
      currentMonthDue: 5800,
      currentMonthPaid: 5800,
      currentMonthStatus: 'paid',
      repaymentDate: '2026-04-15',
      remainingMortgageAmount: 1221800,
      remainingMonths: 312,
      availableAfterMortgage: 12200,
      syncedToExpense: true,
      relatedTransactionId: 'seed-tx-房贷-04'
    }
  ];
  localStorage.setItem(STORAGE_KEYS.MORTGAGE_MONTHLY, JSON.stringify(mortgageMonthly));

  // 6. Prepopulate a parsed salary record for showcase
  const salaryRecord: SalaryBenefitRecord[] = [
    {
      id: 'seed-salary-05',
      salaryMonth: '2026-05',
      bankPayment: 18500,
      personalIncomeTax: 1200,
      housingFundPersonal: 1400,
      housingFundCompany: 1400,
      housingFundTotal: 2800,
      socialSecurityPersonal: 1800,
      socialSecurityCompany: 4200,
      socialSecurityTotal: 6000,
      benefitTotal: 8800,
      comprehensiveIncomeReference: 24100, // 18500 + 1400 + 4200
      imageCount: 1,
      recognitionStatus: 'success',
      userConfirmed: true,
      syncedToIncome: true,
      relatedTransactionId: 'seed-tx-工资-05',
      note: 'AI自动识别成功：此截图完全符合2026年5月份工资规范账单',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  localStorage.setItem(STORAGE_KEYS.SALARY_BENEFITS, JSON.stringify(salaryRecord));

  // Finish seed marker
  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
}

// Guarantee execution of seeding
seedInitialData();

export const Database = {
  // --- USER SETTINGS ---
  getSettings(): UserFinanceSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) return JSON.parse(raw);
    return { openingDeposit: 0 };
  },

  saveSettings(settings: UserFinanceSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  // --- TRANSACTIONS ---
  getTransactions(): TransactionRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (raw) return JSON.parse(raw);
    return [];
  },

  saveTransactions(txs: TransactionRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
  },

  addTransaction(tx: Omit<TransactionRecord, 'id' | 'createdAt' | 'updatedAt'>): TransactionRecord {
    const txs = this.getTransactions();
    const newTx: TransactionRecord = {
      ...tx,
      id: 'tx-' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    txs.unshift(newTx); // Insert at the front
    this.saveTransactions(txs);
    return newTx;
  },

  updateTransaction(tx: TransactionRecord): void {
    const txs = this.getTransactions();
    const index = txs.findIndex(t => t.id === tx.id);
    if (index !== -1) {
      txs[index] = {
        ...tx,
        updatedAt: new Date().toISOString()
      };
      this.saveTransactions(txs);
    }
  },

  deleteTransaction(id: string): void {
    const txs = this.getTransactions();
    const remaining = txs.filter(t => t.id !== id);
    this.saveTransactions(remaining);
  },

  // --- MONTHLY SETTINGS TARGETS ---
  getMonthlyConfigs(): MonthlyFinanceConfig[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MONTHLY_CONFIGS);
    if (raw) return JSON.parse(raw);
    return [];
  },

  getMonthlyConfig(month: string): MonthlyFinanceConfig {
    const configs = this.getMonthlyConfigs();
    const opt = configs.find(c => c.month === month);
    if (opt) return opt;
    // Default fallback values if unconfigured
    return {
      month,
      monthlyIncomeTarget: 15000,
      monthlyExpenseLimit: 8000
    };
  },

  saveMonthlyConfig(month: string, targetIncome: number, limitExpense: number): void {
    const configs = this.getMonthlyConfigs();
    const index = configs.findIndex(c => c.month === month);
    const newConfig: MonthlyFinanceConfig = {
      month,
      monthlyIncomeTarget: targetIncome,
      monthlyExpenseLimit: limitExpense
    };
    if (index !== -1) {
      configs[index] = newConfig;
    } else {
      configs.push(newConfig);
    }
    localStorage.setItem(STORAGE_KEYS.MONTHLY_CONFIGS, JSON.stringify(configs));
  },

  // --- MORTGAGE INFO ---
  getMortgageInfo(): MortgageInfo {
    const raw = localStorage.getItem(STORAGE_KEYS.MORTGAGE_INFO);
    if (raw) return JSON.parse(raw);
    return {
      totalMortgageAmount: 0,
      downPayment: 0,
      totalMonths: 360,
      paidMonths: 0,
      note: ""
    };
  },

  saveMortgageInfo(info: MortgageInfo): void {
    localStorage.setItem(STORAGE_KEYS.MORTGAGE_INFO, JSON.stringify(info));
  },

  // --- MORTGAGE MONTHLY RECORDS ---
  getMortgageMonthlyRecords(): MortgageMonthlyRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MORTGAGE_MONTHLY);
    if (raw) return JSON.parse(raw);
    return [];
  },

  getMortgageMonthlyRecord(month: string): MortgageMonthlyRecord {
    const list = this.getMortgageMonthlyRecords();
    const item = list.find(r => r.month === month);
    if (item) return item;

    // Build smart defaults based on the main Mortgage Profile
    const info = this.getMortgageInfo();
    const averageMonthlyPayment = info.totalMonths > 0 ? Math.round(info.totalMortgageAmount / info.totalMonths) : 0;
    
    return {
      month,
      currentMonthDue: averageMonthlyPayment,
      currentMonthPaid: 0,
      currentMonthStatus: 'unpaid',
      repaymentDate: '',
      remainingMortgageAmount: info.totalMortgageAmount - (info.paidMonths * averageMonthlyPayment),
      remainingMonths: Math.max(0, info.totalMonths - info.paidMonths),
      availableAfterMortgage: 0,
      syncedToExpense: false
    };
  },

  saveMortgageMonthlyRecord(month: string, record: MortgageMonthlyRecord): void {
    const list = this.getMortgageMonthlyRecords();
    const index = list.findIndex(r => r.month === month);
    if (index !== -1) {
      list[index] = record;
    } else {
      list.push(record);
    }
    localStorage.setItem(STORAGE_KEYS.MORTGAGE_MONTHLY, JSON.stringify(list));
  },

  // --- SALARY OCR BENEFIT RECORDS ---
  getSalaryBenefitRecords(): SalaryBenefitRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SALARY_BENEFITS);
    if (raw) return JSON.parse(raw);
    return [];
  },

  saveSalaryBenefitRecords(records: SalaryBenefitRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.SALARY_BENEFITS, JSON.stringify(records));
  },

  addSalaryBenefitRecord(record: Omit<SalaryBenefitRecord, 'id' | 'createdAt' | 'updatedAt'>): SalaryBenefitRecord {
    const list = this.getSalaryBenefitRecords();
    const newRecord: SalaryBenefitRecord = {
      ...record,
      id: 'salary-' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    list.unshift(newRecord);
    this.saveSalaryBenefitRecords(list);
    return newRecord;
  },

  updateSalaryBenefitRecord(record: SalaryBenefitRecord): void {
    const list = this.getSalaryBenefitRecords();
    const idx = list.findIndex(r => r.id === record.id);
    if (idx !== -1) {
      list[idx] = {
        ...record,
        updatedAt: new Date().toISOString()
      };
      this.saveSalaryBenefitRecords(list);
    }
  },

  deleteSalaryBenefitRecord(id: string): void {
    const list = this.getSalaryBenefitRecords();
    const remaining = list.filter(r => r.id !== id);
    this.saveSalaryBenefitRecords(remaining);
  }
};
