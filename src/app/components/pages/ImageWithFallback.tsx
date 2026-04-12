import React, { useState, useEffect } from "react";

const FALLBACK_SVG =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjOTlhMWIzIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBmaWxsPSJub25lIiBzdHJva2Utd2lkdGg9IjIuNSI+PHJlY3QgeD0iMTIiIHk9IjEyIiB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHJ4PSI2Ii8+PHBhdGggZD0ibTEyIDU0IDE2LTE4IDMyIDMyIi8+PGNpcmNsZSBjeD0iNTMiIGN5PSIzNSIgcj0iNyIvPjwvc3ZnPg==";

export function ImageWithFallback(
  props: React.ImgHTMLAttributes<HTMLImageElement>
) {
  const { src, alt, style, className, onError, ...rest } = props;
  const [didError, setDidError] = useState(false);

  useEffect(() => { setDidError(false); }, [src]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setDidError(true);
    onError?.(e);
  };

  if (didError || !src) {
    return (
      <div
        className={`inline-flex items-center justify-center bg-gray-100 ${className ?? ""}`}
        style={style}
      >
        <img src={FALLBACK_SVG} alt="Image unavailable" className="w-10 h-10 opacity-40" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      {...rest}
      onError={handleError}
    />
  );
}