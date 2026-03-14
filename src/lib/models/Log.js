import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  query: { type: String, required: true },
  queryType: { type: String, enum: ['mobile', 'cnic', 'unknown'], default: 'unknown' },
  apiUsed: { type: String, enum: ['api1', 'api2', 'none'], default: 'none' },
  success: { type: Boolean, default: false },
  responseTime: { type: Number, default: 0 },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  apiKey: { type: String, default: '' },
  error: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

logSchema.index({ createdAt: -1 });
logSchema.index({ success: 1 });

export default mongoose.models.Log || mongoose.model('Log', logSchema);
