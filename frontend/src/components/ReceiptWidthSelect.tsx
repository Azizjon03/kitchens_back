import { useState } from 'react';
import { receiptWidth, setReceiptWidth } from '../lib/receipt';

/** #44: shu qurilmadagi printer qog'ozi kengligi (har qurilmada o'z printeri bo'ladi) */
export default function ReceiptWidthSelect() {
  const [w, setW] = useState(receiptWidth());
  return (
    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
      Printer qog'ozi
      <select
        value={w}
        onChange={(e) => { const v = Number(e.target.value) as 58 | 80; setW(v); setReceiptWidth(v); }}
        className="min-h-11 px-2 border border-gray-300 rounded-lg text-sm"
      >
        <option value={80}>80 mm</option>
        <option value={58}>58 mm</option>
      </select>
    </label>
  );
}
