import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ProjectView } from '@/components/project/project-view'
import { DeveloperBootstrapDialog } from '@/components/developer/developer-bootstrap-dialog'
import { ActiveDeveloperProvider } from '@/context/active-developer-context'
import { ConfirmProvider } from '@/context/confirm-context'
import { EmbedProvider } from '@/context/embed-context'
import { clearDb, makeMasterDeveloper, makeProject, makeSection } from '@/test/db-helpers'
import { db } from '@/db/schema'

function renderProjectView(projectId: string) {
  render(
    <MemoryRouter initialEntries={[`/project/${projectId}`]}>
      <ConfirmProvider>
        <Routes>
          <Route
            path="/project/:projectId"
            element={
              <ActiveDeveloperProvider>
                <ProjectView />
              </ActiveDeveloperProvider>
            }
          />
        </Routes>
      </ConfirmProvider>
    </MemoryRouter>,
  )
}

/** Mirrors App.tsx: ActiveDeveloperProvider wraps Routes (useParams unavailable at provider). */
function renderEmbeddedProjectView(
  projectId: string,
  options?: { hostProjectId?: string; productName?: string },
) {
  render(
    <MemoryRouter initialEntries={[`/project/${projectId}`]}>
      <EmbedProvider
        config={{
          embedded: true,
          hideSidebar: true,
          hostProjectId: options?.hostProjectId ?? null,
          productName: options?.productName,
        }}
      >
        <ConfirmProvider>
          <ActiveDeveloperProvider>
            <Routes>
              <Route path="/project/:projectId" element={<ProjectView />} />
            </Routes>
            <DeveloperBootstrapDialog />
          </ActiveDeveloperProvider>
        </ConfirmProvider>
      </EmbedProvider>
    </MemoryRouter>,
  )
}

describe('ProjectView', () => {
  beforeEach(async () => {
    await clearDb()
  })

  it('does not show loading when project needs developer bootstrap', async () => {
    const project = makeProject({ id: 'proj-no-devs', name: 'Tale Book' })
    await db.projects.add(project)

    renderProjectView('proj-no-devs')

    await waitFor(() => {
      expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
    })
    expect(screen.queryByText('Tale Book')).not.toBeInTheDocument()
  })

  it('renders project header when a master developer exists', async () => {
    const project = makeProject({ id: 'proj-ready', name: 'My Project' })
    await db.projects.add(project)
    await db.developers.add(makeMasterDeveloper({ id: 'dev-master', projectId: 'proj-ready' }))

    renderProjectView('proj-ready')

    expect(await screen.findByText('My Project')).toBeInTheDocument()
    expect(screen.getByLabelText('Show completed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'List' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Board' })).toBeInTheDocument()
  })

  it('shows section columns on board view', async () => {
    const user = userEvent.setup()
    const project = makeProject({ id: 'proj-board', name: 'Board Project' })
    await db.projects.add(project)
    await db.developers.add(makeMasterDeveloper({ id: 'dev-board', projectId: 'proj-board' }))
    await db.sections.bulkAdd([
      makeSection({ id: 'sec-todo', projectId: 'proj-board', name: 'To Do', sortOrder: 0 }),
      makeSection({ id: 'sec-wip', projectId: 'proj-board', name: 'In Progress', sortOrder: 1 }),
      makeSection({ id: 'sec-done', projectId: 'proj-board', name: 'Done', sortOrder: 2 }),
    ])

    renderProjectView('proj-board')

    await user.click(await screen.findByRole('button', { name: 'Board' }))

    expect(screen.getByText('To Do')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add section' })).toBeInTheDocument()
  })

  it('loads embedded route when provider sits above Routes without hostProjectId', async () => {
    const project = makeProject({ id: 'tale-host', name: 'Embedded Book' })
    await db.projects.add(project)
    await db.developers.add(makeMasterDeveloper({ id: 'dev-tale', projectId: 'tale-host' }))

    renderEmbeddedProjectView('tale-host')

    expect(await screen.findByText('Embedded Book')).toBeInTheDocument()
  })

  it('scopes developers to hostProjectId when embedded', async () => {
    const host = makeProject({ id: 'host-proj', name: 'Host Project' })
    const other = makeProject({ id: 'route-proj', name: 'Route Project' })
    await db.projects.bulkAdd([host, other])
    await db.developers.add(makeMasterDeveloper({ id: 'dev-host', projectId: 'host-proj' }))

    renderEmbeddedProjectView('route-proj', { hostProjectId: 'host-proj' })

    expect(await screen.findByText('Route Project')).toBeInTheDocument()
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
  })

  it('shows bootstrap for hostProjectId roster when embedded without developers', async () => {
    const project = makeProject({ id: 'embed-empty', name: 'New Book' })
    await db.projects.add(project)

    renderEmbeddedProjectView('embed-empty', {
      hostProjectId: 'embed-empty',
      productName: 'New Book',
    })

    expect(await screen.findByText('Set up New Book team')).toBeInTheDocument()
  })
})
