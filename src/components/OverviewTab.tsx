/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Home, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { TransactionRecord, MonthlyFinanceConfig, MortgageMonthlyRecord } from '../types';
import { Database } from '../db';

interface OverviewTabProps {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  transactions: TransactionRecord[];
  openingDeposit: number;
  monthlyConfig: MonthlyFinanceConfig;
  mortgageRecord: MortgageMonthlyRecord;
  onNavigateToTab: (index: number) => void;
  onRefresh: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  selectedMonth,
  setSelectedMonth,
  transactions,
  openingDeposit,
  monthlyConfig,
  mortgageRecord,
  onNavigateToTab,
  onRefresh
}) => {
  // Extract Year and Month digits for display
  const [yearStr, monthStr] = selectedMonth.split('-');
  const displayMonthText = `${yearStr}年${parseInt(monthStr, 10)}月`;

  // Filter transactions for calculations
  const currentMonthIncomes = transactions.filter(t => t.month === selectedMonth && t.type === 'income');
  const currentMonthExpenses = transactions.filter(t => t.month === selectedMonth && t.type === 'expense');

  const earnedMonth = currentMonthIncomes.reduce((sum, t) => sum + t.amount, 0);
  const spentMonth = currentMonthExpenses.reduce((sum, t) => sum + t.amount, 0);

  // Global lifetime stats
  const totalLifetimeIncomes = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalLifetimeExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  const totalDepositAndEarned = openingDeposit + totalLifetimeIncomes;
  const currentRemaining = totalDepositAndEarned - totalLifetimeExpenses;

  // Monthly ratios
  const incomeTarget = monthlyConfig.monthlyIncomeTarget || 1;
  const expenseBudget = monthlyConfig.monthlyExpenseLimit || 1;

  const incomeCompletionRate = Math.min(100, Math.round((earnedMonth / incomeTarget) * 100));
  const expenseUsageRate = Math.min(100, Math.round((spentMonth / expenseBudget) * 100));

  // Switch month utilities
  const handlePrevMonth = () => {
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10);
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
    const nextMonthStr = `${year}-${month.toString().padStart(2, '0')}`;
    setSelectedMonth(nextMonthStr);
  };

  const handleNextMonth = () => {
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10);
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
    const nextMonthStr = `${year}-${month.toString().padStart(2, '0')}`;
    setSelectedMonth(nextMonthStr);
  };

  // Remaining target calculations
  const remainingIncomeNeeded = incomeTarget - earnedMonth;
  const isIncomeCompleted = earnedMonth >= incomeTarget;
  const isExpenseOverBudget = spentMonth > expenseBudget;

  // Mortgage logic
  const averageMortgage = mortgageRecord.currentMonthDue;
  const isMortgagePaid = mortgageRecord.currentMonthStatus === 'paid';
  const mortgageExpenseAmount = isMortgagePaid ? mortgageRecord.currentMonthPaid : mortgageRecord.currentMonthDue;
  const afterMortgageAvailable = Math.max(0, earnedMonth - mortgageExpenseAmount);

  return (
    <div className="space-y-6">
      {/* 📅 Month Selection Ribbon */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 flex items-center justify-between">
        <button 
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-50 rounded-full text-gray-500 transition-colors"
          title="上个月"
        >
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-violet-600" />
          <span className="font-semibold text-lg text-gray-800">
            📅 正在查看：{displayMonthText}
          </span>
        </div>
        <button 
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-50 rounded-full text-gray-500 transition-colors"
          title="下个月"
        >
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* 👛 Global Core Balance Status Indicator Grid */}
      <div className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Wallet className="w-36 h-36" />
        </div>
        
        <p className="text-white/80 text-sm font-medium">💰 一共还剩多少钱</p>
        <h2 className="text-4xl font-extrabold mt-1 tracking-tight">
          ¥{currentRemaining.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h2>

        <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/10 text-center">
          <div>
            <span className="text-white/70 text-xs">一开始有多少</span>
            <p className="text-white font-bold text-sm mt-0.5">¥{openingDeposit.toLocaleString()}</p>
          </div>
          <div className="border-x border-white/10">
            <span className="text-white/70 text-xs">累计总收入</span>
            <p className="text-white font-bold text-sm mt-0.5">¥{totalLifetimeIncomes.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-white/70 text-xs">累计总支出</span>
            <p className="text-white font-bold text-sm mt-0.5">¥{totalLifetimeExpenses.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* 🎯 Monthly Income Target and Expense Goal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly Income Card */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">🎯 这个月想赚多少</span>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">
                  ¥{earnedMonth.toLocaleString()} <span className="text-xs text-gray-400 font-normal">/ 目标 ¥{incomeTarget.toLocaleString()}</span>
                </h3>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full">
                已达 {incomeCompletionRate}%
              </span>
            </div>

            {/* Income progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-2.5 my-3">
              <div 
                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${incomeCompletionRate}%` }}
              ></div>
            </div>
          </div>

          <div className="mt-2 py-2.5 px-3 rounded-xl flex items-center space-x-2 text-xs bg-gray-50 border border-gray-100">
            {isIncomeCompleted ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-emerald-700 font-medium">🎉 这个月收入目标完成了。</span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0"></div>
                <span className="text-gray-600">⏳ 还差 <strong className="text-violet-700">¥{Math.max(0, remainingIncomeNeeded).toLocaleString()}</strong> 完成这个月目标。</span>
              </>
            )}
          </div>
        </div>

        {/* Monthly Expense Card */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">💸 这个月最多花多少</span>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">
                  ¥{spentMonth.toLocaleString()} <span className="text-xs text-gray-400 font-normal">/ 预算 ¥{expenseBudget.toLocaleString()}</span>
                </h3>
              </div>
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${isExpenseOverBudget ? 'text-rose-700 bg-rose-50' : 'text-violet-700 bg-violet-50'}`}>
                已用 {expenseUsageRate}%
              </span>
            </div>

            {/* Expense progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-2.5 my-3">
              <div 
                className={`h-2.5 rounded-full transition-all duration-500 ${isExpenseOverBudget ? 'bg-rose-500' : 'bg-violet-600'}`} 
                style={{ width: `${expenseUsageRate}%` }}
              ></div>
            </div>
          </div>

          <div className="mt-2 py-2.5 px-3 rounded-xl flex items-center space-x-2 text-xs bg-gray-50 border border-gray-100">
            {isExpenseOverBudget ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="text-rose-700 font-medium">⚠️ 这个月已经花超了，要收一收啦。</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-emerald-700 font-medium">✅ 当前没有超预算。</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 🏠 Mortgage Status Assessment block */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-violet-50 p-2 rounded-xl text-violet-600">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-800">房贷清还与现金压力分析</h4>
            <p className="text-xs text-gray-500">本月应还、已还房贷对可支配生活费的动态影响</p>
          </div>
        </div>

        {/* Status prompt */}
        <div className={`p-4 rounded-xl flex items-start space-x-3 text-sm mb-4 border ${isMortgagePaid ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
          {isMortgagePaid ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-800">✅ 这个月房贷已还。</p>
                <p className="text-xs text-emerald-600 mt-0.5">本月房贷 ¥{mortgageRecord.currentMonthPaid.toLocaleString()} 已结清。辛苦啦，又向完全拥有一套房迈进了一步！</p>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-800">🏠 这个月房贷还没还，记得预留 ¥{averageMortgage.toLocaleString()}。</p>
                <p className="text-xs text-rose-600/90 mt-0.5">还款状态目前标记为【未还】。确保您的还款银行卡内有足够的余额划扣。</p>
              </div>
            </>
          )}
        </div>

        {/* Dynamic calculation: Available balance after mortgage */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-1.5">
            <span>还还房贷保障后，本月还剩多少能用（以该月收入计算）</span>
            <span className="text-violet-600 font-medium">工资 & 收入比分析</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-medium text-gray-700">还完房贷还剩：</span>
            <div className="text-right">
              <span className="text-xl font-bold text-gray-900">
                ¥{afterMortgageAvailable.toLocaleString()}
              </span>
              <p className="text-[10px] text-gray-400 mt-0.5">基于当前月度收入 ¥{earnedMonth.toLocaleString()} 扣除房贷后计算</p>
            </div>
          </div>
        </div>

        {/* Direct Action triggers to help navigate */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button 
            type="button"
            onClick={() => onNavigateToTab(4)} // Index 4 is MortgageTab
            className="py-2.5 px-3 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl text-center transition-colors border border-violet-100"
          >
            🏠 去维护我的房贷账
          </button>
          <button 
            type="button"
            onClick={() => onNavigateToTab(1)} // Tab 2 is Index 1 (Add ledger / detail list)
            className="py-2.5 px-3 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl text-center transition-colors border border-gray-200"
          >
            ✍️ 记一笔今天的手记
          </button>
        </div>
      </div>
    </div>
  );
};
