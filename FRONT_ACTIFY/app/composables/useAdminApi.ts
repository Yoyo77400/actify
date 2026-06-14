import { computed } from 'vue'
import {
  dashboardMock,
  usersMock,
  salesMock,
  assetsMock,
  reportsMock
} from '~/composables/useAdminMock'
import type {
  AdminDashboardPayload,
  AdminUsersPayload,
  AdminSalesPayload,
  AdminAssetsPayload,
  AdminReportsPayload
} from '~/types/admin'

const API_BASE = '/api/admin'

function isApiReady(): boolean {
  // flip to true once the backend exists
  return false
}

async function adminFetch<T>(path: string, fallback: T) {
  if (!isApiReady()) {
    return {
      data: computed(() => fallback),
      error: computed(() => null),
      source: computed(() => 'mock' as const)
    }
  }

  const { data, error } = await useFetch<T>(`${API_BASE}/${path}`)

  return {
    data: computed(() => (error.value || !data.value ? fallback : data.value)),
    error,
    source: computed(() => (error.value ? 'mock' : 'api'))
  }
}

export function useAdminDashboard() {
  return adminFetch<AdminDashboardPayload>('dashboard', dashboardMock)
}

export function useAdminUsers() {
  return adminFetch<AdminUsersPayload>('users', usersMock)
}

export function useAdminSales() {
  return adminFetch<AdminSalesPayload>('sales', salesMock)
}

export function useAdminAssets() {
  return adminFetch<AdminAssetsPayload>('assets', assetsMock)
}

export function useAdminReports() {
  return adminFetch<AdminReportsPayload>('reports', reportsMock)
}

// ── Write operations (stubs) ──
// These will POST/PATCH/DELETE once the API is wired up.
// For now they mutate the local mock data and return a resolved promise.

export async function adminBanUser(_userId: string): Promise<boolean> {
  // TODO: POST /api/admin/users/:id/ban
  return true
}

export async function adminSuspendUser(_userId: string): Promise<boolean> {
  // TODO: POST /api/admin/users/:id/suspend
  return true
}

export async function adminReactivateUser(_userId: string): Promise<boolean> {
  // TODO: POST /api/admin/users/:id/reactivate
  return true
}

export async function adminSetUserRole(_userId: string, _role: string): Promise<boolean> {
  // TODO: PATCH /api/admin/users/:id/role
  return true
}

export async function adminCancelSale(_saleId: string): Promise<boolean> {
  // TODO: POST /api/admin/sales/:id/cancel
  return true
}

export async function adminRefundSale(_saleId: string): Promise<boolean> {
  // TODO: POST /api/admin/sales/:id/refund
  return true
}

export async function adminDeleteSale(_saleId: string): Promise<boolean> {
  // TODO: DELETE /api/admin/sales/:id
  return true
}

export async function adminFlagAsset(_assetId: string): Promise<boolean> {
  // TODO: POST /api/admin/assets/:id/flag
  return true
}

export async function adminRemoveAsset(_assetId: string): Promise<boolean> {
  // TODO: POST /api/admin/assets/:id/remove
  return true
}

export async function adminRestoreAsset(_assetId: string): Promise<boolean> {
  // TODO: POST /api/admin/assets/:id/restore
  return true
}

export async function adminResolveReport(_reportId: string): Promise<boolean> {
  // TODO: POST /api/admin/reports/:id/resolve
  return true
}

export async function adminDismissReport(_reportId: string): Promise<boolean> {
  // TODO: POST /api/admin/reports/:id/dismiss
  return true
}