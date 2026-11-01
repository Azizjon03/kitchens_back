import { useId, useState } from 'react';

/**
 * #35: taom rasmi. Rasm yo'q yoki yuklanmasa — "bo'sh quti" emas, restoran
 * rangidagi atlas (ikat) naqshi va taom bosh harfi. Naqsh har taomda biroz
 * siljiydi, shuning uchun ro'yxat bir xil ko'rinmaydi.
 */
export default function DishImage({
  src,
  name,
  seed,
  className = '',
  eager = false,
}: {
  src?: string | null;
  name: string;
  seed: number;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const pid = useId().replace(/:/g, '');

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  const shift = (seed * 7) % 24;
  return (
    <div role="img" aria-label={name} className={`relative h-full w-full overflow-hidden ${className}`} style={{ background: 'color-mix(in srgb, var(--tg-accent) 14%, var(--tg-card))' }}>
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          {/* Atlas (ikat) naqshi: zinapoya qirrali katta romb — ip bo'yalganda "tovlanadigan" chet */}
          <pattern id={`ikat-${pid}`} width="56" height="96" patternUnits="userSpaceOnUse" patternTransform={`translate(${shift} ${shift * 2})`}>
            <path d="M28 4 L34 14 L38 14 L44 28 L48 28 L52 48 L48 68 L44 68 L38 82 L34 82 L28 92 L22 82 L18 82 L12 68 L8 68 L4 48 L8 28 L12 28 L18 14 L22 14 Z" fill="var(--tg-accent)" opacity="0.16" />
            <path d="M28 24 L36 40 L40 48 L36 56 L28 72 L20 56 L16 48 L20 40 Z" fill="var(--tg-accent)" opacity="0.32" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#ikat-${pid})`} />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-5xl font-black"
        style={{ color: 'var(--tg-accent)', opacity: 0.85 }}
        aria-hidden="true"
      >
        {name.trim().charAt(0).toUpperCase()}
      </span>
    </div>
  );
}
