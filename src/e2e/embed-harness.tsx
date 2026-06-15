import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/App'
import { applyDocumentTheme, loadAppearance } from '@/lib/theme'
import {
  E2E_EMBED_PROJECT_NAME,
  seedEmbeddedTalemailProject,
} from '@/e2e/seed-embedded-project'
import '@/styles/globals.css'

applyDocumentTheme(loadAppearance())

const projectId = await seedEmbeddedTalemailProject()
window.history.replaceState({}, '', `/project/${projectId}`)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App
      embed={{
        embedded: true,
        hostProjectId: projectId,
        productName: E2E_EMBED_PROJECT_NAME,
        tagline: 'Production tasks',
        hideSidebar: true,
        hideProjectSwitcher: true,
      }}
    />
  </StrictMode>,
)
