import { Position } from '@/types';

interface PortfolioExportRow {
  athleteName: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  costBasis: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

interface TradeExportRow {
  date: string;
  athleteName: string;
  side: string;
  quantity: number;
  price: number;
  total: number;
  fee: number;
}

export function exportPositionsToCSV(
  positions: (Position & { athleteName: string; currentPrice: number })[]
) {
  const rows: PortfolioExportRow[] = positions.map((pos) => ({
    athleteName: pos.athleteName,
    quantity: pos.quantity,
    avgCost: pos.avgCost,
    currentPrice: pos.currentPrice,
    costBasis: pos.avgCost * pos.quantity,
    currentValue: pos.currentPrice * pos.quantity,
    unrealizedPnL: pos.pnl,
    unrealizedPnLPercent: pos.pnlPercent,
  }));

  const headers = [
    'Athlete',
    'Quantity',
    'Avg Cost',
    'Current Price',
    'Cost Basis',
    'Current Value',
    'Unrealized P&L',
    'Unrealized P&L %',
  ];

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      [
        `"${row.athleteName}"`,
        row.quantity.toFixed(2),
        row.avgCost.toFixed(2),
        row.currentPrice.toFixed(2),
        row.costBasis.toFixed(2),
        row.currentValue.toFixed(2),
        row.unrealizedPnL.toFixed(2),
        row.unrealizedPnLPercent.toFixed(2),
      ].join(',')
    ),
  ].join('\n');

  downloadCSV(csvContent, 'portfolio-positions.csv');
}

export function exportTradesToCSV(
  trades: { date: Date; athleteName: string; side: string; quantity: number; price: number; total: number; fee: number }[]
) {
  const rows: TradeExportRow[] = trades.map((trade) => ({
    date: trade.date.toISOString(),
    athleteName: trade.athleteName,
    side: trade.side,
    quantity: trade.quantity,
    price: trade.price,
    total: trade.total,
    fee: trade.fee,
  }));

  const headers = ['Date', 'Athlete', 'Side', 'Quantity', 'Price', 'Total', 'Fee'];

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      [
        `"${row.date}"`,
        `"${row.athleteName}"`,
        row.side,
        row.quantity.toFixed(2),
        row.price.toFixed(2),
        row.total.toFixed(2),
        row.fee.toFixed(2),
      ].join(',')
    ),
  ].join('\n');

  downloadCSV(csvContent, 'trade-history.csv');
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
