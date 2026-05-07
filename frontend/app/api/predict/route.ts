import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<Response> {
  const flaskApiUrl = process.env.FLASK_API_URL;

  if (!flaskApiUrl) {
    return NextResponse.json({ error: "FLASK_API_URL is not configured." }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const upstreamResponse = await fetch(`${flaskApiUrl}/predict`, {
      method: "POST",
      body: formData,
      cache: "no-store"
    });

    const payload = await upstreamResponse.json();
    return NextResponse.json(payload, { status: upstreamResponse.status });
  } catch {
    return NextResponse.json({ error: "Prediction service is unavailable." }, { status: 502 });
  }
}
