import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const filePathParts = resolvedParams.path || [];
  const relativePath = filePathParts.map(decodeURIComponent).join("/");
  
  // Audio files can be in process.cwd()/audio_ file/... or process.cwd()/data/uploads/...
  let fullPath = path.join(process.cwd(), "audio_ file", relativePath);
  if (!fs.existsSync(fullPath)) {
    fullPath = path.join(process.cwd(), relativePath);
  }

  if (!fs.existsSync(fullPath)) {
    return new NextResponse("Audio file not found", { status: 404 });
  }

  const stat = fs.statSync(fullPath);
  const fileSize = stat.size;
  const range = request.headers.get("range");

  const ext = path.extname(fullPath).toLowerCase();
  const contentType = ext === ".mp4" ? "video/mp4" : "audio/mpeg";

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(fullPath, { start, end });

    // Stream range response for smooth HTML5 audio seeking
    return new NextResponse(file as any, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunksize),
        "Content-Type": contentType,
      },
    });
  } else {
    const file = fs.createReadStream(fullPath);
    return new NextResponse(file as any, {
      status: 200,
      headers: {
        "Content-Length": String(fileSize),
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
      },
    });
  }
}
