"use client";
import { useState } from "react";

interface Props {
  onChange: (value: number) => void;
}

export default function StarRating({ onChange }: Props) {
  const [hover, setHover] = useState(0);
  const [selected, setSelected] = useState(0);

  return (
    <div className="flex gap-2 text-3xl">
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n}
          className="cursor-pointer transition-colors"
          style={{ color: n <= (hover || selected) ? "#FBBF24" : "#9CA3AF" }}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => { setSelected(n); onChange(n); }}>
          {n <= (hover || selected) ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}