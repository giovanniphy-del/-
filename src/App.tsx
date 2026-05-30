/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Home, 
  BookOpen, 
  BarChart3, 
  Sparkles, 
  UserCircle,
  Settings
} from 'lucide-react';

import { Database } from './db';
import { 
  TransactionRecord, 
  MortgageInfo, 
  MortgageMonthlyRecord, 
  SalaryBenefitRecord,
  MonthlyFinanceConfig
} from './types';

// Tab Components
import { OverviewTab } from './components/OverviewTab';
import { LedgerTab } from './components/LedgerTab';
import { StatisticsTab } from './components/StatisticsTab';
import { SalaryOcrTab } from './components/SalaryOcrTab';
import { MortgageTab } from './components/MortgageTab';
import { SettingsTab } from './components/SettingsTab';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<number>(0);

  // Selected Month State (Defaults to current month of interest e.g., 2026-05)
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-05');

  // Database States
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [openingDeposit, setOpeningDeposit] = useState<number>(0);
  const [monthlyConfig, setMonthlyConfig] = useState<MonthlyFinanceConfig>({
    month: '2026-05',
    monthlyIncomeTarget: 15000,
    monthlyExpenseLimit: 8000
  });
  const [mortgageInfo, setMortgageInfo] = useState<MortgageInfo>({
    totalMortgageAmount: 0,
    downPayment: 0,
    totalMonths: 360,
    paidMonths: 0,
    note: ''
  });
  const [mortgageRecord, setMortgageRecord] = useState<MortgageMonthlyRecord>({
    month: '2026-05',
    currentMonthDue: 0,
    currentMonthPaid: 0,
    currentMonthStatus: 'unpaid',
    repaymentDate: '',
    remainingMortgageAmount: 0,
    remainingMonths: 360,
    availableAfterMortgage: 0,
    syncedToExpense: false
  });
  const [salaryRecords, setSalaryRecords] = useState<SalaryBenefitRecord[]>([]);

  // Trigger state synchronization from local database
  const loadDatabaseState = () => {
    const rawTxs = Database.getTransactions();
    const rawSettings = Database.getSettings();
    const rawMonthly = Database.getMonthlyConfig(selectedMonth);
    const rawMortgageInfo = Database.getMortgageInfo();
    const rawMortgageMonthly = Database.getMortgageMonthlyRecord(selectedMonth);
    const rawSalaries = Database.getSalaryBenefitRecords();

    setTransactions(rawTxs);
    setOpeningDeposit(rawSettings.openingDeposit);
    setMonthlyConfig(rawMonthly);
    setMortgageInfo(rawMortgageInfo);
    setMortgageRecord(rawMortgageMonthly);
    setSalaryRecords(rawSalaries);
  };

  // Synchronize base states on mount or month switches
  useEffect(() => {
    loadDatabaseState();
  }, [selectedMonth]);

  // --- REUSABLE DATA SYNC MUTATORS ---

  // 1. Transactions Actions
  const handleAddTransaction = (newTx: Omit<TransactionRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    Database.addTransaction(newTx);
    loadDatabaseState();
  };

  const handleUpdateTransaction = (updatedTx: TransactionRecord) => {
    Database.updateTransaction(updatedTx);
    loadDatabaseState();
  };

  const handleDeleteTransaction = (id: string) => {
    // Find if any linked mortgage record exists and unset sync markers if matching
    const mtgRecords = Database.getMortgageMonthlyRecords();
    const matchingMtg = mtgRecords.find(r => r.relatedTransactionId === id);
    if (matchingMtg) {
      matchingMtg.syncedToExpense = false;
      matchingMtg.relatedTransactionId = undefined;
      Database.saveMortgageMonthlyRecord(matchingMtg.month, matchingMtg);
    }

    // Find if any linked salary record exists and unset sync markers if matching
    const salaryRecordsList = Database.getSalaryBenefitRecords();
    const matchingSalary = salaryRecordsList.find(s => s.relatedTransactionId === id);
    if (matchingSalary) {
      matchingSalary.syncedToIncome = false;
      matchingSalary.relatedTransactionId = undefined;
      Database.updateSalaryBenefitRecord(matchingSalary);
    }

    Database.deleteTransaction(id);
    loadDatabaseState();
  };

  // 2. Initial Savings Mutator
  const handleUpdateOpeningDeposit = (amount: number) => {
    Database.saveSettings({ openingDeposit: amount });
    loadDatabaseState();
  };

  // 3. Goals Config Mutator
  const handleUpdateMonthlyConfig = (income: number, expense: number) => {
    Database.saveMonthlyConfig(selectedMonth, income, expense);
    loadDatabaseState();
  };

  // 4. Mortgage Metadata Specs Mutator
  const handleUpdateMortgageInfo = (newInfo: MortgageInfo) => {
    Database.saveMortgageInfo(newInfo);
    loadDatabaseState();
  };

  // 5. Monthly Mortgage Payment Status Logger
  const handleUpdateMortgageRecord = (rec: MortgageMonthlyRecord) => {
    Database.saveMortgageMonthlyRecord(selectedMonth, rec);
    loadDatabaseState();
  };

  // 6. Direct Synchronizer: Monthly Mortgage Status -> Daily Expense Ledger
  const handleSyncMortgageToLedger = (rec: MortgageMonthlyRecord) => {
    // Check if duplicate ledger records are already registered in chosen month (Section 13.7)
    if (rec.syncedToExpense && rec.relatedTransactionId) {
      let confirmOverride = true;
      try {
        confirmOverride = window.confirm(`⚠️ 该月份（${selectedMonth}）已经存在一条已同步的房贷支出记录了，确定要覆盖吗？`);
      } catch (err) {
        // Safe fallback if sandboxed iframe blocks window.confirm: default to overwriting
        confirmOverride = true;
      }
      if (!confirmOverride) return;

      // Clean existing old record before inserting new
      Database.deleteTransaction(rec.relatedTransactionId);
    }

    // Insert new manual expense record for Mortgage
    const insertedTx = Database.addTransaction({
      date: rec.repaymentDate || `${selectedMonth}-15`,
      month: selectedMonth,
      type: 'expense',
      category: '房贷',
      amount: rec.currentMonthPaid,
      note: '网银房贷月供对账自动同步记账',
      source: 'mortgage'
    });

    // Update the record link markers
    const updatedMtgRec: MortgageMonthlyRecord = {
      ...rec,
      syncedToExpense: true,
      relatedTransactionId: insertedTx.id
    };
    Database.saveMortgageMonthlyRecord(selectedMonth, updatedMtgRec);
    loadDatabaseState();
  };

  // 7. Salary Benefit Actions
  const handleAddSalaryRecord = (newRec: Omit<SalaryBenefitRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    Database.addSalaryBenefitRecord(newRec);
    loadDatabaseState();
  };

  const handleUpdateSalaryRecord = (rec: SalaryBenefitRecord) => {
    Database.updateSalaryBenefitRecord(rec);
    loadDatabaseState();
  };

  const handleDeleteSalaryRecord = (id: string) => {
    const recordsList = Database.getSalaryBenefitRecords();
    const target = recordsList.find(r => r.id === id);

    if (target && target.syncedToIncome && target.relatedTransactionId) {
      try {
        const deleteSyncTx = window.confirm('❓ 您已删除工资截图档案。\n\n是否同时把该月份已经产生关联的工资收入流水记录也一并抹去？');
        if (deleteSyncTx) {
          Database.deleteTransaction(target.relatedTransactionId);
        }
      } catch (err) {
        // Safe fallback if sandboxed iframe blocks window.confirm: default to deleting both items
        Database.deleteTransaction(target.relatedTransactionId);
      }
    }

    Database.deleteSalaryBenefitRecord(id);
    loadDatabaseState();
  };

  // 8. Direct Synchronizer: Wage actual payment -> Main income ledger
  const handleSyncSalaryToLedger = (rec: SalaryBenefitRecord, forceAdd: boolean = false) => {
    // Verify duplicate sync block if not forced override
    if (!forceAdd && rec.syncedToIncome && rec.relatedTransactionId) {
      alert('已告知：当前月份的实到手薪资已经妥贴进账啦！无需重复同步。');
      return;
    }

    // Check if old transaction is linked
    if (rec.relatedTransactionId) {
      Database.deleteTransaction(rec.relatedTransactionId);
    }

    const insertedTx = Database.addTransaction({
      date: `${rec.salaryMonth}-05`, // standard 5th day payout approximation
      month: rec.salaryMonth,
      type: 'income',
      category: '工资',
      amount: rec.bankPayment,
      note: `工资条（${rec.salaryMonth}）实发AI对账自动同步记账`,
      source: 'salary'
    });

    const updatedRec: SalaryBenefitRecord = {
      ...rec,
      syncedToIncome: true,
      relatedTransactionId: insertedTx.id
    };

    Database.updateSalaryBenefitRecord(updatedRec);
    loadDatabaseState();
    alert(`🎉 恭喜！实收到账 ¥${rec.bankPayment.toLocaleString()} 已经同步并分类为「工资」收入项中。`);
  };

  // Rendering matching views tab
  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <OverviewTab
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            transactions={transactions}
            openingDeposit={openingDeposit}
            monthlyConfig={monthlyConfig}
            mortgageRecord={mortgageRecord}
            onNavigateToTab={setActiveTab}
            onRefresh={loadDatabaseState}
          />
        );
      case 1:
        return (
          <LedgerTab
            selectedMonth={selectedMonth}
            transactions={transactions}
            onAddTransaction={handleAddTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onRefresh={loadDatabaseState}
          />
        );
      case 2:
        return (
          <StatisticsTab
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            transactions={transactions}
          />
        );
      case 3:
        return (
          <SalaryOcrTab
            records={salaryRecords}
            onAddSalaryRecord={handleAddSalaryRecord}
            onUpdateSalaryRecord={handleUpdateSalaryRecord}
            onDeleteSalaryRecord={handleDeleteSalaryRecord}
            onSyncToLedger={handleSyncSalaryToLedger}
            onRefresh={loadDatabaseState}
          />
        );
      case 4:
        return (
          <MortgageTab
            selectedMonth={selectedMonth}
            mortgageInfo={mortgageInfo}
            onUpdateMortgageInfo={handleUpdateMortgageInfo}
            mortgageRecord={mortgageRecord}
            onUpdateMortgageRecord={handleUpdateMortgageRecord}
            onSyncMortgageToLedger={handleSyncMortgageToLedger}
            onRefresh={loadDatabaseState}
          />
        );
      case 5:
        return (
          <SettingsTab
            selectedMonth={selectedMonth}
            openingDeposit={openingDeposit}
            onUpdateOpeningDeposit={handleUpdateOpeningDeposit}
            monthlyIncomeTarget={monthlyConfig.monthlyIncomeTarget}
            monthlyExpenseLimit={monthlyConfig.monthlyExpenseLimit}
            onUpdateMonthlyConfig={handleUpdateMonthlyConfig}
          />
        );
      default:
        return <div className="text-gray-400 p-6">出错了。</div>;
    }
  };

  // Bottom primary indicators
  const totalLifetimeIncomes = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalLifetimeExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalRemainingBalance = openingDeposit + totalLifetimeIncomes - totalLifetimeExpenses;

  return (
    <div className="bg-slate-50 min-h-screen text-gray-800 pb-12 antialiased">
      {/* 🚀 Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3.5">
            <span className="text-3xl animate-bounce-short">💜</span>
            <div>
              <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center">
                <span>我的记账小助手</span>
                <span className="ml-2 text-[10px] uppercase font-semibold text-violet-700 bg-violet-100/60 px-1.5 py-0.5 rounded-sm">
                  v1.0 MVP
                </span>
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">白色极简底色 • 智能大模型识别工资 • 房贷压力动态精算</p>
            </div>
          </div>

          <div className="flex items-center bg-gray-50 px-3.5 py-2 rounded-2xl border border-gray-250">
            <span className="text-[10px] font-bold text-gray-400 block tracking-wide uppercase mr-2.5">
              总存款还剩
            </span>
            <span className="text-sm font-black text-violet-700">
              ¥{totalRemainingBalance.toLocaleString()}
            </span>
          </div>
        </div>
      </header>

      {/* 🧭 Tabs navigation controller */}
      <div className="bg-white border-b border-gray-100 sticky top-[72px] sm:top-[68px] z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto px-2">
          <div className="flex justify-between sm:justify-start sm:space-x-8 overflow-x-auto select-none no-scrollbar">
            {[
              { idx: 0, label: '月度总览', icon: Home },
              { idx: 1, label: '记一笔明细', icon: BookOpen },
              { idx: 2, label: '收支统计', icon: BarChart3 },
              { idx: 3, label: '看工资条', icon: Sparkles },
              { idx: 4, label: '房贷管理', icon: UserCircle },
              { idx: 5, label: '我的设置', icon: Settings }
            ].map(tab => {
              const TabIcon = tab.icon;
              const isAct = activeTab === tab.idx;
              return (
                <button
                  key={tab.idx}
                  type="button"
                  id={`nav-tab-${tab.idx}`}
                  onClick={() => setActiveTab(tab.idx)}
                  className={`py-4 px-3 flex items-center space-x-1.5 border-b-2 font-bold text-sm min-h-[48px] justify-center transition-all shrink-0 cursor-pointer ${isAct ? 'border-violet-600 text-violet-700 bg-violet-50/10' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                >
                  <TabIcon className={`w-4 h-4 ${isAct ? 'text-violet-600' : 'text-gray-450'}`} />
                  <span className="text-xs sm:text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 💼 Primary Content Canvas */}
      <main className="max-w-4xl mx-auto px-4 mt-6">
        <div className="animation-fadeIn">
          {renderActiveTabContent()}
        </div>
      </main>

      {/* 📋 Footer info copyright lines */}
      <footer className="max-w-4xl mx-auto px-4 mt-16 text-center text-[10px] text-gray-400 border-t border-gray-250/20 pt-6">
        <p className="font-medium">© 2026 我的记账小助手 • 每一笔账，都算得清清楚楚。</p>
        <p className="mt-1">采用白色简朴视觉、大模型精准工资条解构服务、房贷余款动态分析模块。</p>
      </footer>
    </div>
  );
}

