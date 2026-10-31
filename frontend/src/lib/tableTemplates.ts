import { useQuery } from '@tanstack/react-query';
import api from './api';

/** Stol shablonlari (#24): stolga oldindan qo'yiladigan narsalar. */
export interface TableTemplate {
  id: number;
  name: string;
  tables_count?: number;
  items: { id: number; menu_item_id: number; quantity: number; menu_item?: { id: number; name_uz: string; price: string | number } }[];
}


export function useTableTemplates() {
  return useQuery<TableTemplate[]>({
    queryKey: ['table-templates'],
    queryFn: async () => (await api.get('/table-templates')).data.data ?? [],
  });
}

