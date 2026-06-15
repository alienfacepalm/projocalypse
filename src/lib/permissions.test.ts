import { describe, expect, it } from 'vitest'
import {
  canRemoveDeveloper,
  countMasters,
  effectivePermissions,
  hasPermission,
  isMaster,
  resolveRolePermissions,
} from '@/lib/permissions'
import { makeDeveloper, makeMasterDeveloper } from '@/test/db-helpers'

describe('permissions', () => {
  it('master has all permissions via effectivePermissions', () => {
    const master = makeMasterDeveloper({
      permissions: { manageDevelopers: false, assignTasks: false, manageProjects: false },
    })
    expect(isMaster(master)).toBe(true)
    expect(hasPermission(master, 'manageDevelopers')).toBe(true)
    expect(effectivePermissions(master).manageProjects).toBe(true)
  })

  it('regular developer uses stored permission flags', () => {
    const dev = makeDeveloper({
      permissions: { manageDevelopers: false, assignTasks: true, manageProjects: false },
    })
    expect(hasPermission(dev, 'assignTasks')).toBe(true)
    expect(hasPermission(dev, 'manageProjects')).toBe(false)
  })

  it('resolveRolePermissions forces manageDevelopers false for developers', () => {
    expect(resolveRolePermissions('developer', { manageDevelopers: true }).manageDevelopers).toBe(false)
  })

  it('prevents removing the last master', () => {
    const master = makeMasterDeveloper({ id: 'm1' })
    const check = canRemoveDeveloper(master, master, [master])
    expect(check.ok).toBe(false)
  })

  it('allows master to remove non-master when multiple masters exist', () => {
    const master = makeMasterDeveloper({ id: 'm1' })
    const other = makeDeveloper({ id: 'd1' })
    const secondMaster = makeMasterDeveloper({ id: 'm2' })
    const check = canRemoveDeveloper(master, other, [master, other, secondMaster])
    expect(check.ok).toBe(true)
    expect(countMasters([master, other, secondMaster])).toBe(2)
  })

  it('blocks non-manager from removing developers', () => {
    const actor = makeDeveloper({ permissions: { manageDevelopers: false, assignTasks: true, manageProjects: true } })
    const target = makeDeveloper({ id: 'd2' })
    const check = canRemoveDeveloper(actor, target, [actor, target])
    expect(check.ok).toBe(false)
  })
})
