import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Setting from '@/lib/models/Setting';
import ApiKey from '@/lib/models/ApiKey';
import Log from '@/lib/models/Log';
import { search, detectQueryType } from '@/lib/services/searchService';

export async function GET(request) {
  const startTime = Date.now();

  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const ip = request.headers.get('x-forwarded-for') || '';
    const userAgent = request.headers.get('user-agent') || '';

    if (!q) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    const cleaned = q.replace(/[^0-9]/g, '');
    if (cleaned.length < 10 || cleaned.length > 13) {
      return NextResponse.json({ error: 'Invalid mobile number or CNIC' }, { status: 400 });
    }

    // Check API key if required
    const apiKeyRequired = await Setting.get('apiKeyRequired');
    if (apiKeyRequired) {
      const key = request.headers.get('x-api-key') || searchParams.get('apikey');
      if (!key) {
        return NextResponse.json({ error: 'API key required' }, { status: 403 });
      }
      const apiKey = await ApiKey.findOne({ key, active: true });
      if (!apiKey) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 403 });
      }
      apiKey.requestCount += 1;
      await apiKey.save();
    }

    const queryType = detectQueryType(q);

    const result = await search(cleaned);
    const elapsed = Date.now() - startTime;

    // Both APIs disabled
    if (result && result.error === 'apis_off') {
      await Log.create({
        query: cleaned,
        queryType,
        apiUsed: 'none',
        success: false,
        responseTime: elapsed,
        ip,
        userAgent,
        apiKey: request.headers.get('x-api-key') || '',
        error: 'All APIs disabled',
      }).catch(() => {});
      return NextResponse.json({ error: result.message }, { status: 503 });
    }

    // Log the request
    await Log.create({
      query: cleaned,
      queryType,
      apiUsed: result ? result.source : 'none',
      success: !!result,
      responseTime: elapsed,
      ip,
      userAgent,
      apiKey: request.headers.get('x-api-key') || '',
      error: result ? '' : 'No records found',
    });

    if (result) {
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'No Records Found' }, { status: 404 });
  } catch (err) {
    const elapsed = Date.now() - startTime;
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
