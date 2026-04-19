"use client";
import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  textarea?: boolean;
  value?: any;
}

export default function FormInput({ textarea = false, className = "", ...rest }: any) {
  const base = "w-full p-3 border rounded-lg bg-pink-50 focus:outline-none focus:border-yellow-400";
  if (textarea) {
    return <textarea {...rest} className={`${base} ${className}`} />;
  }
  return <input {...rest} className={`${base} ${className}`} />;
}
