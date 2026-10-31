import { WifiOff } from 'lucide-react';
import { useOnline } from '../../lib/useOnline';

/** #26: internet uzilganda — savat saqlanib qoladi, ulanganda hammasi o'zi yangilanadi. */
export default function TgOfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="sticky top-0 z-40 flex items-center gap-2 bg-gray-900 px-4 py-2 text-sm text-white">
      <WifiOff size={16} aria-hidden="true" />
      Aloqa yo'q. Savatingiz saqlangan — internet qaytsa davom etasiz.
    </div>
  );
}
