import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { scanUrl } from "@/lib/qr/token";

/**
 * Renders a checkpoint QR as PNG or SVG for preview, download and printing.
 * Admin-only: the token is what a scanner needs to bank points.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdmin();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const checkpoint = await prisma.checkpoint.findUnique({
    where: { id },
    select: { name: true, qrToken: true },
  });
  if (!checkpoint) return new NextResponse("Not found", { status: 404 });

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "svg" ? "svg" : "png";
  const size = Math.min(2000, Math.max(128, Number(url.searchParams.get("size") ?? 600)));
  const download = url.searchParams.get("download") === "1";

  const target = scanUrl(checkpoint.qrToken);
  const options = { width: size, margin: 2, errorCorrectionLevel: "M" as const };

  const filename = `${checkpoint.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.${format}`;
  const disposition = download ? `attachment; filename="${filename}"` : "inline";

  if (format === "svg") {
    const svg = await QRCode.toString(target, { ...options, type: "svg" });
    return new NextResponse(svg, {
      headers: { "content-type": "image/svg+xml", "content-disposition": disposition },
    });
  }

  const png = await QRCode.toBuffer(target, { ...options, type: "png" });
  return new NextResponse(new Uint8Array(png), {
    headers: { "content-type": "image/png", "content-disposition": disposition },
  });
}
