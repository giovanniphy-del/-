/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TransactionRecord {
  id: string;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  type: 'income' | 'expense';
  category: string;
  customCategory?: string; // For "Other" custom name
  amount: number;
  note: string;
  source: 'manual' | 'salary' | 'mortgage';
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyFinanceConfig {
  month: string; // YYYY-MM
  monthlyIncomeTarget: number; // 这个月想赚多少
  monthlyExpenseLimit: number; // 这个月最多花多少
}

export interface UserFinanceSettings {
  openingDeposit: number; // 一开始有多少钱
}

export interface MortgageInfo {
  totalMortgageAmount: number; // 贷款总额 (不含首付)
  downPayment: number; // 首付
  totalMonths: number; // 总还款月数 (例如 360)
  paidMonths: number; // 已还月数
  note: string;
}

export interface MortgageMonthlyRecord {
  month: string; // YYYY-MM
  currentMonthDue: number; // 这个月要还
  currentMonthPaid: number; // 这个月已还
  currentMonthStatus: 'paid' | 'unpaid';
  repaymentDate: string; // YYYY-MM-DD (选填)
  remainingMortgageAmount: number; // 还剩贷款
  remainingMonths: number; // 还要还多久
  availableAfterMortgage: number; // 还完房贷还剩
  syncedToExpense: boolean;
  relatedTransactionId?: string;
}

export interface SalaryBenefitRecord {
  id: string;
  salaryMonth: string; // YYYY-MM
  bankPayment: number; // 银行支付 / 实收金额
  personalIncomeTax: number; // 个税
  housingFundPersonal: number; // 公积金个人
  housingFundCompany: number; // 公积金单位
  housingFundTotal: number; // 公积金合计
  socialSecurityPersonal: number; // 社保个人
  socialSecurityCompany: number; // 社保单位
  socialSecurityTotal: number; // 社保合计
  benefitTotal: number; // 社保公积金合计
  comprehensiveIncomeReference: number; // 综合收入参考 (实收 + 单位社保/公积金)
  imageCount: number; // 图片数量
  recognitionStatus: 'success' | 'failed' | 'edited';
  userConfirmed: boolean;
  syncedToIncome: boolean;
  relatedTransactionId?: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

// Fixed preset categories
export const INCOME_CATEGORIES = ['工资', '广告', '直播', '基金/股票', '其他'];
export const EXPENSE_CATEGORIES = ['购物', '吃饭', '买菜', '家里物品', '逛街', '人情往来', '房贷', '学习费用', '公益'];
