import type { Metadata } from "next";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import { DemoDataProvider } from "@/components/demo-data-provider";

export const metadata: Metadata = {
  title: "Genomic Biobank | Sample Lineage Repository",
  description: "Synthetic demonstration workspace for biobank sample operations and lineage exploration.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <DemoDataProvider>{children}</DemoDataProvider>
      </body>
    </html>
  );
}