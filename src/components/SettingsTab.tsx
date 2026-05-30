/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  PiggyBank, 
  TrendingUp, 
  TrendingDown, 
  Save, 
  CheckCircle2,
  Info 
} from 'lucide-react';

interface SettingsTabProps {
  selectedMonth: string;
  openingDeposit: number;
  onUpdateOpeningDeposit: (amount: number) => void;
  monthlyIncomeTarget: number;
  monthlyExpenseLimit: number;
  onUpdateMonthlyConfig: (income: number, expense: number) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  selectedMonth,
  openingDeposit,
  onUpdateOpeningDeposit,
  monthlyIncomeTarget,
  monthlyExpenseLimit,
  onUpdateMonthlyConfig
}) => {
  const [yearStr, monthStr] = selectedMonth.split('-');
  const displayMonthName = `${yearStr}年${parseInt(monthStr, 10)}月`;

  // Local state inputs synced to props
  const [localOpeningDeposit, setLocalOpeningDeposit] = useState<string>(openingDeposit.toString());
  const [targetIncome, setTargetIncome] = useState<string>(monthlyIncomeTarget.toString());
  const [targetExpense, setTargetExpense] = useState<string>(monthlyExpenseLimit.toString());

  // Keep local states up-to-date when values change due to month changes
  useEffect(() => {
    setLocalOpeningDeposit(openingDeposit.toString());
    setTargetIncome(monthlyIncomeTarget.toString());
    setTargetExpense(monthlyExpenseLimit.toString());
  }, [openingDeposit, monthlyIncomeTarget, monthlyExpenseLimit, selectedMonth]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const depositNum = parseFloat(localOpeningDeposit);
    const incNum = parseFloat(targetIncome);
    const expNum = parseFloat(targetExpense);

    if (isNaN(depositNum) || depositNum < 0) {
      alert('⚠️ 一开始有多少钱（初始存底）必须大于或等于 0');
      return;
    }
    if (isNaN(incNum) || incNum < 0 || isNaN(expNum) || expNum < 0) {
      alert('⚠️ 这个月收益目标或花费支出预算必须大于或等于 0');
      return;
    }

    onUpdateOpeningDeposit(depositNum);
    onUpdateMonthlyConfig(incNum, expNum);
    alert(`🎉 恭喜，我的基础理财指标已在本地数据库更新成功！\n\n已成功将 ${displayMonthName} 的财务指标与理财计算器重设。`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Information Header Guide Card */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-start space-x-3">
        <div className="bg-violet-50 text-violet-600 p-2.5 rounded-xl mt-0.5">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800 text-lg">我的设置柜</h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            在这里灵活设置您最初拥有的本金，以及每个自然月独创的目标和预算。这些数字能帮您衡量存款状况是否超纲。当前对应调整的是：<strong className="text-violet-700 font-extrabold">{displayMonthName}</strong>。
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-150 shadow-xs">
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* 💰 Opening deposit settings */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center">
              <PiggyBank className="w-4 h-4 mr-1.5 text-violet-600" />
              <span>一开始有多少钱（初始总存款）</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-extrabold text-sm">¥</span>
              <input
                type="number"
                step="any"
                required
                value={localOpeningDeposit}
                id="settings-opening-deposit"
                onChange={e => setLocalOpeningDeposit(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-violet-500 bg-white font-bold text-gray-800"
              />
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              * 这指的是您在使用该记账助手前拥有的总存款安全垫底数。记账流水中的【累计收入】和【累计支出】会在该数额的基础上累计计算出您的【现在还剩】账户总余额。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 🎯 Target Income settings */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center">
                <TrendingUp className="w-4 h-4 mr-1.5 text-emerald-500" />
                <span>这个月想赚多少（收入目标）</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-extrabold text-sm">¥</span>
                <input
                  type="number"
                  step="any"
                  required
                  value={targetIncome}
                  id="settings-target-income"
                  onChange={e => setTargetIncome(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-violet-500 bg-white font-bold"
                />
              </div>
              <p className="text-[10px] text-gray-400">
                可为该月单独定制。
              </p>
            </div>

            {/* 💸 Budget limit settings */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center">
                <TrendingDown className="w-4 h-4 mr-1.5 text-rose-500" />
                <span>这个月最多花多少（支出预算）</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-extrabold text-sm">¥</span>
                <input
                  type="number"
                  step="any"
                  required
                  value={targetExpense}
                  id="settings-target-expense"
                  onChange={e => setTargetExpense(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-violet-500 bg-white font-bold"
                />
              </div>
              <p className="text-[10px] text-gray-400">
                达到该数额时首页将进行气泡预警。
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-start space-x-2">
            <Info className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
            <span className="text-[10px] text-gray-500 leading-relaxed">
              温馨提示：在首页切换月份时，由于每个月的挣钱规划和预算上限可以因人而异（例如双十一购物季月度预算可以设得稍微高一些），您可以到设置柜里随时修正对应选中月份的月度收益和开销指标。
            </span>
          </div>

          <button
            type="submit"
            id="settings-submit-btn"
            className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-colors shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>保存我的设置与指标参数</span>
          </button>
        </form>
      </div>
    </div>
  );
};
