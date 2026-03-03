export interface DrawData {
  issue: string;
  date: string;
  numbers: number[];
}

export interface AlgorithmScores {
  frequency: number[];
  markov: number[];
  omission: number[];
  cycle: number[];
  bayesian: number[];
  pagerank: number[];
  entropy: number[];
  heat: number[];
  momentum: number[];
  pairing: number[];
  total: number[];
}

export interface PairScore {
  pair: [number, number];
  score: number;
}

// Helper to normalize scores to 0-100 range
function normalizeScores(scores: number[]): number[] {
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (max === min) return scores.map(() => 50);
  return scores.map(s => ((s - min) / (max - min)) * 100);
}

export class Happy8Analyzer {
  private data: DrawData[];
  private weights: Record<keyof Omit<AlgorithmScores, 'total' | 'pairing'>, number>;

  constructor(data: DrawData[], weights: Record<keyof Omit<AlgorithmScores, 'total' | 'pairing'>, number>) {
    // Data is assumed to be sorted newest first
    this.data = data;
    this.weights = weights;
  }

  public analyze(periodRange: number = 500): AlgorithmScores {
    const recentData = this.data.slice(0, periodRange);
    const oldestFirstData = [...recentData].reverse();

    const frequency = this.calcFrequency(recentData);
    const markov = this.calcMarkov(oldestFirstData);
    const omission = this.calcOmission(oldestFirstData);
    const cycle = this.calcCycle(oldestFirstData);
    const bayesian = this.calcBayesian(recentData);
    const pagerank = this.calcPageRank(recentData);
    const entropy = this.calcEntropy(oldestFirstData);
    const heat = this.calcHeat(recentData);
    const momentum = this.calcMomentum(recentData);

    const total = new Array(80).fill(0);
    const algos = { frequency, markov, omission, cycle, bayesian, pagerank, entropy, heat, momentum };
    
    let totalWeight = 0;
    for (const key of Object.keys(this.weights) as Array<keyof typeof algos>) {
      totalWeight += this.weights[key];
    }

    if (totalWeight === 0) totalWeight = 1;

    for (let i = 0; i < 80; i++) {
      for (const key of Object.keys(this.weights) as Array<keyof typeof algos>) {
        total[i] += (algos[key][i] * this.weights[key]) / totalWeight;
      }
    }

    return {
      ...algos,
      pairing: [], // Handled separately
      total
    };
  }

  public getTopPairs(periodRange: number = 500, topN: number = 10): PairScore[] {
    const recentData = this.data.slice(0, periodRange);
    const pairCounts = new Map<string, number>();
    const singleCounts = new Array(80).fill(0);

    for (const draw of recentData) {
      for (let i = 0; i < draw.numbers.length; i++) {
        const num1 = draw.numbers[i] - 1;
        singleCounts[num1]++;
        for (let j = i + 1; j < draw.numbers.length; j++) {
          const num2 = draw.numbers[j] - 1;
          const key = num1 < num2 ? `${num1},${num2}` : `${num2},${num1}`;
          pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
        }
      }
    }

    const totalDraws = recentData.length;
    const pairs: PairScore[] = [];

    for (const [key, count] of pairCounts.entries()) {
      const [n1, n2] = key.split(',').map(Number);
      const p1 = singleCounts[n1] / totalDraws;
      const p2 = singleCounts[n2] / totalDraws;
      const p12 = count / totalDraws;
      
      // Lift = P(a∩b) / (P(a)P(b))
      const lift = (p1 > 0 && p2 > 0) ? p12 / (p1 * p2) : 0;
      pairs.push({ pair: [n1 + 1, n2 + 1], score: lift });
    }

    pairs.sort((a, b) => b.score - a.score);
    return pairs.slice(0, topN);
  }

  // 1. Frequency Analysis
  private calcFrequency(data: DrawData[]): number[] {
    const counts = new Array(80).fill(0);
    for (const draw of data) {
      for (const num of draw.numbers) {
        counts[num - 1]++;
      }
    }
    return normalizeScores(counts);
  }

  // 2. Markov Chain
  private calcMarkov(oldestFirstData: DrawData[]): number[] {
    const matrix = Array.from({ length: 80 }, () => new Array(80).fill(0));
    
    for (let t = 1; t < oldestFirstData.length; t++) {
      const prev = oldestFirstData[t - 1].numbers;
      const curr = oldestFirstData[t].numbers;
      for (const i of prev) {
        for (const j of curr) {
          matrix[i - 1][j - 1]++;
        }
      }
    }

    for (let i = 0; i < 80; i++) {
      const sum = matrix[i].reduce((a, b) => a + b, 0);
      if (sum > 0) {
        for (let j = 0; j < 80; j++) {
          matrix[i][j] /= sum;
        }
      }
    }

    const lastDraw = oldestFirstData[oldestFirstData.length - 1].numbers;
    const scores = new Array(80).fill(0);
    for (const i of lastDraw) {
      for (let j = 0; j < 80; j++) {
        scores[j] += matrix[i - 1][j];
      }
    }

    return normalizeScores(scores);
  }

  // 3. Omission Analysis
  private calcOmission(oldestFirstData: DrawData[]): number[] {
    const lastSeen = new Array(80).fill(-1);
    const gaps: number[][] = Array.from({ length: 80 }, () => []);

    for (let t = 0; t < oldestFirstData.length; t++) {
      for (const num of oldestFirstData[t].numbers) {
        const idx = num - 1;
        if (lastSeen[idx] !== -1) {
          gaps[idx].push(t - lastSeen[idx]);
        }
        lastSeen[idx] = t;
      }
    }

    const currentT = oldestFirstData.length;
    const scores = new Array(80).fill(0);

    for (let i = 0; i < 80; i++) {
      const currentOmission = lastSeen[i] === -1 ? currentT : currentT - 1 - lastSeen[i];
      const avgOmission = gaps[i].length > 0 ? gaps[i].reduce((a, b) => a + b, 0) / gaps[i].length : 4;
      scores[i] = avgOmission > 0 ? currentOmission / avgOmission : 0;
    }

    return normalizeScores(scores);
  }

  // 4. Cycle Fluctuation
  private calcCycle(oldestFirstData: DrawData[]): number[] {
    const lastSeen = new Array(80).fill(-1);
    const gaps: number[][] = Array.from({ length: 80 }, () => []);

    for (let t = 0; t < oldestFirstData.length; t++) {
      for (const num of oldestFirstData[t].numbers) {
        const idx = num - 1;
        if (lastSeen[idx] !== -1) {
          gaps[idx].push(t - lastSeen[idx]);
        }
        lastSeen[idx] = t;
      }
    }

    const currentT = oldestFirstData.length;
    const scores = new Array(80).fill(0);

    for (let i = 0; i < 80; i++) {
      const currentOmission = lastSeen[i] === -1 ? currentT : currentT - 1 - lastSeen[i];
      const avgOmission = gaps[i].length > 0 ? gaps[i].reduce((a, b) => a + b, 0) / gaps[i].length : 4;
      const diff = Math.abs(currentOmission - avgOmission);
      scores[i] = 1 / (1 + diff);
    }

    return normalizeScores(scores);
  }

  // 5. Bayesian Probability
  private calcBayesian(recentData: DrawData[]): number[] {
    const likelihoodData = recentData.slice(0, 50);
    const counts = new Array(80).fill(0);
    for (const draw of likelihoodData) {
      for (const num of draw.numbers) {
        counts[num - 1]++;
      }
    }
    const scores = counts.map(c => 0.25 * (c / likelihoodData.length));
    return normalizeScores(scores);
  }

  // 6. PageRank Network
  private calcPageRank(recentData: DrawData[]): number[] {
    const matrix = Array.from({ length: 80 }, () => new Array(80).fill(0));
    for (const draw of recentData) {
      for (let i = 0; i < draw.numbers.length; i++) {
        for (let j = i + 1; j < draw.numbers.length; j++) {
          const n1 = draw.numbers[i] - 1;
          const n2 = draw.numbers[j] - 1;
          matrix[n1][n2]++;
          matrix[n2][n1]++;
        }
      }
    }

    for (let j = 0; j < 80; j++) {
      let sum = 0;
      for (let i = 0; i < 80; i++) sum += matrix[i][j];
      if (sum > 0) {
        for (let i = 0; i < 80; i++) matrix[i][j] /= sum;
      }
    }

    let pr = new Array(80).fill(1 / 80);
    const d = 0.85;

    for (let iter = 0; iter < 30; iter++) {
      const newPr = new Array(80).fill((1 - d) / 80);
      for (let i = 0; i < 80; i++) {
        for (let j = 0; j < 80; j++) {
          newPr[i] += d * matrix[i][j] * pr[j];
        }
      }
      pr = newPr;
    }

    return normalizeScores(pr);
  }

  // 7. Information Entropy
  private calcEntropy(oldestFirstData: DrawData[]): number[] {
    const scores = new Array(80).fill(0);
    const totalDraws = oldestFirstData.length;

    for (let i = 0; i < 80; i++) {
      let count = 0;
      for (const draw of oldestFirstData) {
        if (draw.numbers.includes(i + 1)) count++;
      }
      const p1 = count / totalDraws;
      const p0 = 1 - p1;
      
      let entropy = 0;
      if (p1 > 0) entropy -= p1 * Math.log2(p1);
      if (p0 > 0) entropy -= p0 * Math.log2(p0);
      scores[i] = -entropy;
    }

    return normalizeScores(scores);
  }

  // 8. Heat Analysis
  private calcHeat(recentData: DrawData[]): number[] {
    const counts20 = new Array(80).fill(0);
    const counts50 = new Array(80).fill(0);

    for (let i = 0; i < Math.min(50, recentData.length); i++) {
      for (const num of recentData[i].numbers) {
        counts50[num - 1]++;
        if (i < 20) counts20[num - 1]++;
      }
    }

    const scores = new Array(80).fill(0);
    for (let i = 0; i < 80; i++) {
      const rate20 = counts20[i] / 20;
      const rate50 = counts50[i] / 50;
      scores[i] = rate50 > 0 ? rate20 / rate50 : 0;
    }

    return normalizeScores(scores);
  }

  // 9. Momentum Analysis
  private calcMomentum(recentData: DrawData[]): number[] {
    const scores = new Array(80).fill(0);
    const weights = [5, 4, 3, 2, 1];

    for (let i = 0; i < Math.min(5, recentData.length); i++) {
      for (const num of recentData[i].numbers) {
        scores[num - 1] += weights[i];
      }
    }

    return normalizeScores(scores);
  }
}

export interface BacktestResult {
  period: string;
  predicted: [number, number];
  actual: number[];
  hit: boolean;
  hitCount: number;
}

export class Happy8Backtester {
  private data: DrawData[];

  constructor(data: DrawData[]) {
    this.data = data;
  }

  public run(
    testPeriods: number = 100, 
    periodRange: number = 500, 
    weights: Record<keyof Omit<AlgorithmScores, 'total' | 'pairing'>, number>
  ): BacktestResult[] {
    const results: BacktestResult[] = [];
    
    // We need at least periodRange + 1 draws to start testing
    // data is newest first
    for (let i = 0; i < testPeriods; i++) {
      const targetDraw = this.data[i];
      if (!targetDraw) break;

      const historicalData = this.data.slice(i + 1);
      if (historicalData.length < periodRange) break;

      const analyzer = new Happy8Analyzer(historicalData, weights);
      const scores = analyzer.analyze(periodRange);
      
      // Get top 2 numbers
      const top2 = scores.total
        .map((score, index) => ({ number: index + 1, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map(n => n.number) as [number, number];

      const hits = top2.filter(n => targetDraw.numbers.includes(n));
      
      results.push({
        period: targetDraw.issue,
        predicted: top2,
        actual: targetDraw.numbers,
        hit: hits.length === 2,
        hitCount: hits.length
      });
    }

    return results.reverse(); // Return oldest to newest for charting
  }

  public optimizeWeights(testPeriods: number = 50, periodRange: number = 300): Record<keyof Omit<AlgorithmScores, 'total' | 'pairing'>, number> {
    const keys: Array<keyof Omit<AlgorithmScores, 'total' | 'pairing'>> = [
      'frequency', 'markov', 'omission', 'cycle', 'bayesian', 'pagerank', 'entropy', 'heat', 'momentum'
    ];

    let bestWeights = { ...DEFAULT_WEIGHTS };
    let bestHitRate = -1;

    // Simple random search for optimization (10 iterations)
    // In a real scenario, this would be more sophisticated
    for (let iter = 0; iter < 10; iter++) {
      const currentWeights: any = {};
      let sum = 0;
      for (const key of keys) {
        currentWeights[key] = Math.floor(Math.random() * 100);
        sum += currentWeights[key];
      }
      // Normalize to 100%
      for (const key of keys) {
        currentWeights[key] = Math.round((currentWeights[key] / sum) * 100);
      }

      const results = this.run(testPeriods, periodRange, currentWeights);
      const hitRate = results.filter(r => r.hitCount >= 1).length / results.length; // Count at least 1 hit as success for optimization

      if (hitRate > bestHitRate) {
        bestHitRate = hitRate;
        bestWeights = { ...currentWeights };
      }
    }

    return bestWeights;
  }
}

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

