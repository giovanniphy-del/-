/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  BarChart2, 
  Flame, 
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { TransactionRecord } from '../types';

interface StatisticsTabProps {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  transactions: TransactionRecord[];
}

export const StatisticsTab: React.FC<StatisticsTabProps> = ({
  selectedMonth,
  setSelectedMonth,
  transactions
}) => {
  // Years listing setup
  const yearsList = Array.from(new Set(
    transactions.map(t => t.date.substring(0, 4))
  )) as string[];
  
  // Guarantee a default yearsList fallback if no logs
  if (yearsList.length === 0) {
    yearsList.push('2026');
  } else if (!yearsList.includes('2026')) {
    yearsList.push('2026');
  }
  
  // Sort reverse chronological
  yearsList.sort((a, b) => parseInt(b, 10) - parseInt(a, 10));

  // Year UI State
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [statsMode, setStatsMode] = useState<'monthly' | 'yearly'>('monthly');

  // --- Monthly statistics logic ---
  const [yearStr, monthStr] = selectedMonth.split('-');
  const displayMonthName = `${yearStr}年${parseInt(monthStr, 10)}月`;

  // Dynamically compile a selection of years and months
  const monthsOfSelectedYear = Array.from({ length: 12 }, (_, i) => {
    const mm = (i + 1).toString().padStart(2, '0');
    return `${yearStr}-${mm}`;
  });

  const txMonths = Array.from(new Set(
    transactions.map(t => t.month)
  )).filter(Boolean) as string[];

  const allAvailableMonths = Array.from(new Set([
    ...monthsOfSelectedYear,
    ...txMonths,
    selectedMonth
  ])).sort((a, b) => b.localeCompare(a));

  const monthlyTxs = transactions.filter(t => t.month === selectedMonth);

  const monthlyIncome = monthlyTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpense = monthlyTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const monthlySavings = monthlyIncome - monthlyExpense;

  // Group monthly expenses by category
  const expenseByCategory: Record<string, number> = {};
  monthlyTxs.filter(t => t.type === 'expense').forEach(t => {
    const key = (t.category === '其他' && t.customCategory) ? t.customCategory : t.category;
    expenseByCategory[key] = (expenseByCategory[key] || 0) + t.amount;
  });

  // Sort monthly expenses descending
  const sortedExpenses = Object.entries(expenseByCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  // Group monthly income by category
  const incomeByCategory: Record<string, number> = {};
  monthlyTxs.filter(t => t.type === 'income').forEach(t => {
    const key = (t.category === '其他' && t.customCategory) ? t.customCategory : t.category;
    incomeByCategory[key] = (incomeByCategory[key] || 0) + t.amount;
  });

  const sortedIncomes = Object.entries(incomeByCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  // Determine "花钱最多的地方"
  const highestExpenseCategory = sortedExpenses[0] || null;

  // --- Yearly statistics logic ---
  const yearlyTxs = transactions.filter(t => t.date.startsWith(selectedYear));
  const yearlyIncome = yearlyTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const yearlyExpense = yearlyTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const yearlySavings = yearlyIncome - yearlyExpense;

  // Group annual monthly logs to show month-by-month bars
  const annualMonthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthNum = (i + 1).toString().padStart(2, '0');
    const fullMonthStr = `${selectedYear}-${monthNum}`;
    const txsInMonth = yearlyTxs.filter(t => t.month === fullMonthStr);
    
    const inc = txsInMonth.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const exp = txsInMonth.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    return {
      monthLabel: `${i + 1}月`,
      income: inc,
      expense: exp,
      net: inc - exp
    };
  });

  // Calculate annual max peak value for graph scale
  const maxPeakValue = Math.max(
    ...annualMonthlyData.map(d => Math.max(d.income, d.expense)),
    1000 // min scaling point
  );

  return (
    <div className="space-y-6">
      {/* 📊 Selector toggle between Monthly and Yearly view */}
      <div className="bg-white rounded-2xl p-2.5 shadow-xs border border-gray-150 flex justify-between items-center">
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            type="button"
            id="mode-monthly-btn"
            onClick={() => setStatsMode('monthly')}
            className={`py-1.5 px-4 rounded-lg text-xs font-bold transition-all ${statsMode === 'monthly' ? 'bg-white text-violet-700 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
          >
            本月账目分析 ({monthStr}月)
          </button>
          <button
            type="button"
            id="mode-yearly-btn"
            onClick={() => setStatsMode('yearly')}
            className={`py-1.5 px-4 rounded-lg text-xs font-bold transition-all ${statsMode === 'yearly' ? 'bg-white text-violet-700 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
          >
            全年年度分析 ({selectedYear}年)
          </button>
        </div>

        {statsMode === 'yearly' && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 font-semibold flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1" /> 选择年份:
            </span>
            <select
              value={selectedYear}
              id="year-select"
              onChange={e => setSelectedYear(e.target.value)}
              className="px-2 py-1 text-xs font-bold bg-white rounded-lg border border-gray-200 text-gray-700 outline-hidden"
            >
              {yearsList.map(y => (
                <option key={y} value={y}>{y} 年</option>
              ))}
            </select>
          </div>
        )}

        {statsMode === 'monthly' && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 font-semibold flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-violet-600" /> 选择月份:
            </span>
            <select
              value={selectedMonth}
              id="month-select"
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-2 py-1.5 text-xs font-bold bg-white rounded-lg border border-gray-200 text-violet-700 outline-hidden focus:ring-1 focus:ring-violet-500 cursor-pointer"
            >
              {allAvailableMonths.map(m => {
                const [y, mm] = m.split('-');
                return (
                  <option key={m} value={m}>
                    {y}年{parseInt(mm, 10)}月
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {/* --- MONTHLY STATISTICS CONTENT VIEW --- */}
      {statsMode === 'monthly' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Three block balance sheets widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center">
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl mr-4">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-gray-400 font-bold block">本月收入额</span>
                <span className="text-xl font-bold text-gray-800">¥{monthlyIncome.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center">
              <div className="bg-rose-50 text-rose-600 p-3 rounded-2xl mr-4">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-gray-400 font-bold block">本月支出额</span>
                <span className="text-xl font-bold text-gray-800">¥{monthlyExpense.toLocaleString()}</span>
              </div>
            </div>

            <div className={`rounded-2xl p-5 border shadow-xs flex items-center ${monthlySavings >= 0 ? 'bg-white border-gray-100' : 'bg-red-50/20 border-red-100'}`}>
              <div className={`p-3 rounded-2xl mr-4 ${monthlySavings >= 0 ? 'bg-violet-50 text-violet-600' : 'bg-rose-100 text-rose-600'}`}>
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-gray-400 font-bold block">本月结余 (差额)</span>
                <span className={`text-xl font-bold ${monthlySavings >= 0 ? 'text-gray-800' : 'text-rose-600'}`}>
                  ¥{monthlySavings.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* 💸 Top Spent Highlight strip */}
          <div className="bg-gradient-to-r from-violet-50 to-indigo-50/50 rounded-2xl p-4.5 border border-violet-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">💸</span>
              <div>
                <h4 className="font-bold text-gray-800 text-sm">本周/本模块支出之最</h4>
                <p className="text-xs text-gray-500 mt-0.5">自动帮您识别出来这个月您花钱最多的一块开销</p>
              </div>
            </div>
            
            <div className="text-right">
              {highestExpenseCategory ? (
                <>
                  <span className="text-xs font-bold text-violet-700 bg-violet-100/60 px-2 py-0.5 rounded">
                    {highestExpenseCategory.category}
                  </span>
                  <p className="text-base font-extrabold text-violet-900 mt-1">
                    ¥{highestExpenseCategory.amount.toLocaleString()}
                  </p>
                </>
              ) : (
                <span className="text-xs text-gray-400 font-semibold">无支出记录</span>
              )}
            </div>
          </div>

          {/* Two-fold detail categories grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Expense breakdown list (L) */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
              <h4 className="font-bold text-gray-800 text-sm flex items-center mb-4 border-b border-gray-50 pb-2">
                <PieChart className="w-4 h-4 text-rose-500 mr-1.5" />
                <span>👇 这个月开支流向 (支出分类排行)</span>
              </h4>

              {sortedExpenses.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-400 text-xs">在这个月没有任何支出明细记录</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedExpenses.map(({ category, amount }) => {
                    const pct = Math.round((amount / (monthlyExpense || 1)) * 100);
                    return (
                      <div key={category} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-gray-700">{category}</span>
                          <span className="text-gray-500 font-bold">
                            ¥{amount.toLocaleString()} ({pct}%)
                          </span>
                        </div>
                        {/* CSS Progress Bar */}
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div 
                            className="bg-violet-600 h-2 rounded-full transition-all" 
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Income breakdown list (R) */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
              <h4 className="font-bold text-gray-800 text-sm flex items-center mb-4 border-b border-gray-50 pb-2">
                <Layers className="w-4 h-4 text-emerald-500 mr-1.5" />
                <span>🌟 工资等入账构成 (收入分类排行)</span>
              </h4>

              {sortedIncomes.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-400 text-xs">在这个月没有任何收益入账单记录</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedIncomes.map(({ category, amount }) => {
                    const pct = Math.round((amount / (monthlyIncome || 1)) * 100);
                    return (
                      <div key={category} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-gray-700">{category}</span>
                          <span className="text-gray-500 font-bold">
                            ¥{amount.toLocaleString()} ({pct}%)
                          </span>
                        </div>
                        {/* CSS Progress Bar */}
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div 
                            className="bg-emerald-500 h-1.5 rounded-full transition-all" 
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- YEARLY STATISTICS CONTENT VIEW --- */}
      {statsMode === 'yearly' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Annual aggregate boxes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50/50 rounded-2xl p-5 border border-gray-200">
              <span className="text-xs text-gray-400 font-bold block">📆 全年累计总收入</span>
              <p className="text-2xl font-extrabold text-gray-800 mt-1">¥{yearlyIncome.toLocaleString()}</p>
            </div>

            <div className="bg-slate-50/50 rounded-2xl p-5 border border-gray-200">
              <span className="text-xs text-gray-400 font-bold block">📆 全年累计总支出</span>
              <p className="text-2xl font-extrabold text-gray-800 mt-1">¥{yearlyExpense.toLocaleString()}</p>
            </div>

            <div className={`rounded-2xl p-5 border ${yearlySavings >= 0 ? 'bg-violet-50/20 border-violet-100' : 'bg-rose-50/20 border-rose-100'}`}>
              <span className="text-xs text-gray-400 font-bold block">📆 全年累计总结余</span>
              <p className={`text-2xl font-extrabold mt-1 ${yearlySavings >= 0 ? 'text-violet-700' : 'text-rose-600'}`}>
                ¥{yearlySavings.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Custom Month-by-Month Graph bars card */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
            <h4 className="font-bold text-gray-800 text-sm flex items-center mb-6">
              <BarChart2 className="w-4 h-4 text-violet-600 mr-1.5" />
              <span>{selectedYear}年 每月收入与支出对比示意图</span>
            </h4>

            <div className="space-y-4">
              {annualMonthlyData.map(data => {
                const incPercent = Math.max(2, Math.round((data.income / maxPeakValue) * 100));
                const expPercent = Math.max(2, Math.round((data.expense / maxPeakValue) * 100));

                const hasData = data.income > 0 || data.expense > 0;

                return (
                  <div key={data.monthLabel} className="grid grid-cols-12 gap-2 items-center text-xs">
                    {/* Month Label */}
                    <div className="col-span-1 font-bold text-gray-600 text-right pr-2">
                      {data.monthLabel}
                    </div>

                    {/* Bars visualizer */}
                    <div className="col-span-8 space-y-1.5">
                      {hasData ? (
                        <>
                          {/* Income bar (Green) */}
                          <div className="flex items-center space-x-1.5">
                            <span className="w-2 text-[8px] text-gray-400">赚</span>
                            <div className="w-full bg-gray-50 h-2.5 rounded-full">
                              <div 
                                className="bg-emerald-400 h-2.5 rounded-full transition-all" 
                                style={{ width: `${incPercent}%` }}
                              ></div>
                            </div>
                            <span className="w-16 font-semibold text-[10px] text-gray-500">¥{Math.round(data.income).toLocaleString()}</span>
                          </div>

                          {/* Expense bar (Deep purple) */}
                          <div className="flex items-center space-x-1.5">
                            <span className="w-2 text-[8px] text-gray-400">花</span>
                            <div className="w-full bg-gray-50 h-2.5 rounded-full">
                              <div 
                                className="bg-violet-600 h-2.5 rounded-full transition-all" 
                                style={{ width: `${expPercent}%` }}
                              ></div>
                            </div>
                            <span className="w-16 font-semibold text-[10px] text-gray-500">¥{Math.round(data.expense).toLocaleString()}</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-gray-300 py-1 font-medium text-[10px] italic">该自然月无任何流水明细</div>
                      )}
                    </div>

                    {/* Monthly net margin status indicator */}
                    <div className="col-span-3 text-right font-medium">
                      {hasData && (
                        <span className={data.net >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                          {data.net >= 0 ? '+' : '-'}¥{Math.abs(data.net).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Legend guide */}
            <div className="flex justify-end items-center space-x-4 mt-6 pt-4 border-t border-gray-50 text-[10px] text-gray-400">
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-xs mr-1"></div>
                <span>月度收入</span>
              </div>
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 bg-violet-600 rounded-xs mr-1"></div>
                <span>月度开支</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
