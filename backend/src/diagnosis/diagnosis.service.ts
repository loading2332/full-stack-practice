import { Injectable } from '@nestjs/common';

type DiagnosisInput = {
  customerId: string;
  dateRange: string;
};

type AdviceInput = {
  customerId: string;
  focus?: string;
};

@Injectable()
export class DiagnosisService {
  async runDiagnosis(input: DiagnosisInput) {
    return {
      customerId: input.customerId,
      dateRange: input.dateRange,
      score: 78,
      grade: 'B',
      categoryScores: {
        tracking: { score: 80, grade: 'B', weight: 0.25 },
        structure: { score: 76, grade: 'B', weight: 0.2 },
      },
      issues: [
        {
          ruleCode: 'SEARCH_TERMS_NEGATIVE_MISSING',
          title: '缺少否定关键词清理',
          severity: 'medium',
          detail: '建议检查搜索词报告并补充否定词。',
          category: 'traffic',
        },
      ],
    };
  }

  async getOptimizationAdvice(input: AdviceInput) {
    return {
      customerId: input.customerId,
      focus: input.focus || 'overall',
      advice: [
        {
          priority: 'high',
          title: '补充否定关键词',
          reason: '减少无效点击，提升整体预算利用效率。',
        },
        {
          priority: 'medium',
          title: '提升高转化广告组预算',
          reason: '让预算更多流向高 CVR 广告组。',
        },
      ],
    };
  }
}
