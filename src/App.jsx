
import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

export default function App() {
  const [prices, setPrices] = useState([]);
  const [labels, setLabels] = useState([]);
  const [rsi, setRsi] = useState(null);
  const [signal, setSignal] = useState("계산 중...");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("https://api.upbit.com/v1/candles/days?market=KRW-BTC&count=100");
        const data = await res.json();
        const closes = data.map(d => d.trade_price).reverse();
        const times = data.map(d => d.candle_date_time_kst.substring(5, 10)).reverse();

        setPrices(closes);
        setLabels(times);

        // RSI 계산
        const changes = closes.slice(1).map((c, i) => c - closes[i]);
        const gains = changes.map(c => (c > 0 ? c : 0));
        const losses = changes.map(c => (c < 0 ? -c : 0));

        const avgGain = gains.slice(-14).reduce((a, b) => a + b, 0) / 14;
        const avgLoss = losses.slice(-14).reduce((a, b) => a + b, 0) / 14;
        const rs = avgGain / avgLoss;
        const rsiVal = 100 - (100 / (1 + rs));
        setRsi(rsiVal.toFixed(2));

        // 시그널 판정
        const latest = closes[closes.length - 1];
        const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
        const std = Math.sqrt(closes.slice(-20).map(p => (p - sma20) ** 2).reduce((a, b) => a + b, 0) / 20);
        const bbUpper = sma20 + 2 * std;
        const bbLower = sma20 - 2 * std;

        if (rsiVal < 30 && latest < bbLower && latest < sma20) setSignal("🟢 매수");
        else if (rsiVal > 70 || latest > bbUpper) setSignal("🔴 매도");
        else setSignal("⚪ 보류");
      } catch (e) {
        console.error("데이터 오류", e);
      }
    }

    fetchData();
  }, []);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'BTC 가격',
        data: prices,
        borderColor: 'blue',
        backgroundColor: 'rgba(0,0,255,0.1)',
        tension: 0.3,
        pointRadius: 0
      },
    ],
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2>📈 BTC 실시간 시그널</h2>
      <p>RSI: {rsi} / 시그널: <strong>{signal}</strong></p>
      <div style={{ maxWidth: '800px' }}>
        <Line data={chartData} />
      </div>
    </div>
  );
}
