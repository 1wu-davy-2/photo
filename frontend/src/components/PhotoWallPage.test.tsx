import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { savePhotoWallLayout } from "../api/client";
import { translate } from "../i18n";
import { PhotoWallPage } from "./PhotoWallPage";

const photo = {
  id: "photo-1",
  original_name: "summer.png",
  mime_type: "image/png",
  size_bytes: 1024,
  width: 1200,
  height: 800,
  owner_id: "user-1",
  folder_id: "folder-1",
  created_at: "2026-07-14T08:00:00Z",
  updated_at: "2026-07-14T08:00:00Z",
};

const wall = {
  id: "wall-1",
  owner_id: "user-1",
  name: "Summer wall",
  background_color: "#F6FAFF",
  created_at: "2026-07-14T08:00:00Z",
  updated_at: "2026-07-14T08:00:00Z",
  items: [{ id: "item-1", photo, x: 10, y: 15, width: 28, height: 32, rotation: -4, z_index: 2 }],
};

vi.mock("../api/client", () => ({
  listPhotoWalls: vi.fn(async () => [wall]),
  getPhotoWall: vi.fn(async () => wall),
  listPhotos: vi.fn(async () => ({ items: [photo], total: 1, page: 1, page_size: 24 })),
  fetchPhotoBlobUrl: vi.fn(async () => "blob:photo"),
  createPhotoWallShare: vi.fn(async () => ({ token: "share-token", path: "/#/share/walls/share-token", is_active: true })),
  createPhotoWall: vi.fn(),
  savePhotoWallLayout: vi.fn(async () => wall),
  updatePhotoWall: vi.fn(),
}));

describe("PhotoWallPage sharing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("permission denied")) } });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("keeps the generated link available when clipboard permission is denied", async () => {
    render(<PhotoWallPage t={translate("en-US")} accessToken="token" />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Share" })).toBeEnabled());
    await screen.findByRole("button", { name: "Share" }).then((button) => button.click());

    expect(await screen.findByDisplayValue(`${window.location.origin}/#/share/walls/share-token`)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Share link ready");
    expect(screen.getByRole("status")).not.toHaveClass("status-error");
  });

  it("supports a solid background and independent width and height editing", async () => {
    render(<PhotoWallPage t={translate("en-US")} accessToken="token" />);

    expect(await screen.findByLabelText("Background color")).toHaveValue("#f6faff");
    fireEvent.click(document.querySelector('[data-wall-item-id="item-1"]') as HTMLElement);
    expect(screen.getByRole("spinbutton", { name: "Width" })).toHaveValue(28);
    expect(screen.getByRole("spinbutton", { name: "Height" })).toHaveValue(32);

    fireEvent.change(screen.getByLabelText("Background color"), { target: { value: "#ffd6e7" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Height" }), { target: { value: "42" } });
    fireEvent.click(screen.getByRole("button", { name: "Save layout" }));

    await waitFor(() => expect(savePhotoWallLayout).toHaveBeenCalledWith(
      "wall-1",
      expect.objectContaining({
        background_color: "#ffd6e7",
        items: [expect.objectContaining({ photo_id: "photo-1", width: 28, height: 42 })],
      }),
      "token",
    ));
  });
});
