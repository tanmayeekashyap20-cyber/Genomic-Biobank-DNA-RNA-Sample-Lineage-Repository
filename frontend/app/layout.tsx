
import type { Metadata } from "next";
import "@xyflow/react/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Genomic Biobank | Sample Lineage Repository",
  description:
    "Genomic biobank management system for donor records, DNA/RNA samples, experiments, storage and sample lineage using PostgreSQL and MongoDB.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
