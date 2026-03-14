import { NextResponse } from 'next/server';
import axios from 'axios';
import dbConnect from '@/lib/db';
import Setting from '@/lib/models/Setting';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.response;

  try {
    await dbConnect();
    const api1Url = (await Setting.get('api1Url')) || process.env.API1_URL;
    const api2Url = (await Setting.get('api2Url')) || process.env.API2_URL;

    const check = async (url, name) => {
      const start = Date.now();
      try {
        const urlObj = new URL(url);
        const baseUrl = urlObj.origin;
        try {
          await axios.head(baseUrl, { timeout: 15000 });
        } catch (headErr) {
          if (!headErr.response) {
            await axios.get(baseUrl, { timeout: 15000, maxRedirects: 3 });
          }
        }
        return { name, status: 'online', latency: Date.now() - start };
      } catch (err) {
        const latency = Date.now() - start;
        if (err.response) {
          return { name, status: 'online', latency, httpStatus: err.response.status };
        }
        return { name, status: 'offline', latency, error: err.code || err.message };
      }
    };

    const [api1, api2] = await Promise.all([
      check(api1Url, 'api1'),
      check(api2Url, 'api2'),
    ]);

    return NextResponse.json({ api1, api2 });
  } catch (err) {
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 });
  }
}
