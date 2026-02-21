import express, { type Express } from "express";
import fs from "fs";
import path from "path";

function firstExistingPath(paths: string[]) {
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function serveStatic(app: Express) {
  const cwd = process.cwd();

  // En sık görülen build output yerleri
  const candidates = [
    path.join(cwd, "server", "public"),
    path.join(cwd, "public"),
    path.join(cwd, "client", "dist"),
    path.join(cwd, "dist", "public"),
    path.join(cwd, "dist"),
  ];

  const distPath = firstExistingPath(candidates);

  if (!distPath) {
    throw new Error(
      `Build klasörü bulunamadı. Denenen yerler:\n- ${candidates.join("\n- ")}\n` +
        `Build sonrası bu klasörlerden biri oluşmalı.`,
    );
  }

  // ✅ 1) Hash'li asset'leri uzun süre cachele (Vite/React için ideal)
  app.use(
    "/assets",
    express.static(path.join(distPath, "assets"), {
      immutable: true,
      maxAge: "1y",
      setHeaders(res) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      },
    }),
  );

  // ✅ 2) Diğer statikleri serve et (favicon, robots, vs.)
  // Ama HTML cache'ini KES.
  app.use(
    express.static(distPath, {
      setHeaders(res, filePath) {
        // index.html ve tüm html dosyaları asla cachelenmesin
        if (filePath.endsWith(".html")) {
          res.setHeader(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          );
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
          res.setHeader("Surrogate-Control", "no-store");
          return;
        }

        // İstersen burada json gibi şeyleri de no-cache yapabilirsin ama şart değil
      },
    }),
  );

  // ✅ 3) SPA fallback: /login dahil her route index.html döndürsün
  app.get("*", (_req, res) => {
    const indexFile = path.join(distPath, "index.html");
    if (!fs.existsSync(indexFile)) return res.status(404).send("Not Found");

    // Fallback'te de HTML cache'ini KES (Cloudflare yüzünden şart)
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");

    return res.sendFile(indexFile);
  });
}
