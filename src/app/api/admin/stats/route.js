import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Log from '@/lib/models/Log';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.response;

  try {
    await dbConnect();

    const sevenDays = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [total, success, failed, api1Count, api2Count] = await Promise.all([
      Log.countDocuments(),
      Log.countDocuments({ success: true }),
      Log.countDocuments({ success: false }),
      Log.countDocuments({ apiUsed: 'api1' }),
      Log.countDocuments({ apiUsed: 'api2' }),
    ]);

    const [api1Count7d, api2Count7d] = await Promise.all([
      Log.countDocuments({ apiUsed: 'api1', createdAt: { $gte: sevenDays } }),
      Log.countDocuments({ apiUsed: 'api2', createdAt: { $gte: sevenDays } }),
    ]);

    const avgPipeline = await Log.aggregate([
      { $group: { _id: null, avg: { $avg: '$responseTime' } } },
    ]);
    const avgResponseTime = avgPipeline.length > 0 ? Math.round(avgPipeline[0].avg) : 0;

    const daily = await Log.aggregate([
      { $match: { createdAt: { $gte: sevenDays } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          successCount: { $sum: { $cond: ['$success', 1, 0] } },
          failCount: { $sum: { $cond: ['$success', 0, 1] } },
          avgTime: { $avg: '$responseTime' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const nowUtcHour = new Date();
    nowUtcHour.setUTCMinutes(0, 0, 0);
    const start24Utc = new Date(nowUtcHour.getTime() - 23 * 60 * 60 * 1000);

    const hourlyAgg = await Log.aggregate([
      {
        $match: {
          createdAt: {
            $gte: start24Utc,
            $lt: new Date(nowUtcHour.getTime() + 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d-%H',
              date: '$createdAt',
              timezone: 'UTC',
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const hourlyMap = new Map(hourlyAgg.map((h) => [h._id, h.count]));
    const hourly = Array.from({ length: 24 }, (_, i) => {
      const bucketDate = new Date(start24Utc.getTime() + i * 60 * 60 * 1000);
      const year = bucketDate.getUTCFullYear();
      const month = String(bucketDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(bucketDate.getUTCDate()).padStart(2, '0');
      const hour = String(bucketDate.getUTCHours()).padStart(2, '0');
      const key = `${year}-${month}-${day}-${hour}`;

      return {
        _id: key,
        hourNumber: Number.parseInt(hour, 10),
        label: `${hour}:00`,
        count: hourlyMap.get(key) || 0,
      };
    });

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11, 1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);
    const monthly = await Log.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const fiveYearsAgo = new Date(new Date().getFullYear() - 4, 0, 1);
    const yearly = await Log.aggregate([
      { $match: { createdAt: { $gte: fiveYearsAgo } } },
      {
        $group: {
          _id: { $year: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const topQueries = await Log.aggregate([
      { $match: { createdAt: { $gte: sevenDays } } },
      { $group: { _id: '$query', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const recentLogs = await Log.find().sort({ createdAt: -1 }).limit(10).lean();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayCount = await Log.countDocuments({ createdAt: { $gte: startOfDay } });

    return NextResponse.json({
      total,
      success,
      failed,
      api1Count,
      api2Count,
      api1Count7d,
      api2Count7d,
      avgResponseTime,
      daily,
      hourly,
      monthly,
      yearly,
      topQueries,
      recentLogs,
      todayCount,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
