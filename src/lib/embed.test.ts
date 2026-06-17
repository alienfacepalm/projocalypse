import { describe, expect, it } from 'vitest'
import { developersForProject, sliceExportForProject } from '@/lib/embed'
import { makeDeveloper, makeExportData, makeProject, makeSection, makeTask } from '@/test/db-helpers'

describe('developersForProject', () => {
  it('returns developers scoped to the project', () => {
    const roster = [
      makeDeveloper({ id: 'a', projectId: 'p1' }),
      makeDeveloper({ id: 'b', projectId: 'p2' }),
    ]
    expect(developersForProject(roster, 'p1').map((developer) => developer.id)).toEqual(['a'])
  })
})

describe('sliceExportForProject', () => {
  it('keeps project roster and assignees referenced by project tasks', () => {
    const hostSection = makeSection({ id: 'sec-host', projectId: 'host' })
    const hostDev = makeDeveloper({ id: 'host-dev', projectId: 'host' })
    const otherDev = makeDeveloper({ id: 'other-dev', projectId: 'other' })
    const rosterDev = makeDeveloper({ id: 'roster-only', projectId: 'host' })
    const data = makeExportData({
      projects: [makeProject({ id: 'host' }), makeProject({ id: 'other', name: 'Other' })],
      sections: [hostSection],
      tasks: [makeTask({ id: 't1', projectId: 'host', sectionId: 'sec-host', assigneeId: 'host-dev' })],
      developers: [hostDev, otherDev, rosterDev],
    })

    const sliced = sliceExportForProject(data, 'host')
    expect(sliced.projects).toHaveLength(1)
    expect(sliced.developers?.map((developer) => developer.id).sort()).toEqual(['host-dev', 'roster-only'])
  })
})
