import { describe, expect, it } from "vitest";
import { supportWhatsappHref } from "@/server/settings";

describe("supportWhatsappHref", () => {
  it("keeps only digits", () => {
    expect(supportWhatsappHref({ supportWhatsapp: "+91 98765-43210" })).toBe("https://wa.me/919876543210");
  });
  it("hides the link when no real number is set", () => {
    expect(supportWhatsappHref({ supportWhatsapp: "" })).toBeUndefined();
    expect(supportWhatsappHref({ supportWhatsapp: "+91 9000" })).toBeUndefined();
  });
});
