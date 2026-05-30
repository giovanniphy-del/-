/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

// Load environment variables
dotenv.config();

// Standard ESM equivalents for CommonJS variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set payload limits for processing multiple high-resolution base64 screenshots
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Initialize Gemini Client
  // Note: Telemetry header User-Agent: 'aistudio-build' is required by guidelines
  const geminiApiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;

  if (geminiApiKey) {
    ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // 1. API: Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hasGeminiKey: !!geminiApiKey });
  });

  // 2. API: Wages OCR Recognition using Gemini
  app.post('/api/ocr', async (req: any, res: any) => {
    try {
      if (!ai) {
        return res.status(500).json({
          error: 'Gemini API key is not configured in the host environment.',
        });
      }

      const { images } = req.body; // Array of objects: { mimeType: string, data: string (base64) }
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: 'Please provide at least one screenshot image.' });
      }

      // Convert input base64 parts to Gemini inlineData structure
      const imageParts = images.map((img: any) => ({
        inlineData: {
          mimeType: img.mimeType || 'image/png',
          data: img.data,
        },
      }));

      // Construction of structured instructions
      const systemInstruction = `你是一位极度专业的个人财务助手，专门帮助普通用户处理繁琐的工资条/薪资条/银行到账等截图。
你可以同时查看多张截图，它们代表同一个月的工资条的不同部分或关联截图。
你的任务是：仔细分析并合并这些截图中的文字与财务数据，识别并提取个人工资明细。

合并规则与指标要求：
1. **工资月份 (salaryMonth)**：提取截图里提到的哪个月的工资。如果能找到形如“2026年5月”、“2026-05”、“5月份”的信息，则一律转换为 \"YYYY-MM\" 格式（例如 2026-05）。如果未提到，参照当前环境时间 2026-05 并返回此默认值。
2. **银行支付/实收金额 (bankPayment)**：实际到手多少钱。包括“实发工资”、“到手工资”、“银行转账”、“应发扣减后的实有发放”、“本月实缴实得”等。如果有多个可能值，遵循高优先级：银行来账转账/实发 > 到手
3. **个税 (personalIncomeTax)**：代表“个人所得税”或“应扣个税”。如果没有，返回 0。
4. **公积金个人 (housingFundPersonal)**：个人代扣部分。若工资条上无此项，返回 0。
5. **公积金单位 (housingFundCompany)**：公司/单位帮你缴纳的部分。有些工资条会单列公积金单位比例或缴存，如果没有单列，请默认为 0（或等于个人代扣部分，如果你看到明确的1-to-1匹配提示）。
6. **社保个人 (socialSecurityPersonal)**：个人代扣社保。可能包括：养老个人 + 医疗个人 + 失业个人 等的总和。请你做累加。
7. **社保单位 (socialSecurityCompany)**：公司或单位帮你代扣社保。可能包括：养老单位 + 医疗单位 + 失业单位 + 工伤单位 + 生育单位 的总和，请累加。
8. **核对备注 (note)**：简单解释提取的数据来源或任何数值上的可能冲突/不匹配说明（以中文、简单可爱的口吻简述，不要出现繁琐公式术语）。

请输出严格、合法的 JSON，不要带有 Markdown 额外包裹。`;

      const promptText = `请识别并提取上传的所有截图，合并它们的财务数据，返回代表工资状态对应的各项详细数值。`;

      // Define Schema compliant with Type enum from @google/genai
      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          salaryMonth: {
            type: Type.STRING,
            description: "工资月份，格式为 YYYY-MM",
          },
          bankPayment: {
            type: Type.NUMBER,
            description: "实收金额 / 实际到手金额（数字）",
          },
          personalIncomeTax: {
            type: Type.NUMBER,
            description: "个税代扣（数字）",
          },
          housingFundPersonal: {
            type: Type.NUMBER,
            description: "公积金个人部分（数字）",
          },
          housingFundCompany: {
            type: Type.NUMBER,
            description: "公积金单位部分（数字）",
          },
          socialSecurityPersonal: {
            type: Type.NUMBER,
            description: "社保个人缴费部分合计（数字）",
          },
          socialSecurityCompany: {
            type: Type.NUMBER,
            description: "社保单位缴费部分合计（数字）",
          },
          note: {
            type: Type.STRING,
            description: "核对备注文案，例如‘已成功为您自动识别并合并了3张截图’等",
          },
        },
        required: [
          'salaryMonth',
          'bankPayment',
          'personalIncomeTax',
          'housingFundPersonal',
          'housingFundCompany',
          'socialSecurityPersonal',
          'socialSecurityCompany',
          'note'
        ],
      };

      // Call Gemini 3.5 Flash Model
      const geminiResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: {
          parts: [...imageParts, { text: promptText }],
        },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema,
        },
      });

      const resultText = geminiResponse.text?.trim() || '{}';
      const parsedData = JSON.parse(resultText);

      res.json({
        success: true,
        data: parsedData,
      });
    } catch (error: any) {
      console.error('Gemini OCR Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || '识别工资条时发生错误，请稍后再试。',
      });
    }
  });

  // 3. Vite Server or Production Static Files serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
