# Photo Wall View And Download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add authenticated photo viewing and original download commands to the photo wall without loading originals into the wall canvas.

**Architecture:** Reuse `PhotoLightbox` as the single authenticated photo viewer and make its destructive delete action optional. `PhotoWallPage` owns the viewed-photo state and delegates original download to the existing API client. Existing `AuthenticatedImage` variants remain explicit at each wall surface.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library, lucide-react

---

### Task 1: Make the shared lightbox safe for wall viewing

**Files:**
- Modify: `frontend/src/components/PhotoLightbox.tsx`
- Modify: `frontend/src/components/PhotoLightbox.test.tsx`

- [ ] **Step 1: Write a failing optional-delete test**

Render `PhotoLightbox` without `onDelete`, assert its mocked image receives `variant="preview"`, and assert no delete button is rendered.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run src/components/PhotoLightbox.test.tsx`

Expected: TypeScript/runtime failure because `onDelete` is required or the delete button remains visible.

- [ ] **Step 3: Implement optional deletion**

Change the prop to `onDelete?: () => void` and render the delete button only when the callback exists. Keep preview, original-view, and download behavior unchanged.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- --run src/components/PhotoLightbox.test.tsx`

Expected: all lightbox tests pass.

### Task 2: Add wall inspector view and download commands

**Files:**
- Modify: `frontend/src/components/PhotoWallPage.tsx`
- Modify: `frontend/src/components/PhotoWallPage.test.tsx`
- Modify: `frontend/src/i18n.ts`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Write failing wall command tests**

Mock `PhotoLightbox` and `downloadPhoto`. Select a wall item, click `View photo`, and assert the lightbox receives the selected photo without an `onDelete` callback. Click `Download original` and assert `downloadPhoto(photo.id, photo.original_name, accessToken)`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run src/components/PhotoWallPage.test.tsx`

Expected: failures because the inspector commands and viewer state do not exist.

- [ ] **Step 3: Implement the commands**

Import `Eye`, `Download`, `PhotoLightbox`, and `downloadPhoto`. Add `viewingPhoto` state, two inspector buttons, localized `wall.viewPhoto` and `common.downloadOriginal` labels, and a lightbox rendered with no delete callback. Report download failures through the existing `error` state.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- --run src/components/PhotoWallPage.test.tsx src/components/PhotoLightbox.test.tsx`

Expected: all focused tests pass.

### Task 3: Verify the complete frontend

**Files:**
- Modify only if verification reveals a regression.

- [ ] **Step 1: Run all frontend tests**

Run: `npm test`

Expected: zero failures.

- [ ] **Step 2: Build production assets**

Run: `npm run build`

Expected: TypeScript and Vite exit successfully.

- [ ] **Step 3: Verify in the local browser**

Open `http://127.0.0.1:6222`, select a wall photo, open it, verify the network request uses `width=1920`, then click `View original` and verify `original=true`. Confirm `Download original` is available in both inspector and viewer, and confirm no console errors or overlapping controls.
