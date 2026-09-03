import { describe, it, expect } from "vitest";
import {
  prepareQuartoCopy,
  parseYamlFrontMatter,
  getBoolOption,
  formatBytes,
} from "../converter";

describe("formatBytes", () => {
  it("returns '0 B' for zero", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats bytes", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(1048576)).toBe("1.0 MB");
  });

  it("formats gigabytes", () => {
    expect(formatBytes(1073741824)).toBe("1.0 GB");
  });
});

describe("parseYamlFrontMatter", () => {
  it("returns null when no front matter", () => {
    expect(parseYamlFrontMatter("# Hello")).toBeNull();
  });

  it("extracts front matter content", () => {
    const source = "---\ntitle: Test\nauthor: Me\n---\n\nBody";
    expect(parseYamlFrontMatter(source)).toBe("title: Test\nauthor: Me");
  });

  it("handles empty front matter", () => {
    const source = "---\n\n---\n\nBody";
    expect(parseYamlFrontMatter(source)).toBe("");
  });
});

describe("getBoolOption", () => {
  const fm = "title: Test\ntoc: true\nnumber-sections: false";

  it("returns true for true option", () => {
    expect(getBoolOption(fm, "toc")).toBe(true);
  });

  it("returns false for false option", () => {
    expect(getBoolOption(fm, "number-sections")).toBe(false);
  });

  it("returns false for missing option", () => {
    expect(getBoolOption(fm, "missing")).toBe(false);
  });

  it("detects TRUE uppercase", () => {
    expect(getBoolOption("toc: TRUE", "toc")).toBe(true);
  });

  it("detects nested format html option", () => {
    const nested = "format:\n  html:\n    toc: true";
    expect(getBoolOption(nested, "toc")).toBe(true);
  });
});

describe("prepareQuartoCopy", () => {
  it("normalizes CRLF to LF", () => {
    const input = "line1\r\nline2\r\nline3";
    const result = prepareQuartoCopy(input);
    expect(result).not.toContain("\r");
    expect(result).toContain("line1\nline2\nline3");
  });

  it("strips chunk options with #|", () => {
    const input = "```{r}\n#| label: fig-test\n#| fig-cap: \"Test\"\nx <- 1\n```";
    const result = prepareQuartoCopy(input);
    expect(result).not.toContain("#| label");
    expect(result).not.toContain("#| fig-cap");
    expect(result).toContain("x <- 1");
  });

  it("removes echo:false chunks entirely", () => {
    const input = "```{r}\n#| echo: false\nhidden()\n```";
    const result = prepareQuartoCopy(input);
    expect(result).not.toContain("hidden()");
  });

  it("removes include:false chunks entirely", () => {
    const input = "```{r}\n#| include: false\nhidden()\n```";
    const result = prepareQuartoCopy(input);
    expect(result).not.toContain("hidden()");
  });

  it("keeps code for eval:false chunks", () => {
    const input = "```{r}\n#| eval: false\ncode()\n```";
    const result = prepareQuartoCopy(input);
    expect(result).toContain("code()");
  });

  it("wraps bare align environments in $$", () => {
    const input = "\\begin{align*}\nx = y\n\\end{align*}";
    const result = prepareQuartoCopy(input);
    expect(result).toContain("$$\n\\begin{align*}");
    expect(result).toContain("\\end{align*}\n$$");
  });

  it("replaces \\hspace with \\qquad", () => {
    const input = "text \\hspace{1cm} more";
    const result = prepareQuartoCopy(input);
    expect(result).toContain("\\qquad");
    expect(result).not.toContain("\\hspace");
  });

  it("disables chalkboard", () => {
    const input = "chalkboard: true";
    const result = prepareQuartoCopy(input);
    expect(result).toContain("chalkboard: false");
  });

  it("simplifies theme array to default", () => {
    const input = "theme: [default, custom.css]";
    const result = prepareQuartoCopy(input);
    expect(result).toContain("theme: default");
  });
});
