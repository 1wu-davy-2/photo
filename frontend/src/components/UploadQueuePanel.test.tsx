import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { translate } from "../i18n";
import { UploadQueuePanel } from "./UploadQueuePanel";

describe("UploadQueuePanel", () => {
  afterEach(() => cleanup());

  it("toggles the queue between paused and running", () => {
    const onPause = vi.fn();
    const onResume = vi.fn();
    const queue = { total: 4, completed: 1, currentName: "summer.png", currentProgress: 42, isPaused: false, failed: 0 };
    const { rerender } = render(<UploadQueuePanel queue={queue} t={translate("en-US")} onPause={onPause} onResume={onResume} onDismiss={vi.fn()} onRetry={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Pause uploads" }));
    expect(onPause).toHaveBeenCalledTimes(1);

    rerender(<UploadQueuePanel queue={{ ...queue, isPaused: true }} t={translate("en-US")} onPause={onPause} onResume={onResume} onDismiss={vi.fn()} onRetry={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Resume uploads" }));
    expect(onResume).toHaveBeenCalledTimes(1);
  });
});
