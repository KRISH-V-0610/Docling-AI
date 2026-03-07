export const compileLatex = async (req, res) => {
  try {
    const { latex } = req.body;

    if (!latex || typeof latex !== "string") {
      return res.status(400).json({
        success: false,
        message: "LaTeX code is required.",
      });
    }

    const formData = new FormData();
    formData.append("filename[]", "document.tex");
    formData.append("filecontents[]", latex);
    formData.append("engine", "pdflatex");
    formData.append("return", "pdf");

    const response = await fetch("https://texlive.net/cgi-bin/latexcgi", {
      method: "POST",
      body: formData,
    });

    const contentType = response.headers.get("content-type") || "";
    const buffer = Buffer.from(await response.arrayBuffer());

    if (response.ok && contentType.includes("application/pdf")) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline; filename=document.pdf");
      return res.send(buffer);
    }

    const text = buffer.toString("utf8");

    return res.status(500).json({
      success: false,
      message: "LaTeX compilation failed.",
      error: text.slice(0, 12000),
    });
  } catch (error) {
    console.error("LaTeX compile error:", error);
    return res.status(500).json({
      success: false,
      message: "LaTeX compilation failed.",
      error: error.message,
    });
  }
};