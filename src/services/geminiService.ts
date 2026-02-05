import { AnalysisResult } from "../types";

/**
 * GeminiService - 恢复后的稳定版本
 * 逻辑：前端不再直接调用 Google SDK，而是通过 fetch 请求本地后端代理 /api/gemini
 * 优点：解决跨域问题、支持本地代理设置、隐藏 API Key
 */
export class GeminiService {
  /**
   * 核心请求处理方法
   */
  private async requestBackend(payload: any): Promise<AnalysisResult> {
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        // 针对限流（429）做特殊提示，避免前端“卡死”或者提示不明确
        if (response.status === 429 || data.error === 'RATE_LIMIT') {
          const limitMessage = data.message || 'Google Gemini API 调用额度已超限，请稍后再试。';
          return {
            summary: '错误: API 额度超限',
            keyPoints: [limitMessage],
            conclusion: '请求失败（额度超限）',
            detailedAnalysis: limitMessage,
          };
        }

        // 其他错误：直接使用后端返回的错误信息
        const errorMessage = data.error?.message || data.message || `请求失败: ${response.status}`;
        return {
          summary: `错误: ${errorMessage}`,
          keyPoints: [],
          conclusion: "请求失败",
          detailedAnalysis: errorMessage
        };
      }

      // 解析后端转发的 Google 原始响应
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      // 如果后端配置了 responseMimeType: "application/json"，尝试解析内部 JSON
      try {
        if (aiResponse.includes('{')) {
          const parsed = JSON.parse(aiResponse.replace(/```json|```/g, '').trim());
          return {
            summary: parsed.summary || "分析完成",
            keyPoints: parsed.keyPoints || [],
            conclusion: parsed.conclusion || "",
            detailedAnalysis: parsed.detailedAnalysis || aiResponse
          };
        }
      } catch (e) {
        // 解析失败则退回到纯文本展示
      }

      return {
        summary: aiResponse.substring(0, 100) + "...",
        keyPoints: [aiResponse],
        conclusion: "解析完成",
        detailedAnalysis: aiResponse
      };

    } catch (error: any) {
      console.error("GeminiService Error:", error);
      return {
        summary: `错误: ${error.message}`,
        keyPoints: [],
        conclusion: "请求失败",
        detailedAnalysis: error.message
      };
    }
  }

  async analyzeText(text: string): Promise<AnalysisResult> {
    return this.requestBackend({ text });
  }

  async analyzeImage(base64: string): Promise<AnalysisResult> {
    return this.requestBackend({ 
      text: "请分析这张图片的内容", 
      image: base64.split(',')[1] || base64 
    });
  }

  async analyzeDocument(base64: string, mimeType: string): Promise<AnalysisResult> {
    return this.requestBackend({ 
      text: "请分析这份文档的内容", 
      file: { base64: base64.split(',')[1] || base64, mimeType }
    });
  }

  // 其他多媒体方法均指向同一个统一后端入口
  async analyzeAudioFile(base64: string, mimeType: string): Promise<AnalysisResult> {
    return this.analyzeDocument(base64, mimeType);
  }

  async analyzeVideoFile(base64: string, mimeType: string): Promise<AnalysisResult> {
    return this.analyzeDocument(base64, mimeType);
  }

  async analyzeWebUrl(url: string): Promise<AnalysisResult> {
    return this.requestBackend({ text: `请分析此网页内容：${url}` });
  }

  async analyzeVideoUrl(url: string): Promise<AnalysisResult> {
    return this.requestBackend({ text: `请分析此视频内容：${url}` });
  }
}