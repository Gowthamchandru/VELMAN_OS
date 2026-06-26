import { useCollection, uid } from '@/lib/store'
import { todayKey } from '@/lib/time'
import { readFileAsDataUrl, MAX_FILE_BYTES } from '@/modules/vault/vaultStore'

export { readFileAsDataUrl, MAX_FILE_BYTES }

export const WORK_DOC_CATEGORIES = [
  'Trade License',
  'Certificate of Incorporation',
  'MOA / AOA',
  'VAT Certificate',
  'Tax Certificate',
  'Lease Agreement',
  'Bank Letter',
  'Insurance Certificate',
  'Other',
] as const
export type WorkDocCategory = (typeof WORK_DOC_CATEGORIES)[number]

export interface WorkDoc {
  id: string
  companyId: string
  vertical: string
  name: string
  category: WorkDocCategory
  number?: string
  issuer?: string
  issued?: string
  expires?: string
  dataUrl?: string
  fileName?: string
  createdAt: string
}

const seed: WorkDoc[] = [
  // TRI — main vertical
  { id: 'wd-tri-tl', companyId: 'co-tri', vertical: 'TRI', name: 'Trade License', category: 'Trade License', number: 'TL-TRI-2024-001', issuer: 'DED', issued: '2024-01-15', expires: '2025-01-14', createdAt: todayKey() },
  { id: 'wd-tri-inc', companyId: 'co-tri', vertical: 'TRI', name: 'Certificate of Incorporation', category: 'Certificate of Incorporation', number: 'INC-TRI-2019', issuer: 'MCA', issued: '2019-03-10', createdAt: todayKey() },
  // TRG — TRKITCHEN
  { id: 'wd-trk-tl', companyId: 'co-trg', vertical: 'TRKITCHEN', name: 'Trade License', category: 'Trade License', number: 'TL-TRK-2024-001', issuer: 'DED', issued: '2024-02-01', expires: '2025-01-31', createdAt: todayKey() },
  // TRG — TRGLASS
  { id: 'wd-trgl-tl', companyId: 'co-trg', vertical: 'TRGLASS', name: 'Trade License', category: 'Trade License', number: 'TL-TRGL-2024-001', issuer: 'DED', issued: '2024-02-01', expires: '2025-01-31', createdAt: todayKey() },
  // TRG — TRMARBLE
  { id: 'wd-trm-tl', companyId: 'co-trg', vertical: 'TRMARBLE', name: 'Trade License', category: 'Trade License', number: 'TL-TRM-2024-001', issuer: 'DED', issued: '2024-02-01', expires: '2025-01-31', createdAt: todayKey() },
]

export const useWorkDocs = () => useCollection<WorkDoc>('gcos.work.vault.v1', seed)

export const newWorkDoc = (companyId: string, vertical: string, name: string, category: WorkDocCategory): WorkDoc => ({
  id: uid(),
  companyId,
  vertical,
  name,
  category,
  createdAt: todayKey(),
})
