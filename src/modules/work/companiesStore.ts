// Work = your group of companies. Each company has departments with a latest
// headcount; total employees = sum. Built BOT-READY: the agent will update counts
// from what you tell it and suggest department betterment (per-dept slot in UI).
import { useCollection, uid } from '@/lib/store'

export interface Department {
  id: string
  name: string
  count: number
}
export interface Company {
  id: string
  code: string
  name: string
  departments: Department[]
}

const dept = (name: string, count: number): Department => ({ id: uid(), name, count })

// Seed with your company codes + placeholder departments/counts — edit freely.
const seed: Company[] = [
  { id: 'co-tri', code: 'TRI', name: 'TRI', departments: [dept('Sales', 12), dept('Operations', 8), dept('Design', 6), dept('Marketing', 4), dept('HR', 3), dept('Finance', 3)] },
  { id: 'co-trg', code: 'TRG', name: 'TRG', departments: [dept('Sales', 9), dept('Production', 14), dept('Logistics', 5), dept('HR', 2), dept('Finance', 2)] },
  { id: 'co-cmis', code: 'CMIS', name: 'CMIS', departments: [dept('Engineering', 16), dept('Sales', 7), dept('Support', 6), dept('HR', 2), dept('Finance', 2)] },
  { id: 'co-lof', code: 'LOF', name: 'LOF', departments: [dept('Design', 10), dept('Production', 12), dept('Sales', 8), dept('Marketing', 4), dept('Admin', 3)] },
]

export const useCompanies = () => useCollection<Company>('gcos.work.companies.v1', seed)

export const newCompany = (code: string, name: string): Company => ({ id: uid(), code: code.toUpperCase(), name: name || code, departments: [] })
export const newDepartment = (name: string, count = 0): Department => ({ id: uid(), name, count })

export const totalEmployees = (c: Company): number => c.departments.reduce((s, d) => s + (d.count || 0), 0)
export const groupTotal = (companies: Company[]): number => companies.reduce((s, c) => s + totalEmployees(c), 0)
