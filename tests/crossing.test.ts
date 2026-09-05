import { expect, it } from "vitest";
import { crossesPlane } from "../src/model";
it("awards exactly one crossing across successive simulation frames", () => {
  const z = [-2, -0.9, 0.2, 1.3];
  expect(z.slice(1).filter((v, i) => crossesPlane(z[i], v)).length).toBe(1);
});
