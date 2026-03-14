import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: true },
    label: { type: String, default: 'Default' },
    active: { type: Boolean, default: true },
    requestCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.ApiKey || mongoose.model('ApiKey', apiKeySchema);
