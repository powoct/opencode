import { base64Encode } from "@opencode-ai/core/util/encode"
import { expect, test } from "@playwright/test"
import { mockOpenCodeServer } from "../utils/mock-server"

const directory = "C:/OpenCode/DirectRoute"

test("registers a direct directory route as an opened project", async ({ page }) => {
  await mockOpenCodeServer(page, {
    directory,
    project: {
      id: "proj_direct_route",
      worktree: directory,
      vcs: "git",
      name: "DirectRoute",
      time: { created: 1_700_000_000_000, updated: 1_700_000_000_000 },
      sandboxes: [],
    },
    provider: { all: [], connected: [], default: {} },
    sessions: [],
    pageMessages: () => ({ items: [] }),
  })
  await page.addInitScript(() => {
    localStorage.setItem("settings.v3", JSON.stringify({ general: { newLayoutDesigns: true } }))
    localStorage.setItem(
      "opencode.global.dat:server",
      JSON.stringify({ projects: { local: [] }, lastProject: {}, recentlyClosed: {} }),
    )
  })

  await page.goto(`/${base64Encode(directory)}/session`)

  await expect(page).toHaveURL(/\/new-session\?draftId=/)
  await expect(page.locator('[data-component="prompt-input-v2"]')).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate((directory) => {
        const raw = localStorage.getItem("opencode.global.dat:server")
        const state: unknown = JSON.parse(raw ?? "{}")
        const record = state && typeof state === "object" && !Array.isArray(state) ? state : {}
        const projects = "projects" in record && typeof record.projects === "object" ? record.projects : undefined
        const local = projects && !Array.isArray(projects) && "local" in projects ? projects.local : undefined
        const last = "lastProject" in record && typeof record.lastProject === "object" ? record.lastProject : undefined
        return {
          projects: Array.isArray(local)
            ? local.flatMap((project) =>
                project && typeof project === "object" && "worktree" in project && typeof project.worktree === "string"
                  ? [project.worktree]
                  : [],
              )
            : [],
          lastProject: last && !Array.isArray(last) && "local" in last ? last.local : undefined,
          directory,
        }
      }, directory),
    )
    .toEqual({ projects: [directory], lastProject: directory, directory })

  const titlebar = page.locator('[data-slot="titlebar-v2"]')
  await titlebar.getByRole("button", { name: "Home" }).click()
  await expect(page).toHaveURL("/")
  await expect(page.locator('[data-component="home-project-row"]')).toContainText("DirectRoute")

  await titlebar.getByRole("button", { name: "New session" }).click()
  await expect(page).toHaveURL(/\/new-session\?draftId=/)
  await expect(page.locator('[data-component="prompt-input-v2"]')).toBeVisible()
})
