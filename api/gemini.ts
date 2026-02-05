// api/gemini.ts - 修正后的 429 恢复版
import { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch'; // 确保是 node-fetch@2
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const isVercel = !!process.env.VERCEL;
  const isLocal = process.env.NODE_ENV === 'development';

  // 简单的健康检查 / 探活接口：GET 直接返回服务状态
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      message: 'Gemini proxy is running',
    });
  }

  // 仅允许 POST，其它方法返回 405
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'METHOD_NOT_ALLOWED',
      message: `仅支持 POST /api/gemini，请使用 POST 请求。当前方法: ${req.method}`,
    });
  }

  // 简单的 body 校验，防止空请求导致前端“看起来打不开”
  if (!req.body || (!req.body.text && !req.body.image && !(req.body.file && req.body.file.base64))) {
    return res.status(400).json({
      error: 'INVALID_REQUEST',
      message: '请求 body 不能为空，请至少提供 text、image 或 file.base64 其中之一。',
    });
  }
  
  // 本地环境打印调试日志
  if (isLocal) {
    const proxy = process.env.HTTP_PROXY;
    console.log('--- Requesting Gemini (Local) ---');
    console.log('Environment:', 'Local');
    console.log('API Key configured:', !!apiKey);
    console.log('Proxy configuration:', proxy ? 'Enabled' : 'Disabled');
    console.log('Proxy URL:', proxy || 'N/A');
  } else if (isVercel) {
    // Vercel 生产环境只打印必要的信息
    console.log('--- Requesting Gemini (Vercel) ---');
    console.log('Environment:', 'Vercel Production');
    console.log('API Key configured:', !!apiKey);
  } else {
    // 其他云端环境
    console.log('--- Requesting Gemini (Cloud) ---');
    console.log('Environment:', 'Cloud');
    console.log('API Key configured:', !!apiKey);
  }
  
  // 使用当前官方推荐的 Gemini 3 Flash 预览模型
  const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

  try {
    // 构建 contents 数组
    const contents = [{
      parts: [{
        text: req.body.text || "Hello"
      }]
    }];
    
    // 处理图像数据
    if (req.body.image) {
      contents[0].parts.push({
        inlineData: {
          mimeType: "image/jpeg", // 默认 MIME 类型，实际应用中可能需要根据前端提供的类型进行调整
          data: req.body.image
        }
      });
    }
    
    // 处理文件数据
    if (req.body.file && req.body.file.base64) {
      contents[0].parts.push({
        inlineData: {
          mimeType: req.body.file.mimeType || "application/octet-stream",
          data: req.body.file.base64
        }
      });
    }

    const fetchOptions: any = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    };
    
    // 仅在本地环境且有代理配置时使用代理
    if (isLocal) {
      const proxy = process.env.HTTP_PROXY;
      if (proxy) {
        // 动态导入 HttpsProxyAgent，仅在需要时使用
        const { HttpsProxyAgent } = await import('https-proxy-agent');
        fetchOptions.agent = new HttpsProxyAgent(proxy);
      }
    }

    const response = await fetch(`${API_URL}?key=${apiKey}`, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      // 针对 429 限流单独处理，给前端更清晰的提示
      if (response.status === 429) {
        return res.status(429).json({
          error: 'RATE_LIMIT',
          message: 'Google Gemini API 调用额度已超限，请稍后重试或检查配额设置。',
          raw: data,
        });
      }

      return res.status(response.status).json({
        error: 'UPSTREAM_ERROR',
        message: data.error?.message || data.message || `上游服务返回错误: ${response.status}`,
        raw: data,
      });
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Gemini proxy internal error:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message || 'Gemini 代理内部错误',
    });
  }
}
