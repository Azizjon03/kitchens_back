import { useState } from 'react';
import { Printer } from 'lucide-react';
import { printReceipt, type KitchenOptions, type ReceiptKind } from '../lib/receipt';
import { apiErrorMessage } from '../lib/apiError';

const LABELS: Record<ReceiptKind, string> = {
  payment: 'Chek chiqarish',
  bill: 'Hisob chiqarish',
  delivery: 'Chek chiqarish',
  kitchen: 'Chop etish',
};

/** #44: «Chek chiqarish» tugmasi — chek ma'lumotini olib, printerga yuboradi. */
export default function ReceiptButton({ orderId, kind, label, className, kitchen }: {
  orderId: number;
  kind: ReceiptKind;
  label?: string;
  className?: string;
  kitchen?: KitchenOptions;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setError('');
          setBusy(true);
          try {
            await printReceipt(orderId, kind, kitchen);
          } catch (err) {
            setError(apiErrorMessage(err, "Chekni chiqarib bo'lmadi"));
          } finally {
            setBusy(false);
          }
        }}
        aria-label={label === '' ? LABELS[kind] : undefined}
        title={label === '' ? LABELS[kind] : undefined}
        className={className ?? 'min-h-11 inline-flex items-center justify-center gap-2 px-3 rounded-lg border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50'}
      >
        <Printer size={16} aria-hidden="true" /> {label === '' ? null : busy ? 'Tayyorlanmoqda...' : label ?? LABELS[kind]}
      </button>
      {error && <span role="alert" className="mt-1 text-xs text-red-700">{error}</span>}
    </span>
  );
}
