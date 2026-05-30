/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  PlusCircle, 
  Trash2, 
  Edit3, 
  Filter, 
  X, 
  Save, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  Tag, 
  FileText 
} from 'lucide-react';
import { TransactionRecord, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../types';

interface LedgerTabProps {
  selectedMonth: string;
  transactions: TransactionRecord[];
  onAddTransaction: (tx: Omit<TransactionRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateTransaction: (tx: TransactionRecord) => void;
  onDeleteTransaction: (id: string) => void;
  onRefresh: () => void;
}

export const LedgerTab: React.FC<LedgerTabProps> = ({
  selectedMonth,
  transactions,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onRefresh
}) => {
  // Setup forms
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'expense' as 'income' | 'expense',
    category: EXPENSE_CATEGORIES[0],
    customCategory: '',
    amount: '',
    note: ''
  });

  // Filters State
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Input Validation Error Helper
  const [errorText, setErrorText] = useState<string>('');

  // Handle category change logic, set default category for chosen type
  const handleTypeChange = (newType: 'income' | 'expense') => {
    setFormData(prev => ({
      ...prev,
      type: newType,
      category: newType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0],
      customCategory: ''
    }));
  };

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    const numericAmount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(numericAmount) || numericAmount <= 0) {
      setErrorText('⚠️ 金额不正确，必须大于 0');
      return;
    }

    if (!formData.date) {
      setErrorText('⚠️ 请选择账单日期');
      return;
    }

    const recMonth = formData.date.substring(0, 7); // Extract YYYY-MM
    const categoryName = formData.category === '其他' && formData.customCategory.trim() 
      ? '其他' 
      : formData.category;

    const payload = {
      date: formData.date,
      month: recMonth,
      type: formData.type,
      category: categoryName,
      customCategory: formData.category === '其他' ? formData.customCategory.trim() : undefined,
      amount: numericAmount,
      note: formData.note.trim(),
      source: 'manual' as 'manual' | 'salary' | 'mortgage'
    };

    if (isEditing && editingId) {
      // Find matching item to update correctly
      const match = transactions.find(t => t.id === editingId);
      if (match) {
        onUpdateTransaction({
          ...match,
          ...payload
        });
      }
      setIsEditing(false);
      setEditingId(null);
    } else {
      onAddTransaction(payload);
    }

    // Reset Form
    setFormData({
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
      category: EXPENSE_CATEGORIES[0],
      customCategory: '',
      amount: '',
      note: ''
    });
  };

  // Trigger editing state for an existing record
  const startEdit = (tx: TransactionRecord) => {
    setIsEditing(true);
    setEditingId(tx.id);
    
    // Deconstruct fields back to form
    const isCustomOther = tx.category === '其他' || (!INCOME_CATEGORIES.includes(tx.category) && !EXPENSE_CATEGORIES.includes(tx.category) && tx.type === 'income');
    
    setFormData({
      date: tx.date,
      type: tx.type,
      category: isCustomOther ? '其他' : tx.category,
      customCategory: tx.customCategory || (isCustomOther ? tx.category : ''),
      amount: tx.amount.toString(),
      note: tx.note
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
      category: EXPENSE_CATEGORIES[0],
      customCategory: '',
      amount: '',
      note: ''
    });
    setErrorText('');
  };

  // Filter records specifically belonging to the selectedMonth
  const monthFiltered = transactions.filter(t => t.month === selectedMonth);

  // Apply UI Filters on Top
  const displayRecords = monthFiltered.filter(t => {
    const typeMatch = filterType === 'all' || t.type === filterType;
    let finalCategory = t.category;
    if (t.category === '其他' && t.customCategory) {
      finalCategory = t.customCategory;
    }
    const categoryMatch = filterCategory === 'all' || finalCategory === filterCategory;
    return typeMatch && categoryMatch;
  });

  // Get distinct list of categories specifically inside the current month's log for filters
  const uniqueCategoriesInMonth = Array.from(new Set(
    monthFiltered.map(t => (t.category === '其他' && t.customCategory) ? t.customCategory : t.category)
  ));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left side: Logging/Editing Panel (4 columns desktop) */}
      <div className="lg:col-span-5 space-y-4">
        <div id="add-transaction-card" className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
          <h3 className="font-bold text-gray-800 text-lg flex items-center mb-4">
            <span className="mr-2 text-violet-700">✍️</span>
            {isEditing ? '修改这一笔账' : '记一笔收支'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type tabs toggle */}
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-2">选择账款账性</label>
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
                <button
                  type="button"
                  id="type-expense-btn"
                  onClick={() => handleTypeChange('expense')}
                  className={`py-2 text-sm font-bold rounded-lg transition-all ${formData.type === 'expense' ? 'bg-violet-600 text-white shadow-xs' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  支出 (花钱)
                </button>
                <button
                  type="button"
                  id="type-income-btn"
                  onClick={() => handleTypeChange('income')}
                  className={`py-2 text-sm font-bold rounded-lg transition-all ${formData.type === 'income' ? 'bg-violet-600 text-white shadow-xs' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  收入 (赚钱)
                </button>
              </div>
            </div>

            {/* Date Field */}
            <div>
              <label className="text-xs font-semibold text-gray-500 flex items-center mb-1.5">
                <Calendar className="w-3.5 h-3.5 mr-1 text-gray-400" /> 日期
              </label>
              <input
                type="date"
                required
                value={formData.date}
                id="input-date"
                onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3.5 py-2 rounded-xl text-sm border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-violet-500 bg-white"
              />
            </div>

            {/* Category selection */}
            <div>
              <label className="text-xs font-semibold text-gray-500 flex items-center mb-1.5">
                <Tag className="w-3.5 h-3.5 mr-1 text-gray-400" /> 选择分类
              </label>
              <select
                value={formData.category}
                id="input-category"
                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value, customCategory: '' }))}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-gray-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-violet-500"
              >
                {formData.type === 'income'
                  ? INCOME_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)
                  : EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)
                }
              </select>
            </div>

            {/* If choosing "其他" on income, provide custom category text input */}
            {formData.category === '其他' && (
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <label className="text-xs font-bold text-violet-700 block mb-1">自定义其他的分类名称</label>
                <input
                  type="text"
                  required
                  placeholder="例如：兼职、二手出清、利息"
                  value={formData.customCategory}
                  id="input-custom-category"
                  onChange={e => setFormData(prev => ({ ...prev, customCategory: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-lg text-sm border border-gray-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-violet-500"
                />
              </div>
            )}

            {/* Amount Field */}
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">数字金额 (元)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">¥</span>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={formData.amount}
                  id="input-amount"
                  onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full pl-8 pr-3.5 py-2 rounded-xl text-sm border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-violet-500 font-medium"
                />
              </div>
            </div>

            {/* Note Field */}
            <div>
              <label className="text-xs font-semibold text-gray-500 flex items-center mb-1.5">
                <FileText className="w-3.5 h-3.5 mr-1 text-gray-400" /> 备注说明 (选填)
              </label>
              <textarea
                rows={2}
                placeholder="给这笔账钱添加点备忘背景..."
                value={formData.note}
                id="input-note"
                onChange={e => setFormData(prev => ({ ...prev, note: e.target.value }))}
                className="w-full px-3.5 py-2 rounded-xl text-sm border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-violet-500"
              />
            </div>

            {errorText && (
              <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-xl font-medium border border-rose-100">
                {errorText}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {isEditing && (
                <button
                  type="button"
                  id="cancel-edit-btn"
                  onClick={cancelEdit}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
                >
                  取消
                </button>
              )}
              <button
                type="submit"
                id="submit-transaction-btn"
                className="flex-3 py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
              >
                {isEditing ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                <span>{isEditing ? '确定修改' : '记下来'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right side: Detailed Listing / Log list (7 columns desktop) */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
          {/* Header & Month summary */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 mb-4 gap-2">
            <div>
              <h3 className="font-bold text-gray-800 text-lg flex items-center">
                <span>📂 收支明细账目</span>
                <span className="ml-2 text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-md font-semibold">
                  共 {displayRecords.length} 笔
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">展示已勾选月份的所有账目明细（包含OCR导入和房贷同步）</p>
            </div>
          </div>

          {/* Table Filters Ribbon */}
          <div className="flex flex-wrap items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4">
            <div className="flex items-center space-x-1 text-xs text-gray-500 font-bold">
              <Filter className="w-3.5 h-3.5 text-violet-600" />
              <span>筛选:</span>
            </div>

            {/* Type filter */}
            <div className="flex bg-white rounded-lg p-0.5 border border-gray-100 shadow-xs">
              {(['all', 'income', 'expense'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  id={`filter-type-${t}`}
                  onClick={() => setFilterType(t)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${filterType === t ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  {t === 'all' ? '全部' : t === 'income' ? '仅收入' : '仅支出'}
                </button>
              ))}
            </div>

            {/* Dynamic Category filter based on unique categories listed in Month */}
            <select
              value={filterCategory}
              id="filter-category"
              onChange={e => setFilterCategory(e.target.value)}
              className="px-2 py-1 text-xs font-semibold bg-white rounded-lg border border-gray-200 text-gray-700 outline-hidden focus:ring-1 focus:ring-violet-500"
            >
              <option value="all">所有分类</option>
              {uniqueCategoriesInMonth.map(cName => (
                <option key={cName} value={cName}>{cName}</option>
              ))}
            </select>

            {/* Clear Filters helper */}
            {(filterType !== 'all' || filterCategory !== 'all') && (
              <button
                type="button"
                id="clear-filters-btn"
                onClick={() => { setFilterType('all'); setFilterCategory('all'); }}
                className="text-xs text-violet-600 hover:text-violet-700 font-bold flex items-center space-x-0.5 ml-auto"
              >
                <X className="w-3.5 h-3.5" />
                <span>重置</span>
              </button>
            )}
          </div>

          {/* Ledger Records list */}
          {displayRecords.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-gray-200">
              <span className="text-3xl">📭</span>
              <p className="text-gray-400 text-sm mt-2 font-medium">所选月份或筛选条件下，暂无任何收支记录哦。</p>
              <p className="text-xs text-gray-400 mt-1">您可以试着用左边的面板快写一笔，或者去「看工资条」里上传工资截图！</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto pr-1">
              {displayRecords.map(item => {
                const isInc = item.type === 'income';
                const hasSource = item.source !== 'manual';
                const sourceBadge = item.source === 'salary' 
                  ? '🏷️ 工资条' 
                  : item.source === 'mortgage' 
                    ? '🏠 房贷同步' 
                    : null;

                // Category tag display
                const tagDisplay = (item.category === '其他' && item.customCategory) 
                  ? item.customCategory 
                  : item.category;

                return (
                  <div key={item.id} className="py-3.5 flex items-center justify-between hover:bg-gray-50/70 px-2 rounded-xl transition-colors">
                    <div className="flex items-center space-x-3 min-w-0">
                      {/* Direction Icon indicator */}
                      <div className={`p-2 rounded-full shrink-0 ${isInc ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {isInc ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-gray-800 text-sm">{tagDisplay}</span>
                          {sourceBadge && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
                              {sourceBadge}
                            </span>
                          )}
                        </div>
                        {/* Note and Date */}
                        <div className="flex items-center space-x-2 mt-1 text-xs text-gray-400">
                          <span className="shrink-0">{item.date}</span>
                          {item.note && (
                            <>
                              <span>•</span>
                              <p className="truncate" title={item.note}>{item.note}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0 ml-4">
                      {/* Amount display */}
                      <span className={`font-bold text-sm sm:text-base ${isInc ? 'text-emerald-600' : 'text-gray-900'}`}>
                        {isInc ? '+' : '-'}¥{item.amount.toLocaleString()}
                      </span>

                      {/* Operation action icons */}
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="p-1.5 hover:bg-violet-50 text-gray-400 hover:text-violet-600 rounded-lg transition-colors"
                          title="修改"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTransaction(item.id)}
                          className="p-1.5 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
