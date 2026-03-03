import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import { Settings, RefreshCw, BarChart2, Activity, Target, Zap, TrendingUp, Network, Hash, Thermometer, ArrowUpRight, Link2, History, Brain, CheckCircle2, XCircle } from 'lucide-react';
import { Happy8Analyzer, DrawData, AlgorithmScores, Happy8Backtester, BacktestResult } from './lib/algorithms';
import { cn } from './lib/utils';

type TabType = 'overview' | 'analysis' | 'backtest' | 'history';

const DEFAULT_WEIGHTS = {
  frequency: 10,
  markov: 15,
  omission: 10,
  cycle: 10,
  bayesian: 10,
  pagerank: 10,
  entropy: 5,
  heat: 10,
  momentum: 10,
};

export default function App() {
  const [data, setData] = useState<DrawData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  const [periodRange, setPeriodRange] = useState(500);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);

  // Backtest state
  const [backtestResults, setBacktestResults] = useState<BacktestResult[]>([]);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/data');
        if (!res.ok) throw new Error('Failed to fetch data');
        const json = await res.json();
        if (json.status === 'ok') {
          setData(json.data);
        } else {
          throw new Error(json.message);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const analysis = useMemo(() => {
    if (data.length === 0) return null;
    const analyzer = new Happy8Analyzer(data, weights);
    const scores = analyzer.analyze(periodRange);
    const topPairs = analyzer.getTopPairs(periodRange, 10);
    
    const topNumbers = scores.total
      .map((score, index) => ({ number: index + 1, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return { scores, topPairs, topNumbers };
  }, [data, weights, periodRange]);

  const handleBacktest = () => {
    if (data.length < periodRange + 100) {
      alert('数据不足，无法进行100期回测');
      return;
    }
    setIsBacktesting(true);
    setTimeout(() => {
      const backtester = new Happy8Backtester(data);
      const results = backtester.run(100, periodRange, weights);
      setBacktestResults(results);
      setIsBacktesting(false);
    }, 500);
  };

  const handleOptimize = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      const backtester = new Happy8Backtester(data);
      const bestWeights = backtester.optimizeWeights(50, periodRange);
      setWeights(bestWeights);
      setIsOptimizing(false);
      alert('权重已根据近50期表现自动调优');
    }, 1000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-400">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
          <p>正在加载全量开奖数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-red-400">
        <div className="flex flex-col items-center gap-4 bg-red-950/30 p-8 rounded-2xl border border-red-900/50">
          <Activity className="w-12 h-12" />
          <p className="text-lg font-medium">数据加载失败</p>
          <p className="text-sm opacity-80">{error}</p>
        </div>
      </div>
    );
  }

  const overallHitRate = backtestResults.length > 0 
    ? (backtestResults.filter(r => r.hitCount >= 1).length / backtestResults.length * 100).toFixed(1)
    : '0.0';

  const perfectHitRate = backtestResults.length > 0 
    ? (backtestResults.filter(r => r.hitCount === 2).length / backtestResults.length * 100).toFixed(1)
    : '0.0';

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-80 border-r border-zinc-800/50 bg-zinc-900/50 flex flex-col">
        <div className="p-6 border-b border-zinc-800/50">
          <h1 className="text-xl font-bold tracking-tight text-emerald-400 flex items-center gap-2">
            <Target className="w-6 h-6" />
            快乐8选2追号分析
          </h1>
          <p className="text-xs text-zinc-500 mt-2 font-mono">
            最新期数: {data[0]?.issue} ({data[0]?.date})
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4" />
                分析参数
              </h3>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs text-zinc-400 flex justify-between">
                <span>分析期数范围</span>
                <span className="font-mono text-emerald-400">{periodRange} 期</span>
              </label>
              <input 
                type="range" 
                min="50" max="1000" step="50"
                value={periodRange}
                onChange={(e) => setPeriodRange(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="w-4 h-4" />
                算法权重调节
              </h3>
              <button 
                onClick={handleOptimize}
                disabled={isOptimizing}
                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                title="自动调优权重"
              >
                <Brain className={cn("w-4 h-4", isOptimizing && "animate-pulse")} />
              </button>
            </div>
            
            <div className="space-y-4">
              {Object.entries(weights).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs text-zinc-400 flex justify-between">
                    <span className="capitalize">{
                      key === 'frequency' ? '频率分析' :
                      key === 'markov' ? '马尔可夫链' :
                      key === 'omission' ? '遗漏分析' :
                      key === 'cycle' ? '周期波动' :
                      key === 'bayesian' ? '贝叶斯概率' :
                      key === 'pagerank' ? 'PageRank网络' :
                      key === 'entropy' ? '信息熵' :
                      key === 'heat' ? '热度分析' : '动量分析'
                    }</span>
                    <span className="font-mono">{value}%</span>
                  </label>
                  <input 
                    type="range" 
                    min="0" max="100" step="5"
                    value={value}
                    onChange={(e) => setWeights(w => ({...w, [key]: Number(e.target.value)}))}
                    className="w-full accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Nav */}
        <div className="h-16 border-b border-zinc-800/50 flex items-center px-6 gap-6">
          <button 
            onClick={() => setActiveTab('overview')}
            className={cn("text-sm font-medium transition-colors relative h-full flex items-center", activeTab === 'overview' ? "text-emerald-400" : "text-zinc-400 hover:text-zinc-200")}
          >
            综合看板
            {activeTab === 'overview' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />}
          </button>
          <button 
            onClick={() => setActiveTab('analysis')}
            className={cn("text-sm font-medium transition-colors relative h-full flex items-center", activeTab === 'analysis' ? "text-emerald-400" : "text-zinc-400 hover:text-zinc-200")}
          >
            深度分析
            {activeTab === 'analysis' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />}
          </button>
          <button 
            onClick={() => setActiveTab('backtest')}
            className={cn("text-sm font-medium transition-colors relative h-full flex items-center", activeTab === 'backtest' ? "text-emerald-400" : "text-zinc-400 hover:text-zinc-200")}
          >
            回测验证
            {activeTab === 'backtest' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn("text-sm font-medium transition-colors relative h-full flex items-center", activeTab === 'history' ? "text-emerald-400" : "text-zinc-400 hover:text-zinc-200")}
          >
            开奖历史
            {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'overview' && analysis && (
            <div className="max-w-6xl mx-auto space-y-8">
              {/* Hero Section: Recommended Pick 2 */}
              <div className="bg-zinc-900/40 border border-emerald-900/30 rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
                
                <h2 className="text-sm font-semibold text-emerald-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  下一期最优选2推荐
                </h2>
                
                <div className="flex items-center gap-8">
                  <div className="flex gap-4">
                    {analysis.topNumbers.slice(0, 2).map(item => (
                      <div key={item.number} className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-4xl font-bold text-zinc-950 shadow-[0_0_40px_rgba(52,211,153,0.3)]">
                        {item.number.toString().padStart(2, '0')}
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-3xl font-light font-mono text-zinc-200">
                      综合评分: <span className="text-emerald-400 font-bold">{(analysis.topNumbers[0].score + analysis.topNumbers[1].score).toFixed(1)}</span>
                    </div>
                    <p className="text-zinc-500 text-sm">基于10大算法引擎深度计算</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                {/* Top Numbers Radar */}
                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-6 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Top 1 号码算法雷达图
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                        { subject: '频率', A: analysis.scores.frequency[analysis.topNumbers[0].number - 1] },
                        { subject: '马尔可夫', A: analysis.scores.markov[analysis.topNumbers[0].number - 1] },
                        { subject: '遗漏', A: analysis.scores.omission[analysis.topNumbers[0].number - 1] },
                        { subject: '周期', A: analysis.scores.cycle[analysis.topNumbers[0].number - 1] },
                        { subject: '贝叶斯', A: analysis.scores.bayesian[analysis.topNumbers[0].number - 1] },
                        { subject: 'PageRank', A: analysis.scores.pagerank[analysis.topNumbers[0].number - 1] },
                        { subject: '信息熵', A: analysis.scores.entropy[analysis.topNumbers[0].number - 1] },
                        { subject: '热度', A: analysis.scores.heat[analysis.topNumbers[0].number - 1] },
                        { subject: '动量', A: analysis.scores.momentum[analysis.topNumbers[0].number - 1] },
                      ]}>
                        <PolarGrid stroke="#3f3f46" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Score" dataKey="A" stroke="#34d399" fill="#34d399" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Pairs Ranking */}
                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-6 flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    配对排行 (Lift)
                  </h3>
                  <div className="space-y-3">
                    {analysis.topPairs.slice(0, 5).map((pair, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/30 border border-zinc-800/50">
                        <div className="flex items-center gap-4">
                          <span className="text-zinc-500 font-mono text-sm w-4">{idx + 1}</span>
                          <div className="flex gap-2">
                            {pair.pair.map(n => (
                              <span key={n} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-mono text-zinc-200 border border-zinc-700">
                                {n.toString().padStart(2, '0')}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-emerald-400 font-mono font-medium">{(pair.score * 100).toFixed(2)}</div>
                          <div className="text-[10px] text-zinc-500 uppercase">Lift Score</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analysis' && analysis && (
            <div className="max-w-6xl mx-auto space-y-8">
              {/* Heatmap */}
              <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-6 flex items-center gap-2">
                  <Thermometer className="w-4 h-4" />
                  号码综合热力图 (1-80)
                </h3>
                <div className="grid grid-cols-10 gap-2">
                  {Array.from({ length: 80 }).map((_, i) => {
                    const score = analysis.scores.total[i];
                    const opacity = Math.max(0.1, score / 100);
                    return (
                      <div 
                        key={i} 
                        className="aspect-square rounded-lg flex items-center justify-center text-sm font-mono relative group cursor-pointer"
                        style={{ backgroundColor: `rgba(52, 211, 153, ${opacity})` }}
                      >
                        <span className={opacity > 0.5 ? "text-zinc-950 font-bold" : "text-zinc-400"}>
                          {(i + 1).toString().padStart(2, '0')}
                        </span>
                        
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-zinc-800 text-zinc-200 text-xs rounded p-2 opacity-0 group-hover:opacity-100 pointer-events-none z-10 shadow-xl border border-zinc-700">
                          <div className="font-bold mb-1 text-emerald-400">号码 {i + 1}</div>
                          <div className="flex justify-between"><span>综合分:</span> <span className="font-mono">{score.toFixed(1)}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Frequency Chart */}
              <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-6 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4" />
                  频率分布柱状图
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analysis.scores.frequency.map((s, i) => ({ num: i + 1, score: s }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="num" stroke="#71717a" fontSize={10} tickMargin={8} minTickGap={10} />
                      <YAxis stroke="#71717a" fontSize={10} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#e4e4e7' }}
                        itemStyle={{ color: '#34d399' }}
                      />
                      <Bar dataKey="score" fill="#34d399" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backtest' && (
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-8 flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-xl font-medium text-zinc-100 flex items-center gap-2">
                    <History className="w-6 h-6 text-emerald-500" />
                    历史命中率回测
                  </h2>
                  <p className="text-zinc-500 text-sm">
                    系统将使用前 {periodRange} 期数据预测下一期，验证各算法在历史数据中的实际表现。
                  </p>
                </div>
                <button 
                  onClick={handleBacktest}
                  disabled={isBacktesting}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isBacktesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {isBacktesting ? '正在回测...' : '开始 100 期回测'}
                </button>
              </div>

              {backtestResults.length > 0 && (
                <>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6">
                      <div className="text-zinc-500 text-xs uppercase tracking-wider mb-2">综合命中率 (≥1号)</div>
                      <div className="text-4xl font-bold text-emerald-400 font-mono">{overallHitRate}%</div>
                    </div>
                    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6">
                      <div className="text-zinc-500 text-xs uppercase tracking-wider mb-2">完美命中率 (2/2)</div>
                      <div className="text-4xl font-bold text-emerald-400 font-mono">{perfectHitRate}%</div>
                    </div>
                    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6">
                      <div className="text-zinc-500 text-xs uppercase tracking-wider mb-2">回测期数</div>
                      <div className="text-4xl font-bold text-zinc-100 font-mono">{backtestResults.length}</div>
                    </div>
                  </div>

                  <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-6">命中趋势图</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={backtestResults.map((r, i) => ({ 
                          period: r.period, 
                          hits: r.hitCount,
                          avg: backtestResults.slice(0, i + 1).reduce((acc, curr) => acc + curr.hitCount, 0) / (i + 1)
                        }))}>
                          <defs>
                            <linearGradient id="colorHits" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="period" stroke="#71717a" fontSize={10} hide />
                          <YAxis stroke="#71717a" fontSize={10} domain={[0, 2]} ticks={[0, 1, 2]} />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#e4e4e7' }}
                          />
                          <Area type="monotone" dataKey="hits" stroke="#34d399" fillOpacity={1} fill="url(#colorHits)" />
                          <Line type="monotone" dataKey="avg" stroke="#fbbf24" strokeWidth={1} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-900 border-b border-zinc-800/50 text-zinc-400">
                        <tr>
                          <th className="px-6 py-4 font-medium">期号</th>
                          <th className="px-6 py-4 font-medium">预测号码</th>
                          <th className="px-6 py-4 font-medium">命中情况</th>
                          <th className="px-6 py-4 font-medium">结果</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {backtestResults.slice(-20).reverse().map((res) => (
                          <tr key={res.period} className="hover:bg-zinc-800/20 transition-colors">
                            <td className="px-6 py-4 font-mono text-zinc-300">{res.period}</td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                {res.predicted.map(n => (
                                  <span key={n} className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono border",
                                    res.actual.includes(n) ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-zinc-800 border-zinc-700 text-zinc-500"
                                  )}>
                                    {n.toString().padStart(2, '0')}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-24 bg-zinc-800 rounded-full overflow-hidden">
                                  <div 
                                    className={cn("h-full transition-all", res.hitCount === 2 ? "bg-emerald-500" : res.hitCount === 1 ? "bg-emerald-500/50" : "bg-zinc-700")} 
                                    style={{ width: `${(res.hitCount / 2) * 100}%` }}
                                  />
                                </div>
                                <span className="text-xs font-mono text-zinc-500">{res.hitCount}/2</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {res.hitCount === 2 ? (
                                <span className="flex items-center gap-1 text-emerald-500 text-xs font-bold uppercase">
                                  <CheckCircle2 className="w-3 h-3" /> 完美命中
                                </span>
                              ) : res.hitCount === 1 ? (
                                <span className="text-emerald-500/60 text-xs">命中 1 号</span>
                              ) : (
                                <span className="text-zinc-600 text-xs">未命中</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="max-w-6xl mx-auto">
              <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-900 border-b border-zinc-800/50 text-zinc-400">
                    <tr>
                      <th className="px-6 py-4 font-medium">期号</th>
                      <th className="px-6 py-4 font-medium">开奖日期</th>
                      <th className="px-6 py-4 font-medium">开奖号码</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {data.slice(0, 50).map((draw) => (
                      <tr key={draw.issue} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="px-6 py-4 font-mono text-zinc-300">{draw.issue}</td>
                        <td className="px-6 py-4 text-zinc-500">{draw.date}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {draw.numbers.map(n => (
                              <span key={n} className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-xs font-mono text-zinc-300">
                                {n.toString().padStart(2, '0')}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

