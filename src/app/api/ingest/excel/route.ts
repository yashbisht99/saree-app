import { NextResponse } from "next/server"
import { mapExcelColumns, heuristicMap } from "@/lib/gemini"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { headers, sampleRows } = body as { headers: string[]; sampleRows: Record<string,string>[] }
    if (!headers) return NextResponse.json({ error: "No headers" }, { status: 400 })

    if (process.env.GEMINI_API_KEY) {
      try {
        const mapped = await mapExcelColumns(headers, sampleRows || [])
        if (mapped) return NextResponse.json(mapped)
      } catch (e) {
        console.error("Gemini excel map failed, falling back", e)
      }
    }
    // fallback heuristic
    const fallback = heuristicMap(headers)
    return NextResponse.json(fallback)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
