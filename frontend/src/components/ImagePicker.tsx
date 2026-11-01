import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';

/**
 * #35: taom rasmi tanlash (panel). Tanlangan fayl darhol ko'rinadi; yuklash
 * saqlashda bajariladi. Server rasmni kichraytiradi va WebP'ga o'giradi.
 */
export default function ImagePicker({
  current,
  file,
  removed,
  onFile,
  onRemove,
}: {
  current?: string | null;
  file: File | null;
  removed: boolean;
  onFile: (f: File | null) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const shown = preview ?? (removed ? null : current ?? null);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">Rasm</label>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-500 hover:border-amber-600"
          aria-label={shown ? 'Rasmni almashtirish' : 'Rasm tanlash'}
        >
          {shown ? <img src={shown} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={28} aria-hidden="true" />}
        </button>
        <div className="text-sm text-gray-600">
          <p>Mijozlar Telegram menyusida ko'radi. Kvadrat, yorug' rasm yaxshi chiqadi.</p>
          <div className="mt-1 flex flex-wrap gap-2">
            <button type="button" onClick={() => input.current?.click()} className="min-h-11 text-amber-700 font-medium hover:underline">
              {shown ? 'Almashtirish' : 'Rasm tanlash'}
            </button>
            {shown && (
              <button type="button" onClick={() => { onFile(null); onRemove(); }} className="min-h-11 inline-flex items-center gap-1 text-red-600 font-medium hover:underline">
                <Trash2 size={14} aria-hidden="true" /> Olib tashlash
              </button>
            )}
          </div>
          {error && <p className="text-red-600">{error}</p>}
        </div>
      </div>
      <input
        id={id}
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          e.target.value = '';
          if (f && f.size > 6 * 1024 * 1024) {
            setError('Rasm 6 MB dan oshmasin.');
            return;
          }
          setError('');
          onFile(f);
        }}
      />
    </div>
  );
}
