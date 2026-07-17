import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import type { Photo } from "../types/photo";
import { PhotoLightbox } from "./PhotoLightbox";

vi.mock("./AuthenticatedImage", () => ({
  AuthenticatedImage: ({ variant, onLoad }: { variant: string; onLoad?: () => void }) => (
    <button type="button" aria-label="loaded-photo" onClick={onLoad}>{variant}</button>
  ),
}));

const photo: Photo = {
  id: "photo-1",
  original_name: "summer.png",
  mime_type: "image/png",
  size_bytes: 4096,
  width: 1200,
  height: 800,
  owner_id: "user-1",
  folder_id: "folder-1",
  created_at: "2026-07-17T08:00:00",
  updated_at: "2026-07-17T08:00:00",
};

const labels: Record<string, string> = {
  "common.viewOriginal": "\u67e5\u770b\u539f\u56fe",
  "common.loadingOriginal": "\u6b63\u5728\u52a0\u8f7d\u539f\u56fe",
  "common.originalLoaded": "\u5df2\u52a0\u8f7d\u539f\u56fe",
  "common.downloadOriginal": "\u4e0b\u8f7d\u539f\u56fe",
};

it("loads the original inside the current lightbox", () => {
  render(
    <PhotoLightbox
      photo={photo}
      hasPrevious={false}
      hasNext={false}
      onClose={vi.fn()}
      onPrevious={vi.fn()}
      onNext={vi.fn()}
      onDelete={vi.fn()}
      t={(key) => labels[key] ?? key}
      accessToken="token"
    />,
  );

  expect(screen.getByRole("button", { name: "loaded-photo" })).toHaveTextContent("preview");
  expect(screen.getByRole("button", { name: "\u4e0b\u8f7d\u539f\u56fe" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "\u67e5\u770b\u539f\u56fe" }));
  expect(screen.getByRole("button", { name: "loaded-photo" })).toHaveTextContent("original");
  expect(screen.getByRole("button", { name: "\u6b63\u5728\u52a0\u8f7d\u539f\u56fe" })).toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: "loaded-photo" }));
  expect(screen.getByRole("button", { name: "\u5df2\u52a0\u8f7d\u539f\u56fe" })).toBeDisabled();
});
