/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Upload, 
  Trash2, 
  Camera, 
  FileCheck, 
  AlertCircle, 
  Sparkles, 
  Save, 
  RefreshCw, 
  FileSpreadsheet,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { SalaryBenefitRecord } from '../types';
import { Database } from '../db';

interface SalaryOcrTabProps {
  records: SalaryBenefitRecord[];
  onAddSalaryRecord: (rec: Omit<SalaryBenefitRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateSalaryRecord: (rec: SalaryBenefitRecord) => void;
  onDeleteSalaryRecord: (id: string) => void;
  onSyncToLedger: (rec: SalaryBenefitRecord, forceAdd: boolean) => void;
  onRefresh: () => void;
}

export const SalaryOcrTab: React.FC<SalaryOcrTabProps> = ({
  records,
  onAddSalaryRecord,
  onUpdateSalaryRecord,
  onDeleteSalaryRecord,
  onSyncToLedger,
  onRefresh
}) => {
  // Upload States
  const [imageList, setImageList] = useState<{ id: string; file: File; base64: string; name: string; status: 'idle' | 'ocr' | 'success' | 'failed' }[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [ocrError, setOcrError] = useState<string>('');

  // Verification Screen state ("核对一下")
  const [showVerifyScreen, setShowVerifyScreen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<Omit<SalaryBenefitRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }>({
    salaryMonth: new Date().toISOString().substring(0, 7),
    bankPayment: 15000,
    personalIncomeTax: 1000,
    housingFundPersonal: 1200,
    housingFundCompany: 1200,
    housingFundTotal: 2400,
    socialSecurityPersonal: 1600,
    socialSecurityCompany: 3600,
    socialSecurityTotal: 5200,
    benefitTotal: 7600,
    comprehensiveIncomeReference: 19800,
    imageCount: 0,
    recognitionStatus: 'success',
    userConfirmed: false,
    syncedToIncome: false,
    note: ''
  });

  // Annual overview Year selection state
  const [benefitYear, setBenefitYear] = useState<string>('2026');

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Multi-image selection trigger
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      filesArr.forEach((file: any) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const rawBase64 = reader.result as string;
          // Strip data URLs headers to get clean payload
          const base64Data = rawBase64.replace(/^data:image\/[a-z]+;base64,/, "");

          setImageList(prev => [
            ...prev,
            {
              id: 'img-' + Math.random().toString(36).substring(2, 9),
              file: file as File,
              base64: base64Data,
              name: file.name,
              status: 'idle'
            }
          ]);
        };
        reader.readAsDataURL(file as File);
      });
      // Clear target to allow repeated select
      e.target.value = '';
    }
  };

  const removeUploadImage = (id: string) => {
    setImageList(prev => prev.filter(img => img.id !== id));
  };

  // Perform Gemini full OCR
  const triggerOcrRecognition = async () => {
    if (imageList.length === 0) {
      setOcrError('⚠️ 请先上传至少一张工资单或银行支付截图。');
      return;
    }

    setIsProcessing(true);
    setOcrError('');

    // Mark image elements as OCR status
    setImageList(prev => prev.map(img => ({ ...img, status: 'ocr' })));

    try {
      // Assemble parts payload
      const imagesPayload = imageList.map(img => ({
        mimeType: img.file.type,
        data: img.base64
      }));

      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: imagesPayload })
      });

      const body = await res.json();

      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Gemini OCR 模块目前异常。');
      }

      // Successful result parsing
      const report = body.data;

      // Update OCR status labels
      setImageList(prev => prev.map(img => ({ ...img, status: 'success' })));

      // Populate Editing verify state with computed fields
      const fundTotal = (report.housingFundPersonal || 0) + (report.housingFundCompany || 0);
      const ssTotal = (report.socialSecurityPersonal || 0) + (report.socialSecurityCompany || 0);
      const benTotal = fundTotal + ssTotal;
      const compIncome = (report.bankPayment || 0) + (report.housingFundCompany || 0) + (report.socialSecurityCompany || 0);

      setEditingRecord({
        salaryMonth: report.salaryMonth || new Date().toISOString().substring(0, 7),
        bankPayment: report.bankPayment || 0,
        personalIncomeTax: report.personalIncomeTax || 0,
        housingFundPersonal: report.housingFundPersonal || 0,
        housingFundCompany: report.housingFundCompany || 0,
        housingFundTotal: fundTotal,
        socialSecurityPersonal: report.socialSecurityPersonal || 0,
        socialSecurityCompany: report.socialSecurityCompany || 0,
        socialSecurityTotal: ssTotal,
        benefitTotal: benTotal,
        comprehensiveIncomeReference: compIncome,
        imageCount: imageList.length,
        recognitionStatus: 'success',
        userConfirmed: false,
        syncedToIncome: false,
        note: report.note || 'AI多图分析成功，数据合并完成。'
      });

      setShowVerifyScreen(true);
    } catch (err: any) {
      console.error('OCR Process failed:', err);
      setImageList(prev => prev.map(img => ({ ...img, status: 'failed' })));
      setOcrError(err.message || '识别工资条失败，您可以点击页面下手写登记。');

      // Setup clean blank verify state to allow manual override
      setEditingRecord({
        salaryMonth: new Date().toISOString().substring(0, 7),
        bankPayment: 0,
        personalIncomeTax: 0,
        housingFundPersonal: 0,
        housingFundCompany: 0,
        housingFundTotal: 0,
        socialSecurityPersonal: 0,
        socialSecurityCompany: 0,
        socialSecurityTotal: 0,
        benefitTotal: 0,
        comprehensiveIncomeReference: 0,
        imageCount: imageList.length,
        recognitionStatus: 'failed',
        userConfirmed: false,
        syncedToIncome: false,
        note: 'OCR系统出错或无接口应答，您可以用此空白表单手写补充录入。'
      });
      setShowVerifyScreen(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // Skip artificial OCR option to trigger sheet manually
  const triggerManualForm = () => {
    setEditingRecord({
      salaryMonth: new Date().toISOString().substring(0, 7),
      bankPayment: 0,
      personalIncomeTax: 0,
      housingFundPersonal: 0,
      housingFundCompany: 0,
      housingFundTotal: 0,
      socialSecurityPersonal: 0,
      socialSecurityCompany: 0,
      socialSecurityTotal: 0,
      benefitTotal: 0,
      comprehensiveIncomeReference: 0,
      imageCount: 0,
      recognitionStatus: 'edited',
      userConfirmed: false,
      syncedToIncome: false,
      note: '用户起草的空白工资账单，欢迎补充修改。'
    });
    setOcrError('');
    setShowVerifyScreen(true);
  };

  // Form edit handlers with math synchronization
  const handleFormInputChange = (field: string, val: string | number) => {
    setEditingRecord(prev => {
      const next: any = { ...prev, [field]: val };

      // Cast numeric strings back
      if (typeof val === 'string' && field !== 'salaryMonth' && field !== 'note') {
        const num = parseFloat(val);
        next[field] = isNaN(num) ? 0 : num;
      }

      // Re-sum dynamic indicators immediately
      next.housingFundTotal = next.housingFundPersonal + next.housingFundCompany;
      next.socialSecurityTotal = next.socialSecurityPersonal + next.socialSecurityCompany;
      next.benefitTotal = next.housingFundTotal + next.socialSecurityTotal;
      next.comprehensiveIncomeReference = next.bankPayment + next.housingFundCompany + next.socialSecurityCompany;

      return next;
    });
  };

  // Save parsed wages
  const saveVerifiedRecord = () => {
    const payload = {
      ...editingRecord,
      userConfirmed: true
    };

    if (payload.id) {
      onUpdateSalaryRecord(payload as SalaryBenefitRecord);
    } else {
      onAddSalaryRecord(payload);
    }

    // Post processing sync prompt asks if to post to ledger
    let syncConfirmed = true;
    try {
      syncConfirmed = window.confirm(`🎉 工资已经录入成功。\n\n是否同时把实收金额 ¥${payload.bankPayment.toLocaleString()} 自动同步到本月记账流水的「工资」收入科目里？`);
    } catch (err) {
      // Default to true if sandboxed iframe restricts modal alerts
      syncConfirmed = true;
    }
    
    if (syncConfirmed) {
      // Re-fetch records list to capture newly-created record or pass down mock payload
      const itemToSync = {
        ...payload,
        id: payload.id || 'new-salary-temp-id'
      } as SalaryBenefitRecord;

      onSyncToLedger(itemToSync, true);
    }

    // Reset workflow
    setImageList([]);
    setShowVerifyScreen(false);
  };

  const startEditExistingRecord = (rec: SalaryBenefitRecord) => {
    setEditingRecord(rec);
    setShowVerifyScreen(true);
  };

  // Calculate annual aggregation for selected year (section 17.5)
  const annualTxs = records.filter(r => r.salaryMonth.startsWith(benefitYear));
  const totBankPayment = annualTxs.reduce((sum, r) => sum + r.bankPayment, 0);
  const totTax = annualTxs.reduce((sum, r) => sum + r.personalIncomeTax, 0);
  const totPersonalFund = annualTxs.reduce((sum, r) => sum + r.housingFundPersonal, 0);
  const totCompanyFund = annualTxs.reduce((sum, r) => sum + r.housingFundCompany, 0);
  const totFund = totPersonalFund + totCompanyFund;

  const totPersonalSocial = annualTxs.reduce((sum, r) => sum + r.socialSecurityPersonal, 0);
  const totCompanySocial = annualTxs.reduce((sum, r) => sum + r.socialSecurityCompany, 0);
  const totSocial = totPersonalSocial + totCompanySocial;

  const totBenefit = totFund + totSocial;

  return (
    <div className="space-y-6">
      {/* OCR Workspace & Drop Area panel (Shown when not viewing the nuclear verify form) */}
      {!showVerifyScreen ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* L: Upload & Image lists (6 columns) */}
          <div className="md:col-span-7 bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-gray-800 text-lg flex items-center">
                <span className="mr-2 text-violet-700">📸</span>
                <span>工资截图AI自动识别</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                上传公司工资信、后台页面截图、或者资金到账通知，AI助理可同时合并分析并解构实收、税项、个人公积金或五险一金等权益。
              </p>
            </div>

            {/* Simulated file selection box */}
            <div className="border-2 border-dashed border-gray-200 hover:border-violet-400 bg-gray-50/50 rounded-2xl p-6 text-center transition-colors relative cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="选择多张工资截图"
              />
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-700">点击或拖拽上传工资截图</p>
              <p className="text-xs text-gray-400 mt-1">支持 PNG, JPG, JPEG 等格式格式，最多连选9张合并识别</p>
            </div>

            {/* List of uploaded screenshots */}
            {imageList.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-gray-500 font-semibold px-1">
                  <span>待识别图片（{imageList.length}张）</span>
                  <button 
                    type="button" 
                    onClick={() => setImageList([])}
                    className="text-rose-600 hover:text-rose-700 font-bold"
                  >
                    全部清除
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {imageList.map((img, idx) => (
                    <div key={img.id} className="relative group border border-gray-100 bg-white p-2 rounded-xl text-center shadow-2xs">
                      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden mb-1 relative">
                        {/* Status overlays */}
                        {img.status === 'ocr' ? (
                          <div className="absolute inset-0 bg-violet-900/60 flex items-center justify-center text-white text-xs">
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          </div>
                        ) : img.status === 'success' ? (
                          <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </div>
                        ) : null}
                        <img 
                          src={`data:image/png;base64,${img.base64}`} 
                          alt="工资条" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      
                      <p className="text-[10px] text-gray-400 truncate max-w-full px-1">{img.name}</p>
                      
                      <button
                        type="button"
                        onClick={() => removeUploadImage(img.id)}
                        className="absolute -top-1.5 -right-1.5 bg-rose-100 text-rose-700 rounded-full p-1 border border-rose-200 shadow-xs hover:bg-rose-200 hover:text-rose-800 transition-colors"
                        title="移除截图"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ocrError && (
              <div className="p-3 text-xs bg-rose-50 border border-rose-100 text-rose-700 rounded-xl flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{ocrError}</span>
              </div>
            )}

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={triggerManualForm}
                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold text-center transition-colors"
              >
                📝 不传图，直接手写登记工资
              </button>
              
              <button
                type="button"
                disabled={imageList.length === 0 || isProcessing}
                onClick={triggerOcrRecognition}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white flex items-center justify-center space-x-1.5 transition-colors shadow-xs ${imageList.length === 0 || isProcessing ? 'bg-gray-300 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-700'}`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AI助理深度联脑识别中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>开始大模型智能提取 ({imageList.length}张)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* R: Explain OCR Rules & help guidelines (5 columns) */}
          <div className="md:col-span-5 bg-gray-50/50 p-5 rounded-2xl border border-gray-150 space-y-4">
            <h4 className="font-bold text-gray-800 text-xs tracking-wider uppercase">💡 大模型工资识别指南</h4>
            
            <div className="space-y-3.5 text-xs text-gray-600">
              <div className="flex space-x-2">
                <span className="bg-violet-100 text-violet-700 rounded-full w-5 h-5 shrink-0 flex items-center justify-center font-bold">1</span>
                <div>
                  <h5 className="font-bold text-gray-700">优先识别到账 & 现金实收</h5>
                  <p className="mt-0.5 leading-relaxed text-gray-500">按照银行支付金额、实发数进行捕获；个税、社保公积金一经合并，自动计算出您的【综合收入参考】。</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <span className="bg-violet-100 text-violet-700 rounded-full w-5 h-5 shrink-0 flex items-center justify-center font-bold">2</span>
                <div>
                  <h5 className="font-bold text-gray-700">多张图片无痕对接</h5>
                  <p className="mt-0.5 leading-relaxed text-gray-500">要是工资条过长分屏截图，您可以统统一次选好。AI会匹配时间戳、个税金额将截断的明细条自动归纳成一份数据。</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <span className="bg-violet-100 text-violet-700 rounded-full w-5 h-5 shrink-0 flex items-center justify-center font-bold">3</span>
                <div>
                  <h5 className="font-bold text-gray-700">社保及个人公积金记录</h5>
                  <p className="mt-0.5 leading-relaxed text-gray-500">这些资产不直接增加日常理财现金余额。它们能作为您购房贷款额度，养老医保的累计额，单独列表储存查看。</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200/50 pt-4 text-center">
              <span className="text-[10px] text-gray-400 font-medium">✨ Powered by Gemini 3.5 Flash Model</span>
            </div>
          </div>
        </div>
      ) : (
        /* --- VERIFICATION SCREEN VIEW ("核对一下") --- */
        <div className="bg-white rounded-2xl p-6 border border-violet-100 shadow-md space-y-6">
          <div className="flex justify-between items-start border-b border-gray-100 pb-4">
            <div>
              <span className="px-2.5 py-0.5 bg-violet-600 text-white rounded-md text-[10px] font-extrabold uppercase shrink-0">核对一下</span>
              <h3 className="text-xl font-black text-gray-800 mt-1.5">🔬 AI 归集工资单核对</h3>
              <p className="text-xs text-gray-500 mt-1">保存前请仔细查验大模型提取的各项财务账目。您可以点击直接修改任意非零数据项。</p>
            </div>
            
            <button 
              type="button" 
              onClick={() => setShowVerifyScreen(false)}
              className="text-xs text-gray-400 hover:text-gray-600 font-bold"
            >
              放弃返回
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* L: Base specs */}
            <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100 h-fit">
              <h4 className="font-bold text-xs text-gray-400 tracking-wider">📅 工资月份与实到手</h4>
              
              <div>
                <label className="text-xs text-gray-500 block mb-1">工资月份</label>
                <input
                  type="month"
                  value={editingRecord.salaryMonth}
                  id="verify-salary-month"
                  onChange={e => handleFormInputChange('salaryMonth', e.target.value)}
                  className="w-full px-3 py-1.5 text-sm font-bold rounded-lg border border-gray-200 bg-white"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1 font-bold">银行实收工资 (元)</label>
                <input
                  type="number"
                  step="any"
                  value={editingRecord.bankPayment || ''}
                  id="verify-bank-payment"
                  onChange={e => handleFormInputChange('bankPayment', e.target.value)}
                  className="w-full px-3 py-1.5 text-sm font-bold rounded-lg border border-violet-300 bg-violet-50 text-violet-800"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">个税代扣 (元)</label>
                <input
                  type="number"
                  step="any"
                  value={editingRecord.personalIncomeTax || ''}
                  id="verify-personal-income-tax"
                  onChange={e => handleFormInputChange('personalIncomeTax', e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white"
                />
              </div>
            </div>

            {/* M: Housing Fun (公积金) */}
            <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <h4 className="font-bold text-xs text-emerald-700 tracking-wider">🏢 公积金存管 (住房公积金)</h4>
              
              <div>
                <label className="text-xs text-gray-500 block mb-1 text-emerald-800">公积金个人缴纳 (元)</label>
                <input
                  type="number"
                  step="any"
                  value={editingRecord.housingFundPersonal || ''}
                  id="verify-housing-fund-personal"
                  onChange={e => handleFormInputChange('housingFundPersonal', e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-emerald-900"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1 text-emerald-800">公积金单位缴纳 (元)</label>
                <input
                  type="number"
                  step="any"
                  value={editingRecord.housingFundCompany || ''}
                  id="verify-housing-fund-company"
                  onChange={e => handleFormInputChange('housingFundCompany', e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-emerald-900"
                />
              </div>

              <div className="bg-emerald-50 rounded-lg p-3 text-emerald-800 text-xs border border-emerald-100 flex justify-between items-center font-bold">
                <span>🏦 公积金本月合并注入:</span>
                <span>¥{editingRecord.housingFundTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* R: Social security (五险) */}
            <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <h4 className="font-bold text-xs text-indigo-700 tracking-wider">🛡️ 社会保险存管 (养老医疗等)</h4>
              
              <div>
                <label className="text-xs text-gray-500 block mb-1 text-indigo-800">社保个人代扣 (元)</label>
                <input
                  type="number"
                  step="any"
                  value={editingRecord.socialSecurityPersonal || ''}
                  id="verify-social-security-personal"
                  onChange={e => handleFormInputChange('socialSecurityPersonal', e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1 text-indigo-800">社保单位补贴 (元)</label>
                <input
                  type="number"
                  step="any"
                  value={editingRecord.socialSecurityCompany || ''}
                  id="verify-social-security-company"
                  onChange={e => handleFormInputChange('socialSecurityCompany', e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white"
                />
              </div>

              <div className="bg-indigo-50 rounded-lg p-3 text-indigo-800 text-xs border border-indigo-100 flex justify-between items-center font-bold">
                <span>🧬 社保五险本月合并投存:</span>
                <span>¥{editingRecord.socialSecurityTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Core sum panel */}
          <div className="bg-gradient-to-r from-violet-600 to-indigo-700 rounded-2xl p-5 text-white grid grid-cols-1 sm:grid-cols-3 gap-4 border border-violet-700">
            <div>
              <span className="text-xs text-white/70 font-semibold block">本月综合保险公积金注入</span>
              <p className="text-lg font-black mt-1">¥{editingRecord.benefitTotal.toLocaleString()}</p>
            </div>
            
            <div className="sm:border-x sm:border-white/10 sm:px-4">
              <span className="text-xs text-white/70 font-semibold block">大数权益核对 (银行 + 企业总配比)</span>
              <p className="text-lg font-black mt-1">¥{editingRecord.comprehensiveIncomeReference.toLocaleString()}</p>
            </div>

            <div>
              <span className="text-xs text-white/70 font-semibold block">AI 分析结论手记</span>
              <textarea
                value={editingRecord.note}
                id="verify-note"
                onChange={e => handleFormInputChange('note', e.target.value)}
                className="w-full h-10 mt-1 bg-white/10 rounded border-0 text-xs text-white placeholder-white/50 px-2 py-1 focus:outline-hidden focus:ring-1 focus:ring-white"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              id="abort-verify-btn"
              onClick={() => setShowVerifyScreen(false)}
              className="py-2.5 px-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-colors"
            >
              返回重设
            </button>
            <button
              type="button"
              id="confirm-verify-btn"
              onClick={saveVerifiedRecord}
              className="py-2.5 px-6 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              <FileCheck className="w-4 h-4" />
              <span>验证并存盘工资条</span>
            </button>
          </div>
        </div>
      )}

      {/* --- BOTTOM SECTION: HISTORICAL WAGES BENEFITS RECORDS --- */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 mb-4 gap-2">
          <div>
            <h3 className="font-bold text-gray-800 text-lg flex items-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 mr-2" />
              <span>社保与五险一金权益对账单</span>
            </h3>
            <p className="text-xs text-gray-500 mt-1">汇总查看历史工资清单及所缴存的公司匹配权益（已核实归档数据）</p>
          </div>

          {/* Year selector specifically for annual aggregates */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 font-semibold">对账年份:</span>
            <select
              value={benefitYear}
              id="benefit-year"
              onChange={e => setBenefitYear(e.target.value)}
              className="px-2.5 py-1 text-xs font-bold bg-gray-50 border border-gray-200 text-gray-700 rounded-lg outline-hidden"
            >
              {['2026', '2025', '2024'].map(yr => (
                <option key={yr} value={yr}>{yr}年</option>
              ))}
            </select>
          </div>
        </div>

        {/* Aggregate report of the chosen year */}
        {records.filter(r => r.salaryMonth.startsWith(benefitYear)).length > 0 ? (
          <div className="bg-emerald-50/40 rounded-2xl p-4.5 border border-emerald-100 grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div>
              <span className="text-[10px] text-gray-400 font-bold block">🏦 {benefitYear}年度实收工资累计</span>
              <span className="text-base font-extrabold text-gray-800">¥{totBankPayment.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-bold block">🛡️ {benefitYear}年个人公积金累计</span>
              <span className="text-base font-extrabold text-gray-800">¥{totPersonalFund.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-bold block">🏦 {benefitYear}年单位五险一金配比累计</span>
              <span className="text-base font-extrabold text-gray-800">¥{(totCompanyFund + totCompanySocial).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-800 font-bold block">🎉 {benefitYear}年补充总资产收益</span>
              <span className="text-base font-extrabold text-emerald-700">¥{totBenefit.toLocaleString()}</span>
            </div>
          </div>
        ) : null}

        {/* Logs table */}
        {records.length === 0 ? (
          <div className="text-center py-10 rounded-xl border border-dashed border-gray-200">
            <span className="text-2xl">📑</span>
            <p className="text-gray-400 text-xs mt-2">暂无核对入档的历史工资大数。快上传一张截图测试，看看您的公积金有多惊人！</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold">
                  <th className="py-2.5 px-2">工资月份</th>
                  <th className="py-2.5 px-2">实收到手</th>
                  <th className="py-2.5 px-2">个税代扣</th>
                  <th className="py-2.5 px-2">公积金（个人+单位）</th>
                  <th className="py-2.5 px-2">社保（个人+单位）</th>
                  <th className="py-2.5 px-2">是否入账</th>
                  <th className="py-2.5 px-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-2 font-extrabold text-gray-800">{rec.salaryMonth}</td>
                    <td className="py-3 px-2 text-violet-800 font-bold">¥{rec.bankPayment.toLocaleString()}</td>
                    <td className="py-3 px-2 text-gray-500">¥{rec.personalIncomeTax.toLocaleString()}</td>
                    <td className="py-3 px-2 text-emerald-800">
                      ¥{rec.housingFundPersonal.toLocaleString()}+{rec.housingFundCompany.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-indigo-800">
                      ¥{rec.socialSecurityPersonal.toLocaleString()}+{rec.socialSecurityCompany.toLocaleString()}
                    </td>
                    <td className="py-3 px-2">
                      {rec.syncedToIncome ? (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                          已进账口
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSyncToLedger(rec, false)}
                          className="text-[10px] text-violet-600 hover:text-violet-700 font-bold hover:underline"
                        >
                          同步进记账
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right whitespace-nowrap">
                      {deletingId === rec.id ? (
                        <span className="inline-flex items-center space-x-1.5 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">
                          <span className="text-[10px] text-rose-700 font-bold">确认删除此月的五险一金对账单记录？</span>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteSalaryRecord(rec.id);
                              setDeletingId(null);
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white px-1.5 py-0.5 rounded text-[10px] font-bold transition-all"
                          >
                            确定
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-bold transition-all"
                          >
                            取消
                          </button>
                        </span>
                      ) : (
                        <span className="space-x-1.5">
                          <button
                            type="button"
                            onClick={() => startEditExistingRecord(rec)}
                            className="text-violet-600 hover:text-violet-700 hover:underline"
                          >
                            看明细/改
                          </button>
                          <span className="text-gray-200">|</span>
                          <button
                            type="button"
                            onClick={() => setDeletingId(rec.id)}
                            className="text-rose-500 hover:text-rose-600 hover:underline"
                            title="删除此项记录"
                          >
                            删除
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
