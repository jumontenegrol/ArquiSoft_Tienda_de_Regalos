"use client";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export default function Button({ children, className = "", ...rest }: ButtonProps) {
  const base = "inline-block text-white font-semibold rounded-xl shadow transition";
  return (
    <button {...rest} className={`${base} ${className}`}> {children} </button>
  );
}
