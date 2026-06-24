import type { User, Contact, Opportunity, Task, ActivityLog } from '@/types'

export const USERS: User[] = []
export const CONTACTS: Contact[] = []
export const OPPORTUNITIES: Opportunity[] = []
export const ACTIVITY_LOGS: ActivityLog[] = []
export const TASKS: Task[] = []

export function mockFetch<T>(data: T, ms = 5000): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(data), ms))
}

export function getUserById(_id: string): User | undefined { return undefined }
export function getContactById(_id: string): Contact | undefined { return undefined }
export function getOppById(_id: string): Opportunity | undefined { return undefined }
export function getLogsForOpp(_oppId: string): ActivityLog[] { return [] }
export function getTasksForOpp(_oppId: string): Task[] { return [] }
