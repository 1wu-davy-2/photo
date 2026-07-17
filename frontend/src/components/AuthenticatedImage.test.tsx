import { render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { fetchPhotoBlobUrl } from "../api/client";
import { AuthenticatedImage } from "./AuthenticatedImage";

vi.mock("../api/client", () => ({
  fetchPhotoBlobUrl: vi.fn(async (_id: string, variant: string) => `blob:${variant}`),
}));

afterEach(() => {
  vi.clearAllMocks();
});

it("keeps thumbnail and preview requests in separate cache entries", async () => {
  render(
    <>
      <AuthenticatedImage photoId="photo-1" alt="Thumbnail" variant="thumbnail" accessToken="token" />
      <AuthenticatedImage photoId="photo-1" alt="Preview" variant="preview" accessToken="token" />
    </>,
  );

  await waitFor(() => expect(fetchPhotoBlobUrl).toHaveBeenCalledTimes(2));
  expect(fetchPhotoBlobUrl).toHaveBeenCalledWith("photo-1", "thumbnail", expect.any(AbortSignal), "token");
  expect(fetchPhotoBlobUrl).toHaveBeenCalledWith("photo-1", "preview", expect.any(AbortSignal), "token");
});
