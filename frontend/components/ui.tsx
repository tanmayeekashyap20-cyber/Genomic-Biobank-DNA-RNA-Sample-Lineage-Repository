"use client";

import { useState } from "react";
import { AlertTriangle, Check, CircleHelp, X } from "lucide-react";

export function Badge({ children, tone }: { children: React.ReactNode; tone?: string }) {
  return <span className={`badge ${tone ?? ""}`}>{children}</span>;
}

export function PageHeading({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="page-subtitle">{subtitle}</p></div>{children}</div>;
}

export function Panel({ title, caption, children, action, className = "" }: { title: string; caption?: string; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><div className="panel-header"><div><h2 className="panel-title">{title}</h2>{caption && <div className="panel-caption">{caption}</div>}</div>{action}</div>{children}</section>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="empty-state"><div><CircleHelp size={22} /><strong>{title}</strong><span>{detail}</span></div></div>;
}

export function Notice({ children, warning = false }: { children: React.ReactNode; warning?: boolean }) {
  const Icon = warning ? AlertTriangle : Check;
  return <div className="notice"><Icon size={15} aria-hidden="true" /><span>{children}</span></div>;
}

export function Modal({ title, subtitle, onClose, children, footer }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-head"><div><h2 className="panel-title">{title}</h2>{subtitle && <div className="panel-caption">{subtitle}</div>}</div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={16} /></button></div><div className="modal-body">{children}</div>{footer && <div className="modal-footer">{footer}</div>}</section></div>;
}

export function useToast() {
  const [message, setMessage] = useState("");
  const show = (next: string) => {
    setMessage(next);
    window.setTimeout(() => setMessage(""), 3200);
  };
  const Toast = () => message ? <div role="status" className="toast">{message}</div> : null;
  return { show, Toast };
}