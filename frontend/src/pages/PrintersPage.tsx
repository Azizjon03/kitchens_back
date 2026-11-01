import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Monitor, Pencil, Plus, Printer as PrinterIcon, Trash2, X } from 'lucide-react';
import api from '../lib/api';
import Layout from '../components/Layout';
import PageGuide from '../components/PageGuide';
import NumberInput from '../components/NumberInput';
import { ErrorState, LoadingState } from '../components/QueryState';
import { apiErrorMessage, apiFieldErrors } from '../lib/apiError';
import { formatDateTime } from '../lib/format';
import { useEscape } from '../lib/useEscape';

/**
 * #53: oshxona LAN printerlari. Oshxona kompyuteridagi dastur (Windows, PowerShell)
 * serverdan cheklarni olib, har bo'lim printeriga to'g'ridan-to'g'ri yuboradi.
 */
interface PrinterRow {
  id: number; name: string; ip: string; port: number; paper_width: 58 | 80; is_active: boolean;
  status: 'online' | 'offline' | 'unknown'; last_error: string | null; last_checked_at: string | null;
}
interface AgentRow { id: number; name: string; online: boolean; last_seen_at: string | null; version: string | null }
interface JobRow {
  id: number; order_id: number | null; kind: string; status: 'pending' | 'sent' | 'printed' | 'failed';
  error: string | null; created_at: string; printer?: { id: number; name: string } | null;
}
interface Data { printers: PrinterRow[]; agents: AgentRow[]; recent_jobs: JobRow[]; latest_agent_version?: string }

const PSTATUS = {
  online: { label: 'Ishlayapti', cls: 'bg-green-100 text-green-800' },
  offline: { label: 'Javob bermayapti', cls: 'bg-red-100 text-red-800' },
  unknown: { label: 'Tekshirilmagan', cls: 'bg-gray-100 text-gray-800' },
};
const JSTATUS = {
  pending: { label: 'Navbatda', cls: 'text-amber-800' },
  sent: { label: 'Yuborildi', cls: 'text-blue-800' },
  printed: { label: 'Chiqdi', cls: 'text-green-800' },
  failed: { label: 'Chiqmadi', cls: 'text-red-700' },
};

function download(filename: string, text: string) {
  // BOM (\uFEFF) — Windows PowerShell 5.1 faylni UTF-8 deb o'qisin; CRLF — Windows qator oxiri
  const url = URL.createObjectURL(new Blob(['\uFEFF' + text.replace(/\r?\n/g, '\r\n')], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function PrinterModal({ printer, onClose }: { printer?: PrinterRow; onClose: () => void }) {
  const queryClient = useQueryClient();
  useEscape(onClose);
  const [form, setForm] = useState({
    name: printer?.name ?? '', ip: printer?.ip ?? '', port: String(printer?.port ?? 9100), paper_width: printer?.paper_width ?? 80,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: async () => {
      const body = { name: form.name.trim(), ip: form.ip.trim(), port: Number(form.port) || 9100, paper_width: form.paper_width };
      return printer ? api.put(`/printers/${printer.id}`, body) : api.post('/printers', body);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['printers'] }); onClose(); },
    onError: (err) => { const fe = apiFieldErrors(err); setErrors(Object.keys(fe).length ? fe : { _: apiErrorMessage(err, "Saqlab bo'lmadi") }); },
  });
  const input = 'w-full min-h-11 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none';
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4" onClick={onClose}>
      <form role="dialog" aria-modal="true" aria-labelledby="pr-title" onClick={(e) => e.stopPropagation()}
        onSubmit={(e: FormEvent) => { e.preventDefault(); setErrors({}); save.mutate(); }}
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="pr-title" className="text-lg font-semibold text-gray-900">{printer ? 'Printerni tahrirlash' : 'Yangi printer'}</h2>
          <button type="button" onClick={onClose} aria-label="Yopish" className="min-h-11 min-w-11 inline-flex items-center justify-center text-gray-600"><X size={20} /></button>
        </div>
        <div>
          <label htmlFor="pr-name" className="block text-sm font-medium text-gray-700 mb-1">Nomi</label>
          <input id="pr-name" required maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Masalan: Kabob printeri" className={input} />
          {errors.name && <p className="mt-1 text-sm text-red-700">{errors.name}</p>}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label htmlFor="pr-ip" className="block text-sm font-medium text-gray-700 mb-1">IP manzil</label>
            <input id="pr-ip" required inputMode="decimal" value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value.replace(/[^\d.]/g, '') })} placeholder="192.168.1.100" className={input} />
          </div>
          <div>
            <label htmlFor="pr-port" className="block text-sm font-medium text-gray-700 mb-1">Port</label>
            <NumberInput id="pr-port" required min={1} step={1} value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} className={input} />
          </div>
        </div>
        {errors.ip && <p className="-mt-2 text-sm text-red-700">{errors.ip}</p>}
        <p className="-mt-2 text-xs text-gray-600">IP manzil printerning o'zidan chop etiladigan «Self test» qog'ozida yoziladi (printerni o'chirib, FEED tugmasini bosib turgan holda yoqing).</p>
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-1">Qog'oz kengligi</legend>
          <div className="flex gap-2">
            {([80, 58] as const).map((w) => (
              <label key={w} className={`min-h-11 px-4 inline-flex items-center gap-2 rounded-lg border cursor-pointer ${form.paper_width === w ? 'border-amber-600 bg-amber-50' : 'border-gray-300'}`}>
                <input type="radio" name="pw" checked={form.paper_width === w} onChange={() => setForm({ ...form, paper_width: w })} className="accent-amber-700" /> {w} mm
              </label>
            ))}
          </div>
        </fieldset>
        {errors._ && <p role="alert" className="text-sm text-red-700">{errors._}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="min-h-11 px-4 text-sm text-gray-700">Bekor qilish</button>
          <button type="submit" disabled={save.isPending} className="min-h-11 px-5 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50">Saqlash</button>
        </div>
      </form>
    </div>
  );
}

function AgentModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  useEscape(onClose);
  const [name, setName] = useState('Oshxona kompyuteri');
  const [done, setDone] = useState<{ script: string; filename: string } | null>(null);
  const [error, setError] = useState('');
  const create = useMutation({
    mutationFn: async () => (await api.post('/print-agents', { name: name.trim() })).data.data as { script: string; filename: string },
    onSuccess: (d) => { queryClient.invalidateQueries({ queryKey: ['printers'] }); setDone(d); download(d.filename, d.script); },
    onError: (err) => setError(apiErrorMessage(err, "Ulab bo'lmadi")),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="ag-title" onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="ag-title" className="text-lg font-semibold text-gray-900">Oshxona kompyuterini ulash</h2>
          <button type="button" onClick={onClose} aria-label="Yopish" className="min-h-11 min-w-11 inline-flex items-center justify-center text-gray-600"><X size={20} /></button>
        </div>
        {!done ? (
          <form onSubmit={(e) => { e.preventDefault(); setError(''); create.mutate(); }} className="space-y-4">
            <p className="text-sm text-gray-700">Printerlar ulangan tarmoqdagi Windows kompyuter. Unga kichik dastur yuklab olinadi — u cheklarni printerlarga yuboradi.</p>
            <div>
              <label htmlFor="ag-name" className="block text-sm font-medium text-gray-700 mb-1">Kompyuter nomi</label>
              <input id="ag-name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className="w-full min-h-11 px-3 border border-gray-300 rounded-lg text-sm" />
            </div>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={create.isPending} className="w-full min-h-12 bg-amber-700 text-white rounded-lg font-semibold hover:bg-amber-800 disabled:opacity-50 inline-flex items-center justify-center gap-2">
              <Download size={18} aria-hidden="true" /> Dasturni yuklab olish
            </button>
          </form>
        ) : (
          <div className="space-y-3 text-sm text-gray-800">
            <p className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-green-900">«{done.filename}» yuklab olindi. Faylda shu kompyuterning maxfiy kaliti bor — boshqalarga bermang.</p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>Faylni oshxona kompyuteriga ko'chiring (shu kompyuterda yuklab olgan bo'lsangiz — kerak emas).</li>
              <li>Fayl ustida o'ng tugma → <b>«Run with PowerShell»</b> (PowerShell bilan ishga tushirish).</li>
              <li>«O'rnatildi» yozuvi chiqadi. Dastur kichraytirilgan oynada ishlaydi va Windows yoqilganda o'zi ishga tushadi — oynani yopmang.</li>
              <li>Shu sahifada kompyuter «Ulangan» bo'lgach, printerlar uchun «Sinov cheki» ni bosing.</li>
            </ol>
            <p className="text-xs text-gray-600">Windows «Bu fayl xavfli bo'lishi mumkin» desa — «Batafsil» → «Baribir ishga tushirish».</p>
            <button type="button" onClick={() => download(done.filename, done.script)} className="min-h-11 inline-flex items-center gap-2 px-3 rounded-lg border border-gray-300 font-medium hover:bg-gray-50">
              <Download size={16} aria-hidden="true" /> Qayta yuklab olish
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PrintersPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery<Data>({
    queryKey: ['printers'],
    queryFn: async () => (await api.get('/printers')).data.data,
    refetchInterval: 10_000,
  });
  const [printerModal, setPrinterModal] = useState<{ printer?: PrinterRow } | null>(null);
  const [agentModal, setAgentModal] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const done = (text: string) => () => { setMsg({ ok: true, text }); queryClient.invalidateQueries({ queryKey: ['printers'] }); };
  const fail = (err: unknown) => setMsg({ ok: false, text: apiErrorMessage(err, "Bajarib bo'lmadi") });
  const test = useMutation({ mutationFn: async (id: number) => api.post(`/printers/${id}/test`), onSuccess: done('Sinov cheki yuborildi — printerdan chiqishi kerak.'), onError: fail });
  const removePrinter = useMutation({ mutationFn: async (id: number) => api.delete(`/printers/${id}`), onSuccess: done("Printer o'chirildi."), onError: fail });
  const removeAgent = useMutation({ mutationFn: async (id: number) => api.delete(`/print-agents/${id}`), onSuccess: done('Kompyuter uzildi — uning kaliti endi ishlamaydi.'), onError: fail });

  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Printerlar</h1>
          <p className="text-sm text-gray-600 mt-1">Oshxona bo'limlariga chek printeri — har bo'lim faqat o'z taomlari qog'ozini oladi</p>
        </div>
        <PageGuide id="printers" />
        {msg && <p role={msg.ok ? 'status' : 'alert'} className={`mb-4 rounded-lg border px-4 py-3 text-sm ${msg.ok ? 'border-green-200 bg-green-50 text-green-900' : 'border-red-200 bg-red-50 text-red-800'}`}>{msg.text}</p>}

        {isLoading ? <LoadingState /> : isError || !data ? <ErrorState error={error} onRetry={() => refetch()} /> : (
          <div className="space-y-6">
            <section className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-gray-900 inline-flex items-center gap-2"><Monitor size={18} aria-hidden="true" /> Oshxona kompyuteri</h2>
                <button type="button" onClick={() => setAgentModal(true)} className="min-h-11 inline-flex items-center gap-1.5 px-3 rounded-lg border border-amber-600 text-sm font-medium text-amber-800 hover:bg-amber-50">
                  <Plus size={16} aria-hidden="true" /> Kompyuterni ulash
                </button>
              </div>
              {data.agents.length === 0 ? (
                <p className="mt-3 text-sm text-gray-600">Hali ulanmagan. Printerlar ishlashi uchun oshxonadagi Windows kompyuterni ulang.</p>
              ) : (
                <ul className="mt-3 divide-y divide-gray-100">
                  {data.agents.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.online ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{a.online ? 'Ulangan' : 'Aloqada emas'}</span>
                      <span className="font-medium text-gray-900">{a.name}</span>
                      <span className="text-sm text-gray-600">{a.last_seen_at ? `oxirgi: ${formatDateTime(a.last_seen_at)}` : 'hali ishga tushmagan'}{a.version ? ` · v${a.version}` : ''}</span>
                      <button type="button" onClick={() => removeAgent.mutate(a.id)} className="ml-auto min-h-11 px-2 text-sm text-gray-600 hover:text-red-700">Uzish</button>
                      {a.version && data.latest_agent_version && a.version !== data.latest_agent_version && (
                        <p className="w-full text-sm text-amber-800">
                          Dastur eski (v{a.version}). Yangi versiya v{data.latest_agent_version} — oyna pauzaga tushmaydi, yopilsa o'zi qayta ishga tushadi. «Uzish» → «Kompyuterni ulash» bilan faylni qayta yuklab oling.
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-gray-900 inline-flex items-center gap-2"><PrinterIcon size={18} aria-hidden="true" /> Printerlar</h2>
                <button type="button" onClick={() => setPrinterModal({})} className="min-h-11 inline-flex items-center gap-1.5 px-3 rounded-lg bg-amber-700 text-sm font-medium text-white hover:bg-amber-800">
                  <Plus size={16} aria-hidden="true" /> Printer qo'shish
                </button>
              </div>
              {data.printers.length === 0 ? (
                <p className="mt-3 text-sm text-gray-600">Printer yo'q. Qo'shgach, «Oshxona bo'limlari» da har bo'limga printerini tanlang.</p>
              ) : (
                <ul className="mt-3 divide-y divide-gray-100">
                  {data.printers.map((p) => (
                    <li key={p.id} className="py-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PSTATUS[p.status].cls}`}>{PSTATUS[p.status].label}</span>
                      <span className="font-medium text-gray-900">{p.name}</span>
                      <span className="text-sm text-gray-600 tabular-nums">{p.ip}:{p.port} · {p.paper_width} mm</span>
                      <span className="ml-auto flex gap-1">
                        <button type="button" onClick={() => test.mutate(p.id)} disabled={test.isPending} className="min-h-11 px-3 rounded-lg border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50">Sinov cheki</button>
                        <button type="button" onClick={() => setPrinterModal({ printer: p })} aria-label={`${p.name} — tahrirlash`} className="min-h-11 min-w-11 inline-flex items-center justify-center text-gray-600 hover:text-amber-800"><Pencil size={16} /></button>
                        <button type="button" onClick={() => removePrinter.mutate(p.id)} aria-label={`${p.name} — o'chirish`} className="min-h-11 min-w-11 inline-flex items-center justify-center text-gray-600 hover:text-red-700"><Trash2 size={16} /></button>
                      </span>
                      {p.status === 'offline' && p.last_error && <p className="w-full text-sm text-red-700">{p.last_error}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {data.recent_jobs.length > 0 && (
              <section className="bg-white rounded-xl border border-gray-200">
                <h2 className="px-5 pt-5 font-semibold text-gray-900">Oxirgi cheklar</h2>
                <ul className="mt-2 divide-y divide-gray-100 text-sm">
                  {data.recent_jobs.map((j) => (
                    <li key={j.id} className="px-5 py-2 flex flex-wrap gap-x-3">
                      <span className="tabular-nums text-gray-600">{formatDateTime(j.created_at)}</span>
                      <span className="text-gray-900">{j.kind === 'test' ? 'Sinov' : `#${j.order_id}`} → {j.printer?.name}</span>
                      <span className={`ml-auto font-medium ${JSTATUS[j.status].cls}`}>{JSTATUS[j.status].label}</span>
                      {j.status === 'failed' && j.error && <span className="w-full text-red-700">{j.error}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
      {printerModal && <PrinterModal printer={printerModal.printer} onClose={() => setPrinterModal(null)} />}
      {agentModal && <AgentModal onClose={() => setAgentModal(false)} />}
    </Layout>
  );
}
