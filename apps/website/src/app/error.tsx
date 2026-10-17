"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="prose" role="alert">
      <h1>काहीतरी चूक झाली</h1>
      <p>पान लोड करताना अडचण आली. कृपया पुन्हा प्रयत्न करा.</p>
      <button type="button" onClick={reset}>पुन्हा प्रयत्न करा</button>
    </div>
  );
}
