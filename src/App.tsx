import React, { useState } from 'react';
import { InputType, ProcessingState, FileData, VideoMode } from './types';
import { GeminiService } from './services/geminiService';
import { TextIcon, ImageIcon, AudioIcon, VideoIcon, WebIcon, LoaderIcon, UploadIcon } from './components/Icons';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<InputType>(InputType.TEXT);
  const [videoMode, setVideoMode] = useState<VideoMode>(VideoMode.URL);
  const [textInput, setTextInput] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [webUrl, setWebUrl] = useState('');
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [status, setStatus] = useState<ProcessingState>({
    isAnalyzing: false,
    error: null,
    result: null,
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFileData({
        name: file.name,
        type: file.type,
        base64: result,
        rawText: file.type === 'text/plain' ? result : undefined
      });
      
      // Auto-switch tab based on file type
      if (file.type.startsWith('image/')) {
        setActiveTab(InputType.IMAGE);
      } else if (file.type.startsWith('audio/')) {
        setActiveTab(InputType.AUDIO);
      } else if (file.type.startsWith('video/')) {
        setActiveTab(InputType.VIDEO);
        setVideoMode(VideoMode.FILE);
      } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setActiveTab(InputType.TEXT);
      }
    };

    if (file.type === 'text/plain') {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async () => {
    setStatus({ isAnalyzing: true, error: null, result: null });
    // Create GeminiService instance right before the call to ensure fresh state.
    const gemini = new GeminiService();
    
    try {
      let analysisResult;
      if (activeTab === InputType.TEXT) {
        if (fileData?.type === 'application/pdf') {
          analysisResult = await gemini.analyzeDocument(fileData.base64, fileData.type);
        } else {
          const content = textInput || fileData?.rawText;
          if (!content) throw new Error("请输入文本内容或上传文件");
          analysisResult = await gemini.analyzeText(content);
        }
      } else if (activeTab === InputType.IMAGE) {
        if (!fileData || !fileData.type.startsWith('image/')) throw new Error("请上传图片文件");
        analysisResult = await gemini.analyzeImage(fileData.base64);
      } else if (activeTab === InputType.AUDIO) {
        if (!fileData || !fileData.type.startsWith('audio/')) throw new Error("请上传音频文件");
        analysisResult = await gemini.analyzeAudioFile(fileData.base64, fileData.type);
      } else if (activeTab === InputType.VIDEO) {
        if (videoMode === VideoMode.URL) {
          if (!videoUrl.trim()) throw new Error("请输入视频 URL");
          analysisResult = await gemini.analyzeVideoUrl(videoUrl);
        } else {
          if (!fileData || !fileData.type.startsWith('video/')) throw new Error("请上传本地视频文件");
          analysisResult = await gemini.analyzeVideoFile(fileData.base64, fileData.type);
        }
      } else if (activeTab === InputType.WEB) {
        if (!webUrl.trim()) throw new Error("请输入网页链接 URL");
        analysisResult = await gemini.analyzeWebUrl(webUrl);
      }
      setStatus({ isAnalyzing: false, error: null, result: analysisResult });
    } catch (err: any) {
      console.error(err);
      setStatus({ isAnalyzing: false, error: err.message || "分析失败，请检查输入或重试", result: null });
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileData(null);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center bg-slate-50 selection:bg-indigo-100 text-slate-900">
      <header className="w-full max-w-5xl mb-12 text-center">
        <div className="inline-block px-4 py-1.5 mb-6 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black tracking-widest uppercase border border-indigo-100">
          Multimodal Insight Engine v2.5
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 tracking-tighter">
          解析万物 <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-fuchsia-600">全能AI</span>
        </h1>
        <p className="text-slate-500 text-xl max-w-3xl mx-auto font-medium leading-relaxed">
          深度挖掘 PDF、图像、音频、网页与视频中的核心逻辑。不仅仅是总结，更是深度洞察。
        </p>
      </header>

      <main className="w-full max-w-5xl">
        {/* Navigation Tabs */}
        <div className="flex bg-white/80 backdrop-blur-md shadow-sm p-2 rounded-3xl mb-10 border border-slate-200 overflow-x-auto no-scrollbar">
          {(Object.values(InputType) as InputType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setStatus(s => ({ ...s, result: null })); }}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-3 py-4 rounded-2xl font-bold transition-all ${
                activeTab === tab 
                  ? 'bg-slate-900 text-white shadow-xl' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab === InputType.TEXT && <TextIcon />}
              {tab === InputType.IMAGE && <ImageIcon />}
              {tab === InputType.AUDIO && <AudioIcon />}
              {tab === InputType.VIDEO && <VideoIcon />}
              {tab === InputType.WEB && <WebIcon />}
              <span>{
                tab === InputType.TEXT ? '文档/文本' : 
                tab === InputType.IMAGE ? '图片分析' : 
                tab === InputType.AUDIO ? '音频解析' :
                tab === InputType.VIDEO ? '视频解析' : '网页解析'
              }</span>
            </button>
          ))}
        </div>

        {/* Input Card */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden mb-12">
          <div className="p-8 md:p-12">
            {activeTab === InputType.TEXT && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">内容来源</h3>
                  <label className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-bold cursor-pointer hover:bg-indigo-700 transition-all active:scale-95 shadow-md shadow-indigo-200">
                    <UploadIcon />
                    <span>上传 PDF / TXT</span>
                    <input type="file" className="hidden" accept=".txt,.pdf" onChange={handleFileUpload} />
                  </label>
                </div>
                {fileData?.type === 'application/pdf' ? (
                  <div className="p-16 border-2 border-dashed border-indigo-200 rounded-[2.5rem] bg-indigo-50/20 flex flex-col items-center group relative">
                    <div className="w-20 h-20 bg-white rounded-3xl shadow-lg flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                    <span className="text-xl font-bold text-slate-800">{fileData.name}</span>
                    <button onClick={clearFile} className="mt-6 text-sm text-red-500 font-bold hover:underline">移除并切换输入方式</button>
                  </div>
                ) : (
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="在此输入需要分析的内容，或点击上方按钮上传文档..."
                    className="w-full h-80 p-8 rounded-3xl border-none bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all text-xl leading-relaxed shadow-inner placeholder:text-slate-300"
                  />
                )}
              </div>
            )}

            {activeTab === InputType.IMAGE && (
              <div className="flex flex-col items-center justify-center min-h-[400px] border-4 border-dashed border-slate-100 rounded-[3rem] bg-slate-50 hover:bg-white hover:border-indigo-100 transition-all cursor-pointer relative group overflow-hidden">
                <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                {fileData && fileData.type.startsWith('image/') ? (
                  <div className="p-6 flex flex-col items-center">
                    <img src={fileData.base64} alt="Preview" className="max-h-[350px] rounded-3xl shadow-2xl mb-6 ring-8 ring-white" />
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-slate-800">{fileData.name}</span>
                      <button onClick={clearFile} className="px-4 py-1 bg-red-50 text-red-500 text-xs font-black rounded-full uppercase">更换</button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center text-indigo-600 mx-auto mb-8 group-hover:scale-110 transition-transform">
                      <ImageIcon />
                    </div>
                    <p className="text-2xl font-black text-slate-800">上传图像分析</p>
                    <p className="text-slate-400 mt-2 font-bold">精准识别图中每一个元素与隐含逻辑</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === InputType.AUDIO && (
              <div className="flex flex-col items-center justify-center min-h-[400px] border-4 border-dashed border-slate-100 rounded-[3rem] bg-slate-50 hover:bg-white hover:border-indigo-100 transition-all cursor-pointer relative group overflow-hidden">
                <input type="file" accept="audio/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                {fileData && fileData.type.startsWith('audio/') ? (
                  <div className="p-16 flex flex-col items-center">
                    <div className="w-20 h-20 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-100 flex items-center justify-center text-white mb-6">
                      <AudioIcon />
                    </div>
                    <p className="text-xl font-black text-slate-800 text-center">{fileData.name}</p>
                    <button onClick={clearFile} className="mt-6 text-sm text-red-500 font-bold hover:underline">更换文件</button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center text-indigo-600 mx-auto mb-8 group-hover:scale-110 transition-transform">
                      <AudioIcon />
                    </div>
                    <p className="text-2xl font-black text-slate-800">上传音频文件</p>
                    <p className="text-slate-400 mt-2 font-bold">深度解析对白、环境音及核心逻辑</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === InputType.VIDEO && (
              <div className="space-y-10">
                <div className="flex bg-slate-100/80 p-1.5 rounded-2xl w-fit mx-auto border border-slate-200">
                  <button 
                    onClick={() => setVideoMode(VideoMode.URL)}
                    className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${videoMode === VideoMode.URL ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    网页链接
                  </button>
                  <button 
                    onClick={() => setVideoMode(VideoMode.FILE)}
                    className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${videoMode === VideoMode.FILE ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    本地上传
                  </button>
                </div>

                {videoMode === VideoMode.URL ? (
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-8 flex items-center pointer-events-none text-indigo-400">
                      <VideoIcon />
                    </div>
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="粘贴视频链接 (Bilibili, Youtube etc.)..."
                      className="w-full pl-20 pr-8 py-8 rounded-[2rem] border-none bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all text-xl shadow-inner font-medium"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[300px] border-4 border-dashed border-slate-100 rounded-[3rem] bg-slate-50 hover:bg-white transition-all cursor-pointer relative group">
                    <input type="file" accept="video/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {fileData && fileData.type.startsWith('video/') ? (
                      <div className="text-center p-8">
                        <div className="w-20 h-20 bg-indigo-600 rounded-3xl shadow-xl flex items-center justify-center text-white mx-auto mb-6">
                          <VideoIcon />
                        </div>
                        <p className="text-xl font-black text-slate-800">{fileData.name}</p>
                        <button onClick={clearFile} className="mt-6 text-sm text-red-500 font-bold hover:underline">更换视频</button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="w-20 h-20 bg-white rounded-3xl shadow-lg flex items-center justify-center text-slate-400 mx-auto mb-6">
                           <UploadIcon />
                        </div>
                        <p className="text-2xl font-black text-slate-800">上传本地视频</p>
                        <p className="text-slate-400 mt-2 font-bold italic">模型将深度解码画面并提供详尽分析</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === InputType.WEB && (
              <div className="space-y-6">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-8 flex items-center pointer-events-none text-emerald-500">
                    <WebIcon />
                  </div>
                  <input
                    type="url"
                    value={webUrl}
                    onChange={(e) => setWebUrl(e.target.value)}
                    placeholder="输入网页链接进行全局解析..."
                    className="w-full pl-20 pr-8 py-8 rounded-[2rem] border-none bg-slate-50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:outline-none transition-all text-xl shadow-inner font-medium"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="px-10 py-8 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-6">
             <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-sm font-bold text-slate-400 tracking-wide uppercase">AI 引擎就绪: Gemini 3 Advanced</span>
             </div>
            <button
              onClick={handleProcess}
              disabled={status.isAnalyzing}
              className={`group px-14 py-5 rounded-2xl font-black text-white transition-all transform hover:-translate-y-1 active:scale-95 flex items-center gap-4 shadow-2xl ${
                status.isAnalyzing 
                  ? 'bg-slate-700 cursor-not-allowed opacity-50' 
                  : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 hover:shadow-indigo-500/40'
              }`}
            >
              {status.isAnalyzing ? <><LoaderIcon /> 正在进行深度解析...</> : <>立即开始分析 <svg className="group-hover:translate-x-1 transition-transform" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>}
            </button>
          </div>
        </div>

        {/* Errors */}
        {status.error && (
          <div className="mb-12 p-8 bg-red-50 border border-red-100 rounded-[2rem] text-red-600 flex items-start gap-6 animate-in slide-in-from-top-4">
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center shrink-0 shadow-sm">
               <span className="text-2xl font-black">!</span>
            </div>
            <div>
              <h4 className="text-lg font-black mb-1">分析任务异常</h4>
              <p className="font-bold opacity-80 leading-relaxed">{status.error}</p>
            </div>
          </div>
        )}

        {/* Results Area */}
        {status.result && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-700">
            {/* 1. Summary Card */}
            <section className="bg-white p-10 md:p-14 rounded-[3rem] shadow-2xl border border-slate-100 relative overflow-hidden group">
              <div className="flex items-center gap-6 mb-10 relative">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-100">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter">深度内容概况</h3>
                  <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mt-1">Executive Summary</p>
                </div>
              </div>
              <div className="text-slate-700 text-xl leading-[2] whitespace-pre-wrap font-medium relative">
                {status.result.summary}
              </div>
            </section>

            {/* 2. Key Points & Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
               <section className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-50">
                  <h4 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
                    <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
                    核心提取要点
                  </h4>
                  <ul className="space-y-6">
                    {status.result.keyPoints.map((point, idx) => (
                      <li key={idx} className="flex gap-4 p-5 bg-slate-50 rounded-2xl border border-transparent hover:border-indigo-100 transition-all group">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform">
                          {idx + 1}
                        </span>
                        <p className="text-slate-700 font-bold leading-relaxed">{point}</p>
                      </li>
                    ))}
                  </ul>
               </section>

               <section className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl text-white">
                  <h4 className="text-xl font-black text-emerald-400 mb-8 flex items-center gap-3">
                    <span className="w-2 h-8 bg-emerald-400 rounded-full"></span>
                    决策建议与结论
                  </h4>
                  <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 italic text-lg leading-relaxed font-medium">
                    {status.result.conclusion}
                  </div>
               </section>
            </div>

            {/* 3. Detailed Logic Analysis */}
            <section className="bg-white p-10 md:p-14 rounded-[3rem] shadow-lg border border-slate-100">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">底层逻辑深度解析</h3>
                </div>
                <div className="text-slate-600 leading-loose whitespace-pre-wrap">
                  {status.result.detailedAnalysis}
                </div>
            </section>

            {/* Sources */}
            {status.result.sources && status.result.sources.length > 0 && (
              <div className="bg-slate-100 p-8 rounded-[2.5rem] border border-slate-200">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-3">
                  联网共识参考
                </h4>
                <div className="flex flex-wrap gap-3">
                  {status.result.sources.map((source, idx) => (
                    <a
                      key={idx}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-700 hover:bg-slate-900 hover:text-white transition-all flex items-center gap-3 group shadow-sm active:scale-95"
                    >
                      <span className="truncate max-w-[300px]">{source.title}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform opacity-50"><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-32 text-slate-400 text-[10px] pb-16 font-black uppercase tracking-widest text-center">
        Powered by Gemini 3 Multimodal Engine &bull; AI Information Processor
      </footer>
    </div>
  );
};

export default App;