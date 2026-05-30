/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Home, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Info,
  Calendar,
  Save
} from 'lucide-react';
import { MortgageInfo, MortgageMonthlyRecord } from '../types';

interface MortgageTabProps {
  selectedMonth: string;
  mortgageInfo: MortgageInfo;
  onUpdateMortgageInfo: (info: MortgageInfo) => void;
  mortgageRecord: MortgageMonthlyRecord;
  onUpdateMortgageRecord: (rec: MortgageMonthlyRecord) => void;
  onSyncMortgageToLedger: (rec: MortgageMonthlyRecord) => void;
  onRefresh: () => void;
}

export const MortgageTab: React.FC<MortgageTabProps> = ({
  selectedMonth,
  mortgageInfo,
  onUpdateMortgageInfo,
  mortgageRecord,
  onUpdateMortgageRecord,
  onSyncMortgageToLedger,
  onRefresh
}) => {
  const [yearStr, monthStr] = selectedMonth.split('-');
  const displayMonthName = `${yearStr}年${parseInt(monthStr, 10)}月`;

  // Mortgage info forms specs
  const [mortgageForm, setMortgageForm] = useState({
    totalMortgageAmount: mortgageInfo.totalMortgageAmount,
    downPayment: mortgageInfo.downPayment,
    totalMonths: mortgageInfo.totalMonths,
    paidMonths: mortgageInfo.paidMonths,
    note: mortgageInfo.note
  });

  // Track state of current chosen month repayment
  const [localRepaymentDue, setLocalRepaymentDue] = useState<string>(mortgageRecord.currentMonthDue.toString());
  const [localRepaymentPaid, setLocalRepaymentPaid] = useState<string>(
    mortgageRecord.currentMonthStatus === 'paid' 
      ? (mortgageRecord.currentMonthPaid || mortgageRecord.currentMonthDue).toString() 
      : '0'
  );
  const [repaymentDate, setRepaymentDate] = useState<string>(mortgageRecord.repaymentDate || '');
  const [repaymentStatus, setRepaymentStatus] = useState<'paid' | 'unpaid'>(mortgageRecord.currentMonthStatus);

  // Synchronize when month changes or props update
  useEffect(() => {
    setMortgageForm({
      totalMortgageAmount: mortgageInfo.totalMortgageAmount,
      downPayment: mortgageInfo.downPayment,
      totalMonths: mortgageInfo.totalMonths,
      paidMonths: mortgageInfo.paidMonths,
      note: mortgageInfo.note
    });
  }, [mortgageInfo]);

  useEffect(() => {
    setLocalRepaymentDue(mortgageRecord.currentMonthDue.toString());
    setLocalRepaymentPaid(
      mortgageRecord.currentMonthStatus === 'paid' 
        ? (mortgageRecord.currentMonthPaid || mortgageRecord.currentMonthDue).toString() 
        : '0'
    );
    setRepaymentDate(mortgageRecord.repaymentDate || '');
    setRepaymentStatus(mortgageRecord.currentMonthStatus);
  }, [mortgageRecord, selectedMonth]);

  // Sync general Mortgage Specs
  const handleSaveMortgageSpecs = (e: React.FormEvent) => {
    e.preventDefault();
    const totalM = parseFloat(mortgageForm.totalMortgageAmount as any);
    const downP = parseFloat(mortgageForm.downPayment as any);
    const totalMn = parseInt(mortgageForm.totalMonths as any, 10);
    const paidMn = parseInt(mortgageForm.paidMonths as any, 10);

    if (isNaN(totalM) || totalM < 0 || isNaN(downP) || downP < 0) {
      alert('⚠️ 贷款总额与首付额必须大于等于 0');
      return;
    }
    if (isNaN(totalMn) || totalMn <= 0 || isNaN(paidMn) || paidMn < 0 || paidMn > totalMn) {
      alert('⚠️ 还款期数比例与总数不合常理');
      return;
    }

    const payload: MortgageInfo = {
      totalMortgageAmount: totalM,
      downPayment: downP,
      totalMonths: totalMn,
      paidMonths: paidMn,
      note: mortgageForm.note.trim()
    };

    onUpdateMortgageInfo(payload);
    alert('🎉 恭喜，我的房贷核心资产信息同步成功！请在右侧登记该月的银行自动代扣。');
  };

  // Sync monthly payment data & options to record ledger
  const handleSaveMonthlyRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    const dueAmt = parseFloat(localRepaymentDue);
    const paidAmt = statusIsPaid ? parseFloat(localRepaymentPaid) : 0;

    if (isNaN(dueAmt) || dueAmt < 0) {
      alert('⚠️ 这个月应还房贷必须是有效金额');
      return;
    }

    const computedAverageMonthly = mortgageInfo.totalMonths > 0 
      ? Math.round(mortgageInfo.totalMortgageAmount / mortgageInfo.totalMonths) 
      : 0;
    
    const historicalCumulative = mortgageInfo.paidMonths * computedAverageMonthly;
    const finalPaid = statusIsPaid ? (paidAmt || dueAmt) : 0;
    const computedRemainingBalance = Math.max(0, mortgageInfo.totalMortgageAmount - historicalCumulative - finalPaid);
    const computedRemainingMonths = Math.max(0, mortgageInfo.totalMonths - mortgageInfo.paidMonths - (statusIsPaid ? 1 : 0));

    const updatedRecord: MortgageMonthlyRecord = {
      month: selectedMonth,
      currentMonthDue: dueAmt,
      currentMonthPaid: finalPaid,
      currentMonthStatus: repaymentStatus,
      repaymentDate: repaymentDate || (statusIsPaid ? new Date().toISOString().split('T')[0] : ''),
      remainingMortgageAmount: computedRemainingBalance,
      remainingMonths: computedRemainingMonths,
      availableAfterMortgage: 0,
      syncedToExpense: mortgageRecord.syncedToExpense,
      relatedTransactionId: mortgageRecord.relatedTransactionId
    };

    onUpdateMortgageRecord(updatedRecord);

    if (statusIsPaid) {
      const confirmSync = window.confirm(`🏠 是否要把这笔已缴还房贷 ¥${finalPaid} 自动同步作为 ${displayMonthName} 的「房贷」扣缴支出，以便精确核计现在剩余存款？`);
      if (confirmSync) {
        onSyncMortgageToLedger(updatedRecord);
      }
    } else {
      alert(`🎉 ${displayMonthName} 还款状态已更新标记为【未扣缴】。`);
    }
  };

  const statusIsPaid = repaymentStatus === 'paid';

  // Calculations for current mortgage specs display
  const totalInvestment = mortgageInfo.totalMortgageAmount + mortgageInfo.downPayment;
  const computedAverageMonthly = mortgageInfo.totalMonths > 0 
    ? Math.round(mortgageInfo.totalMortgageAmount / mortgageInfo.totalMonths) 
    : 0;
  const historicalCumulative = mortgageInfo.paidMonths * computedAverageMonthly;
  const totalRemainingLoan = Math.max(0, mortgageInfo.totalMortgageAmount - historicalCumulative - (statusIsPaid ? mortgageRecord.currentMonthPaid : 0));
  const monthsRemaining = Math.max(0, mortgageInfo.totalMonths - mortgageInfo.paidMonths - (statusIsPaid ? 1 : 0));

  return (
    <div className="space-y-6">
      {/* Informative ribbon showing the selected month for alignment */}
      <div className="bg-white rounded-2xl p-4.5 border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="text-xl">🏠</span>
          <div>
            <h3 className="font-extrabold text-sm text-gray-800">房贷管理舱</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">登记房贷大额规格并计算扣缴月度。当前对账归档月份：<strong className="text-violet-700">{displayMonthName}</strong>。</p>
          </div>
        </div>
        <span className="text-xs shrink-0 self-start sm:self-center font-bold px-2 py-0.5 rounded bg-violet-50 text-violet-700">房贷与房盘精算</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* L: Total mortgage asset specs configuration (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-gray-100 shadow-xs h-fit space-y-4">
          <h3 className="font-bold text-gray-800 text-sm flex items-center border-b border-gray-50 pb-2">
            <Home className="w-4 h-4 text-violet-600 mr-2" />
            <span>房贷总规格（大房盘资产）</span>
          </h3>

          <form onSubmit={handleSaveMortgageSpecs} className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1 font-semibold">贷款总额（不含首付，元）</label>
              <input
                type="number"
                value={mortgageForm.totalMortgageAmount || ''}
                id="mortgage-total-amount"
                onChange={e => setMortgageForm(prev => ({ ...prev, totalMortgageAmount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 rounded-xl text-xs border border-gray-200 focus:ring-1 focus:ring-violet-500 bg-white"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1 font-semibold">首付款金额（元）</label>
              <input
                type="number"
                value={mortgageForm.downPayment || ''}
                id="mortgage-down-payment"
                onChange={e => setMortgageForm(prev => ({ ...prev, downPayment: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 rounded-xl text-xs border border-gray-200 bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs text-gray-500 block mb-1 font-semibold">总还款月数</label>
                <input
                  type="number"
                  value={mortgageForm.totalMonths || ''}
                  id="mortgage-total-months"
                  onChange={e => setMortgageForm(prev => ({ ...prev, totalMonths: parseInt(e.target.value, 15) || 0 }))}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-gray-200 bg-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1 font-semibold">历史已缴月数</label>
                <input
                  type="number"
                  value={mortgageForm.paidMonths || ''}
                  id="mortgage-paid-months"
                  onChange={e => setMortgageForm(prev => ({ ...prev, paidMonths: parseInt(e.target.value, 10) || 0 }))}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-gray-200 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1 font-semibold">档案批注（利率/银行等）</label>
              <input
                type="text"
                placeholder="如还款形式等"
                value={mortgageForm.note}
                id="mortgage-note"
                onChange={e => setMortgageForm(prev => ({ ...prev, note: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-xs border border-gray-200 bg-white"
              />
            </div>

            <button
              type="submit"
              id="mortgage-specs-submit"
              className="w-full py-2.5 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-xl text-xs transition-colors"
            >
              更新保存房贷基础档案
            </button>
          </form>
        </div>

        {/* R: Monthly repayment recorder for current selectedMonth (7 cols) */}
        <div className="lg:col-span-12 xl:col-span-7 lg:col-start-6 lg:row-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-violet-100 shadow-xs space-y-4">
            <h3 className="font-bold text-gray-800 text-sm flex items-center border-b border-gray-50 pb-2">
              <span className="p-1 text-xs bg-emerald-50 text-emerald-600 rounded mr-2">📅</span>
              <span>房贷月供快速标记（{displayMonthName}）</span>
            </h3>

            <form onSubmit={handleSaveMonthlyRepayment} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1.5">还贷完成状态</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl">
                  <button
                    type="button"
                    id="mortgage-status-unpaid"
                    onClick={() => { setRepaymentStatus('unpaid'); setLocalRepaymentPaid('0'); }}
                    className={`py-2 text-xs font-bold rounded-lg transition-colors ${!statusIsPaid ? 'bg-red-500 text-white shadow-xs' : 'text-gray-400 hover:text-gray-700'}`}
                  >
                    未行缴 / 扣缴失误
                  </button>
                  <button
                    type="button"
                    id="mortgage-status-paid"
                    onClick={() => { setRepaymentStatus('paid'); setLocalRepaymentPaid(localRepaymentDue); }}
                    className={`py-2 text-xs font-bold rounded-lg transition-colors ${statusIsPaid ? 'bg-emerald-500 text-white shadow-xs' : 'text-gray-400 hover:text-gray-700'}`}
                  >
                    已在网银还清
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5 font-semibold">此月须偿还金额（元）</label>
                  <input
                    type="number"
                    value={localRepaymentDue}
                    id="mortgage-repayment-due"
                    onChange={e => setLocalRepaymentDue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-gray-200 focus:ring-1 focus:ring-violet-500 bg-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1.5 font-semibold">此月已付供楼款（元）</label>
                  <input
                    type="number"
                    disabled={!statusIsPaid}
                    value={statusIsPaid ? localRepaymentPaid : '0'}
                    id="mortgage-repayment-paid"
                    onChange={e => setLocalRepaymentPaid(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${!statusIsPaid ? 'bg-gray-55 text-gray-400 cursor-not-allowed border-gray-150' : 'border-emerald-250 bg-white font-bold text-emerald-700'}`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1.5 font-semibold">扣款交割日期</label>
                <input
                  type="date"
                  value={repaymentDate}
                  id="mortgage-repayment-date"
                  onChange={e => setRepaymentDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-gray-200 bg-white text-gray-700"
                />
              </div>

              {!statusIsPaid ? (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start space-x-2 text-xs text-rose-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>本月月供尚未划扣，请千万记得在还款日前保证账户备妥 ¥{parseFloat(localRepaymentDue || '0').toLocaleString()} 自动划扣资金底盘！</span>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start space-x-2 text-xs text-emerald-800">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span>太棒啦！这笔房贷已划缴，我们可以把月供实际同步生成本月支出，让账户现金流对账算账更为无懈可击。</span>
                </div>
              )}

              <button
                type="submit"
                id="mortgage-repayment-submit"
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs transition-colors"
              >
                点此落锁确认并按设定记入状态
              </button>
            </form>
          </div>

          {/* Theoretical Calculations Panel */}
          <div className="bg-slate-50 border border-gray-150 rounded-2xl p-5 space-y-4">
            <h4 className="font-bold text-gray-800 text-xs tracking-wider uppercase flex items-center">
              <Info className="w-3.5 h-3.5 text-indigo-500 mr-2" />
              <span>💡 精算舱：您的总房产与账本对齐盘点</span>
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
              <div className="bg-white p-3 rounded-xl border border-gray-150 text-center">
                <span className="text-gray-400 block mb-0.5">房屋总体前期出资估算</span>
                <span className="font-extrabold text-gray-800 text-sm">¥{totalInvestment.toLocaleString()}</span>
                <p className="text-[9px] text-gray-400 mt-0.5">贷款 + 首付款</p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-gray-150 text-center">
                <span className="text-gray-400 block mb-0.5">历史累计偿还大本金</span>
                <span className="font-extrabold text-gray-800 text-sm">¥{historicalCumulative.toLocaleString()}</span>
                <p className="text-[9px] text-gray-400 mt-0.5">已兑付 {mortgageInfo.paidMonths} 期</p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-gray-150 text-center col-span-2 md:col-span-1">
                <span className="text-gray-400 block mb-0.5">剩余未还金额（估算）</span>
                <span className="font-extrabold text-violet-700 text-sm">¥{totalRemainingLoan.toLocaleString()}</span>
                <p className="text-[9px] text-gray-400 mt-0.5">还剩下 {monthsRemaining} 期月供</p>
              </div>
            </div>

            <div className="text-[9px] text-gray-400 text-center leading-relaxed">
              * 目前估算采用：未偿余数 = 总贷款本金 - （理论平均月缴数额 × 历史期数） - 选中月份实际已付款。具体贷款本金细节以您所在的公积金及银行等额本息/本息代扣单为准。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
